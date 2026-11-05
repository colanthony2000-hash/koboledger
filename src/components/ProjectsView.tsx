import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import { ProjectItem } from '../types/finance';
import {
  Gift,
  Utensils,
  ShoppingBag,
  Shield,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { projects, projectItems, markCommitmentPaid, commitments, accounts, categories } = useFinance();

  const [activeSection, setActiveSection] = useState<string>('all');
  const project = projects[0]; // Christmas 2026

  const sections = [
    { id: 'all', label: 'All 8 Template Sections' },
    { id: 'master_budget', label: '1. Master Budget' },
    { id: 'confirmed_funds', label: '2. Confirmed Funds' },
    { id: 'protected_reserve', label: '3. Protected Reserve' },
    { id: 'gifts', label: '4. Gifts Sub-list' },
    { id: 'food', label: '5. Food & Feast' },
    { id: 'shopping', label: '6. Shopping & Attire' },
    { id: 'monthly_savings', label: '7. Savings Schedule' },
    { id: 'summary', label: '8. Summary & Commitments' },
  ];

  const filteredItems = activeSection === 'all'
    ? projectItems
    : projectItems.filter((i) => i.section === activeSection);

  // Totals calculation
  const totalEstimatedMinor = projectItems
    .filter((i) => ['gifts', 'food', 'shopping', 'protected_reserve'].includes(i.section))
    .reduce((sum, i) => sum + i.estimated_minor, 0);

  const confirmedFundsMinor = projectItems
    .filter((i) => i.section === 'confirmed_funds')
    .reduce((sum, i) => sum + i.estimated_minor, 0);

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'gifts':
        return <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'protected_reserve':
        return <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Christmas Project Workbook (Section 17)
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 17 Specification</span>
            <span aria-hidden="true">·</span>
            <span>8 Canonical Sections</span>
            <span aria-hidden="true">·</span>
            <span>Zero Double-Counting (INV-06, T-12)</span>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-500 block">Master Budget Ceiling:</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMinor(project?.master_budget_minor || 35000000)}
          </span>
        </div>
      </div>

      {/* KPI Cards: Confirmed Funds vs Estimated Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">
            Confirmed Available Funds
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMinor(confirmedFundsMinor)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Earmarked savings & confirmed allocations
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-amber-600 uppercase tracking-wider font-semibold block mb-1">
            Planned & Committed Expenses
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600">
            {formatMinor(totalEstimatedMinor)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Gifts, Food, Shopping & Reserves
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">
            Ceiling Buffer Remaining
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMinor((project?.master_budget_minor || 35000000) - totalEstimatedMinor)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Under master project budget limit
          </span>
        </div>
      </div>

      {/* Section Filter Pills/Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
              activeSection === sec.id
                ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Section Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Section & Item Name</th>
              <th className="py-3 px-4">Project Section</th>
              <th className="py-3 px-4">Commitment Link (T-12)</th>
              <th className="py-3 px-4 text-right">Estimated Amount</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item) => {
              const linkedCommitment = commitments.find((c) => c.id === item.commitment_id);

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        {getSectionIcon(item.section)}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-500 font-mono text-[11px]">
                    {item.section.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {linkedCommitment ? (
                      <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                        {linkedCommitment.title} ({linkedCommitment.status})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Direct Project Entry</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatMinor(item.estimated_minor)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.is_paid ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        Settled
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                        Planned / Open
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Blueprint Double-Count Protection Callout (Section 4 & T-12) */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/40 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <strong className="text-slate-900 dark:text-white">Anti-Double-Count Guarantee (INV-06 & T-12):</strong>
        <p className="mt-1">
          A project is a tag on ledger transactions, not a separate expenditure. When an item in the gifts or food section is paid, it posts exactly one balanced transaction into the ledger carrying a category tag and a project tag. It counts once in total household spending and once in its category budget.
        </p>
      </div>
    </div>
  );
};
