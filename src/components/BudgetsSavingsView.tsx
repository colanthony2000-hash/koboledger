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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Budgets & Virtual Savings Earmarks
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Sections 2 & 6</span>
            <span aria-hidden="true">·</span>
            <span>Threshold Deduplication (T-04)</span>
            <span aria-hidden="true">·</span>
            <span>Virtual Earmarks (T-08)</span>
          </div>
        </div>

        {activeTab === 'budgets' ? (
          <button
            onClick={() => setIsAddBudgetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Budget</span>
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'budgets'
              ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Budgets & Alerts ({budgets.length})
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'savings'
              ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Savings Goals & Earmarks ({savingsGoals.length})
        </button>
      </div>

      {/* TAB 1: BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Deduplicated Alerts Log (T-04) */}
          {budgetAlerts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Deduplicated Budget Alerts Register (T-04)</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Key: budgetId + period + threshold + limitVersion
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {budgetAlerts.map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>{a.message}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-4">
                      {a.timestamp.slice(11, 19)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetSpendMap.map(({ budget, spendMinor, usagePct, isOverspent }) => {
              const cat = categories.find((c) => c.id === budget.category_id);
              const remainingMinor = budget.limit_minor - spendMinor;

              return (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {budget.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>Category: {cat?.name}</span>
                        {cat?.is_essential && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 font-medium">Essential Living</span>
                          </>
                        )}
                        {budget.exclude_project_spending && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-purple-600 font-medium">Excludes Project Tags</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isOverspent && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300">
                        Overspent (T-06)
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Spent: <strong>{formatMinor(spendMinor)}</strong></span>
                      <span>Limit: <strong>{formatMinor(budget.limit_minor)}</strong></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverspent
                            ? 'bg-rose-500'
                            : usagePct >= 90
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{Math.round(usagePct)}% utilized</span>
                      <span>
                        {remainingMinor >= 0
                          ? `${formatMinor(remainingMinor)} remaining`
                          : `Overspent by ${formatMinor(Math.abs(remainingMinor))}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 text-[11px]">
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
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Adjust Limit (v{budget.limit_version})
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
        <div className="space-y-5">
          {/* Section 2 Architectural Note */}
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-200">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Section 2 Invariant: Savings Goals are NOT Posting Lines (INV-03, T-08)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Goal balances are held as <strong>virtual earmarks</strong> inside your real accounts. Earmarking funds moves zero cash and touches no posting lines. It increases Reserved balance and decreases Spendable balance without counting as an expense.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savingsGoals.map((goal) => {
              const alloc = goalAllocations.find((a) => a.goal_id === goal.id);
              const currentBalanceMinor = alloc?.allocated_minor || 0;
              const progressPct = Math.min(100, Math.round((currentBalanceMinor / goal.target_amount_minor) * 100));
              const linkedAcc = accounts.find((a) => a.id === goal.linked_account_id);

              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {goal.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Target Date: {goal.target_date}
                      </div>
                    </div>

                    {/* Access Mode Badge (Section 2, T-10) */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {goal.access_mode === 'locked' ? (
                        <button
                          onClick={() => toggleGoalLock(goal.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                            goal.is_locked
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                          title="Click to deliberately lock/unlock (T-10)"
                        >
                          {goal.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{goal.is_locked ? 'Locked' : 'Unlocked'}</span>
                        </button>
                      ) : goal.access_mode === 'protected' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                          <Shield className="w-3 h-3" />
                          <span>Protected</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Flexible
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span>Virtual Earmark inside: <strong>{linkedAcc?.name || 'Account'}</strong></span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Saved: <strong className="text-emerald-600 dark:text-emerald-400">{formatMinor(currentBalanceMinor)}</strong></span>
                      <span>Target: <strong>{formatMinor(goal.target_amount_minor)}</strong></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-right">
                      {progressPct}% completed
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      onClick={() => handleOpenGoalModal(goal, 'contribute')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold cursor-pointer transition-colors text-center"
                    >
                      + Earmark Funds
                    </button>
                    <button
                      onClick={() => handleOpenGoalModal(goal, 'withdraw')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 rounded-md font-semibold cursor-pointer transition-colors text-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {modalMode === 'contribute' ? 'Earmark Savings Funds' : 'Withdraw From Savings Earmark'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Goal: {selectedGoal.name} ({selectedGoal.access_mode} access mode)
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleExecuteGoalAction} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={actionAmountNaira || ''}
                  onChange={(e) => setActionAmountNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Mandatory Reason for Protected Goals (T-10) */}
              {modalMode === 'withdraw' && selectedGoal.access_mode === 'protected' && (
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Mandatory Stated Reason (Protected Goal Rule T-10)
                  </label>
                  <input
                    type="text"
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    placeholder="e.g. Urgent car brake repair, hospital bill"
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Reason is recorded in the immutable audit log and updates target forecast.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Create Category Budget
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure monthly limits with automatic threshold alerts.
              </p>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Budget Label (Optional)
                </label>
                <input
                  type="text"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  placeholder="e.g. Fuel & Commute Monthly Cap"
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_essential ? '(Essential)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Limit (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newBudgetLimitNaira || ''}
                  onChange={(e) => setNewBudgetLimitNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBudgetOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
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
