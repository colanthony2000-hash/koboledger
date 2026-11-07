import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, handleFirestoreError, OperationType } from './firebase';
import {
  Account,
  Budget,
  Commitment,
  Debt,
  SavingsGoal,
  Transaction,
  UserProfile,
  Category,
  TodoItem,
} from '../types/finance';

export interface WorkspaceMembership {
  id: string;
  name: string;
  role: 'owner' | 'member' | 'auditor';
}

let activeWorkspaceId: string | null = null;
let activeMemberIds: string[] = [];

export function setActiveWorkspace(workspaceId: string | null, memberIds: string[] = []) {
  activeWorkspaceId = workspaceId;
  activeMemberIds = [...new Set(memberIds)];
}

function currentUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in before syncing financial records.');
  return uid;
}

function stampRecord<T extends object & { owner_user_id?: string; workspace_id?: string; visibility?: string }>(record: T) {
  const uid = currentUserId();
  const originalWorkspace = record.workspace_id;
  const workspaceId = !originalWorkspace || originalWorkspace === 'ws_main'
    ? (activeWorkspaceId || uid)
    : originalWorkspace;
  const ownerId = record.owner_user_id || uid;
  const isShared = record.visibility === 'shared' && activeMemberIds.includes(uid);
  return {
    ...record,
    workspace_id: workspaceId,
    owner_user_id: ownerId,
    visibility: isShared ? 'shared' : 'private',
    sharedWith: isShared ? activeMemberIds : [ownerId],
  };
}

async function persistRecord<T extends { id: string; owner_user_id?: string; workspace_id?: string; visibility?: string }>(name: string, record: T): Promise<void> {
  try {
    await setDoc(doc(db, name, record.id), stampRecord(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${name}/{recordId}`);
  }
}

export async function persistRecords<T extends { id: string; owner_user_id?: string; workspace_id?: string; visibility?: string }>(name: string, records: T[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const allowed = records.filter((record) => !record.owner_user_id || record.owner_user_id === uid || record.visibility === 'shared');
  if (name === 'audit_logs') {
    const existing = await getDocs(query(collection(db, name), where('sharedWith', 'array-contains', uid)));
    const existingIds = new Set(existing.docs.map((item) => item.id));
    await Promise.all(allowed.filter((record) => !existingIds.has(record.id)).map((record) => persistRecord(name, record)));
    return;
  }
  await Promise.all(allowed.map((record) => persistRecord(name, record)));
}

export const persistTransaction = (record: Transaction) => persistRecord('transactions', record);
export const persistAccount = (record: Account) => persistRecord('accounts', record);
export const persistDebt = (record: Debt) => persistRecord('debts', record);
export const persistBudget = (record: Budget & { id: string }) => persistRecord('budgets', record);
export const persistSavingsGoal = (record: SavingsGoal) => persistRecord('savings_goals', record);
export const persistCommitment = (record: Commitment & { id: string }) => persistRecord('commitments', record);
export const persistTodoItem = (record: TodoItem) => persistRecord('todo_items', record);
export const deleteTodoItem = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'todo_items', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'todo_items/{todoId}');
  }
};

export async function ensureWorkspace(name: string): Promise<{ workspaceId: string; role: string; platformAdmin: boolean }> {
  const call = httpsCallable<{ name: string }, { workspaceId: string; role: string; platformAdmin: boolean }>(functions, 'ensureWorkspace');
  return (await call({ name })).data;
}

export async function refreshPlatformAdminAccess(): Promise<boolean> {
  const call = httpsCallable<Record<string, never>, { platformAdmin: boolean }>(functions, 'refreshPlatformAdminAccess');
  return (await call({})).data.platformAdmin;
}

export async function listMyWorkspaces(): Promise<WorkspaceMembership[]> {
  const call = httpsCallable<Record<string, never>, { workspaces: WorkspaceMembership[] }>(functions, 'listMyWorkspaces');
  return (await call({})).data.workspaces;
}

export interface HouseholdMember {
  uid: string;
  name: string;
  email: string;
  role: 'owner' | 'member' | 'auditor';
}

export interface PlatformAccount {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string;
  tier: 'free' | 'pro';
  subscriptionStatus: string;
  expiresAt: string;
}

export interface PlatformSettings {
  plans: Record<'weekly' | 'monthly' | 'annual', { amountMinor: number; durationDays: number }>;
  announcement: string;
  maintenanceMode: boolean;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  plans: {
    weekly: { amountMinor: 150000, durationDays: 7 },
    monthly: { amountMinor: 500000, durationDays: 30 },
    annual: { amountMinor: 5000000, durationDays: 365 },
  },
  announcement: '',
  maintenanceMode: false,
};

export async function getPublicPlatformSettings(): Promise<PlatformSettings> {
  const call = httpsCallable<Record<string, never>, PlatformSettings>(functions, 'getPublicPlatformSettings');
  return (await call({})).data;
}

export async function updatePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  const call = httpsCallable<PlatformSettings, PlatformSettings>(functions, 'updatePlatformSettings');
  return (await call(settings)).data;
}

export async function setPlatformSubscription(uid: string, action: 'grant' | 'revoke', reason: string, days: number): Promise<void> {
  const call = httpsCallable<{ uid: string; action: 'grant' | 'revoke'; reason: string; days: number }, { uid: string; action: string }>(functions, 'setPlatformSubscription');
  await call({ uid, action, reason, days });
}

export async function saveGlobalCategory(category: Category): Promise<void> {
  const call = httpsCallable<Category, { saved: boolean }>(functions, 'saveGlobalCategory');
  await call(category);
}

export function listenToGlobalCategories(onUpdate: (categories: Category[]) => void) {
  return onSnapshot(
    query(collection(db, 'categories')),
    (snapshot) => onUpdate(snapshot.docs.map((item) => item.data() as Category).sort((a, b) => a.name.localeCompare(b.name))),
    (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
  );
}

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  const call = httpsCallable<Record<string, never>, { accounts: PlatformAccount[] }>(functions, 'listPlatformAccounts');
  return (await call({})).data.accounts;
}

export async function setPlatformAccountDisabled(uid: string, disabled: boolean): Promise<void> {
  const call = httpsCallable<{ uid: string; disabled: boolean }, { uid: string; disabled: boolean }>(functions, 'setPlatformAccountDisabled');
  await call({ uid, disabled });
}

export async function listHouseholdMembers(workspaceId: string): Promise<HouseholdMember[]> {
  const call = httpsCallable<{ workspaceId: string }, { members: HouseholdMember[] }>(functions, 'listHouseholdMembers');
  return (await call({ workspaceId })).data.members;
}

export async function createHouseholdInvite(workspaceId: string, email: string, role: 'member' | 'auditor') {
  const call = httpsCallable<{ workspaceId: string; email: string; role: string }, { token: string; expiresAt: string }>(functions, 'createHouseholdInvite');
  return (await call({ workspaceId, email, role })).data;
}

export async function acceptHouseholdInvite(token: string) {
  const call = httpsCallable<{ token: string }, { workspaceId: string; role: string }>(functions, 'acceptHouseholdInvite');
  return (await call({ token })).data;
}

export async function removeHouseholdMember(workspaceId: string, memberId: string) {
  const call = httpsCallable<{ workspaceId: string; memberId: string }, { removed: boolean }>(functions, 'removeHouseholdMember');
  return (await call({ workspaceId, memberId })).data;
}

export async function startPaystackCheckout(plan: 'weekly' | 'monthly' | 'annual') {
  const call = httpsCallable<{ plan: string }, { authorizationUrl: string; reference: string }>(functions, 'createPaystackCheckout');
  return (await call({ plan })).data;
}

export async function verifyPaystackCheckout(reference: string) {
  const call = httpsCallable<{ reference: string }, { verified: boolean }>(functions, 'verifyPaystackCheckout');
  return (await call({ reference })).data;
}

export async function persistUserProfile(user: UserProfile & { email?: string; photoURL?: string }): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), {
      uid: user.id,
      displayName: user.name,
      workspaceId: user.workspace_id || user.id,
      email: user.email || '',
      photoURL: user.photoURL || '',
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/{userId}');
  }
}

export function listenToRecords<T>(
  name: string,
  userId: string,
  onUpdate: (items: T[]) => void,
  onError?: (code: string, branch: 'owned' | 'shared') => void,
) {
  // Rules authorize owned records by owner_user_id, and household records by
  // visibility + sharedWith. Keep each query aligned with its rule branch.
  const ownedQuery = query(collection(db, name), where('owner_user_id', '==', userId));
  const sharedQuery = query(
    collection(db, name),
    where('workspace_id', '==', activeWorkspaceId || userId),
    where('visibility', '==', 'shared'),
    where('sharedWith', 'array-contains', userId),
  );
  let owned = new Map<string, T>();
  let shared = new Map<string, T>();
  let ownedReady = false;
  let sharedReady = false;
  const publish = () => {
    if (!ownedReady || !sharedReady) return;
    const merged = new Map(owned);
    for (const [id, record] of shared) merged.set(id, record);
    onUpdate([...merged.values()]);
  };
  const reportError = (name: string, error: unknown, branch: 'owned' | 'shared') => {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'unknown';
    console.error('Firestore record read failed:', name, branch, code);
    onError?.(code, branch);
  };
  const stopOwned = onSnapshot(ownedQuery, (snapshot) => {
    owned = new Map(snapshot.docs.map((item) => [item.id, item.data() as T]));
    ownedReady = true;
    publish();
  }, (error) => {
    ownedReady = true;
    reportError(name, error, 'owned');
    publish();
  });
  const stopShared = onSnapshot(sharedQuery, (snapshot) => {
    shared = new Map(snapshot.docs.map((item) => [item.id, item.data() as T]));
    sharedReady = true;
    publish();
  }, (error) => {
    sharedReady = true;
    reportError(name, error, 'shared');
    publish();
  });
  return () => { stopOwned(); stopShared(); };
}

export function listenToTransactions(userId: string, onUpdate: (txs: Transaction[]) => void, onError?: (code: string, branch: 'owned' | 'shared') => void) {
  return listenToRecords<Transaction>('transactions', userId, (items) => {
    items.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
    onUpdate(items);
  }, onError);
}

export function listenToSubscription(userId: string, onUpdate: (subscription: Record<string, unknown> | null) => void) {
  return onSnapshot(
    doc(db, 'subscriptions', userId),
    (snapshot) => onUpdate(snapshot.exists() ? snapshot.data() : null),
    (error) => handleFirestoreError(error, OperationType.GET, 'subscriptions/{userId}')
  );
}
