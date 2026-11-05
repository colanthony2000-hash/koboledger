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
  X,
  CreditCard,
  Check,
  AlertCircle,
} from 'lucide-react';

export const CommitmentsView: React.FC = () => {
  const {
    commitments,
    accounts,
    categories,
    markCommitmentPaid,
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Unified Commitments Register</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {approvedCommitments.length} Active Reservations
            </span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 4</span>
            <span aria-hidden="true">·</span>
            <span>Single Source of Unpaid Obligations</span>
            <span aria-hidden="true">·</span>
            <span>Instant Spendable Balance Deduction (T-05)</span>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs bg-slate-50 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
          <span className="text-slate-400 block font-medium">Active Approved Commitments:</span>
          <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {formatMinor(totalApprovedReservedMinor)}
          </span>
        </div>
      </div>

      {/* Blueprint Architecture Note */}
      <div className="p-4.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <strong className="text-amber-800 dark:text-amber-300 font-bold">Section 4 Principle:</strong> Every approved obligation (project items, utility bills, loan instalments) lives here. It reduces Spendable Balance immediately without touching ledger accounts until marked paid.
      </div>

      {/* Active Approved Obligations Table */}
      <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm space-y-3 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Active Approved Obligations ({approvedCommitments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-400 font-semibold border-b border-slate-100 dark:border-white/5">
              <tr>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Title & Source</th>
                <th className="py-3 px-4">Earmarked Account</th>
                <th className="py-3 px-4 text-right">Amount (₦)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {approvedCommitments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No open obligations. All approved commitments are settled!
                  </td>
                </tr>
              ) : (
                approvedCommitments.map((com) => {
                  const acc = accounts.find((a) => a.id === com.account_id);
                  const cat = categories.find((c) => c.id === com.category_id);

                  return (
                    <tr key={com.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {com.due_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {com.title}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize">
                          Source: {com.source_type.replace(/_/g, ' ')} {cat ? `· Category: ${cat.name}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {acc?.name || 'Any Account'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap text-sm">
                        {formatMinor(com.amount_minor)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPay(com)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-xs"
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
        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Settled Commitments Archive ({paidCommitments.length})
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
            {paidCommitments.map((com) => (
              <div key={com.id} className="py-3 flex items-center justify-between text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">{com.title}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tx: #{com.linked_transaction_id?.slice(-6)}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatMinor(com.amount_minor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MARK AS PAID MODAL (INV-05, INV-06, T-12) */}
      {payingCommitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Fulfill Obligation & Post Ledger Entry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  '{payingCommitment.title}' ({formatMinor(payingCommitment.amount_minor)})
                </p>
              </div>
              <button
                onClick={() => setPayingCommitment(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-medium"
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Budget Category (Section 4 Category Rule)
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] text-slate-900 dark:text-white font-medium"
                  required
                >
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_essential ? '(Essential Living)' : ''}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Counts once in total spending and once in this category budget.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setPayingCommitment(null)}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
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
