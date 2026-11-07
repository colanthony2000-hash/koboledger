import React, { useEffect, useState } from 'react';
import { useFinance, SEED_USERS } from '../context/FinanceContext';
import { AuthModal } from './AuthModal';
import {
  Plus,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  LogIn,
  LogOut,
  Crown,
  Lock,
  Home,
  Download,
  Settings,
} from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  onOpenTests: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAdd,
  onOpenTests,
  darkMode,
  setDarkMode,
}) => {
  const {
    currentUser,
    switchUser,
    firebaseUser,
    isFirebaseConnected,
    isSyncing,
    authError,
    workspaceSetupError,
    signInGoogle,
    signOutGoogle,
    subscription,
    openSubscriptionModal,
    openUserProfileModal,
    openHouseholdModal,
    platformSettings,
    isPlatformAdmin,
  } = useFinance();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    return () => window.removeEventListener('beforeinstallprompt', onInstallAvailable);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const navLinks = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'budgets', label: 'Budgets & Vaults' },
    { id: 'debts', label: 'Debt Payoff' },
    { id: 'projects', label: 'Christmas Plan' },
    { id: 'commitments', label: 'Commitments' },
    { id: 'todos', label: 'To‑Do' },
    ...(isPlatformAdmin ? [{ id: 'owner-settings', label: 'Owner Settings' }] : []),
  ];

  const isPro = subscription.tier === 'pro' && subscription.status === 'active';

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-[#080B11]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        {/* Zone 1: Brandmark with Company Logo & Status */}
        <div className="min-w-0 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentTab('dashboard');
            }}
            className="flex items-center gap-2.5 group cursor-pointer sm:gap-3"
          >
            <div className="relative">
              <img
                src="/assets/aistudio/logo_bf2c43a3.png"
                alt="JENECONK Integrated Global Solutions Logo"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-400/30 transition-transform shadow-[0_2px_12px_rgba(10,37,64,0.25)] group-hover:scale-105 sm:h-9 sm:w-9"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#080B11] ${
                  isSyncing
                    ? 'bg-amber-400 animate-spin'
                    : isFirebaseConnected
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
                title={
                  isSyncing
                    ? 'Syncing with Firestore...'
                    : isFirebaseConnected
                    ? 'Firestore Connected'
                    : 'Local Offline Mode'
                }
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white uppercase sm:text-sm">
                  JENECONK
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 font-mono">
                  Ledger
                </span>
              </div>
              <span className="hidden text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 font-medium sm:block">
                Integrated Global Solutions
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation Links (Clean, Uncluttered, Calm) */}
        <nav className="hidden 2xl:flex items-center gap-1 text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                {link.id === 'owner-settings' && <Settings className="mr-1.5 inline h-3.5 w-3.5" />}
                {link.label}
              </button>
            );
          })}
          <button
            onClick={onOpenTests}
            className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'tests'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
            title="Inspect 13 Accounting Invariants and 23 Acceptance Tests"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audit</span>
          </button>
        </nav>

        {/* Zone 3: Subscription Status, User Perspective & Primary CTA */}
        <div className="hidden 2xl:flex items-center gap-2 sm:gap-3 shrink-0">
          {installPrompt && <button onClick={installApp} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" title="Install KoboLedger on this device"><Download className="h-3.5 w-3.5"/><span className="hidden sm:inline">Install app</span></button>}
          {/* Subscription Upgrade / Status Trigger */}
          {isPro ? (
            <button
              onClick={() => openSubscriptionModal()}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-emerald-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:scale-[1.02] transition-transform cursor-pointer shadow-xs"
              title="You are on the Pro Tier. Click to view subscription details."
            >
              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>PRO ACTIVE</span>
            </button>
          ) : (
            <button
              onClick={() => openSubscriptionModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-xs font-bold shadow-[0_2px_10px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Upgrade to Pro</span>
            </button>
          )}

          {/* Real Firebase Google Sign-In */}
          {firebaseUser ? (
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1 bg-white/70 dark:bg-white/5 text-xs">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {firebaseUser.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="hidden md:block max-w-32 truncate text-[10px] text-slate-600 dark:text-slate-300" title={firebaseUser.email || undefined}>
                {firebaseUser.email || 'Signed-in account'}
              </div>
              <button
                onClick={() => signOutGoogle()}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign in or create an account"
            >
              <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Sign in</span>
            </button>
          )}

          {firebaseUser && <button onClick={openHouseholdModal} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"><Home className="h-3.5 w-3.5"/>Household</button>}

          {/* Household Role Switcher & Profile Matrix Trigger */}
          {!firebaseUser && <div className="flex items-center gap-1.5 border border-slate-200 dark:border-white/10 rounded-xl p-1 bg-white/70 dark:bg-white/5 text-xs">
            <span className="px-1 text-[9px] font-extrabold tracking-wide text-amber-700 dark:text-amber-300">DEMO</span>
            <button
              onClick={() => openUserProfileModal(currentUser)}
              className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group"
              title="Click to view full Role Details, Permissions Matrix & Scope"
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-xs ${
                  currentUser.role === 'owner'
                    ? 'bg-amber-600'
                    : currentUser.role === 'auditor'
                    ? 'bg-purple-600'
                    : 'bg-blue-600'
                }`}
              >
                {currentUser.avatar_initials}
              </div>
            </button>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs pr-1"
              title="Demo profiles only; this does not sign you in or create an account"
            >
              {SEED_USERS.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-[#0E131F]">
                  {u.name.split(' ')[0]} (DEMO {u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>}

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary Action Button (Read-Only Guard for Auditor) */}
          {currentUser.role === 'auditor' ? (
            <button
              onClick={() => openUserProfileModal(currentUser)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600/15 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
              title="Auditor Perspective: Read-Only Access. Ledger entries cannot be created."
            >
              <Lock className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden sm:inline">Audit View (Read-Only)</span>
            </button>
          ) : (
            <button
              onClick={onOpenQuickAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Add</span>
            </button>
          )}
        </div>

        {/* Compact navigation keeps the phone header within the screen width. */}
        <div className="flex shrink-0 items-center gap-2 2xl:hidden">
          {currentUser.role === 'auditor' ? (
            <button onClick={() => openUserProfileModal(currentUser)} aria-label="Open read-only audit profile" className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"><Lock className="h-4 w-4"/></button>
          ) : (
            <button onClick={onOpenQuickAdd} aria-label="Quick add transaction" title="Quick add transaction" className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"><Plus className="h-5 w-5"/></button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
          </button>
        </div>
      </div>

      {platformSettings.announcement && <div role="status" className="border-t border-amber-300/40 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-300/10 dark:bg-amber-500/10 dark:text-amber-100">{platformSettings.announcement}</div>}

      {(authError || workspaceSetupError) && <div role="alert" className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{authError || workspaceSetupError}</p>
      </div>}

      {isMobileMenuOpen && <div className="border-t border-slate-200/80 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#0B101B] sm:px-6 2xl:hidden">
        <nav aria-label="Main navigation" className="grid grid-cols-2 gap-2">
          {navLinks.map((link) => <button key={link.id} onClick={() => { setCurrentTab(link.id); setIsMobileMenuOpen(false); }} className={`flex min-h-11 min-w-0 items-center rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${link.id === 'owner-settings' ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200' : currentTab === link.id ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'}`}>{link.id === 'owner-settings' && <Settings className="mr-2 h-4 w-4 shrink-0"/>}{link.label}</button>)}
          <button onClick={() => { onOpenTests(); setIsMobileMenuOpen(false); }} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${currentTab === 'tests' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-700 dark:border-white/10 dark:text-slate-200'}`}><ShieldCheck className="h-4 w-4 shrink-0"/>Audit</button>
        </nav>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
          {installPrompt && <button onClick={() => { installApp(); setIsMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 px-3 py-2 text-left text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200"><Download className="h-4 w-4 shrink-0"/>Install app</button>}
          <button onClick={() => { openSubscriptionModal(); setIsMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-left text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:text-amber-200"><Crown className="h-4 w-4 shrink-0"/>Upgrade to Pro</button>
          {firebaseUser ? <>
            <button onClick={() => { openHouseholdModal(); setIsMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200"><Home className="h-4 w-4 shrink-0"/>Household</button>
            <button onClick={() => { setIsMobileMenuOpen(false); void signOutGoogle(); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200"><LogOut className="h-4 w-4 shrink-0"/>Sign out</button>
          </> : <>
            <button onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200"><LogIn className="h-4 w-4 shrink-0"/>Sign in / create account</button>
            <label className="flex min-w-0 flex-col justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">Demo profile<select value={currentUser.id} onChange={(event) => switchUser(event.target.value)} className="min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none dark:text-slate-100">{SEED_USERS.map((user) => <option key={user.id} value={user.id} className="dark:bg-[#0E131F]">{user.name.split(' ')[0]} · {user.role}</option>)}</select></label>
          </>}
          <button onClick={() => { setDarkMode(!darkMode); setIsMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">{darkMode ? <Sun className="h-4 w-4 shrink-0"/> : <Moon className="h-4 w-4 shrink-0"/>}Switch to {darkMode ? 'light' : 'dark'} mode</button>
        </div>
      </div>}
    </header>
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      onGoogleSignIn={signInGoogle}
      authError={authError}
      firebaseUser={firebaseUser}
    />
    </>
  );
};
