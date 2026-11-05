import React from 'react';
import { useFinance, SEED_USERS } from '../context/FinanceContext';
import {
  X,
  User,
  ShieldCheck,
  Building,
  Home,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Lock,
  Layers,
  Shield,
} from 'lucide-react';
import { UserProfile } from '../types/finance';

export const UserProfileModal: React.FC = () => {
  const {
    isUserProfileModalOpen,
    closeUserProfileModal,
    selectedUserProfile,
    currentUser,
    switchUser,
    firebaseUser,
  } = useFinance();

  if (!isUserProfileModalOpen) return null;

  const profile: UserProfile = selectedUserProfile || currentUser;
  const details = profile.details;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            WORKSPACE OWNER
          </span>
        );
      case 'member':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <User className="w-3.5 h-3.5 text-blue-500" />
            HOUSEHOLD MEMBER & ASSOCIATE
          </span>
        );
      case 'auditor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
            INDEPENDENT STATUTORY AUDITOR
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'from-amber-500 to-amber-700';
      case 'member':
        return 'from-blue-500 to-blue-700';
      case 'auditor':
        return 'from-purple-600 to-indigo-800';
      default:
        return 'from-slate-600 to-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E131F] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_bf2c43a3.png"
              alt="JENECONK Integrated Global Solutions"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400/40"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                User Profile & Role Matrix
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  RBAC V2
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personal finance workspace · Role-Based Access
              </p>
            </div>
          </div>
          <button
            onClick={closeUserProfileModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Identity Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getRoleColor(
                    profile.role
                  )} text-white flex items-center justify-center font-extrabold text-lg shadow-md ring-2 ring-white dark:ring-slate-800`}
                >
                  {profile.avatar_initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile.name}
                    </h2>
                    {getRoleBadge(profile.role)}
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {details?.designation || 'System User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {details?.department} · {details?.affiliation}
                  </p>
                </div>
              </div>

              {profile.id === currentUser.id && (
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  Active User
                </span>
              )}
            </div>

            {/* Contact details */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-mono">{details?.email || profile.email || 'N/A'}</span>
              </div>
              {details?.phoneNumber && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{details.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Simulated role switching is available only in the unauthenticated demo. */}
          {!firebaseUser && <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Switch Role Perspective (Live Data Isolation Test)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to simulate role view</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SEED_USERS.map((u) => {
                const isActive = u.id === currentUser.id;
                const isViewing = u.id === profile.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                        : isViewing
                        ? 'border-slate-400 bg-white dark:bg-white/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{u.name.split(' ')[0]}</span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10">
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {u.details?.designation}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>}

          {/* Workspace & Scope Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-2">
                {details?.workspaceType === 'company' ? (
                  <Building className="w-4 h-4 text-purple-500" />
                ) : (
                  <Home className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Workspace Scope
                </span>
                <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 uppercase">
                  {details?.workspaceType || 'household'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {details?.workspaceName || 'Okafor Family Office & Treasury'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {details?.scopeDescription}
              </p>
            </div>

            {/* Permitted Accounts / Data Nodes */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Permitted Account Nodes
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {details?.assignedAccounts.map((accName, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{accName}</span>
                  </div>
                ))}
                {profile.role === 'member' && (
                  <div className="flex items-center gap-2 text-xs text-rose-500 dark:text-rose-400 pt-1 border-t border-slate-200 dark:border-white/10">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Piggyvest Vault & Owner Debts are strictly restricted</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Granular RBAC Permissions Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              Granular Role Authorization Matrix (Firestore Rules Aligned)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canPostTransactions
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Create Ledger Transactions</span>
                {details?.permissions.canPostTransactions ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canReverseTransactions
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Issue Transaction Reversals</span>
                {details?.permissions.canReverseTransactions ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canManageAccounts
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Manage & Link Bank Accounts</span>
                {details?.permissions.canManageAccounts ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canViewPrivateRecords
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Access Private Vaults & Debts</span>
                {details?.permissions.canViewPrivateRecords ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canManageBudgets
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Configure Master Budgets</span>
                {details?.permissions.canManageBudgets ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canManageSavings
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Manage Savings Vaults & Locks</span>
                {details?.permissions.canManageSavings ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canManageDebts
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Debt Amortization & Payoff Rules</span>
                {details?.permissions.canManageDebts ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canManageSubscriptions
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Commercial Tier & Paystack Billing</span>
                {details?.permissions.canManageSubscriptions ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.canExportAuditStatements
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-400'
                }`}
              >
                <span>Export Financial Summaries</span>
                {details?.permissions.canExportAuditStatements ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  details?.permissions.isReadOnly
                    ? 'border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-300'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>Statutory Read-Only Enforcement</span>
                {details?.permissions.isReadOnly ? (
                  <span className="font-bold text-[10px] text-purple-600 dark:text-purple-400">
                    ENFORCED
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">N/A</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-end">
          <button
            onClick={closeUserProfileModal}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
