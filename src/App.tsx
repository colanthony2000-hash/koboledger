import React, { useState, useEffect } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { DebtsView } from './components/DebtsView';
import { BudgetsSavingsView } from './components/BudgetsSavingsView';
import { ProjectsView } from './components/ProjectsView';
import { CommitmentsView } from './components/CommitmentsView';
import { AcceptanceTestsView } from './components/AcceptanceTestsView';
import { QuickAddModal } from './components/QuickAddModal';
import { BackupModal } from './components/BackupModal';
import { ShieldCheck, Database, FileText } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        {/* Top Navigation Bar adhering to Top Bar Contract */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenTests={() => setCurrentTab('tests')}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'ledger' && <LedgerView />}

          {currentTab === 'debts' && <DebtsView />}

          {currentTab === 'budgets' && <BudgetsSavingsView />}

          {currentTab === 'projects' && <ProjectsView />}

          {currentTab === 'commitments' && <CommitmentsView />}

          {currentTab === 'tests' && <AcceptanceTestsView />}
        </main>

        {/* Modals */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />

        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />

        {/* Quiet Editorial Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                KoboLedger Platform
              </span>
              <span aria-hidden="true">·</span>
              <span>Blueprint v1.1 Implementation</span>
              <span aria-hidden="true">·</span>
              <span>Double-Entry Zero-Sum Ledger</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentTab('tests')}
                className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer"
              >
                Invariants (INV-01 to INV-13)
              </button>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => setIsBackupOpen(true)}
                className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer"
              >
                Backup & Restore (T-22)
              </button>
              <span aria-hidden="true">·</span>
              <span>NGN (Kobo Units)</span>
            </div>
          </div>
        </footer>
      </div>
    </FinanceProvider>
  );
}
