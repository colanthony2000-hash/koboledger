import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { Transaction, TransactionType } from '../types/finance';
import {
  Search,
  Filter,
  Download,
  Edit2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShieldCheck,
  FileSpreadsheet,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

export const LedgerView: React.FC = () => {
  const { transactions, accounts, categories, currentUser, editTransaction } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Edit Modal State (Section 6, T-02)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmountNaira, setEditAmountNaira] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // Filter transactions visible to currentUser (Section 5, T-21)
  const visibleTxs = transactions.filter(
    (tx) => tx.visibility === 'shared' || tx.owner_user_id === currentUser.id
  );

  const filteredTxs = visibleTxs.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payee && tx.payee.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDesc(tx.description);
    setEditAmountNaira(tx.amount_minor / 100);
    setEditDate(tx.effective_date);
    setEditAccountId(tx.account_id || '');
    setEditCategoryId(tx.category_id || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    editTransaction(editingTx, {
      description: editDesc,
      effective_date: editDate,
      amount_minor: Math.round(editAmountNaira * 100),
      account_id: editAccountId || editingTx.account_id,
      category_id: editCategoryId || editingTx.category_id,
      payee: editingTx.payee,
      project_id: editingTx.project_id,
    });

    setEditingTx(null);
  };

  // CSV Export (Section 1)
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Status', 'Effective Date', 'Type', 'Description', 'Amount Minor', 'Currency', 'Revision Group'];
    const rows = visibleTxs.map((t) => [
      t.id,
      t.status,
      t.effective_date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount_minor,
      t.currency,
      t.revision_group_id,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `koboledger_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ArrowDownLeft className="w-2.5 h-2.5" />
            <span>Income</span>
          </span>
        );
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <ArrowUpRight className="w-2.5 h-2.5" />
            <span>Expense</span>
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>Transfer</span>
          </span>
        );
      case 'debt_drawdown':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <span>Drawdown</span>
          </span>
        );
      case 'debt_repayment':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span>Repayment</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
            <span>{type.replace(/_/g, ' ')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Double-Entry Posting Ledger</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {filteredTxs.length} Transactions
            </span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 2</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Sum Posting Lines</span>
            <span aria-hidden="true">·</span>
            <span>Immutable Revisions (INV-07)</span>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Export Clean CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description, payee, or transaction hash..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
        >
          <option value="all">All Movement Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Incomes Only</option>
          <option value="transfer">Internal Transfers</option>
          <option value="debt_drawdown">Debt Drawdowns</option>
          <option value="debt_repayment">Debt Repayments</option>
          <option value="opening_balance">Opening Balances</option>
        </select>
      </div>

      {/* Transactions Table with Posting Lines Expandable Row */}
      <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] text-slate-400 uppercase tracking-widest font-semibold text-[10px]">
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Description & Category</th>
                <th className="py-3.5 px-5">Type</th>
                <th className="py-3.5 px-5">Status & Invariant</th>
                <th className="py-3.5 px-5 text-right">Amount (₦)</th>
                <th className="py-3.5 px-5 text-center">Posting Lines</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match your search filter.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  const isReversed = tx.status === 'reversed';

                  // Calculate sum of debits and credits for zero-sum display
                  const totalDebits = tx.posting_lines
                    .filter((l) => l.direction === 'debit')
                    .reduce((s, l) => s + l.amount_minor, 0);
                  const totalCredits = tx.posting_lines
                    .filter((l) => l.direction === 'credit')
                    .reduce((s, l) => s + l.amount_minor, 0);
                  const isBalanced = totalDebits === totalCredits;

                  const isPositive = tx.type === 'income';

                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors ${
                          isReversed ? 'opacity-50 bg-slate-50/40 dark:bg-black/20' : ''
                        }`}
                      >
                        {/* Effective Date (INV-08) */}
                        <td className="py-4 px-5 font-mono whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {tx.effective_date}
                        </td>

                        {/* Description & Type */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{tx.description}</span>
                            {tx.replaces_id && (
                              <span className="text-[10px] font-mono font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                Replaces #{tx.replaces_id.slice(-6)}
                              </span>
                            )}
                            {tx.reversal_of_id && (
                              <span className="text-[10px] font-mono font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                Reversal of #{tx.reversal_of_id.slice(-6)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {tx.payee && <span>Payee: {tx.payee}</span>}
                            {tx.project_id && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Christmas Tagged</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          {getTypeBadge(tx.type)}
                        </td>

                        {/* Status & Invariant Check */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`capitalize font-bold text-[11px] ${
                                tx.status === 'posted'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-500 dark:text-rose-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-white/20">·</span>
                            {isBalanced ? (
                              <span
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono font-medium"
                                title="Debits = Credits (INV-13)"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Zero-Sum</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-600 flex items-center gap-1 font-mono font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>Unbalanced</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 text-right font-mono font-bold tabular-nums whitespace-nowrap text-sm">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }
                          >
                            {isPositive ? '+' : ''}
                            {formatMinor(tx.amount_minor, tx.currency)}
                          </span>
                        </td>

                        {/* Posting Lines Toggle Button */}
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(tx.id)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                          >
                            <span>{tx.posting_lines.length} lines</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Actions (Section 6, T-02 Immutable Edit) */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          {tx.status === 'posted' ? (
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
                              title="Edit transaction (creates immutable reversal and replacement in revision group)"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Revise</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Reversed</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Double-Entry Posting Lines Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-[#090C12] border-y border-slate-200/80 dark:border-white/5">
                          <td colSpan={7} className="p-5">
                            <div className="space-y-3 max-w-4xl">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Posting Lines Double-Entry Node Breakdown (INV-13)</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">
                                  Debits: <strong className="text-emerald-600">{formatMinor(totalDebits)}</strong> / Credits: <strong className="text-rose-500">{formatMinor(totalCredits)}</strong> (Net Balanced ₦0.00)
                                </span>
                              </div>

                              <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#0E131F]">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                                      <th className="py-2.5 px-4">Node Type</th>
                                      <th className="py-2.5 px-4">Ledger Node</th>
                                      <th className="py-2.5 px-4">Direction</th>
                                      <th className="py-2.5 px-4 text-right">Debit (₦)</th>
                                      <th className="py-2.5 px-4 text-right">Credit (₦)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {tx.posting_lines.map((line) => {
                                      let nodeName = line.ledger_node_id;
                                      const acc = accounts.find((a) => a.id === line.ledger_node_id);
                                      const cat = categories.find((c) => c.id === line.ledger_node_id);
                                      if (acc) nodeName = `Account: ${acc.name}`;
                                      else if (cat) nodeName = `Category: ${cat.name}`;
                                      else if (line.node_type === 'equity') nodeName = 'Equity: Opening Balance';
                                      else if (line.node_type === 'debt_liability') nodeName = `Liability: ${line.ledger_node_id}`;

                                      return (
                                        <tr key={line.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01]">
                                          <td className="py-2.5 px-4 capitalize text-slate-400 text-[11px]">
                                            {line.node_type}
                                          </td>
                                          <td className="py-2.5 px-4 text-slate-900 dark:text-white font-medium">
                                            {nodeName}
                                          </td>
                                          <td className="py-2.5 px-4 uppercase text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                            {line.direction}
                                          </td>
                                          <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                                            {line.direction === 'debit' ? formatMinor(line.amount_minor, line.currency) : '—'}
                                          </td>
                                          <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                                            {line.direction === 'credit' ? formatMinor(line.amount_minor, line.currency) : '—'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Revision Modal (Section 6, INV-07, T-02) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Revise Transaction (Immutable Ledger Rule)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Section 6: Creates reversal of #{editingTx.id.slice(-6)} and links replacement transaction.
                </p>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editAmountNaira || ''}
                  onChange={(e) => setEditAmountNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 font-mono font-bold tabular-nums rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Effective Date (INV-08)
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-5 py-2.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Post Revision (T-02)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
