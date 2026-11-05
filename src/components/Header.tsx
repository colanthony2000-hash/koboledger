import React, { useState } from 'react';
import { useFinance, SEED_USERS } from '../context/FinanceContext';
import {
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  LogIn,
  LogOut,
  RefreshCw,
  Crown,
  CheckCircle2,
  Lock,
} from 'lucide-react';

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
    signInGoogle,
    signOutGoogle,
    subscription,
    openSubscriptionModal,
    openUserProfileModal,
  } = useFinance();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'budgets', label: 'Budgets & Vaults' },
    { id: 'debts', label: 'Debt Payoff' },
    { id: 'projects', label: 'Christmas Plan' },
    { id: 'commitments', label: 'Commitments' },
  ];

  const isPro = subscription.tier === 'pro' && subscription.status === 'active';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-[#080B11]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
        {/* Zone 1: Brandmark with Company Logo & Status */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentTab('dashboard');
            }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="relative">
              <img
                src="/assets/aistudio/logo_bf2c43a3.png"
                alt="JENECONK Integrated Global Solutions Logo"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform shadow-[0_2px_12px_rgba(10,37,64,0.25)]"
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
                <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  JENECONK
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 font-mono">
                  Ledger
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 font-medium">
                Integrated Global Solutions
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation Links (Clean, Uncluttered, Calm) */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            <div className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1 bg-white/70 dark:bg-white/5 text-xs">
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
              onClick={() => signInGoogle()}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign in with Google"
            >
              <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Household Role Switcher & Profile Matrix Trigger */}
          {!firebaseUser && <div className="flex items-center gap-1.5 border border-slate-200 dark:border-white/10 rounded-xl p-1 bg-white/70 dark:bg-white/5 text-xs">
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
              title="Switch user perspective"
            >
              {SEED_USERS.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-[#0E131F]">
                  {u.name.split(' ')[0]} ({u.role.toUpperCase()})
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
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-200/80 dark:border-white/10 px-4 py-2 gap-1.5 text-xs font-medium no-scrollbar bg-slate-50/50 dark:bg-white/[0.02]">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => setCurrentTab(link.id)}
            className={`whitespace-nowrap px-3 py-1 rounded-lg cursor-pointer transition-colors ${
              currentTab === link.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {link.label}
          </button>
        ))}
        <button
          onClick={onOpenTests}
          className={`whitespace-nowrap px-3 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
            currentTab === 'tests'
              ? 'bg-emerald-600 text-white font-bold'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Audit</span>
        </button>
      </div>
    </header>
  );
};
