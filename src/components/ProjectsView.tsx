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
  TreePine,
  Check,
  Tag,
  Crown,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { projects, projectItems, commitments, subscription, openSubscriptionModal } = useFinance();

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

  const masterBudgetMinor = project?.master_budget_minor || 35000000;
  const remainingBufferMinor = masterBudgetMinor - totalEstimatedMinor;

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
      {/* View Header with Holiday Champagne Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Christmas 2026 Project Workbook</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <TreePine className="w-3.5 h-3.5" />
              <span>Section 17 Canonical</span>
            </span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Section 17 Specification</span>
            <span aria-hidden="true">·</span>
            <span>8 Canonical Sections</span>
            <span aria-hidden="true">·</span>
            <span>Zero Double-Counting (INV-06, T-12)</span>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs bg-slate-50 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
          <span className="text-slate-400 block font-medium">Master Budget Cap:</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMinor(masterBudgetMinor)}
          </span>
        </div>
      </div>

      {/* KPI Cards: Confirmed Funds vs Estimated Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">
            Confirmed Available Funds
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMinor(confirmedFundsMinor)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Earmarked savings & confirmed allocations
          </span>
        </div>

        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-amber-500/30 p-5 shadow-sm space-y-1 bg-gradient-to-br from-amber-500/[0.03] to-transparent">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest font-bold block mb-1">
            Planned & Committed Expenses
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatMinor(totalEstimatedMinor)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Gifts, Food, Shopping & Reserves
          </span>
        </div>

        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">
            Ceiling Buffer Remaining
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMinor(remainingBufferMinor)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Available headroom under ceiling
          </span>
        </div>
      </div>

      {/* Pro Callout for Free Tier */}
      {subscription.tier !== 'pro' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                Holiday Planning & Protected Vault Earmarks
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Upgrade to JENECONK Pro (from ₦1,500/wk) to synchronize Christmas budget items directly with real-time bank reserves.
              </p>
            </div>
          </div>
          <button
            onClick={() => openSubscriptionModal('Christmas 8-Section Master Plan')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
              activeSection === sec.id
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 font-medium'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Section Items Table */}
      <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-400 font-semibold border-b border-slate-100 dark:border-white/5">
            <tr>
              <th className="py-3.5 px-5">Item & Section</th>
              <th className="py-3.5 px-5">Workbook Section</th>
              <th className="py-3.5 px-5">Commitment Register Link (T-12)</th>
              <th className="py-3.5 px-5 text-right">Estimated Amount</th>
              <th className="py-3.5 px-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredItems.map((item) => {
              const linkedCommitment = commitments.find((c) => c.id === item.commitment_id);

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                        {getSectionIcon(item.section)}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 capitalize text-slate-400 font-mono text-[11px]">
                    {item.section.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">
                    {linkedCommitment ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <span>{linkedCommitment.title}</span>
                        <span className="capitalize">({linkedCommitment.status})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Direct Entry</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                    {formatMinor(item.estimated_minor)}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {item.is_paid ? (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        Settled
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
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
      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <strong className="text-slate-900 dark:text-white font-bold">Anti-Double-Count Guarantee (INV-06 & T-12):</strong>
        <p className="mt-1">
          A project is a tag on ledger transactions, not a separate expenditure. When an item in the gifts or food section is paid, it posts exactly one balanced transaction into the ledger carrying a category tag and a project tag. It counts once in total household spending and once in its category budget.
        </p>
      </div>
    </div>
  );
};
