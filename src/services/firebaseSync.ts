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
    await setDoc(doc(db, collectionName, tx.id), tx);
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
    await setDoc(doc(db, collectionName, acc.id), acc);
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
    await setDoc(doc(db, collectionName, debt.id), debt);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${debt.id}`);
  }
}

/**
 * Persists a budget to Firestore
 */
export async function persistBudget(budget: Budget): Promise<void> {
  const collectionName = 'budgets';
  try {
    await setDoc(doc(db, collectionName, budget.id), budget);
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
    await setDoc(doc(db, collectionName, goal.id), goal);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${goal.id}`);
  }
}

/**
 * Persists a commitment obligation to Firestore
 */
export async function persistCommitment(commitment: Commitment): Promise<void> {
  const collectionName = 'commitments';
  try {
    await setDoc(doc(db, collectionName, commitment.id), commitment);
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
        role: user.role === 'owner' ? 'head' : 'member',
        workspaceId: 'ws_main',
        email: user.email || 'user@koboledger.app',
        photoURL: user.photoURL || '',
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
    // Check if transactions already exist in Firestore
    const txSnap = await getDocs(collection(db, 'transactions'));
    if (txSnap.size === 0) {
      console.log('Seeding initial ledger data to Firestore...');
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
 * Sets up real-time listener on transactions with proper error handler
 */
export function listenToTransactions(onUpdate: (txs: Transaction[]) => void) {
  const path = 'transactions';
  return onSnapshot(
    collection(db, path),
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
