import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  PieChart,
  ArrowRight,
} from 'lucide-react';

export const FinancialHealthScoreCard: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { transactions, budgets, debts, categories, currentUser } = useFinance();

  // Compute composite score based on visible data
  const healthAnalysis = useMemo(() => {
    const visibleTxs = transactions.filter(
      (t) =>
        t.status === 'posted' &&
        (t.visibility === 'shared' || t.owner_user_id === currentUser.id)
    );

    // Filter current reporting period (November 2026 or last 30 days)
    const recentTxs = visibleTxs.filter((t) => t.effective_date >= '2026-10-01');

    const totalIncomeMinor = recentTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount_minor, 0);

    const totalExpenseMinor = recentTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount_minor, 0);

    const netSurplusMinor = Math.max(0, totalIncomeMinor - totalExpenseMinor);

    // 1. Savings Rate Sub-Score (Max 35 points)
    const savingsRate = totalIncomeMinor > 0 ? (netSurplusMinor / totalIncomeMinor) * 100 : 0;
    let savingsScore = 0;
    if (savingsRate >= 25) savingsScore = 35;
    else if (savingsRate >= 20) savingsScore = 32;
    else if (savingsRate >= 15) savingsScore = 26;
    else if (savingsRate >= 10) savingsScore = 18;
    else if (savingsRate >= 5) savingsScore = 12;
    else savingsScore = 5;

    // 2. Spending Habits & Budget Discipline (Max 35 points)
    // Check essential vs discretionary spending
    let essentialSpendMinor = 0;
    let discretionarySpendMinor = 0;

    recentTxs.forEach((t) => {
      if (t.type === 'expense') {
        const cat = categories.find((c) => c.id === t.category_id);
        if (cat?.is_essential) {
          essentialSpendMinor += t.amount_minor;
        } else {
          discretionarySpendMinor += t.amount_minor;
        }
      }
    });

    const discretionaryRatio =
      totalExpenseMinor > 0 ? (discretionarySpendMinor / totalExpenseMinor) * 100 : 0;

    let budgetScore = 25;
    if (discretionaryRatio <= 25) budgetScore += 10;
    else if (discretionaryRatio <= 35) budgetScore += 6;
    else if (discretionaryRatio <= 50) budgetScore += 2;
    else budgetScore -= 5;

    // Check budget overspending
    budgets.forEach((b) => {
      const bSpend = recentTxs
        .filter((t) => t.category_id === b.category_id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount_minor, 0);
      if (bSpend > b.limit_minor) {
        budgetScore -= 4; // penalty for overspending
      }
    });
    budgetScore = Math.max(5, Math.min(35, budgetScore));

    // 3. Debt Management Sub-Score (Max 30 points)
    const totalDebtOutstandingMinor = debts.reduce((sum, d) => sum + d.principal_minor, 0);
    const monthlyDebtServiceMinor = debts.reduce(
      (sum, d) => sum + Math.round((d.principal_minor * 0.1)),
      0
    );

    const dtiRatio =
      totalIncomeMinor > 0 ? (monthlyDebtServiceMinor / totalIncomeMinor) * 100 : 0;

    let debtScore = 0;
    if (debts.length === 0) debtScore = 30;
    else if (dtiRatio <= 15) debtScore = 28;
    else if (dtiRatio <= 25) debtScore = 24;
    else if (dtiRatio <= 35) debtScore = 18;
    else if (dtiRatio <= 45) debtScore = 12;
    else debtScore = 6;

    // Total Composite Score
    const compositeScore = Math.round(savingsScore + budgetScore + debtScore);

    // Tier Label & Color
    let tierLabel = 'Optimal Prime';
    let tierColor = 'text-emerald-600 dark:text-emerald-400';
    let tierBg = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    let recommendation =
      'Outstanding liquidity management. Your 20%+ savings rate and controlled debt service position your household in top tier resilience.';

    if (compositeScore >= 80) {
      tierLabel = 'Prime / Resilient';
      tierColor = 'text-emerald-600 dark:text-emerald-400';
      tierBg = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      recommendation =
        'Excellent financial position. Maintain automated contributions to your emergency vault and consider accelerating remaining loan principal.';
    } else if (compositeScore >= 65) {
      tierLabel = 'Stable / Good';
      tierColor = 'text-blue-600 dark:text-blue-400';
      tierBg = 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
      recommendation =
        'Solid balance. To boost your score above 80, trim discretionary shopping expenses by 10% and allocate the surplus to reducing-balance debts.';
    } else if (compositeScore >= 50) {
      tierLabel = 'Moderate Caution';
      tierColor = 'text-amber-600 dark:text-amber-400';
      tierBg = 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      recommendation =
        'Elevated spending detected in non-essential categories. Review active budget caps and set strict daily savings targets to strengthen liquidity buffer.';
    } else {
      tierLabel = 'Attention Needed';
      tierColor = 'text-rose-600 dark:text-rose-400';
      tierBg = 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
      recommendation =
        'Debt obligations or overspends are straining current monthly income. Activate debt avalanche payoff and freeze non-essential project earmarks.';
    }

    return {
      compositeScore,
      savingsScore,
      budgetScore,
      debtScore,
      savingsRate,
      discretionaryRatio,
      tierLabel,
      tierColor,
      tierBg,
      recommendation,
    };
  }, [transactions, budgets, debts, categories, currentUser.id]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D111C] p-5.5 border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      {/* Background Accent Glow */}
      <div className="absolute right-0 top-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Financial Health Score</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${healthAnalysis.tierBg}`}>
                {healthAnalysis.tierLabel}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Monthly composite index derived from savings, debt ratio & budget compliance
            </span>
          </div>
        </div>

        {/* Circular / Score Gauge Indicator */}
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums flex items-baseline justify-end gap-1">
            <span className={healthAnalysis.tierColor}>{healthAnalysis.compositeScore}</span>
            <span className="text-xs text-slate-400 font-sans font-normal">/100</span>
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Composite Index</span>
        </div>
      </div>

      {/* 3 Pillar Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Pillar 1: Savings Rate */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Savings Rate</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
              {healthAnalysis.savingsScore}/35
            </strong>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(healthAnalysis.savingsScore / 35) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {healthAnalysis.savingsRate.toFixed(1)}% monthly net savings
          </span>
        </div>

        {/* Pillar 2: Budget Discipline */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Budget Discipline</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
              {healthAnalysis.budgetScore}/35
            </strong>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${(healthAnalysis.budgetScore / 35) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {healthAnalysis.discretionaryRatio.toFixed(0)}% discretionary spend
          </span>
        </div>

        {/* Pillar 3: Debt Management */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Debt Management</span>
            <strong className="text-blue-600 dark:text-blue-400 font-mono">
              {healthAnalysis.debtScore}/30
            </strong>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(healthAnalysis.debtScore / 30) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            Debt-to-income & repayment
          </span>
        </div>
      </div>

      {/* Dynamic Recommendation Box */}
      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-start gap-2.5 text-xs">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            Tailored Recommendation
          </span>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            {healthAnalysis.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
};
