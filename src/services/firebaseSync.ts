import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
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

function currentUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in before syncing financial records.');
  return uid;
}

function privateRecord<T extends object>(record: T) {
  const uid = currentUserId();
  return {
    ...record,
    workspace_id: uid,
    owner_user_id: uid,
    visibility: 'private',
    // Until real workspace invitations exist, every record is visible only to its owner.
    sharedWith: [uid],
  };
}

async function persistRecord<T extends { id: string }>(name: string, record: T): Promise<void> {
  try {
    await setDoc(doc(db, name, record.id), privateRecord(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${name}/{recordId}`);
  }
}

export const persistTransaction = (record: Transaction) => persistRecord('transactions', record);
export const persistAccount = (record: Account) => persistRecord('accounts', record);
export const persistDebt = (record: Debt) => persistRecord('debts', record);
export const persistBudget = (record: Budget & { id: string }) => persistRecord('budgets', record);
export const persistSavingsGoal = (record: SavingsGoal) => persistRecord('savings_goals', record);
export const persistCommitment = (record: Commitment & { id: string }) => persistRecord('commitments', record);

/** Store only the signed-in user's profile in the private user document. */
export async function persistUserProfile(user: UserProfile & { email?: string; photoURL?: string }): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), {
      uid: user.id,
      displayName: user.name,
      workspaceId: user.id,
      email: user.email || '',
      photoURL: user.photoURL || '',
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/{userId}');
  }
}

/** Query only records whose sharing list contains the authenticated user's UID. */
export function listenToTransactions(userId: string, onUpdate: (txs: Transaction[]) => void) {
  const path = 'transactions';
  const scopedQuery = query(
    collection(db, path),
    where('sharedWith', 'array-contains', userId)
  );

  return onSnapshot(
    scopedQuery,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((snapshotDoc) => items.push(snapshotDoc.data() as Transaction));
      items.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
      onUpdate(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}
