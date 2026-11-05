import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  generateAmortizationSchedule,
  calculateDebtStrategies,
} from '../services/debtEngine';
import { analyzeAffordability } from '../services/affordabilityEngine';
import { calculateDebtOutstandingBalance, formatMinor } from '../services/ledgerEngine';
import { Debt, DebtTermType } from '../types/finance';
import {
  ShieldAlert,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertOctagon,
  CheckCircle,
  Plus,
  Percent,
  Clock,
  Layers,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const DebtsView: React.FC = () => {
  const {
    debts,
    transactions,
    categories,
    budgets,
    commitments,
    savingsGoals,
    accounts,
    currentUser,
    addDebt,
    recordDebtPayment,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'register' | 'strategies' | 'affordability'>('register');
  const [selectedDebtForSchedule, setSelectedDebtForSchedule] = useState<Debt | null>(null);

  // New Debt Modal State
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [termType, setTermType] = useState<DebtTermType>('D-2_reducing_balance');
  const [principalNaira, setPrincipalNaira] = useState<number>(100000);
  const [monthlyRatePct, setMonthlyRatePct] = useState<number>(3.0);
  const [tenureMonths, setTenureMonths] = useState<number>(4);
  const [urgencyFlag, setUrgencyFlag] = useState<'high' | 'medium' | 'low'>('medium');
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared');

  // Record Repayment Modal State (Section 2, INV-04, T-17)
  const [repayingDebt, setRepayingDebt] = useState<Debt | null>(null);
  const [repaymentAccount, setRepaymentAccount] = useState<string>('');
  const [totalPaymentNaira, setTotalPaymentNaira] = useState<number>(26902.71);
  const [interestPartNaira, setInterestPartNaira] = useState<number>(3000);

  // Filter visible debts for user (Section 5, T-21)
  const visibleDebts = debts.filter(
    (d) => d.visibility === 'shared' || d.owner_user_id === currentUser.id
  );

  // Calculate outstanding balances strictly from posting lines
  const outstandingBalances: Record<string, number> = {};
  for (const d of visibleDebts) {
    const bal = calculateDebtOutstandingBalance(d.liability_node_id, transactions);
    outstandingBalances[d.id] = bal.outstandingBalanceMinor || d.principal_minor;
  }

  // Affordability analysis (Section 9, T-16)
  const affordability = analyzeAffordability({
    transactions,
    categories,
    budgets,
    commitments,
    savingsGoals,
    debts: visibleDebts,
    safetyBufferMinor: 2000000, // ₦20,000 buffer
  });

  // Strategy Comparison (Section 8, T-18)
  const strategies = calculateDebtStrategies(
    visibleDebts,
    outstandingBalances,
    affordability.monthlyRepaymentCapacityMinor
  );

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    addDebt({
      name: debtName,
      creditor,
      term_type: termType,
      principal_minor: Math.round(principalNaira * 100),
      monthly_rate_pct: termType === 'D-1_interest_free' ? 0 : monthlyRatePct,
      tenure_months: tenureMonths,
      start_date: new Date().toISOString().split('T')[0],
      urgency_flag: urgencyFlag,
      owner_user_id: currentUser.id,
      visibility,
      notes: `Recorded under ${termType}`,
    });

    setIsNewDebtOpen(false);
  };

  const handleOpenRepayment = (debt: Debt) => {
    setRepayingDebt(debt);
    const sched = generateAmortizationSchedule(debt);
    setTotalPaymentNaira(sched.regularMonthlyPaymentMinor / 100);
    // Suggest first month interest
    setInterestPartNaira((sched.rows[0]?.interest_minor || 0) / 100);
    const defaultBank = accounts.find((a) => a.type === 'bank') || accounts[0];
    if (defaultBank) setRepaymentAccount(defaultBank.id);
  };

  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingDebt || !repaymentAccount) return;

    recordDebtPayment(
      repayingDebt.id,
      repaymentAccount,
      Math.round(totalPaymentNaira * 100),
      Math.round(interestPartNaira * 100)
    );

    setRepayingDebt(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Debt Management & Affordability
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Blueprint Sections 7 & 8</span>
            <span aria-hidden="true">·</span>
            <span>Interest-Free, Reducing & Flat Rate</span>
            <span aria-hidden="true">·</span>
            <span>Kobo Amortization</span>
          </div>
        </div>

        <button
          onClick={() => setIsNewDebtOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Debt</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('register')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'register'
              ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Debt Register ({visibleDebts.length})
        </button>
        <button
          onClick={() => setActiveTab('strategies')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'strategies'
              ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Payoff Strategies (Avalanche / Snowball)
        </button>
        <button
          onClick={() => setActiveTab('affordability')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'affordability'
              ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Affordability Capacity (Section 9)</span>
          {!affordability.isAffordable && (
            <span className="w-2 h-2 rounded-full bg-rose-500" title="Shortfall detected" />
          )}
        </button>
      </div>

      {/* TAB 1: DEBT REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Flat Rate Stealth Cost Warning (Section 8) */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Section 8 Caution: Headline Rate vs True Borrowing Cost (T-14)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Under D-3 Flat Rate, ₦100,000 at 3%/month costs{' '}
              <strong className="font-mono text-rose-700 dark:text-rose-400">₦12,000 in interest</strong>,
              whereas the same 3% under D-2 Reducing Balance costs only{' '}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">₦7,610.82</strong>.
              KoboLedger always displays the full cash cost so you avoid predatory fintech terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleDebts.map((debt) => {
              const schedule = generateAmortizationSchedule(debt);
              const outstandingMinor = outstandingBalances[debt.id] ?? debt.principal_minor;

              return (
                <div
                  key={debt.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {debt.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>Creditor: {debt.creditor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{debt.term_type.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                        debt.urgency_flag === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                          : debt.urgency_flag === 'medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {debt.urgency_flag} Urgency
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block">Principal</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatMinor(debt.principal_minor)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Monthly Payment</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMinor(schedule.regularMonthlyPaymentMinor)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Interest</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatMinor(schedule.totalInterestMinor)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => setSelectedDebtForSchedule(debt)}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>View Amortization Schedule (T-14)</span>
                    </button>
                    <button
                      onClick={() => handleOpenRepayment(debt)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-md font-semibold cursor-pointer transition-colors"
                    >
                      Record Payment (T-17)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PAYOFF STRATEGIES (AVALANCHE VS SNOWBALL VS SMART PRIORITY) */}
      {activeTab === 'strategies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[strategies.avalanche, strategies.snowball, strategies.smartPriority].map((strat) => (
              <div
                key={strat.strategyName}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {strat.title}
                  </h3>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {strat.strategyName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[3rem]">
                  {strat.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Total Interest:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatMinor(strat.totalInterestMinor)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payoff Timeline:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {strat.monthsToDebtFree} Months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Minimum Total:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatMinor(strat.monthlyMinimumTotalMinor)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Payoff Sequence:
                  </span>
                  <ol className="text-xs space-y-1 text-slate-700 dark:text-slate-300 list-decimal list-inside">
                    {strat.orderedDebts.map((d) => (
                      <li key={d.id} className="truncate">
                        {d.name} ({d.monthly_rate_pct}%/mo)
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AFFORDABILITY CAPACITY AUDIT (SECTION 9, T-16) */}
      {activeTab === 'affordability' && (
        <div className="space-y-5">
          {/* Shortfall Verdict Card */}
          <div
            className={`p-5 rounded-xl border ${
              affordability.isAffordable
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                : 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/30 dark:border-rose-900'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {affordability.isAffordable ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <h3
                    className={`text-base font-bold ${
                      affordability.isAffordable
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {affordability.isAffordable
                      ? 'Plan Verified Affordable'
                      : 'Shortfall Rule Triggered: Plan Not Affordable (T-16)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  {affordability.verdictMessage}
                </p>
              </div>

              {!affordability.isAffordable && (
                <div className="text-right shrink-0">
                  <span className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400 font-semibold block">
                    Monthly Shortfall
                  </span>
                  <span className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums">
                    {formatMinor(affordability.shortfallMinor)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 9 Formula Inputs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Audited Affordability Parameters (Section 9 Specification)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Lists every input, verified source, and determination timestamp.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3">Source & Method</th>
                    <th className="py-2.5 px-3">Effective Date</th>
                    <th className="py-2.5 px-3 text-right">Value (₦ NGN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {affordability.inputsList.map((inp) => (
                    <tr key={inp.name}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {inp.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{inp.source}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{inp.date}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${
                          inp.isDeduction
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {inp.isDeduction ? '-' : '+'}
                        {formatMinor(inp.amountMinor)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 font-bold">
                    <td colSpan={3} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      Calculated Monthly Repayment Capacity:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white tabular-nums">
                      {formatMinor(affordability.monthlyRepaymentCapacityMinor)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/80 dark:bg-slate-850/80 font-bold">
                    <td colSpan={3} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      Total Monthly Debt Minimum Obligations:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatMinor(affordability.totalDebtMinimumsMinor)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AMORTIZATION SCHEDULE MODAL (T-14) */}
      {selectedDebtForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Amortization Schedule: {selectedDebtForSchedule.name}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedDebtForSchedule.term_type.replace(/_/g, ' ')} · Kobo-exact with residual absorption
                </span>
              </div>
              <button
                onClick={() => setSelectedDebtForSchedule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const sched = generateAmortizationSchedule(selectedDebtForSchedule);
              return (
                <div className="space-y-4 text-xs font-mono">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 uppercase">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2 px-3">Month</th>
                          <th className="py-2 px-3 text-right">Opening</th>
                          <th className="py-2 px-3 text-right">Interest</th>
                          <th className="py-2 px-3 text-right">Principal</th>
                          <th className="py-2 px-3 text-right">Payment</th>
                          <th className="py-2 px-3 text-right">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sched.rows.map((row) => (
                          <tr key={row.month} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3">{row.month}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{formatMinor(row.opening_balance_minor)}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-amber-600">{formatMinor(row.interest_minor)}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{formatMinor(row.principal_minor)}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-600">{formatMinor(row.payment_minor)}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{formatMinor(row.closing_balance_minor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-sans">
                    <span>Total Paid: <strong>{formatMinor(sched.totalRepaymentMinor)}</strong></span>
                    <span>Total Interest: <strong>{formatMinor(sched.totalInterestMinor)}</strong></span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* RECORD DEBT REPAYMENT MODAL (INV-04, T-17) */}
      {repayingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Record Debt Repayment (INV-04, T-17)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Posting splits principal reduction (reduces liability) from interest (finance cost).
              </p>
            </div>

            <form onSubmit={handleSaveRepayment} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Source Bank/Wallet Account
                </label>
                <select
                  value={repaymentAccount}
                  onChange={(e) => setRepaymentAccount(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Total Payment Amount (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={totalPaymentNaira || ''}
                  onChange={(e) => setTotalPaymentNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Interest Cost Component (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={interestPartNaira || ''}
                  onChange={(e) => setInterestPartNaira(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Principal reduction: {formatMinor(Math.max(0, (totalPaymentNaira - interestPartNaira) * 100))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRepayingDebt(null)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Post Repayment (T-17)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW DEBT MODAL */}
      {isNewDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Register New Debt / Loan
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose the term structure (Interest-free, Reducing balance, Flat rate, or Daily rate).
              </p>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    placeholder="e.g. Asset Finance Loan"
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Creditor
                  </label>
                  <input
                    type="text"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    placeholder="e.g. GTBank, Kuda, Friend"
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Term Model (Section 8)
                </label>
                <select
                  value={termType}
                  onChange={(e) => setTermType(e.target.value as DebtTermType)}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="D-1_interest_free">D-1: Interest-Free (0% Interest)</option>
                  <option value="D-2_reducing_balance">D-2: Reducing Balance (True Monthly Amortization)</option>
                  <option value="D-3_flat_rate">D-3: Flat Rate (Full Term Spread)</option>
                  <option value="D-4_daily_rate">D-4: Daily Rate Digital Loan</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Principal (₦)
                  </label>
                  <input
                    type="number"
                    value={principalNaira || ''}
                    onChange={(e) => setPrincipalNaira(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Rate (% / month)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={termType === 'D-1_interest_free'}
                    value={termType === 'D-1_interest_free' ? 0 : monthlyRatePct}
                    onChange={(e) => setMonthlyRatePct(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    value={tenureMonths || ''}
                    onChange={(e) => setTenureMonths(parseInt(e.target.value) || 1)}
                    className="w-full p-2 font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Urgency Flag
                  </label>
                  <select
                    value={urgencyFlag}
                    onChange={(e) => setUrgencyFlag(e.target.value as any)}
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="low">Low Urgency (Family / Friendly)</option>
                    <option value="medium">Medium Urgency (Standard Bank)</option>
                    <option value="high">High Urgency (Aggressive / Legal)</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Visibility (Section 5)
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="shared">Shared with Household</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewDebtOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Record Debt & Drawdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
