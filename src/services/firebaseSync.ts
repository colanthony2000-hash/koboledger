import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Account,
  Budget,
  Commitment,
  Debt,
  SavingsGoal,
  Transaction,
  UserProfile,
} from '../types/finance';

/**
 * Persists an individual transaction to Firestore with error handling
 */
export async function persistTransaction(tx: Transaction): Promise<void> {
  const collectionName = 'transactions';
  try {
    const sharedWith = tx.visibility === 'shared'
      ? Array.from(new Set([tx.owner_user_id, 'user_ada', 'user_chidi', 'user_auditor']))
      : [tx.owner_user_id];

    await setDoc(doc(db, collectionName, tx.id), {
      ...tx,
      sharedWith,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${tx.id}`);
  }
}

/**
 * Persists an account to Firestore
 */
export async function persistAccount(acc: Account): Promise<void> {
  const collectionName = 'accounts';
  try {
    const sharedWith = acc.visibility === 'shared'
      ? Array.from(new Set([acc.owner_user_id, 'user_ada', 'user_chidi', 'user_auditor']))
      : [acc.owner_user_id];

    await setDoc(doc(db, collectionName, acc.id), {
      ...acc,
      sharedWith,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${acc.id}`);
  }
}

/**
 * Persists a debt to Firestore
 */
export async function persistDebt(debt: Debt): Promise<void> {
  const collectionName = 'debts';
  try {
    const sharedWith = debt.visibility === 'shared'
      ? Array.from(new Set([debt.owner_user_id, 'user_ada', 'user_chidi', 'user_auditor']))
      : [debt.owner_user_id];

    await setDoc(doc(db, collectionName, debt.id), {
      ...debt,
      sharedWith,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${debt.id}`);
  }
}

/**
 * Persists a budget to Firestore
 */
export async function persistBudget(budget: Budget & { owner_user_id?: string; workspace_id?: string; visibility?: string }): Promise<void> {
  const collectionName = 'budgets';
  const ownerId = budget.owner_user_id || 'user_ada';
  try {
    await setDoc(doc(db, collectionName, budget.id), {
      ...budget,
      owner_user_id: ownerId,
      workspace_id: budget.workspace_id || 'ws_household_jeneconk_01',
      sharedWith: ['user_ada', 'user_chidi', 'user_auditor'],
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${budget.id}`);
  }
}

/**
 * Persists a savings goal to Firestore
 */
export async function persistSavingsGoal(goal: SavingsGoal): Promise<void> {
  const collectionName = 'savings_goals';
  try {
    const sharedWith = goal.visibility === 'shared'
      ? Array.from(new Set([goal.owner_user_id, 'user_ada', 'user_chidi', 'user_auditor']))
      : [goal.owner_user_id];

    await setDoc(doc(db, collectionName, goal.id), {
      ...goal,
      sharedWith,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${goal.id}`);
  }
}

/**
 * Persists a commitment obligation to Firestore
 */
export async function persistCommitment(commitment: Commitment & { owner_user_id?: string }): Promise<void> {
  const collectionName = 'commitments';
  const ownerId = commitment.owner_user_id || 'user_ada';
  try {
    await setDoc(doc(db, collectionName, commitment.id), {
      ...commitment,
      owner_user_id: ownerId,
      sharedWith: ['user_ada', 'user_chidi', 'user_auditor'],
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${commitment.id}`);
  }
}

/**
 * Persists or updates user profile in Firestore
 */
export async function persistUserProfile(user: UserProfile & { email?: string; photoURL?: string }): Promise<void> {
  const collectionName = 'users';
  try {
    await setDoc(
      doc(db, collectionName, user.id),
      {
        uid: user.id,
        displayName: user.name,
        role: user.role,
        workspaceId: user.workspace_id || 'ws_household_jeneconk_01',
        workspaceType: user.workspace_type || 'household',
        email: user.email || `${user.id}@koboledger.app`,
        photoURL: user.photoURL || '',
        details: user.details || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${user.id}`);
  }
}

/**
 * Seeds initial collections to Firestore on first connection
 */
export async function seedInitialFirestoreData(data: {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  commitments: Commitment[];
}): Promise<void> {
  try {
    const txSnap = await getDocs(collection(db, 'transactions'));
    if (txSnap.size === 0) {
      console.log('Seeding initial ledger data to Firestore with scoped ownership...');
      for (const a of data.accounts) {
        await persistAccount(a);
      }
      for (const t of data.transactions) {
        await persistTransaction(t);
      }
      for (const d of data.debts) {
        await persistDebt(d);
      }
      for (const b of data.budgets) {
        await persistBudget(b);
      }
      for (const g of data.savingsGoals) {
        await persistSavingsGoal(g);
      }
      for (const c of data.commitments) {
        await persistCommitment(c);
      }
      console.log('Initial ledger data seeded to Firestore successfully.');
    }
  } catch (error) {
    console.warn('Firestore seeding check skipped (evaluating permissions):', error);
  }
}

/**
 * Sets up real-time listener on transactions with scoped query for security rules compliance
 */
export function listenToTransactions(userId: string, onUpdate: (txs: Transaction[]) => void) {
  const path = 'transactions';
  const q = query(
    collection(db, path),
    where('sharedWith', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Transaction);
      });
      if (items.length > 0) {
        // Sort descending by effective date
        items.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        onUpdate(items);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
