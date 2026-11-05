import React from 'react';
import { useFinance, SEED_USERS } from '../context/FinanceContext';
import { Plus, ShieldAlert, Sparkles, User, RefreshCw, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  onOpenTests: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAdd,
  onOpenTests,
  darkMode,
  setDarkMode,
}) => {
  const { currentUser, switchUser, budgetAlerts } = useFinance();

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ledger', label: 'Posting Ledger' },
    { id: 'debts', label: 'Debts & Affordability' },
    { id: 'budgets', label: 'Budgets & Savings' },
    { id: 'projects', label: 'Projects (Christmas)' },
    { id: 'commitments', label: 'Commitments' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark (Top Bar Contract §2) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentTab('dashboard');
            }}
            className="flex items-center gap-2.5 text-slate-900 dark:text-white group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-emerald-700 transition-colors">
              ₦
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight whitespace-nowrap">
                KoboLedger
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: 4-5 single-line clean text links with subtle underlines (Top Bar Contract §2) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
                  isActive
                    ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <button
            onClick={onOpenTests}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'tests'
                ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>Audit Tests (T01–T23)</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action + household switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Household Member Perspective Switcher (Section 5, T-21) */}
          <div className="hidden sm:flex items-center gap-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800">
            <span className="text-slate-500 dark:text-slate-400">View as:</span>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
              title="Switch user perspective to verify Section 5 & T-21 privacy rules"
            >
              {SEED_USERS.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-slate-800">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary Action Button (Top Bar Contract §2) */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Mobile nav scrollbar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-200 dark:border-slate-800 px-4 py-2 gap-4 text-xs font-medium no-scrollbar">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => setCurrentTab(link.id)}
            className={`whitespace-nowrap px-2 py-1 rounded cursor-pointer ${
              currentTab === link.id
                ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950 dark:text-emerald-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {link.label}
          </button>
        ))}
        <button
          onClick={onOpenTests}
          className={`whitespace-nowrap px-2 py-1 rounded cursor-pointer ${
            currentTab === 'tests'
              ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Audit Tests (T01–T23)
        </button>
      </div>
    </header>
  );
};
