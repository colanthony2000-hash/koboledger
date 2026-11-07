import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail, X } from 'lucide-react';
import {
  createEmailAndPasswordAccount,
  loginWithEmailAndPassword,
  requestPasswordReset,
  resendEmailVerification,
} from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  authError: string | null;
  firebaseUser: FirebaseUser | null;
}

function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
  const messages: Record<string, string> = {
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase yet. The project owner must enable it in Authentication settings.',
    'auth/email-already-in-use': 'An account already uses this email. Sign in with its existing method or reset its password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/invalid-credential': 'The email or password is incorrect. Check them and try again.',
    'auth/user-disabled': 'This account is disabled. Contact KoboLedger support.',
    'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
    'auth/network-request-failed': 'Firebase could not be reached. Check your connection and try again.',
  };
  return messages[code] || 'Authentication could not be completed. Check your details and try again.';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onGoogleSignIn, authError, firebaseUser }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const authFlow = useRef<AuthMode>('signin');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setMessage('');
      authFlow.current = 'signin';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!firebaseUser || authFlow.current === 'signup') return;
    onClose();
  }, [firebaseUser, onClose]);

  if (!isOpen) return null;

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    authFlow.current = mode;

    if (mode === 'signup' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (mode !== 'reset' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const result = await createEmailAndPasswordAccount(email, password, name);
        setMessage(result.verificationSent
          ? 'Your account is ready. We sent a verification link to your email. You can start using KoboLedger now; verify your email to use household invitations.'
          : 'Your account is ready, but we could not send the verification email. Sign in and use “Resend verification email” to try again.');
        setPassword('');
        setConfirmPassword('');
      } else if (mode === 'signin') {
        await loginWithEmailAndPassword(email, password);
        authFlow.current = 'signin';
      } else {
        await requestPasswordReset(email);
        setMessage('If a password account matches that email, a reset link has been sent. Check your inbox and spam folder.');
      }
    } catch (submitError) {
      setError(friendlyAuthError(submitError));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    setBusy(true);
    setError('');
    try {
      await resendEmailVerification();
      setMessage('A fresh verification link has been sent.');
    } catch {
      setError('We could not send a verification link. Sign in again and retry.');
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0E131F]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">JENECONK · KoboLedger</p><h2 id="auth-title" className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close sign-in" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5"/></button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {mode !== 'reset' && <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            <button type="button" onClick={() => changeMode('signin')} className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'signin' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign in</button>
            <button type="button" onClick={() => changeMode('signup')} className={`min-h-11 rounded-lg text-sm font-bold ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Create account</button>
          </div>}

          {mode !== 'reset' && <button type="button" onClick={async () => { authFlow.current = 'signin'; setBusy(true); setError(''); try { await onGoogleSignIn(); } finally { setBusy(false); } }} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 font-bold text-base text-blue-600">G</span>Continue with Google
          </button>}

          {mode !== 'reset' && <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10"/>or use email<span className="h-px flex-1 bg-slate-200 dark:bg-white/10"/></div>}

          <form onSubmit={submit} className="space-y-3.5">
            {mode === 'signup' && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Name shown in your household" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>}
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Email address<div className="relative mt-1.5"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-base text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/></div></label>
            {mode !== 'reset' && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password<div className="relative mt-1.5"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-12 text-base text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/><button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></label>}
            {mode === 'signup' && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>}

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
            {authError && mode === 'signin' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{authError}</p>}
            {message && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>{message}</p>}
            {message && mode === 'signup' && firebaseUser && !firebaseUser.emailVerified && <button type="button" disabled={busy} onClick={resendVerification} className="min-h-10 w-full rounded-xl border border-emerald-200 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/10">Resend verification email</button>}

            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Please wait…' : submitLabel}</button>
          </form>

          {mode === 'signin' && <button type="button" onClick={() => changeMode('reset')} className="min-h-10 w-full text-center text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Forgot your password?</button>}
          {mode === 'reset' && <button type="button" onClick={() => changeMode('signin')} className="min-h-10 w-full text-center text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Back to sign in</button>}
          <p className="text-center text-xs leading-relaxed text-slate-500">Your finance records are private unless you choose to share them with your household.</p>
        </div>
      </section>
    </div>
  );
};
