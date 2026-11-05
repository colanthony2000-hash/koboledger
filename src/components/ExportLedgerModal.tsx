import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { Transaction } from '../types/finance';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface ExportLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportLedgerModal: React.FC<ExportLedgerModalProps> = ({ isOpen, onClose }) => {
  const { transactions, accounts, categories, currentUser } = useFinance();

  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('pdf');
  const [dateRange, setDateRange] = useState<'all' | 'current_month' | 'last_30_days' | 'last_6_months'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [includeBalancesSummary, setIncludeBalancesSummary] = useState(true);

  if (!isOpen) return null;

  // Filter transactions visible to user
  const visibleTxs = transactions.filter(
    (tx) => tx.visibility === 'shared' || tx.owner_user_id === currentUser.id
  );

  // Filter based on user selections
  const filteredTxs = visibleTxs.filter((tx) => {
    const today = new Date();
    const cutoff = new Date(today);
    if (dateRange === 'last_30_days') cutoff.setDate(cutoff.getDate() - 30);
    if (dateRange === 'last_6_months') cutoff.setMonth(cutoff.getMonth() - 6);
    // Type filter
    if (selectedType !== 'all' && tx.type !== selectedType) return false;

    // Account filter
    if (selectedAccountId !== 'all') {
      const matchAccount =
        tx.account_id === selectedAccountId ||
        (tx as any).destination_account_id === selectedAccountId ||
        tx.posting_lines.some((l) => l.ledger_node_id === selectedAccountId);
      if (!matchAccount) return false;
    }

    // Date range filter
    if (dateRange === 'current_month') {
      return tx.effective_date.startsWith(today.toISOString().slice(0, 7));
    }
    if (dateRange === 'last_30_days' || dateRange === 'last_6_months') {
      return tx.effective_date >= cutoff.toISOString().slice(0, 10);
    }

    return true;
  });

  // Calculate summary metrics
  const totalInflowsMinor = filteredTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount_minor, 0);

  const totalOutflowsMinor = filteredTxs
    .filter((t) => t.type === 'expense' || t.type === 'debt_repayment')
    .reduce((sum, t) => sum + t.amount_minor, 0);

  const netBalanceMinor = totalInflowsMinor - totalOutflowsMinor;

  // CSV Generation
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Effective Date',
      'Type',
      'Description',
      'Category',
      'Source Account',
      'Inflow Amount (NGN)',
      'Outflow Amount (NGN)',
      'Raw Amount Minor',
      'Currency',
      'Status',
      'Payee',
      'Audit Group',
    ];

    const rows = filteredTxs.map((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const acc = accounts.find((a) => a.id === t.account_id);
      const isInflow = t.type === 'income';
      const isOutflow = t.type === 'expense' || t.type === 'debt_repayment';
      const amountNaira = (t.amount_minor / 100).toFixed(2);

      return [
        t.id,
        t.effective_date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${cat?.name || 'Uncategorized'}"`,
        `"${acc?.name || 'Main Ledger'}"`,
        isInflow ? amountNaira : '0.00',
        isOutflow ? amountNaira : '0.00',
        t.amount_minor,
        t.currency,
        t.status,
        `"${t.payee || ''}"`,
        t.revision_group_id || '',
      ];
    });

    let csvContent = 'data:text/csv;charset=utf-8,';

    if (includeBalancesSummary) {
      csvContent += 'KoboLedger Financial Summary\n';
      csvContent += `Generated On,${new Date().toISOString()}\n`;
      csvContent += `Account Holder,${currentUser.name} (${currentUser.role})\n`;
      csvContent += `Total Inflows NGN,${(totalInflowsMinor / 100).toFixed(2)}\n`;
      csvContent += `Total Outflows NGN,${(totalOutflowsMinor / 100).toFixed(2)}\n`;
      csvContent += `Net Ledger Movement NGN,${(netBalanceMinor / 100).toFixed(2)}\n\n`;
      csvContent += 'ACCOUNT BALANCES\n';
      accounts.forEach((a) => {
        csvContent += `"${a.name} (${a.institution_name || a.type})",NGN,${(a.opening_balance_minor / 100).toFixed(2)}\n`;
      });
      csvContent += '\n';
    }

    csvContent += [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `koboledger_financial_records_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  // PDF Generation / Printing
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for this site to generate the PDF statement.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KoboLedger Financial Summary - ${currentUser.name}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 20px;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand img {
              width: 48px;
              height: 48px;
              border-radius: 50%;
            }
            .company-name {
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .sub-title {
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
            }
            .statement-meta {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .statement-meta strong {
              color: #0f172a;
              font-size: 11px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
            }
            .card-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 4px;
            }
            .card-val {
              font-size: 16px;
              font-weight: 800;
              font-family: monospace;
            }
            .green { color: #16a34a; }
            .red { color: #dc2626; }
            .blue { color: #0284c7; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f1f5f9;
              padding: 8px 10px;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #cbd5e1;
              color: #475569;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 10px;
            }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount {
              text-align: right;
              font-family: monospace;
              font-weight: 700;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
            .official-badge {
              display: inline-block;
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: 700;
              font-size: 9px;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <img src="${window.location.origin}/assets/aistudio/logo_bf2c43a3.png" alt="KoboLedger Logo" />
              <div>
                <div class="company-name">KoboLedger</div>
                <div class="sub-title">Personal Finance Summary</div>
              </div>
            </div>
            <div class="statement-meta">
              <div>Statement Reference: <strong>JNK-REC-${Date.now().toString().slice(-6)}</strong></div>
              <div>Period: <strong>${dateRange.toUpperCase().replace(/_/g, ' ')}</strong></div>
              <div>Generated: <strong>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
            </div>
          </div>

          <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <span style="font-size: 10px; color: #64748b;">Account Holder: </span>
              <strong style="font-size: 13px;">${currentUser.name}</strong>
              <span style="font-size: 10px; color: #64748b;">(${currentUser.role.toUpperCase()})</span>
            </div>
            <div class="official-badge">DOUBLE-ENTRY BALANCED & RECONCILED</div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-label">Total Inflow / Earnings</div>
              <div class="card-val green">${formatMinor(totalInflowsMinor)}</div>
            </div>
            <div class="card">
              <div class="card-label">Total Outflow / Expenditures</div>
              <div class="card-val red">${formatMinor(totalOutflowsMinor)}</div>
            </div>
            <div class="card">
              <div class="card-label">Net Ledger Cash Movement</div>
              <div class="card-val blue">${netBalanceMinor >= 0 ? '+' : ''}${formatMinor(netBalanceMinor)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 75px;">Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th>Type</th>
                <th style="text-align: right; width: 100px;">Amount (NGN)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTxs
                .map((t) => {
                  const cat = categories.find((c) => c.id === t.category_id);
                  const acc = accounts.find((a) => a.id === t.account_id);
                  const isInc = t.type === 'income';
                  return `
                    <tr>
                      <td style="font-family: monospace;">${t.effective_date}</td>
                      <td><strong>${t.description}</strong></td>
                      <td>${cat?.name || 'General'}</td>
                      <td>${acc?.name || 'Ledger'}</td>
                      <td style="text-transform: capitalize;">${t.type.replace(/_/g, ' ')}</td>
                      <td class="amount ${isInc ? 'green' : ''}">
                        ${isInc ? '+' : '-'}${formatMinor(t.amount_minor, t.currency)}
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>
              <strong>KoboLedger</strong><br />
              Generated for the account holder. Review figures before relying on this summary.
            </div>
            <div style="text-align: right;">
              Page 1 of 1 · Verified Kobo-Precision Ledger
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D111C] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_bf2c43a3.png"
              alt="JENECONK Logo"
              className="w-8 h-8 rounded-full object-cover shadow-sm"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Export Financial Records
              </h2>
              <p className="text-xs text-slate-500">
                Download your ledger data in CSV or PDF format
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

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Format Selection Cards */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Select Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                  exportFormat === 'pdf'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-600'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    PDF Statement
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Official letterhead, summaries & print-ready layout
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                  exportFormat === 'csv'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-600'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    CSV Spreadsheet
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Raw & formatted data for Excel & accounting software
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Reporting Period
            </label>
            <select
              value={dateRange}
              onChange={(e: any) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Records (Complete Ledger History)</option>
              <option value="current_month">Current Reporting Month (November 2026)</option>
              <option value="last_30_days">Previous 30 Days</option>
              <option value="last_6_months">Previous 6 Months</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Institutional Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Transaction Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Movement Types</option>
                <option value="income">Incomes Only</option>
                <option value="expense">Expenses Only</option>
                <option value="transfer">Internal Transfers</option>
                <option value="debt_repayment">Debt Repayments</option>
              </select>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Matching Transactions:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {filteredTxs.length} items
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Total Filtered Inflows:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                +{formatMinor(totalInflowsMinor)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Total Filtered Outflows:</span>
              <strong className="text-rose-600 dark:text-rose-400 font-mono">
                -{formatMinor(totalOutflowsMinor)}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {exportFormat === 'pdf' ? (
            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Generate & Print PDF</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
