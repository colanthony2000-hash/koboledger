import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  Account,
  Budget,
  Commitment,
  Debt,
  SavingsGoal,
  Transaction,
  UserProfile,
} from '../types/finance';

function currentWorkspaceId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in before accessing a financial workspace.');
  return uid;
}

function workspaceCollection(name: string) {
  return collection(db, 'workspaces', currentWorkspaceId(), name);
}

function stampOwner<T extends object>(data: T) {
  const uid = currentWorkspaceId();
  return { ...data, workspace_id: uid, owner_user_id: uid };
}

/** Creates the signed-in user's isolated workspace and owner membership once. */
export async function ensurePersonalWorkspace(displayName: string): Promise<void> {
  const uid = currentWorkspaceId();
  const workspaceRef = doc(db, 'workspaces', uid);
  const memberRef = doc(db, 'workspaces', uid, 'members', uid);
  const [workspaceSnap, memberSnap] = await Promise.all([getDoc(workspaceRef), getDoc(memberRef)]);

  if (workspaceSnap.exists() && memberSnap.exists()) return;

  const batch = writeBatch(db);
  if (!workspaceSnap.exists()) {
    batch.set(workspaceRef, {
      owner_user_id: uid,
      name: `${displayName || 'My'} workspace`,
      type: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  if (!memberSnap.exists()) {
    batch.set(memberRef, { uid, role: 'owner', createdAt: new Date().toISOString() });
  }
  await batch.commit();
}

async function persistRecord<T extends { id: string }>(name: string, record: T): Promise<void> {
  try {
    await setDoc(doc(workspaceCollection(name), record.id), stampOwner(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/{uid}/${name}/${record.id}`);
  }
}

export const persistTransaction = (record: Transaction) => persistRecord('transactions', record);
export const persistAccount = (record: Account) => persistRecord('accounts', record);
export const persistDebt = (record: Debt) => persistRecord('debts', record);
export const persistBudget = (record: Budget & { id: string }) => persistRecord('budgets', record);
export const persistSavingsGoal = (record: SavingsGoal) => persistRecord('savings_goals', record);
export const persistCommitment = (record: Commitment & { id: string }) => persistRecord('commitments', record);

/** Stores only the signed-in user's own profile. Workspace membership is authoritative for roles. */
export async function persistUserProfile(user: UserProfile & { email?: string; photoURL?: string }): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), {
      uid: user.id,
      displayName: user.name,
      workspaceId: user.id,
      email: user.email || '',
      photoURL: user.photoURL || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

/** Listens only to transactions in the authenticated user's workspace. */
export function listenToTransactions(_userId: string, onUpdate: (txs: Transaction[]) => void) {
  const path = 'transactions';
  return onSnapshot(
    workspaceCollection(path),
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((snapshotDoc) => items.push(snapshotDoc.data() as Transaction));
      items.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
      onUpdate(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, `workspaces/{uid}/${path}`)
  );
}
