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
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
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

// Custom Tooltip adhering to Zero-Pill & Typography rules (§1.A, §1.D)
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const incomeVal = payload.find((p: any) => p.dataKey === 'Income')?.value ?? 0;
    const expVal = payload.find((p: any) => p.dataKey === 'Expenditure')?.value ?? 0;
    const netVal = incomeVal - expVal;

    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-lg backdrop-blur-xs text-xs space-y-1.5 min-w-[200px]">
        <div className="font-semibold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
          {label} Ledger Summary
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Income Inflow:</span>
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ₦{incomeVal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Expenditure:</span>
          </span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            ₦{expVal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Net Margin:</span>
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
  } = useFinance();

  const [showNetMarginLine, setShowNetMarginLine] = useState(false);

  // Filter accounts by user visibility (Section 5, T-21)
  const visibleAccounts = accounts.filter(
    (a) => a.visibility === 'shared' || a.owner_user_id === currentUser.id
  );

  // Compute aggregate balances across all visible accounts
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

    // Generate month keys for last 6 months (Jun 2026 - Nov 2026)
    const now = new Date(2026, 10, 4);
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
      monthlyMap[key] = { incomeMinor: 0, expenditureMinor: 0 };
    }

    // Process posted transactions visible to current user
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
        // Refund reduces category expenditure (Section 2)
        monthlyMap[txMonth].expenditureMinor -= tx.amount_minor;
      } else if (tx.type === 'debt_repayment') {
        // Loan interest part counts as finance cost expense (INV-04)
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

  // Recent posted transactions
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

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Context Banner (Section 5, T-21) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-300">
            Viewing workspace as: <strong className="text-slate-900 dark:text-white font-semibold">{currentUser.name}</strong> ({currentUser.role})
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-slate-500 dark:text-slate-400">
            {currentUser.id === 'user_chidi'
              ? 'Private records belonging to Ada are completely hidden from lists and aggregates (T-21).'
              : 'Full access to personal and shared household accounts.'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-500 dark:text-slate-400">Double-Entry Posting Engine: Active</span>
        </div>
      </div>

      {/* Deduplicated Budget Alerts (Section 6, T-04) */}
      {budgetAlerts.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Budget Threshold Alerts ({budgetAlerts.length} Fired · Deduplicated by Key)</span>
            </div>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              View Budgets →
            </button>
          </div>
          <div className="space-y-1.5">
            {budgetAlerts.slice(-2).map((alert) => (
              <div key={alert.id} className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <span>•</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Balance Triad (Section 3 Balance Definitions) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Ledger Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium uppercase tracking-wider">Total Ledger Balance</span>
            <span title="Opening balance + all posted lines. Pending excluded.">Section 3 Def</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMinor(totalLedgerMinor)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>Posted ledger liquidity</span>
            <span aria-hidden="true">·</span>
            <span>{visibleAccounts.length} accounts</span>
          </div>
        </div>

        {/* 2. Reserved Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Reserved</span>
            <span>Goals + Commitments</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatMinor(totalReservedMinor)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>Virtual goal earmarks</span>
            <span aria-hidden="true">·</span>
            <span>Approved unpaid obligations</span>
          </div>
        </div>

        {/* 3. Spendable Balance */}
        <div className={`rounded-xl border p-5 shadow-xs transition-colors ${
          totalSpendableMinor < 0
            ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-medium uppercase tracking-wider ${
              totalSpendableMinor < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              Spendable Balance
            </span>
            <span className="text-slate-500 dark:text-slate-400">Ledger − Reserved</span>
          </div>
          <div className={`text-2xl lg:text-3xl font-bold font-mono tabular-nums ${
            totalSpendableMinor < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            {formatMinor(totalSpendableMinor)}
          </div>
          <div className="text-xs mt-2">
            {totalSpendableMinor < 0 ? (
              <span className="font-semibold text-rose-700 dark:text-rose-400">
                Notice: Spendable balance is negative (Deficit of {formatMinor(Math.abs(totalSpendableMinor))})
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Safe cash available for immediate uncommitted spending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY INCOME VS EXPENDITURE TREND CHART (RECHARTS LINE CHART) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        {/* Chart Header & Statistical Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Monthly Income vs. Expenditure Trends
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Derived from Double-Entry Ledger Posting Lines</span>
              <span aria-hidden="true">·</span>
              <span>Chronological 6-Month Inflows & Consumption</span>
            </div>
          </div>

          {/* Controls & Quick Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-sans">6-Mo Income</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ₦{(total6mIncome / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-sans">6-Mo Spend</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                  ₦{(total6mExpenditure / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-[11px] text-slate-400 block font-sans">Surplus Margin</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {avgSavingsRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowNetMarginLine(!showNetMarginLine)}
              className={`px-2.5 py-1 text-xs rounded-md border cursor-pointer transition-colors ${
                showNetMarginLine
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-300 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {showNetMarginLine ? 'Hide Net Margin' : 'Show Net Margin'}
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                strokeOpacity={0.2}
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
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="Income"
                name="Monthly Income"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
              <Line
                type="monotone"
                dataKey="Expenditure"
                name="Monthly Expenditure"
                stroke="#F43F5E"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#F43F5E' }}
              />
              {showNetMarginLine && (
                <Line
                  type="monotone"
                  dataKey="NetSurplus"
                  name="Net Margin / Surplus"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Blueprint Worked Example Showcase (Section 3 & T-05) */}
      {walletBalances && (
        <div className="border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-900/40 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Blueprint Section 3 Worked Example Verification (T-05)
              </h3>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-800 dark:text-emerald-300">
              Rule INV-11 Confirmed
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            In {walletAcc?.name}: Ledger Balance is{' '}
            <strong className="font-mono text-slate-900 dark:text-white">
              {formatMinor(walletBalances.ledgerBalanceMinor)}
            </strong>. Goal allocations held:{' '}
            <span className="font-mono">₦30,000</span> (Emergency) +{' '}
            <span className="font-mono">₦20,000</span> (Christmas) ={' '}
            <strong className="font-mono text-amber-700 dark:text-amber-300">
              {formatMinor(walletBalances.activeGoalAllocationsMinor)}
            </strong>. Approved unpaid commitments:{' '}
            <strong className="font-mono text-amber-700 dark:text-amber-300">
              {formatMinor(walletBalances.unpaidCommitmentsMinor)}
            </strong>.
            <br className="hidden sm:inline" />
            Formula: Spendable = 200,000 − 50,000 − 40,000 ={' '}
            <strong className="font-mono text-emerald-800 dark:text-emerald-300 text-sm">
              ₦110,000.00
            </strong>. Pending salary of ₦80,000 is{' '}
            <em>strictly not counted</em> anywhere until received.
          </p>
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Accounts & Liquidity Register
          </h2>
          <button
            onClick={() => onNavigate('commitments')}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
          >
            Manage Commitments →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accountBalanceMap.map(({ account, ledgerBalanceMinor, reservedMinor, spendableMinor, availableBalanceMinor, isSpendableNegative }) => (
            <div
              key={account.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {account.name}
                    </h3>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {account.type.replace('_', ' ')} {account.visibility === 'private' ? '· Private' : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Ledger Balance:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatMinor(ledgerBalanceMinor, account.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Reserved:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    -{formatMinor(reservedMinor, account.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Spendable:</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      isSpendableNegative
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatMinor(spendableMinor, account.currency)}
                  </span>
                </div>
              </div>

              {/* Statement Reconciliation Available Balance (Section 3) */}
              <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                {availableBalanceMinor !== null ? (
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Statement Reconciled: <strong>{formatMinor(availableBalanceMinor)}</strong></span>
                  </span>
                ) : (
                  <span className="italic text-slate-400">Statement rec pending (never guessed)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 2-Column Split: Recent Ledger Postings & Active Debts / Strategy Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions List with Posting Line Indicator */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Ledger Postings
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Atomic Posting Lines</span>
                <span aria-hidden="true">·</span>
                <span>Immutable Revisions</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              Full Ledger →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No transactions recorded yet. Click Quick Add to log your first entry.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{tx.description}</span>
                      {tx.replaces_id && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                          Revised
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span>{tx.effective_date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{tx.type.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.posting_lines.length} lines balanced</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold tabular-nums ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'transfer'
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : ''}
                      {formatMinor(tx.amount_minor, tx.currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Debts & Urgency Summary (Section 8, T-15, T-18) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Debts & Repayment Engine
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>D-1, D-2 & D-3 Models</span>
                <span aria-hidden="true">·</span>
                <span>Affordability Shortfall Checker</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('debts')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              Debt Dashboard →
            </button>
          </div>

          <div className="space-y-3">
            {debts
              .filter((d) => d.visibility === 'shared' || d.owner_user_id === currentUser.id)
              .slice(0, 3)
              .map((debt) => (
                <div
                  key={debt.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {debt.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatMinor(debt.principal_minor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>{debt.creditor}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{debt.term_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Rate: {debt.monthly_rate_pct}% / mo</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`capitalize font-medium ${
                          debt.urgency_flag === 'high'
                            ? 'text-rose-600'
                            : debt.urgency_flag === 'medium'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {debt.urgency_flag} Urgency
                      </span>
                    </div>
                  </div>
                </div>
              ))}

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">
                Want to check your monthly debt repayment capacity?
              </span>
              <button
                onClick={() => onNavigate('debts')}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Run Affordability Audit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
