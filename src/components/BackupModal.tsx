import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Download, Upload, CheckCircle2, AlertCircle, X, ShieldCheck, Database, RotateCcw } from 'lucide-react';

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
    firebaseUser,
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

      const prefix = firebaseUser?.uid ? `kl_user_${firebaseUser.uid}_` : 'kl_';
      localStorage.setItem(`${prefix}accounts`, JSON.stringify(parsed.data.accounts));
      localStorage.setItem(`${prefix}transactions`, JSON.stringify(parsed.data.transactions));
      localStorage.setItem(`${prefix}categories`, JSON.stringify(parsed.data.categories));
      localStorage.setItem(`${prefix}goals`, JSON.stringify(parsed.data.savingsGoals));
      localStorage.setItem(`${prefix}allocations`, JSON.stringify(parsed.data.goalAllocations));
      localStorage.setItem(`${prefix}commitments`, JSON.stringify(parsed.data.commitments));
      localStorage.setItem(`${prefix}debts`, JSON.stringify(parsed.data.debts));
      localStorage.setItem(`${prefix}budgets`, JSON.stringify(parsed.data.budgets));
      localStorage.setItem(`${prefix}project_items`, JSON.stringify(parsed.data.projectItems));
      localStorage.setItem(`${prefix}audit_logs`, JSON.stringify(parsed.data.auditLogs));

      setRestoreStatus('Backup successfully verified and restored! Reloading workspace...');
      setTimeout(() => {
        window.location.reload();
      }, 750);
    } catch (err: any) {
      setRestoreStatus(`Restore failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Workspace Backup & Data Portability
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Section 1 & T-22 · JSON Export, Verification & Restore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {restoreStatus && (
          <div className="p-3.5 text-xs rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium">
            {restoreStatus}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Download Full Backup */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Export Full Workspace JSON
              </span>
              <span className="text-slate-500 text-[11px] mt-0.5 block">
                Exports all {transactions.length} transactions, posting lines, debts, and budgets.
              </span>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl cursor-pointer transition-all shadow-xs shrink-0"
            >
              <Download className="w-4 h-4" />
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
              className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleApplyRestore}
              disabled={!restoreText.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-40 transition-all"
            >
              Verify Schema & Restore Database
            </button>
          </div>

          {/* Reset Workspace Option */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Need to test clean initial blueprint seed data?
            </span>
            <button
              onClick={() => {
                if (confirm('Reset KoboLedger to clean initial blueprint seed data?')) {
                  resetToDefaultSeed();
                  window.location.reload();
                }
              }}
              className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer text-[11px] font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Factory Seed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
