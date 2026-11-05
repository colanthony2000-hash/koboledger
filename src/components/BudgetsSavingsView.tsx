import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { Budget, SavingsGoal } from '../types/finance';
import {
  PieChart,
  PiggyBank,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Sparkles,
  X,
  Sliders,
  Wallet,
  Crown,
} from 'lucide-react';

export const BudgetsSavingsView: React.FC = () => {
  const {
    budgets,
    budgetAlerts,
    categories,
    transactions,
    savingsGoals,
    goalAllocations,
    accounts,
    currentUser,
    addBudget,
    updateBudgetLimit,
    postGoalContribution,
    withdrawGoalFunds,
    toggleGoalLock,
    subscription,
    openSubscriptionModal,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'budgets' | 'savings'>('budgets');

  // Budget Modal State
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimitNaira, setNewBudgetLimitNaira] = useState<number>(50000);
  const [excludeProjectSpending, setExcludeProjectSpending] = useState(false);

  // Goal Contribution / Withdrawal Modal
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [modalMode, setModalMode] = useState<'contribute' | 'withdraw'>('contribute');
  const [actionAmountNaira, setActionAmountNaira] = useState<number>(10000);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const currentPeriod = new Date().toISOString().slice(0, 7); // '2026-11'

  // Calculate actual spend per budget
  const budgetSpendMap = budgets.map((b) => {
    let spendMinor = 0;
    for (const tx of transactions) {
      if (tx.status !== 'posted') continue;
      if (!tx.effective_date.startsWith(currentPeriod)) continue;
      if (b.exclude_project_spending && tx.project_id) continue;
      for (const line of tx.posting_lines) {
        if (line.ledger_node_id === b.category_id && line.direction === 'debit') {
          spendMinor += line.amount_minor;
        } else if (line.ledger_node_id === b.category_id && line.direction === 'credit') {
          // Refunds reduce spend
          spendMinor -= line.amount_minor;
        }
      }
    }
    const usagePct = (spendMinor / b.limit_minor) * 100;
    const isOverspent = spendMinor > b.limit_minor;
    return {
      budget: b,
      spendMinor: Math.max(0, spendMinor),
      usagePct,
      isOverspent,
    };
  });

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetCategory) return;
    const cat = categories.find((c) => c.id === newBudgetCategory);
    addBudget({
      name: newBudgetName || `${cat?.name} Budget`,
      period: 'monthly',
      category_id: newBudgetCategory,
      limit_minor: Math.round(newBudgetLimitNaira * 100),
      exclude_project_spending: excludeProjectSpending,
    });
    setIsAddBudgetOpen(false);
  };

  const handleOpenGoalModal = (goal: SavingsGoal, mode: 'contribute' | 'withdraw') => {
    setSelectedGoal(goal);
    setModalMode(mode);
    setActionAmountNaira(10000);
    setWithdrawalReason('');
    setActionError(null);
  };

  const handleExecuteGoalAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountMinor = Math.round(actionAmountNaira * 100);

    if (modalMode === 'contribute') {
      postGoalContribution(selectedGoal.id, selectedGoal.linked_account_id, amountMinor);
      setSelectedGoal(null);
    } else {
      const res = withdrawGoalFunds(selectedGoal.id, selectedGoal.linked_account_id, amountMinor, withdrawalReason);
      if (!res.success) {
        setActionError(res.error || 'Failed to process withdrawal.');
      } else {
        setSelectedGoal(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Budgets & Virtual Earmarks</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {activeTab === 'budgets' ? `${budgets.length} Active Budgets` : `${savingsGoals.length} Savings Vaults`}
            </span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Sections 2 & 6</span>
            <span aria-hidden="true">·</span>
            <span>Deduplicated 4-Threshold Alerts (T-04)</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Movement Earmarks (INV-03, T-08)</span>
          </div>
        </div>

        {activeTab === 'budgets' ? (
          <button
            onClick={() => setIsAddBudgetOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category Budget</span>
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-3 px-4 transition-all cursor-pointer relative ${
            activeTab === 'budgets'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Category Budgets & Alerts ({budgets.length})</span>
          {activeTab === 'budgets' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={`pb-3 px-4 transition-all cursor-pointer relative ${
            activeTab === 'savings'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Savings Goals & Vault Earmarks ({savingsGoals.length})</span>
          {activeTab === 'savings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Deduplicated Alerts Log (T-04) */}
          {budgetAlerts.length > 0 && (
            <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-amber-500/30 p-5 space-y-3 shadow-sm bg-gradient-to-r from-amber-500/[0.03] to-transparent">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Deduplicated Budget Warning Stream (T-04 Verified)</span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">
                  ID: budgetId + period + threshold + limitVersion
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {budgetAlerts.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{a.message}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-4">
                      {a.timestamp.slice(11, 19)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {budgetSpendMap.map(({ budget, spendMinor, usagePct, isOverspent }) => {
              const cat = categories.find((c) => c.id === budget.category_id);
              const remainingMinor = budget.limit_minor - spendMinor;

              return (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5.5 shadow-sm space-y-4 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {budget.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Category: <strong className="text-slate-700 dark:text-slate-200">{cat?.name}</strong></span>
                        {cat?.is_essential && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Essential</span>
                          </>
                        )}
                        {budget.exclude_project_spending && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">Excludes Projects</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isOverspent && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Overspent (T-06)
                      </span>
                    )}
                  </div>

                  {/* Progress Bar with 50/75/90/100 markers */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500">Spent: <strong className="text-slate-900 dark:text-white">{formatMinor(spendMinor)}</strong></span>
                      <span className="text-slate-500">Limit: <strong className="text-slate-900 dark:text-white">{formatMinor(budget.limit_minor)}</strong></span>
                    </div>
                    
                    <div className="relative w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverspent
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : usagePct >= 90
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                      <span>{Math.round(usagePct)}% utilized</span>
                      <span>
                        {remainingMinor >= 0
                          ? `${formatMinor(remainingMinor)} left`
                          : `Overspent by ${formatMinor(Math.abs(remainingMinor))}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Thresholds: 50% · 75% · 90% · 100%
                    </span>
                    <button
                      onClick={() => {
                        const newLimit = prompt(
                          `Update monthly limit for ${budget.name} (current: ₦${budget.limit_minor / 100}):`,
                          (budget.limit_minor / 100).toString()
                        );
                        if (newLimit && !isNaN(parseFloat(newLimit))) {
                          updateBudgetLimit(budget.id, Math.round(parseFloat(newLimit) * 100));
                        }
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Adjust Limit (v{budget.limit_version})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SAVINGS GOALS & ACCESS MODES */}
      {activeTab === 'savings' && (
        <div className="space-y-6">
          {/* Section 2 Architectural Note */}
          <div className="p-4.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Section 2 Invariant: Savings Goals are NOT Separate Bank Accounts (INV-03, T-08)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Goal balances are held as <strong>virtual earmarks</strong> inside your real bank and cash accounts. Earmarking funds moves zero cash and creates no posting lines. It increases Reserved balance and decreases Spendable balance without counting as an expense.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {savingsGoals.map((goal) => {
              const alloc = goalAllocations.find((a) => a.goal_id === goal.id);
              const currentBalanceMinor = alloc?.allocated_minor || 0;
              const progressPct = Math.min(100, Math.round((currentBalanceMinor / goal.target_amount_minor) * 100));
              const linkedAcc = accounts.find((a) => a.id === goal.linked_account_id);

              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5.5 shadow-sm space-y-4 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {goal.name}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">
                        Target Date: {goal.target_date}
                      </div>
                    </div>

                    {/* Access Mode Badge (Section 2, T-10) */}
                    <div>
                      {goal.access_mode === 'locked' ? (
                        <button
                          onClick={() => toggleGoalLock(goal.id)}
                          className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                            goal.is_locked
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                          title="Click to deliberately toggle lock (T-10)"
                        >
                          {goal.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{goal.is_locked ? 'Locked' : 'Unlocked'}</span>
                        </button>
                      ) : goal.access_mode === 'protected' ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Shield className="w-3 h-3" />
                          <span>Protected</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          Flexible
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <span>Virtual Earmark inside: <strong className="text-slate-900 dark:text-white">{linkedAcc?.name || 'Account'}</strong></span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500">Saved: <strong className="text-emerald-600 dark:text-emerald-400">{formatMinor(currentBalanceMinor)}</strong></span>
                      <span className="text-slate-500">Target: <strong className="text-slate-900 dark:text-white">{formatMinor(goal.target_amount_minor)}</strong></span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 text-right">
                      {progressPct}% completed
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                    <button
                      onClick={() => handleOpenGoalModal(goal, 'contribute')}
                      className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold cursor-pointer transition-all text-center shadow-xs"
                    >
                      + Earmark Funds
                    </button>
                    <button
                      onClick={() => handleOpenGoalModal(goal, 'withdraw')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-200 rounded-xl font-semibold cursor-pointer transition-all text-center"
                    >
                      Withdraw (T-10)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTRIBUTE / WITHDRAW MODAL (T-08, T-09, T-10) */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {modalMode === 'contribute' ? 'Earmark Savings Funds' : 'Withdraw From Savings Earmark'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Goal: {selectedGoal.name} ({selectedGoal.access_mode} mode)
                </p>
              </div>
              <button
                onClick={() => setSelectedGoal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleExecuteGoalAction} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={actionAmountNaira || ''}
                  onChange={(e) => setActionAmountNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 font-mono font-bold tabular-nums rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Mandatory Reason for Protected Goals (T-10) */}
              {modalMode === 'withdraw' && selectedGoal.access_mode === 'protected' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mandatory Stated Reason (Protected Goal Rule T-10)
                  </label>
                  <input
                    type="text"
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    placeholder="e.g. Urgent car brake repair, emergency hospital bill"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Reason is recorded in the immutable audit log and adjusts forecast.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {modalMode === 'contribute' ? 'Confirm Earmark (T-08)' : 'Confirm Withdrawal (T-10)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BUDGET MODAL */}
      {isAddBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Category Budget
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure monthly spending limit with 4-tier threshold alerts.
                </p>
              </div>
              <button
                onClick={() => setIsAddBudgetOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Budget Label (Optional)
                </label>
                <input
                  type="text"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  placeholder="e.g. Fuel & Commute Monthly Cap"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Expense Category
                </label>
                <select
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-medium"
                  required
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_essential ? '(Essential Living)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Limit (₦ NGN)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newBudgetLimitNaira || ''}
                  onChange={(e) => setNewBudgetLimitNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 font-mono font-bold tabular-nums rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="excludeProj"
                  checked={excludeProjectSpending}
                  onChange={(e) => setExcludeProjectSpending(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="excludeProj" className="text-slate-700 dark:text-slate-300">
                  Exclude project-tagged spending (Section 4)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddBudgetOpen(false)}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
