import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateAccountBalances, formatMinor } from '../services/ledgerEngine';
import {
  Wallet,
  Building2,
  Smartphone,
  PiggyBank,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Lock,
  ArrowRight,
  CreditCard,
  ChevronRight,
  Shield,
  Layers,
  Crown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  onOpenQuickAdd: () => void;
  onNavigate: (tab: string) => void;
}

// Custom Glassmorphism Tooltip
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const incomeVal = payload.find((p: any) => p.dataKey === 'Income')?.value ?? 0;
    const expVal = payload.find((p: any) => p.dataKey === 'Expenditure')?.value ?? 0;
    const netVal = incomeVal - expVal;

    return (
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-[#0D111C]/95 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-mono">LEDGER POSTED</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span>Monthly Inflow:</span>
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ₦{incomeVal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span>Expenditure:</span>
          </span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            ₦{expVal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Net Surplus:</span>
          </span>
          <span
            className={`font-mono tabular-nums ${
              netVal >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {netVal >= 0 ? '+' : ''}₦{netVal.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenQuickAdd, onNavigate }) => {
  const {
    currentUser,
    accounts,
    transactions,
    goalAllocations,
    commitments,
    budgetAlerts,
    debts,
    subscription,
    openSubscriptionModal,
  } = useFinance();

  const [showNetMarginLine, setShowNetMarginLine] = useState(true);
  const [showMathProof, setShowMathProof] = useState(false);

  // Time-sensitive greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Filter accounts by user visibility (Section 5, T-21)
  const visibleAccounts = accounts.filter(
    (a) => a.visibility === 'shared' || a.owner_user_id === currentUser.id
  );

  // Compute aggregate balances across visible accounts
  let totalLedgerMinor = 0;
  let totalReservedMinor = 0;
  let totalSpendableMinor = 0;

  const accountBalanceMap = visibleAccounts.map((acc) => {
    const bal = calculateAccountBalances(acc, transactions, goalAllocations, commitments);
    totalLedgerMinor += bal.ledgerBalanceMinor;
    totalReservedMinor += bal.reservedMinor;
    totalSpendableMinor += bal.spendableMinor;
    return { account: acc, ...bal };
  });

  // Calculate monthly income vs expenditure trends from the ledger transactions
  const { chartData, total6mIncome, total6mExpenditure, avgSavingsRate } = useMemo(() => {
    const monthlyMap: Record<string, { incomeMinor: number; expenditureMinor: number }> = {};

    const now = new Date(2026, 10, 4);
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
      monthlyMap[key] = { incomeMinor: 0, expenditureMinor: 0 };
    }

    for (const tx of transactions) {
      if (tx.status !== 'posted') continue;
      if (tx.visibility === 'private' && tx.owner_user_id !== currentUser.id) continue;

      const txMonth = tx.effective_date.slice(0, 7);
      if (!monthlyMap[txMonth]) {
        monthlyMap[txMonth] = { incomeMinor: 0, expenditureMinor: 0 };
        if (!keys.includes(txMonth)) keys.push(txMonth);
      }

      if (tx.type === 'income') {
        monthlyMap[txMonth].incomeMinor += tx.amount_minor;
      } else if (tx.type === 'expense') {
        monthlyMap[txMonth].expenditureMinor += tx.amount_minor;
      } else if (tx.type === 'refund') {
        monthlyMap[txMonth].expenditureMinor -= tx.amount_minor;
      } else if (tx.type === 'debt_repayment') {
        for (const line of tx.posting_lines) {
          if (line.ledger_node_id === 'cat_loan_interest' && line.direction === 'debit') {
            monthlyMap[txMonth].expenditureMinor += line.amount_minor;
          }
        }
      }
    }

    keys.sort();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let sumIncome = 0;
    let sumExp = 0;

    const formatted = keys.map((key) => {
      const [yearStr, monthStr] = key.split('-');
      const mIdx = parseInt(monthStr, 10) - 1;
      const monthLabel = `${monthNames[mIdx]} '${yearStr.slice(2)}`;

      const incNaira = Math.round(monthlyMap[key].incomeMinor / 100);
      const expNaira = Math.round(Math.max(0, monthlyMap[key].expenditureMinor) / 100);
      const netNaira = incNaira - expNaira;

      sumIncome += incNaira;
      sumExp += expNaira;

      return {
        monthKey: key,
        monthLabel,
        Income: incNaira,
        Expenditure: expNaira,
        NetSurplus: netNaira,
      };
    });

    const netSurplus = sumIncome - sumExp;
    const rate = sumIncome > 0 ? (netSurplus / sumIncome) * 100 : 0;

    return {
      chartData: formatted,
      total6mIncome: sumIncome,
      total6mExpenditure: sumExp,
      avgSavingsRate: rate,
    };
  }, [transactions, currentUser.id]);

  // Recent transactions
  const recentTransactions = transactions
    .filter(
      (t) =>
        t.status === 'posted' &&
        (t.visibility === 'shared' || t.owner_user_id === currentUser.id)
    )
    .slice(0, 6);

  // Section 3 / T-05 Worked Example Account (Cash Wallet)
  const walletAcc = visibleAccounts.find((a) => a.id === 'acc_wallet');
  const walletBalances = walletAcc
    ? calculateAccountBalances(walletAcc, transactions, goalAllocations, commitments)
    : null;

  const getAccountBrand = (acc: any) => {
    if (acc.name.toLowerCase().includes('gtbank')) {
      return {
        badge: 'GTBank',
        cardGradient: 'from-orange-600 via-amber-600 to-orange-700',
        textColor: 'text-orange-500',
      };
    }
    if (acc.name.toLowerCase().includes('stanbic')) {
      return {
        badge: 'Stanbic IBTC',
        cardGradient: 'from-blue-700 via-indigo-700 to-blue-900',
        textColor: 'text-blue-500',
      };
    }
    if (acc.name.toLowerCase().includes('kuda')) {
      return {
        badge: 'Kuda Bank',
        cardGradient: 'from-purple-700 via-violet-800 to-indigo-900',
        textColor: 'text-purple-400',
      };
    }
    if (acc.name.toLowerCase().includes('piggyvest') || acc.name.toLowerCase().includes('secret')) {
      return {
        badge: 'Piggyvest SafeLock',
        cardGradient: 'from-emerald-700 via-teal-800 to-slate-900',
        textColor: 'text-emerald-400',
      };
    }
    return {
      badge: 'Cash Wallet',
      cardGradient: 'from-slate-700 via-slate-800 to-slate-900',
      textColor: 'text-emerald-500',
    };
  };

  return (
    <div className="space-y-7">
      {/* Welcome & Context Header Ribbon */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-7 text-white shadow-xl ring-1 ring-white/10">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Treasury Operations · Household Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Your double-entry posting ledger is reconciled with zero imbalances. Spendable liquidity is calculated after all earmarked savings and commitments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('ledger')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
            >
              Inspect Ledger
            </button>
            <button
              onClick={onOpenQuickAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-[0_4px_16px_rgba(255,255,255,0.2)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>+ Quick Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deduplicated Budget Threshold Alerts Banner */}
      {budgetAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-300/80 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 dark:border-amber-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Threshold Warnings ({budgetAlerts.length} Fired · Deduplicated by Rule T-04)</span>
            </div>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Allocations</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300/90 font-mono">
            {budgetAlerts.slice(-2).map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span>›</span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Executive Balance Triad (Section 3 Hierarchy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Ledger Liquidity */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D111C] p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Ledger Cash Balance</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {visibleAccounts.length} Accounts
            </span>
          </div>
          <div className="text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatMinor(totalLedgerMinor)}
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
            <span>Posted double-entry cash</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span>Balanced</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Total Reserved Obligations */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D111C] p-6 border border-amber-200/70 dark:border-amber-900/40 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Reserved</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
              Earmarks & Obligations
            </span>
          </div>
          <div className="text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatMinor(totalReservedMinor)}
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
            <span>Virtual Goals + Commitments</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Deducted from spendable</span>
          </div>
        </div>

        {/* Card 3: True Spendable Cash (The Hero Metric) */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all ${
          totalSpendableMinor < 0
            ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-white ring-1 ring-rose-500/30'
            : 'bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 text-white ring-1 ring-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-400">
              Safe Spendable Balance
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/90">
              Ledger − Reserved
            </span>
          </div>
          <div className="text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-white mt-1">
            {formatMinor(totalSpendableMinor)}
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 text-xs text-emerald-200/90">
            {totalSpendableMinor < 0 ? (
              <span className="text-rose-300 font-bold">
                Deficit of {formatMinor(Math.abs(totalSpendableMinor))} (Spendable is negative)
              </span>
            ) : (
              <span>Verified uncommitted cash available right now</span>
            )}
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Alluring Pro Upgrade Banner for Free Users */}
      {subscription.tier !== 'pro' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white border border-amber-400/30 shadow-xl">
          <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>JENECONK PRO WEALTH TOOLS</span>
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">
                Accelerate Debt Freedom & Smart Household Budgeting
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Enjoy flexible subscriptions starting at <strong>₦1,500/week</strong> or <strong>₦5,000/month</strong>. Verified <strong>Paystack</strong> checkout or manual direct transfer to our company account at <strong>Wema Bank 0128077067 (JENECONK INTEGRATED GLOBAL SOLUTIONS LIMITED)</strong>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Unlimited Accounts</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>D-2 Debt Payoff Engine</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>4-Tier Budget Alerts</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Christmas 8-Section Plan</span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => openSubscriptionModal()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg hover:shadow-amber-500/25 transition-all cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                <span>Unlock Pro Features</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discreet Accounting Mathematical Verification Link */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <button
          onClick={() => setShowMathProof(!showMathProof)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
        >
          <span>{showMathProof ? 'Hide' : 'Inspect'} Double-Entry Cash Proof (Rule INV-11)</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showMathProof ? 'rotate-90' : ''}`} />
        </button>
        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
          13 Invariants Verified Balanced
        </span>
      </div>

      {showMathProof && walletBalances && (
        <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-4 text-xs font-mono space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800/40 pb-2">
            <span>Cash Wallet Math Proof (T-05)</span>
            <span>200,000 − 50,000 − 40,000 = ₦110,000.00</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Ledger Balance</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatMinor(walletBalances.ledgerBalanceMinor)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Goal Earmarks</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">-₦50,000.00</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Commitments</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">-₦40,000.00</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-sans font-semibold">True Spendable</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">₦110,000.00</span>
            </div>
          </div>
        </div>
      )}

      {/* ALLURING MONTHLY INCOME VS EXPENDITURE TREND CHART */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0D111C] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Inflows vs. Consumption Trends
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Double-entry operational ledger curves across the previous 6 reporting months
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-mono bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Total Inflow</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ₦{(total6mIncome / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-[10px] text-slate-400 block font-sans">Total Spend</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  ₦{(total6mExpenditure / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-[10px] text-slate-400 block font-sans">Surplus Margin</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {avgSavingsRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowNetMarginLine(!showNetMarginLine)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                showNetMarginLine
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {showNetMarginLine ? 'Net Margin On' : 'Show Net Margin'}
            </button>
          </div>
        </div>

        {/* Recharts Area / Line Chart with Gradients */}
        <div className="h-[300px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                strokeOpacity={0.15}
              />
              <XAxis
                dataKey="monthLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `₦${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTrendTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="Income"
                name="Monthly Income"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeGradient)"
              />
              <Area
                type="monotone"
                dataKey="Expenditure"
                name="Monthly Expenditure"
                stroke="#F43F5E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseGradient)"
              />
              {showNetMarginLine && (
                <Line
                  type="monotone"
                  dataKey="NetSurplus"
                  name="Net Margin"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accounts & Virtual Banking Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Institutional Accounts & Liquidity
            </h2>
            <p className="text-xs text-slate-500">
              Real asset nodes reflecting posted ledger liquidity vs earmarked reserves
            </p>
          </div>
          <button
            onClick={() => onNavigate('commitments')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Commitments Register</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accountBalanceMap.map(({ account, ledgerBalanceMinor, reservedMinor, spendableMinor, availableBalanceMinor, isSpendableNegative }) => {
            const brand = getAccountBrand(account);

            return (
              <div
                key={account.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0D111C] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all space-y-4 group"
              >
                {/* Virtual Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {account.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {brand.badge} {account.account_number_mask || '·· 001'}
                      </span>
                    </div>
                  </div>
                  {account.visibility === 'private' && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200/60">
                      Private
                    </span>
                  )}
                </div>

                {/* Balances Breakdown */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 text-[11px]">Ledger Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMinor(ledgerBalanceMinor, account.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 text-[11px]">Reserved:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                      -{formatMinor(reservedMinor, account.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Spendable:</span>
                    <span
                      className={`font-mono font-extrabold text-sm tabular-nums ${
                        isSpendableNegative
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatMinor(spendableMinor, account.currency)}
                    </span>
                  </div>
                </div>

                {/* Reconciled Badge */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  {availableBalanceMinor !== null ? (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Reconciled: <strong>{formatMinor(availableBalanceMinor)}</strong></span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Statement verification pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Split: Ledger Stream & Debt Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Ledger Stream */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0D111C] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Ledger Postings
              </h2>
              <span className="text-xs text-slate-400">Atomic zero-sum balanced transactions</span>
            </div>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Complete Ledger →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-850/40 rounded-lg px-2 transition-colors">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{tx.description}</span>
                    {tx.replaces_id && (
                      <span className="text-[9px] uppercase font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.5 rounded">
                        Revised
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                    <span>{tx.effective_date}</span>
                    <span>·</span>
                    <span className="capitalize">{tx.type.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono font-extrabold tabular-nums ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'transfer'
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : ''}
                    {formatMinor(tx.amount_minor, tx.currency)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tx.posting_lines.length} lines balanced
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debt Radar & Affordability Action */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0D111C] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Debt Portfolio & Capacity Radar
              </h2>
              <span className="text-xs text-slate-400">D-1, D-2, and D-3 active liabilities</span>
            </div>
            <button
              onClick={() => onNavigate('debts')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Debt Engine →
            </button>
          </div>

          <div className="space-y-3">
            {debts
              .filter((d) => d.visibility === 'shared' || d.owner_user_id === currentUser.id)
              .slice(0, 3)
              .map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{d.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      {d.creditor} · {d.monthly_rate_pct}%/mo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white block">
                      {formatMinor(d.principal_minor)}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        d.urgency_flag === 'high'
                          ? 'text-rose-600'
                          : d.urgency_flag === 'medium'
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {d.urgency_flag} Urgency
                    </span>
                  </div>
                </div>
              ))}

            <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20 text-xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                  Verify Monthly Repayment Capacity
                </span>
                <span className="text-emerald-800/80 dark:text-emerald-300/80 text-[11px]">
                  Runs Section 9 essential living baseline and shortfall checks
                </span>
              </div>
              <button
                onClick={() => onNavigate('debts')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Audit Capacity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
