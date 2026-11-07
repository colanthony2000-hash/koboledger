import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseEmailSignIn,
  createUserWithEmailAndPassword as firebaseEmailSignUp,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const functions = getFunctions(app, 'us-central1');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  // Keep document IDs, auth identifiers, and provider details out of browser logs/errors.
  void error;
  void path;
  console.error('Firestore operation failed:', operationType);
  throw new Error('Cloud sync failed. Please try again.');
}

// Connection test per skill instructions
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or cannot connect to Firestore.');
      return false;
    }
    // Expected if document doesn't exist or permissions are evaluated
    return true;
  }
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  const credential = await firebaseEmailSignIn(auth, email.trim(), password);
  return credential.user;
}

export async function createEmailAndPasswordAccount(email: string, password: string, displayName: string) {
  const credential = await firebaseEmailSignUp(auth, email.trim(), password);
  const name = displayName.trim();
  if (name) await updateProfile(credential.user, { displayName: name });
  try {
    await sendEmailVerification(credential.user);
    return { user: credential.user, verificationSent: true };
  } catch {
    return { user: credential.user, verificationSent: false };
  }
}

export async function resendEmailVerification() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before requesting an email verification link.');
  await sendEmailVerification(user);
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign-Out failed:', error);
    throw error;
  }
}
