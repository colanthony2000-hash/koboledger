const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { defineSecret } = require('firebase-functions/params');
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');

initializeApp();
setGlobalOptions({ cpu: 'gcf_gen1', memory: '256MiB', maxInstances: 1 });
// Match the named Firestore database used by the web client and deployed rules.
const db = getFirestore('ai-studio-koboledgerperson-d3c2aa84-4cfb-4aa9-ade0-d53402b35132');
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const PLATFORM_ADMIN_EMAIL = 'jeneconklms@gmail.com';

const PLAN_DEFAULTS = Object.freeze({
  weekly: { amountMinor: 150000, durationDays: 7 },
  monthly: { amountMinor: 500000, durationDays: 30 },
  annual: { amountMinor: 5000000, durationDays: 365 },
});
const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Staple Foods & Groceries', type: 'expense', is_essential: true, color: '#16A34A' },
  { id: 'cat_rent', name: 'House Rent & Estate Fees', type: 'expense', is_essential: true, color: '#0284C7' },
  { id: 'cat_utilities', name: 'Power, Light & Utilities', type: 'expense', is_essential: true, color: '#D97706' },
  { id: 'cat_transport', name: 'Commute, Transport & Fuel', type: 'expense', is_essential: true, color: '#EA580C' },
  { id: 'cat_healthcare', name: 'Healthcare & Medications', type: 'expense', is_essential: true, color: '#DC2626' },
  { id: 'cat_tuition', name: 'School Fees & Education', type: 'expense', is_essential: true, color: '#7C3AED' },
  { id: 'cat_family', name: 'Family Support & Upkeep', type: 'expense', is_essential: true, color: '#059669' },
  { id: 'cat_dining', name: 'Dining Out & Fast Food', type: 'expense', is_essential: false, color: '#E11D48' },
  { id: 'cat_tech', name: 'Gadgets & Tech Upgrades', type: 'expense', is_essential: false, color: '#4F46E5' },
  { id: 'cat_shopping', name: 'Shopping & Apparel', type: 'expense', is_essential: false, color: '#9333EA' },
  { id: 'cat_financial_costs', name: 'Bank & Transaction Fees', type: 'financial_cost', is_essential: false, color: '#64748B' },
  { id: 'cat_loan_interest', name: 'Loan Interest Costs', type: 'financial_cost', is_essential: false, color: '#B91C1C' },
  { id: 'cat_income_salary', name: 'Salary & Core Income', type: 'income', is_essential: false, color: '#15803D' },
  { id: 'cat_income_business', name: 'Side Business & Consulting', type: 'income', is_essential: false, color: '#047857' },
];
const PLATFORM_SETTINGS_REF = db.doc('platformSettings/main');
const FINANCE_COLLECTIONS = [
  'accounts', 'transactions', 'debts', 'budgets', 'savings_goals', 'commitments',
  'recurring_transactions', 'goal_allocations', 'project_items', 'audit_logs', 'daily_savings', 'todo_items',
];

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function grantPlatformAdminIfOwner(auth) {
  const user = await getAuth().getUser(auth.uid);
  if (!user.emailVerified || normalizeEmail(user.email) !== PLATFORM_ADMIN_EMAIL) return false;
  const claims = { ...(user.customClaims || {}), platformAdmin: true };
  if (user.customClaims && user.customClaims.platformAdmin === true) return true;
  await getAuth().setCustomUserClaims(auth.uid, claims);
  return true;
}

function requirePlatformAdmin(request) {
  const auth = requireAuth(request);
  if (auth.token.platformAdmin !== true || normalizeEmail(auth.token.email) !== PLATFORM_ADMIN_EMAIL || auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Platform administrator access is required.');
  }
  return auth;
}

async function paystackRequest(path, body, secret) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== true) {
    throw new HttpsError('failed-precondition', 'The payment provider could not complete the request.');
  }
  return result.data;
}

async function getPlatformSettings() {
  const snapshot = await PLATFORM_SETTINGS_REF.get();
  const saved = snapshot.exists ? snapshot.data() : {};
  return {
    plans: Object.fromEntries(Object.entries(PLAN_DEFAULTS).map(([id, defaults]) => [id, {
      amountMinor: Number(saved.plans?.[id]?.amountMinor) || defaults.amountMinor,
      durationDays: defaults.durationDays,
    }])),
    announcement: typeof saved.announcement === 'string' ? saved.announcement : '',
    maintenanceMode: saved.maintenanceMode === true,
  };
}

async function seedGlobalCategoriesIfEmpty() {
  await db.runTransaction(async (transaction) => {
    const refs = DEFAULT_CATEGORIES.map((category) => db.doc(`categories/${category.id}`));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    if (snapshots.some((snapshot) => snapshot.exists)) return;
    refs.forEach((ref, index) => transaction.create(ref, { ...DEFAULT_CATEGORIES[index], is_active: true, createdAt: FieldValue.serverTimestamp() }));
  });
}

async function saveVerifiedSubscription(data) {
  const uid = data.metadata && data.metadata.uid;
  const planName = data.metadata && data.metadata.plan;
  const planDefault = PLAN_DEFAULTS[planName];
  const amountMinor = Number(data.metadata && data.metadata.amountMinor);
  if (!uid || !planDefault || !Number.isSafeInteger(amountMinor) || amountMinor < 1000 || data.status !== 'success' || data.currency !== 'NGN' || data.amount !== amountMinor) {
    throw new HttpsError('failed-precondition', 'The payment does not match an available KoboLedger plan.');
  }

  const reference = String(data.reference || '');
  if (!reference) throw new HttpsError('failed-precondition', 'The payment reference is missing.');
  const ref = db.doc(`subscriptions/${uid}`);
  const expiresAt = new Date(Date.now() + planDefault.durationDays * 24 * 60 * 60 * 1000);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists && existing.data().paymentReference === reference && existing.data().status === 'active') return;
    transaction.set(ref, {
      tier: 'pro',
      status: 'active',
      billingCycle: planName,
      expiresAt: expiresAt.toISOString().slice(0, 10),
      paymentMethod: 'paystack',
      paymentReference: reference,
      amountPaidMinor: amountMinor,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function verifyReference(reference, secret) {
  if (typeof reference !== 'string' || reference.length > 100) {
    throw new HttpsError('invalid-argument', 'Enter a valid payment reference.');
  }
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, null, secret);
}

async function syncSharedRecords(workspaceId, memberIds) {
  const ids = [...new Set(memberIds)];
  for (const collectionName of FINANCE_COLLECTIONS) {
    let cursor = null;
    while (true) {
      let query = db.collection(collectionName)
        .where('workspace_id', '==', workspaceId)
        .orderBy('__name__')
        .limit(350);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;

      const batch = db.batch();
      let changed = 0;
      for (const document of snapshot.docs) {
        if (document.data().visibility === 'shared') {
          batch.update(document.ref, { sharedWith: ids });
          changed += 1;
        }
      }
      if (changed) await batch.commit();
      cursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < 350) break;
    }
  }
}

exports.ensureWorkspace = onCall(async (request) => {
  const auth = requireAuth(request);
  const uid = auth.uid;
  const name = String(request.data && request.data.name || 'My household').slice(0, 80);
  const platformAdmin = await grantPlatformAdminIfOwner(auth);
  await seedGlobalCategoriesIfEmpty();
  const workspaceRef = db.doc(`workspaces/${uid}`);
  const memberRef = db.doc(`workspaces/${uid}/members/${uid}`);
  await db.runTransaction(async (transaction) => {
    const [workspace, member] = await Promise.all([transaction.get(workspaceRef), transaction.get(memberRef)]);
    if (!workspace.exists) {
      transaction.set(workspaceRef, {
        name,
        owner_user_id: uid,
        type: 'personal',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (!member.exists) {
      transaction.set(memberRef, {
        uid,
        role: 'owner',
        email: normalizeEmail(auth.token.email),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { workspaceId: uid, role: 'owner', platformAdmin };
});

exports.refreshPlatformAdminAccess = onCall(async (request) => {
  const auth = requireAuth(request);
  const platformAdmin = await grantPlatformAdminIfOwner(auth);
  return { platformAdmin };
});

exports.saveGlobalCategory = onCall(async (request) => {
  const actor = requirePlatformAdmin(request);
  const input = request.data || {};
  const id = String(input.id || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const type = input.type;
  const isEssential = input.is_essential === true;
  const color = String(input.color || '');
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(id) || name.length < 2 || name.length > 60 || !['expense', 'income', 'financial_cost'].includes(type) || typeof input.is_essential !== 'boolean' || !/^#[\da-fA-F]{6}$/.test(color)) {
    throw new HttpsError('invalid-argument', 'Enter a category name, type, essential flag, and six-digit hex color.');
  }
  const existing = await db.collection('categories').get();
  const matchingName = existing.docs.find((item) => item.id !== id && String(item.data().name || '').trim().toLowerCase() === name.toLowerCase());
  if (matchingName) throw new HttpsError('already-exists', 'A global category with that name already exists.');
  await db.doc(`categories/${id}`).set({ id, name, type, is_essential: isEssential, color: color.toUpperCase(), is_active: true, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('platformAdminAudit').add({ actorUid: actor.uid, action: 'SAVE_GLOBAL_CATEGORY', categoryId: id, categoryName: name, timestamp: FieldValue.serverTimestamp() });
  return { saved: true, category: { id, name, type, is_essential: isEssential, color: color.toUpperCase(), is_active: true } };
});

// Platform support sees account and subscription metadata only, never ledger records.
exports.listPlatformAccounts = onCall(async (request) => {
  requirePlatformAdmin(request);
  const snapshot = await db.collection('users').orderBy('__name__').limit(200).get();
  const accounts = await Promise.all(snapshot.docs.map(async (profile) => {
    const uid = profile.id;
    const [authUser, subscription] = await Promise.all([
      getAuth().getUser(uid).catch(() => null),
      db.doc(`subscriptions/${uid}`).get(),
    ]);
    const data = profile.data();
    const paid = subscription.exists ? subscription.data() : {};
    return {
      uid,
      email: data.email || authUser?.email || '',
      displayName: data.displayName || authUser?.displayName || 'KoboLedger customer',
      disabled: authUser?.disabled ?? false,
      createdAt: authUser?.metadata.creationTime || '',
      lastSignInAt: authUser?.metadata.lastSignInTime || '',
      tier: paid.tier === 'pro' && paid.status === 'active' ? 'pro' : 'free',
      subscriptionStatus: paid.status || 'free',
      expiresAt: paid.expiresAt || '',
    };
  }));
  return { accounts };
});

exports.setPlatformAccountDisabled = onCall(async (request) => {
  const actor = requirePlatformAdmin(request);
  const uid = String(request.data && request.data.uid || '');
  const disabled = request.data && request.data.disabled;
  if (!uid || uid === actor.uid || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Choose a customer account and a valid access state.');
  }
  const target = await getAuth().getUser(uid);
  if (normalizeEmail(target.email) === PLATFORM_ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'The platform owner account cannot be disabled here.');
  }
  await getAuth().updateUser(uid, { disabled });
  await db.collection('platformAdminAudit').add({
    actorUid: actor.uid,
    action: disabled ? 'DISABLE_CUSTOMER_ACCOUNT' : 'ENABLE_CUSTOMER_ACCOUNT',
    targetUid: uid,
    timestamp: FieldValue.serverTimestamp(),
  });
  return { uid, disabled };
});

exports.getPublicPlatformSettings = onCall(async () => {
  const settings = await getPlatformSettings();
  return {
    plans: Object.fromEntries(Object.entries(settings.plans).map(([id, plan]) => [id, { amountMinor: plan.amountMinor, durationDays: plan.durationDays }])),
    announcement: settings.announcement,
    maintenanceMode: settings.maintenanceMode,
  };
});

exports.updatePlatformSettings = onCall(async (request) => {
  const actor = requirePlatformAdmin(request);
  const input = request.data || {};
  const plans = {};
  for (const [id, defaults] of Object.entries(PLAN_DEFAULTS)) {
    const amount = Number(input.plans && input.plans[id] && input.plans[id].amountMinor);
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 1000000000) {
      throw new HttpsError('invalid-argument', `Set a valid ${id} plan price in minor currency units.`);
    }
    plans[id] = { amountMinor: amount, durationDays: defaults.durationDays };
  }
  const announcement = typeof input.announcement === 'string' ? input.announcement.trim().slice(0, 280) : '';
  const maintenanceMode = input.maintenanceMode === true;
  await PLATFORM_SETTINGS_REF.set({
    plans,
    announcement,
    maintenanceMode,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection('platformAdminAudit').add({
    actorUid: actor.uid,
    action: 'UPDATE_PLATFORM_SETTINGS',
    changes: { plans, announcement, maintenanceMode },
    timestamp: FieldValue.serverTimestamp(),
  });
  return { plans, announcement, maintenanceMode };
});

exports.setPlatformSubscription = onCall(async (request) => {
  const actor = requirePlatformAdmin(request);
  const uid = String(request.data && request.data.uid || '');
  const action = request.data && request.data.action;
  const reason = String(request.data && request.data.reason || '').trim().slice(0, 500);
  const days = Number(request.data && request.data.days);
  if (!uid || uid === actor.uid || !['grant', 'revoke'].includes(action) || reason.length < 8 || (action === 'grant' && (!Number.isInteger(days) || days < 1 || days > 3650))) {
    throw new HttpsError('invalid-argument', 'Choose an account, provide a reason, and enter a valid grant duration.');
  }
  const target = await getAuth().getUser(uid);
  if (normalizeEmail(target.email) === PLATFORM_ADMIN_EMAIL) throw new HttpsError('permission-denied', 'Owner subscription controls are protected.');
  const ref = db.doc(`subscriptions/${uid}`);
  if (action === 'grant') {
    const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await ref.set({ tier: 'pro', status: 'active', expiresAt: expiry.toISOString().slice(0, 10), paymentMethod: 'admin_comp', adminGrantedBy: actor.uid, adminReason: reason, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await ref.set({ tier: 'free', status: 'free', expiresAt: '', paymentMethod: 'admin_comp', adminRevokedBy: actor.uid, adminReason: reason, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await db.collection('platformAdminAudit').add({
    actorUid: actor.uid,
    action: action === 'grant' ? 'GRANT_PRO_ACCESS' : 'REVOKE_PRO_ACCESS',
    targetUid: uid,
    reason,
    days: action === 'grant' ? days : null,
    timestamp: FieldValue.serverTimestamp(),
  });
  return { uid, action };
});

exports.createHouseholdInvite = onCall(async (request) => {
  const auth = requireAuth(request);
  const workspaceId = String(request.data && request.data.workspaceId || auth.uid);
  const email = normalizeEmail(request.data && request.data.email);
  const role = request.data && request.data.role;
  if (!email || email.length > 254 || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  if (!['member', 'auditor'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Choose member or read-only auditor access.');
  }
  const ownerMember = await db.doc(`workspaces/${workspaceId}/members/${auth.uid}`).get();
  if (!ownerMember.exists || ownerMember.data().role !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the household owner can invite people.');
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.doc(`householdInvites/${tokenHash}`).create({
    workspaceId,
    email,
    role,
    createdBy: auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
  return { token, expiresAt: expiresAt.toDate().toISOString() };
});

exports.acceptHouseholdInvite = onCall(async (request) => {
  const auth = requireAuth(request);
  const token = String(request.data && request.data.token || '');
  const email = normalizeEmail(auth.token.email);
  if (!token || token.length > 200 || auth.token.email_verified !== true || !email) {
    throw new HttpsError('failed-precondition', 'Sign in with a verified email account to accept this invite.');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const inviteRef = db.doc(`householdInvites/${tokenHash}`);
  const inviteSnapshot = await inviteRef.get();
  if (!inviteSnapshot.exists) throw new HttpsError('not-found', 'This invite is invalid or has already been used.');
  const invite = inviteSnapshot.data();
  if (invite.email !== email) throw new HttpsError('permission-denied', 'This invite was sent to a different email address.');
  if (invite.expiresAt.toMillis() <= Date.now()) throw new HttpsError('deadline-exceeded', 'This invite has expired.');

  const workspaceRef = db.doc(`workspaces/${invite.workspaceId}`);
  const memberRef = workspaceRef.collection('members').doc(auth.uid);
  await db.runTransaction(async (transaction) => {
    const [currentInvite, workspace, existingMember] = await Promise.all([
      transaction.get(inviteRef), transaction.get(workspaceRef), transaction.get(memberRef),
    ]);
    if (!currentInvite.exists || !workspace.exists) throw new HttpsError('not-found', 'This invite is no longer available.');
    if (existingMember.exists) throw new HttpsError('already-exists', 'You are already a member of this household.');
    transaction.create(memberRef, {
      uid: auth.uid,
      email,
      role: invite.role,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.delete(inviteRef);
  });

  const members = await workspaceRef.collection('members').get();
  await syncSharedRecords(invite.workspaceId, members.docs.map((member) => member.id));
  return { workspaceId: invite.workspaceId, role: invite.role };
});

exports.removeHouseholdMember = onCall(async (request) => {
  const auth = requireAuth(request);
  const workspaceId = String(request.data && request.data.workspaceId || auth.uid);
  const memberId = String(request.data && request.data.memberId || '');
  if (!memberId || memberId === auth.uid) throw new HttpsError('invalid-argument', 'Choose a household member to remove.');
  const owner = await db.doc(`workspaces/${workspaceId}/members/${auth.uid}`).get();
  if (!owner.exists || owner.data().role !== 'owner') throw new HttpsError('permission-denied', 'Only the household owner can remove members.');
  await db.doc(`workspaces/${workspaceId}/members/${memberId}`).delete();
  const members = await db.collection(`workspaces/${workspaceId}/members`).get();
  await syncSharedRecords(workspaceId, members.docs.map((member) => member.id));
  return { removed: true };
});

exports.listMyWorkspaces = onCall(async (request) => {
  const auth = requireAuth(request);
  const snapshot = await db.collectionGroup('members').where('uid', '==', auth.uid).get();
  const workspaces = await Promise.all(snapshot.docs.map(async (member) => {
    const workspaceId = member.ref.parent.parent.id;
    const workspace = await db.doc(`workspaces/${workspaceId}`).get();
    return {
      id: workspaceId,
      name: workspace.exists ? workspace.data().name : 'Household',
      role: member.data().role,
    };
  }));
  return { workspaces };
});

exports.listHouseholdMembers = onCall(async (request) => {
  const auth = requireAuth(request);
  const workspaceId = String(request.data && request.data.workspaceId || '');
  const caller = await db.doc(`workspaces/${workspaceId}/members/${auth.uid}`).get();
  if (!caller.exists) throw new HttpsError('permission-denied', 'You are not a member of this household.');
  const members = await db.collection(`workspaces/${workspaceId}/members`).get();
  const result = await Promise.all(members.docs.map(async (member) => {
    const profile = await db.doc(`users/${member.id}`).get();
    const data = member.data();
    return {
      uid: member.id,
      name: profile.exists ? profile.data().displayName || 'Household member' : 'Household member',
      email: caller.data().role === 'owner' ? (data.email || '') : '',
      role: data.role,
    };
  }));
  return { members: result };
});

exports.createPaystackCheckout = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async (request) => {
  const auth = requireAuth(request);
  const email = normalizeEmail(auth.token.email);
  const planName = request.data && request.data.plan;
  const settings = await getPlatformSettings();
  const plan = settings.plans[planName];
  if (!email || !plan) throw new HttpsError('invalid-argument', 'Choose a valid plan and sign in with an email account.');
  const checkout = await paystackRequest('/transaction/initialize', {
    email,
    amount: plan.amountMinor,
    currency: 'NGN',
    callback_url: process.env.KOBOLEDGER_APP_URL || 'https://koboledger.vercel.app',
    metadata: { uid: auth.uid, plan: planName, amountMinor: plan.amountMinor, app: 'KoboLedger' },
  }, PAYSTACK_SECRET_KEY.value());
  return { authorizationUrl: checkout.authorization_url, reference: checkout.reference };
});

exports.verifyPaystackCheckout = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async (request) => {
  const auth = requireAuth(request);
  const reference = String(request.data && request.data.reference || '');
  const payment = await verifyReference(reference, PAYSTACK_SECRET_KEY.value());
  if (!payment.metadata || payment.metadata.uid !== auth.uid) {
    throw new HttpsError('permission-denied', 'This payment does not belong to your account.');
  }
  await saveVerifiedSubscription(payment);
  return { verified: true };
});

exports.paystackWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY] }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }
  const signature = request.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY.value()).update(request.rawBody).digest('hex');
  const supplied = Buffer.from(signature, 'hex');
  const calculated = Buffer.from(expected, 'hex');
  if (supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) {
    response.status(401).send('Invalid signature');
    return;
  }
  const event = request.body;
  if (event && event.event === 'charge.success' && event.data && event.data.reference) {
    try {
      const verified = await verifyReference(String(event.data.reference), PAYSTACK_SECRET_KEY.value());
      await saveVerifiedSubscription(verified);
    } catch (error) {
      console.error('Paystack verification failed for a signed webhook.');
      response.status(400).send('Could not verify payment');
      return;
    }
  }
  response.status(200).send('OK');
});
