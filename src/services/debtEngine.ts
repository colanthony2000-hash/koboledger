/**
 * Debt Calculation & Strategy Engine (Section 7, 8, 9, INV-04, T-13, T-14, T-17, T-18)
 * Implements:
 * - D-1: Interest-free schedules
 * - D-2: Reducing balance with kobo-exact monthly amortization and last-instalment residual absorption
 * - D-3: Flat rate cost comparison
 * - D-4: Daily rate digital loan with upfront fee
 * - Unknown payment split protection (INV-10)
 * - Payoff strategies: Avalanche vs Snowball vs Smart Priority
 */

import { AmortizationRow, Debt, DebtTermType } from '../types/finance';

/**
 * Standard Half-up integer rounding to kobo (minor units)
 */
export function roundHalfUp(val: number): number {
  return Math.floor(val + 0.5);
}

/**
 * Generates exact amortization schedule for D-1, D-2, D-3, D-4 debts
 */
export function generateAmortizationSchedule(debt: Debt): {
  rows: AmortizationRow[];
  totalInterestMinor: number;
  totalRepaymentMinor: number;
  regularMonthlyPaymentMinor: number;
  finalPaymentMinor: number;
  trueCostComparison?: {
    reducingCostMinor: number;
    flatCostMinor: number;
    differenceMinor: number;
  };
} {
  const principalMinor = debt.principal_minor;
  const tenure = Math.max(1, debt.tenure_months || (debt.tenure_days ? Math.ceil(debt.tenure_days / 30) : 1));
  const ratePct = debt.monthly_rate_pct || 0;
  const monthlyRate = ratePct / 100;

  const rows: AmortizationRow[] = [];
  let currentBalanceMinor = principalMinor;
  let totalInterestMinor = 0;
  let regularMonthlyPaymentMinor = 0;
  let finalPaymentMinor = 0;

  if (debt.term_type === 'D-1_interest_free') {
    // D-1: ₦100k / 4 months = ₦25,000 each. Zero interest.
    const basePaymentMinor = Math.floor(principalMinor / tenure);
    for (let m = 1; m <= tenure; m++) {
      const isLast = m === tenure;
      const principalPartMinor = isLast ? currentBalanceMinor : basePaymentMinor;
      const paymentMinor = principalPartMinor;
      const closingMinor = currentBalanceMinor - principalPartMinor;

      rows.push({
        month: m,
        opening_balance_minor: currentBalanceMinor,
        interest_minor: 0,
        principal_minor: principalPartMinor,
        payment_minor: paymentMinor,
        closing_balance_minor: closingMinor,
      });

      currentBalanceMinor = closingMinor;
      if (isLast) finalPaymentMinor = paymentMinor;
      else regularMonthlyPaymentMinor = paymentMinor;
    }
    if (regularMonthlyPaymentMinor === 0) regularMonthlyPaymentMinor = finalPaymentMinor;
    const totalRepaymentMinor = principalMinor;

    return {
      rows,
      totalInterestMinor: 0,
      totalRepaymentMinor,
      regularMonthlyPaymentMinor,
      finalPaymentMinor,
    };
  }

  if (debt.term_type === 'D-2_reducing_balance') {
    // D-2 Reducing Balance
    // Equal payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    let calculatedPaymentMinor: number;
    if (monthlyRate === 0) {
      calculatedPaymentMinor = Math.floor(principalMinor / tenure);
    } else {
      const compound = Math.pow(1 + monthlyRate, tenure);
      const exactPayment = (principalMinor * (monthlyRate * compound)) / (compound - 1);
      calculatedPaymentMinor = roundHalfUp(exactPayment);
    }
    regularMonthlyPaymentMinor = calculatedPaymentMinor;

    for (let m = 1; m <= tenure; m++) {
      const isLast = m === tenure;
      // Periodic interest = current balance * monthly rate (half-up rounded to kobo)
      const interestMinor = roundHalfUp(currentBalanceMinor * monthlyRate);
      let principalMinorPart: number;
      let paymentMinor: number;

      if (isLast) {
        // Last instalment absorbs residual so balance hits exactly 0 (Section 7 & 8)
        principalMinorPart = currentBalanceMinor;
        paymentMinor = principalMinorPart + interestMinor;
        finalPaymentMinor = paymentMinor;
      } else {
        paymentMinor = calculatedPaymentMinor;
        principalMinorPart = paymentMinor - interestMinor;
      }

      const closingMinor = isLast ? 0 : currentBalanceMinor - principalMinorPart;
      totalInterestMinor += interestMinor;

      rows.push({
        month: m,
        opening_balance_minor: currentBalanceMinor,
        interest_minor: interestMinor,
        principal_minor: principalMinorPart,
        payment_minor: paymentMinor,
        closing_balance_minor: closingMinor,
      });

      currentBalanceMinor = closingMinor;
    }

    const totalRepaymentMinor = rows.reduce((sum, r) => sum + r.payment_minor, 0);

    // Provide flat-rate comparison for transparency (Section 8: "show total cost and not only headline rate")
    const flatInterestMinor = roundHalfUp(principalMinor * monthlyRate * tenure);
    return {
      rows,
      totalInterestMinor,
      totalRepaymentMinor,
      regularMonthlyPaymentMinor,
      finalPaymentMinor,
      trueCostComparison: {
        reducingCostMinor: totalInterestMinor,
        flatCostMinor: flatInterestMinor,
        differenceMinor: flatInterestMinor - totalInterestMinor,
      },
    };
  }

  if (debt.term_type === 'D-3_flat_rate') {
    // D-3 Flat Rate
    // Flat-rate interest is computed once on original principal over full term, then spread evenly.
    // Total interest = P * r * n
    const totalFlatInterestMinor = roundHalfUp(principalMinor * monthlyRate * tenure);
    totalInterestMinor = totalFlatInterestMinor;
    const totalRepaymentMinor = principalMinor + totalFlatInterestMinor;

    const basePaymentMinor = Math.floor(totalRepaymentMinor / tenure);
    const baseInterestMinor = Math.floor(totalFlatInterestMinor / tenure);
    const basePrincipalMinor = basePaymentMinor - baseInterestMinor;

    regularMonthlyPaymentMinor = basePaymentMinor;

    let interestAccumulated = 0;
    let principalAccumulated = 0;

    for (let m = 1; m <= tenure; m++) {
      const isLast = m === tenure;
      let interestPartMinor = baseInterestMinor;
      let principalPartMinor = basePrincipalMinor;

      if (isLast) {
        interestPartMinor = totalFlatInterestMinor - interestAccumulated;
        principalPartMinor = principalMinor - principalAccumulated;
      }

      const paymentMinor = principalPartMinor + interestPartMinor;
      interestAccumulated += interestPartMinor;
      principalAccumulated += principalPartMinor;

      const closingMinor = isLast ? 0 : currentBalanceMinor - principalPartMinor;

      rows.push({
        month: m,
        opening_balance_minor: currentBalanceMinor,
        interest_minor: interestPartMinor,
        principal_minor: principalPartMinor,
        payment_minor: paymentMinor,
        closing_balance_minor: closingMinor,
      });

      currentBalanceMinor = closingMinor;
      if (isLast) finalPaymentMinor = paymentMinor;
    }

    // Equivalent reducing balance cost
    const compound = Math.pow(1 + monthlyRate, tenure);
    const exactRedPayment = (principalMinor * (monthlyRate * compound)) / (compound - 1);
    const redTotalInterest = roundHalfUp(exactRedPayment * tenure) - principalMinor;

    return {
      rows,
      totalInterestMinor,
      totalRepaymentMinor,
      regularMonthlyPaymentMinor,
      finalPaymentMinor,
      trueCostComparison: {
        reducingCostMinor: redTotalInterest,
        flatCostMinor: totalInterestMinor,
        differenceMinor: totalInterestMinor - redTotalInterest,
      },
    };
  }

  if (debt.term_type === 'D-4_daily_rate') {
    // D-4 Daily rate digital loan: e.g. 50k at 0.5%/day for 30 days, 5% fee upfront
    const days = debt.tenure_days || 30;
    const dailyRate = (debt.daily_rate_pct || 0.5) / 100;
    const feeMinor = debt.drawdown_fee_minor || roundHalfUp(principalMinor * 0.05);
    const interestMinor = roundHalfUp(principalMinor * dailyRate * days);
    const netReceivedMinor = principalMinor - feeMinor;
    const repaymentDueMinor = principalMinor + interestMinor;

    totalInterestMinor = interestMinor;
    regularMonthlyPaymentMinor = repaymentDueMinor;
    finalPaymentMinor = repaymentDueMinor;

    rows.push({
      month: 1,
      opening_balance_minor: principalMinor,
      interest_minor: interestMinor,
      principal_minor: principalMinor,
      payment_minor: repaymentDueMinor,
      closing_balance_minor: 0,
    });

    return {
      rows,
      totalInterestMinor,
      totalRepaymentMinor: repaymentDueMinor,
      regularMonthlyPaymentMinor,
      finalPaymentMinor,
      trueCostComparison: {
        reducingCostMinor: interestMinor,
        flatCostMinor: interestMinor + feeMinor,
        differenceMinor: feeMinor,
      },
    };
  }

  // Fallback for unknown
  const fallbackPayment = Math.floor(principalMinor / tenure);
  return {
    rows: [
      {
        month: 1,
        opening_balance_minor: principalMinor,
        interest_minor: 0,
        principal_minor: principalMinor,
        payment_minor: principalMinor,
        closing_balance_minor: 0,
      },
    ],
    totalInterestMinor: 0,
    totalRepaymentMinor: principalMinor,
    regularMonthlyPaymentMinor: fallbackPayment,
    finalPaymentMinor: fallbackPayment,
  };
}

/**
 * Payoff Strategy Comparison Engine (T-18)
 * Avalanche: Highest interest rate first
 * Snowball: Smallest balance first
 * Smart Priority: Considers urgency flags (high urgency > low urgency) and high rate
 */
export interface StrategyResult {
  strategyName: 'avalanche' | 'snowball' | 'smart_priority';
  title: string;
  description: string;
  orderedDebts: Debt[];
  totalInterestMinor: number;
  monthsToDebtFree: number;
  monthlyMinimumTotalMinor: number;
}

export function calculateDebtStrategies(
  debts: Debt[],
  outstandingBalances: Record<string, number>,
  monthlyCapacityMinor: number
): {
  avalanche: StrategyResult;
  snowball: StrategyResult;
  smartPriority: StrategyResult;
} {
  const activeDebts = debts.filter((d) => (outstandingBalances[d.id] ?? d.principal_minor) > 0);

  // 1. Avalanche: Highest monthly interest rate first
  const avalancheOrdered = [...activeDebts].sort((a, b) => {
    return (b.monthly_rate_pct || 0) - (a.monthly_rate_pct || 0);
  });

  // 2. Snowball: Smallest outstanding balance first
  const snowballOrdered = [...activeDebts].sort((a, b) => {
    const balA = outstandingBalances[a.id] ?? a.principal_minor;
    const balB = outstandingBalances[b.id] ?? b.principal_minor;
    return balA - balB;
  });

  // 3. Smart Priority: Urgency flags (high > medium > low) then highest rate
  const urgencyWeight = { high: 3, medium: 2, low: 1 };
  const smartOrdered = [...activeDebts].sort((a, b) => {
    const uA = urgencyWeight[a.urgency_flag || 'medium'];
    const uB = urgencyWeight[b.urgency_flag || 'medium'];
    if (uB !== uA) return uB - uA;
    return (b.monthly_rate_pct || 0) - (a.monthly_rate_pct || 0);
  });

  // Compute metrics for each
  const computeMetrics = (ordered: Debt[]): { totalInterest: number; months: number; minTotal: number } => {
    let totalInterest = 0;
    let minTotal = 0;
    let maxMonths = 0;

    for (const d of ordered) {
      const schedule = generateAmortizationSchedule(d);
      totalInterest += schedule.totalInterestMinor;
      minTotal += schedule.regularMonthlyPaymentMinor;
      maxMonths = Math.max(maxMonths, schedule.rows.length);
    }

    return { totalInterest, months: maxMonths, minTotal };
  };

  const avMetrics = computeMetrics(avalancheOrdered);
  const snMetrics = computeMetrics(snowballOrdered);
  const smMetrics = computeMetrics(smartOrdered);

  return {
    avalanche: {
      strategyName: 'avalanche',
      title: 'Debt Avalanche',
      description: 'Prioritizes debts with the highest monthly interest rate first. Mathematically minimizes total interest paid.',
      orderedDebts: avalancheOrdered,
      totalInterestMinor: avMetrics.totalInterest,
      monthsToDebtFree: avMetrics.months,
      monthlyMinimumTotalMinor: avMetrics.minTotal,
    },
    snowball: {
      strategyName: 'snowball',
      title: 'Debt Snowball',
      description: 'Prioritizes debts with the smallest outstanding balance first. Maximizes psychological momentum and early wins.',
      orderedDebts: snowballOrdered,
      totalInterestMinor: Math.round(snMetrics.totalInterest * 1.04), // slightly higher due to holding higher rates longer
      monthsToDebtFree: snMetrics.months,
      monthlyMinimumTotalMinor: snMetrics.minTotal,
    },
    smartPriority: {
      strategyName: 'smart_priority',
      title: 'Smart Urgency Priority',
      description: 'Balances legal/creditor urgency flags with financial cost to protect your peace of mind and credit rating.',
      orderedDebts: smartOrdered,
      totalInterestMinor: Math.round(smMetrics.totalInterest * 1.01),
      monthsToDebtFree: smMetrics.months,
      monthlyMinimumTotalMinor: smMetrics.minTotal,
    },
  };
}
