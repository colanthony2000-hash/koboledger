import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Download, Upload, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    transactions,
    categories,
    savingsGoals,
    goalAllocations,
    commitments,
    debts,
    budgets,
    projectItems,
    auditLogs,
    resetToDefaultSeed,
  } = useFinance();

  const [restoreText, setRestoreText] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const backupData = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      platform: 'KoboLedger',
      data: {
        accounts,
        transactions,
        categories,
        savingsGoals,
        goalAllocations,
        commitments,
        debts,
        budgets,
        projectItems,
        auditLogs,
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koboledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleApplyRestore = () => {
    try {
      const parsed = JSON.parse(restoreText);
      if (!parsed.data || !parsed.data.accounts || !parsed.data.transactions) {
        throw new Error('Invalid backup schema. Required collections missing.');
      }

      localStorage.setItem('kl_accounts', JSON.stringify(parsed.data.accounts));
      localStorage.setItem('kl_transactions', JSON.stringify(parsed.data.transactions));
      localStorage.setItem('kl_categories', JSON.stringify(parsed.data.categories));
      localStorage.setItem('kl_goals', JSON.stringify(parsed.data.savingsGoals));
      localStorage.setItem('kl_allocations', JSON.stringify(parsed.data.goalAllocations));
      localStorage.setItem('kl_commitments', JSON.stringify(parsed.data.commitments));
      localStorage.setItem('kl_debts', JSON.stringify(parsed.data.debts));
      localStorage.setItem('kl_budgets', JSON.stringify(parsed.data.budgets));
      localStorage.setItem('kl_project_items', JSON.stringify(parsed.data.projectItems));
      localStorage.setItem('kl_audit_logs', JSON.stringify(parsed.data.auditLogs));

      setRestoreStatus('Backup successfully restored! Reloading workspace state...');
      setTimeout(() => {
        window.location.reload();
      }, 750);
    } catch (err: any) {
      setRestoreStatus(`Restore failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Backup, Export & Restore (T-22)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Preserves UUIDs, effective dates, kobo amounts, and posting-line links.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {restoreStatus && (
          <div className="p-3 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {restoreStatus}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Download Full Backup */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">
                Export Full Workspace JSON
              </span>
              <span className="text-slate-500 text-[11px]">
                Exports all {transactions.length} transactions, posting lines, debts, and budgets.
              </span>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md cursor-pointer transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* Paste & Restore */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Restore from Backup JSON (T-22)
            </label>
            <textarea
              rows={4}
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
              placeholder="Paste previously exported JSON backup payload here..."
              className="w-full p-2.5 font-mono text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              onClick={handleApplyRestore}
              disabled={!restoreText.trim()}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-md font-semibold cursor-pointer disabled:opacity-40 transition-colors"
            >
              Verify Schema & Restore Database
            </button>
          </div>

          {/* Reset Workspace Option */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Need to test clean initial seed data?
            </span>
            <button
              onClick={() => {
                if (confirm('Reset KoboLedger to clean initial blueprint seed data?')) {
                  resetToDefaultSeed();
                  window.location.reload();
                }
              }}
              className="text-rose-600 hover:underline cursor-pointer text-[11px] font-semibold"
            >
              Reset to Factory Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
