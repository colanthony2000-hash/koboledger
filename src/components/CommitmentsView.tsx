import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { Commitment } from '../types/finance';
import {
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Building,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const CommitmentsView: React.FC = () => {
  const {
    commitments,
    accounts,
    categories,
    markCommitmentPaid,
    currentUser,
  } = useFinance();

  const [payingCommitment, setPayingCommitment] = useState<Commitment | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const approvedCommitments = commitments.filter((c) => c.status === 'approved');
  const paidCommitments = commitments.filter((c) => c.status === 'paid');

  const totalApprovedReservedMinor = approvedCommitments.reduce(
    (sum, c) => sum + c.amount_minor,
    0
  );

  const handleOpenPay = (com: Commitment) => {
    setPayingCommitment(com);
    setSelectedAccountId(com.account_id || accounts[0]?.id || '');
    setSelectedCategoryId(com.category_id || categories[0]?.id || '');
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCommitment || !selectedAccountId || !selectedCategoryId) return;

    markCommitmentPaid(payingCommitment.id, selectedCategoryId, selectedAccountId);
    setPayingCommitment(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Unified Commitments Register
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 4</span>
            <span aria-hidden="true">·</span>
            <span>Single Source of Unpaid Obligations</span>
            <span aria-hidden="true">·</span>
            <span>Spendable Balance Deduction (T-05)</span>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-500 block">Total Active Approved Reservations:</span>
          <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatMinor(totalApprovedReservedMinor)}
          </span>
        </div>
      </div>

      {/* Blueprint Architecture Note */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/40 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <strong className="text-slate-900 dark:text-white">Section 4 Principle:</strong> Every approved obligation (project items, utility bills, loan instalments) lives here. It reduces Spendable Balance immediately without touching ledger balances until marked paid.
      </div>

      {/* Active Approved Obligations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-3 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Active Approved Obligations ({approvedCommitments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Title & Source</th>
                <th className="py-2.5 px-3">Earmarked Account</th>
                <th className="py-2.5 px-3 text-right">Amount (₦)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvedCommitments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No open obligations. All approved commitments are settled!
                  </td>
                </tr>
              ) : (
                approvedCommitments.map((com) => {
                  const acc = accounts.find((a) => a.id === com.account_id);
                  const cat = categories.find((c) => c.id === com.category_id);

                  return (
                    <tr key={com.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {com.due_date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {com.title}
                        </span>
                        <span className="text-[11px] text-slate-500 capitalize">
                          Source: {com.source_type.replace(/_/g, ' ')} {cat ? `· Category: ${cat.name}` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {acc?.name || 'Any Account'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        {formatMinor(com.amount_minor)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPay(com)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md text-[11px] cursor-pointer transition-colors"
                        >
                          Mark as Paid (INV-05)
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paid Commitments History */}
      {paidCommitments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Settled Commitments Archive ({paidCommitments.length})
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {paidCommitments.map((com) => (
              <div key={com.id} className="py-2.5 flex items-center justify-between text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-white">{com.title}</span>
                  <span className="text-[11px] text-slate-400">
                    Linked to Tx: <code className="font-mono">{com.linked_transaction_id?.slice(-8)}</code>
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formatMinor(com.amount_minor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MARK AS PAID MODAL (INV-05, INV-06, T-12) */}
      {payingCommitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Fulfill Obligation & Post Ledger Entry
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Marking '{payingCommitment.title}' ({formatMinor(payingCommitment.amount_minor)}) as paid will post a single balanced expense transaction into the double-entry ledger.
              </p>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Budget Category (Section 4 Category Rule)
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                >
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_essential ? '(Essential)' : ''}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Counts once in total spending and once in this category budget.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingCommitment(null)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Post Expense & Settle Obligation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
