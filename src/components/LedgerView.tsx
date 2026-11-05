import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { Transaction, TransactionType } from '../types/finance';
import {
  Search,
  Filter,
  Download,
  Edit2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
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

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Double-Entry Posting Ledger
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 2</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Sum Posting Lines</span>
            <span aria-hidden="true">·</span>
            <span>Immutable Audit Revisions</span>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions by description, payee, or ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="all">All Movement Types</option>
          <option value="expense">Expenses</option>
          <option value="income">Incomes</option>
          <option value="transfer">Transfers</option>
          <option value="debt_drawdown">Debt Drawdowns</option>
          <option value="debt_repayment">Debt Repayments</option>
          <option value="opening_balance">Opening Balances</option>
        </select>
      </div>

      {/* Transactions Table with Posting Lines Expandable Row */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Description & Type</th>
                <th className="py-3 px-4">Status & Invariant</th>
                <th className="py-3 px-4 text-right">Amount (₦)</th>
                <th className="py-3 px-4 text-center">Posting Lines</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
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

                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isReversed ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                        }`}
                      >
                        {/* Effective Date (INV-08) */}
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {tx.effective_date}
                        </td>

                        {/* Description & Type */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{tx.description}</span>
                            {tx.replaces_id && (
                              <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                                Replaces {tx.replaces_id.slice(-6)}
                              </span>
                            )}
                            {tx.reversal_of_id && (
                              <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                                Reversal of {tx.reversal_of_id.slice(-6)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
                            <span>{tx.type.replace(/_/g, ' ')}</span>
                            {tx.payee && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Payee: {tx.payee}</span>
                              </>
                            )}
                            {tx.project_id && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-600 font-medium">Christmas Project Tagged</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Status & Invariant Check */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`capitalize font-semibold text-[11px] ${
                                tx.status === 'posted'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                            <span aria-hidden="true">·</span>
                            {isBalanced ? (
                              <span
                                className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono"
                                title="Sum of debits equals sum of credits (INV-13)"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Balanced</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-600 flex items-center gap-1 font-mono">
                                <AlertCircle className="w-3 h-3" />
                                <span>Unbalanced</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatMinor(tx.amount_minor, tx.currency)}
                        </td>

                        {/* Posting Lines Toggle Button */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(tx.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            <span>{tx.posting_lines.length} lines</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Actions (Section 6, T-02 Immutable Edit) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {tx.status === 'posted' ? (
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              title="Edit transaction (creates reversal and replacement in revision group)"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Revise / Edit</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Reversed</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Double-Entry Posting Lines Breakdown (Section 2) */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-850/60 border-y border-slate-200 dark:border-slate-800">
                          <td colSpan={6} className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                <span>Posting Lines Detail (Zero-Sum Invariant INV-13)</span>
                                <span className="font-mono">
                                  Debits: {formatMinor(totalDebits)} / Credits: {formatMinor(totalCredits)} (Net: ₦0.00)
                                </span>
                              </div>
                              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/40">
                                      <th className="py-1.5 px-3">Node Type</th>
                                      <th className="py-1.5 px-3">Ledger Node</th>
                                      <th className="py-1.5 px-3">Direction</th>
                                      <th className="py-1.5 px-3 text-right">Debit (₦)</th>
                                      <th className="py-1.5 px-3 text-right">Credit (₦)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {tx.posting_lines.map((line) => {
                                      // Resolve node name
                                      let nodeName = line.ledger_node_id;
                                      const acc = accounts.find((a) => a.id === line.ledger_node_id);
                                      const cat = categories.find((c) => c.id === line.ledger_node_id);
                                      if (acc) nodeName = `Account: ${acc.name}`;
                                      else if (cat) nodeName = `Category: ${cat.name}`;
                                      else if (line.node_type === 'equity') nodeName = 'Equity: Opening Balance';
                                      else if (line.node_type === 'debt_liability') nodeName = `Liability: ${line.ledger_node_id}`;

                                      return (
                                        <tr key={line.id}>
                                          <td className="py-2 px-3 capitalize text-slate-500">{line.node_type}</td>
                                          <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">{nodeName}</td>
                                          <td className="py-2 px-3 uppercase text-slate-600 dark:text-slate-400 font-semibold">{line.direction}</td>
                                          <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            {line.direction === 'debit' ? formatMinor(line.amount_minor, line.currency) : '—'}
                                          </td>
                                          <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 tabular-nums">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Revise Transaction (Immutable Ledger Rule)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Per Section 6: Posted transactions are immutable. Saving this will create a reversal of the original ({editingTx.id}) and a linked replacement transaction with updated figures.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editAmountNaira || ''}
                  onChange={(e) => setEditAmountNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Effective Date (INV-08)
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
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
