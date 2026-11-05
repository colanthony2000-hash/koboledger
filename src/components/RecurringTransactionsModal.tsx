import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { RecurrenceInterval, RecurringTransaction, TransactionType } from '../types/finance';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  X,
  CreditCard,
  Tag,
} from 'lucide-react';

interface RecurringTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecurringTransactionsModal: React.FC<RecurringTransactionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    recurringTransactions,
    accounts,
    categories,
    currentUser,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    executeRecurringTransaction,
  } = useFinance();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [desc, setDesc] = useState('');
  const [amountNaira, setAmountNaira] = useState<number>(10000);
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [interval, setInterval] = useState<RecurrenceInterval>('monthly');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id || '');
  const [nextDueDate, setNextDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    addRecurringTransaction({
      description: desc.trim(),
      amount_minor: Math.round(amountNaira * 100),
      currency: 'NGN',
      type,
      interval,
      account_id: accountId,
      category_id: type === 'transfer' ? undefined : categoryId,
      destination_account_id: type === 'transfer' ? destinationAccountId : undefined,
      next_due_date: nextDueDate,
      owner_user_id: currentUser.id,
      visibility: 'shared',
    });

    setToastMessage(`Scheduled "${desc}" to repeat ${interval}!`);
    setTimeout(() => setToastMessage(null), 2500);

    // Reset Form
    setDesc('');
    setAmountNaira(10000);
    setIsCreatingNew(false);
  };

  const handleRunNow = (rec: RecurringTransaction) => {
    executeRecurringTransaction(rec.id);
    setToastMessage(`Executed & posted "${rec.description}" to ledger! Next due date updated.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleStatus = (rec: RecurringTransaction) => {
    const nextStatus = rec.status === 'active' ? 'paused' : 'active';
    updateRecurringTransaction(rec.id, { status: nextStatus });
  };

  const getIntervalBadge = (int: RecurrenceInterval) => {
    switch (int) {
      case 'daily':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
      case 'weekly':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200';
      case 'monthly':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0D111C] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recurring Transactions Manager</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {recurringTransactions.length} Schedules
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Automate repeating salaries, bill payments & allowances on daily, weekly or monthly cycles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Repeating Schedules
            </span>
            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingNew ? 'Cancel' : 'New Schedule'}</span>
            </button>
          </div>

          {/* New Schedule Form */}
          {isCreatingNew && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-4 animate-in slide-in-from-top-2"
            >
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Create New Repeating Movement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Schedule Description
                  </label>
                  <input
                    type="text"
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="e.g. Netflix Subscription, Cleaning Fee..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Amount (NGN)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={amountNaira}
                    onChange={(e) => setAmountNaira(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Movement Type
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                    <option value="transfer">Internal Transfer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Interval Frequency
                  </label>
                  <select
                    value={interval}
                    onChange={(e: any) => setInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {type === 'transfer' ? 'Source Account' : 'Account Node'}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {type === 'transfer' ? (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Destination Account
                    </label>
                    <select
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Category Node
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      {categories
                        .filter((c) => (type === 'income' ? c.type === 'income' : c.type !== 'income'))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl cursor-pointer"
                >
                  Schedule Recurrence
                </button>
              </div>
            </form>
          )}

          {/* List of Schedules */}
          <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#0E131F]">
            {recurringTransactions.map((rec) => {
              const acc = accounts.find((a) => a.id === rec.account_id);
              const cat = categories.find((c) => c.id === rec.category_id);
              const isPaused = rec.status === 'paused';
              const isIncome = rec.type === 'income';

              return (
                <div
                  key={rec.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isPaused ? 'opacity-60 bg-slate-50/50 dark:bg-white/[0.01]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {rec.description}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getIntervalBadge(
                          rec.interval
                        )}`}
                      >
                        {rec.interval}
                      </span>
                      {isPaused && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-white/10">
                          Paused
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{acc?.name || 'Main Ledger'}</span>
                      {cat && (
                        <>
                          <span>·</span>
                          <span>{cat.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Next: {rec.next_due_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-mono font-extrabold text-sm tabular-nums ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatMinor(rec.amount_minor, rec.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400 block capitalize">
                        {rec.interval} schedule
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-white/10 pl-3">
                      <button
                        onClick={() => handleRunNow(rec)}
                        title="Execute & post to ledger right now"
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-600" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(rec)}
                        title={isPaused ? 'Resume schedule' : 'Pause schedule'}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => deleteRecurringTransaction(rec.id)}
                        title="Delete schedule"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] text-xs text-slate-500">
          <span>Executed schedules post exact double-entry balancing lines to your ledger.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
