import React, { useState, useEffect } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { useFinance } from './context/FinanceContext';
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
import { SubscriptionModal } from './components/SubscriptionModal';
import { HouseholdModal } from './components/HouseholdModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PlatformAdminModal } from './components/PlatformAdminModal';
import { TodoView } from './components/TodoView';
import { OwnerSettingsView } from './components/OwnerSettingsView';

function TodoReminderAgent() {
  const { todoItems } = useFinance();

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || localStorage.getItem('kl_todo_notifications_enabled') !== 'true') return;
    const checkReminders = () => {
      const now = Date.now();
      for (const task of todoItems) {
        if (task.completed || !task.reminderAt || new Date(task.reminderAt).getTime() > now) continue;
        const key = `kl_todo_reminded_${task.id}_${task.reminderAt}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, 'true');
        const title = 'KoboLedger task reminder';
        const options: NotificationOptions = { body: task.title, tag: key, icon: '/icons/koboledger-192.png' };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => registration.showNotification(title, options))
            .catch(() => new Notification(title, options));
        } else new Notification(title, options);
      }
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 30_000);
    return () => window.clearInterval(timer);
  }, [todoItems]);

  return null;
}

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
      <TodoReminderAgent />
      <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#080B11] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        {/* Top Navigation Bar with JENECONK Branding */}
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

          {currentTab === 'todos' && <TodoView />}

          {currentTab === 'tests' && <AcceptanceTestsView />}

          {currentTab === 'owner-settings' && <OwnerSettingsView onOpenAudit={() => setCurrentTab('tests')} />}
        </main>

        {/* Core Modals */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />

        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />

        <SubscriptionModal />
        <HouseholdModal />
        <UserProfileModal />
        <PlatformAdminModal />

        {/* Quiet Editorial Footer */}
        <footer className="border-t border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#0E131F] py-6 text-xs text-slate-500 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/logo_bf2c43a3.png"
                alt="JENECONK Logo"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                JENECONK INTEGRATED GLOBAL SOLUTIONS LIMITED
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/10">·</span>
              <span>KoboLedger Systems</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentTab('tests')}
                className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer transition-colors"
              >
                Invariants (INV-01 to INV-13)
              </button>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/10">·</span>
              <button
                onClick={() => setIsBackupOpen(true)}
                className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer transition-colors"
              >
                Backup & Restore
              </button>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/10">·</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">NGN Kobo Units</span>
            </div>
          </div>
        </footer>
      </div>
    </FinanceProvider>
  );
}
