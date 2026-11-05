/**
 * Ledger Engine for KoboLedger
 * Strictly enforces double-entry posting-line rules, zero-sum balancing (INV-13, T-23),
 * immutable revision chains (Section 6), and 3-tier balance definitions (Section 3).
 */

import {
  Account,
  Commitment,
  Currency,
  GoalAllocation,
  LineDirection,
  PostingLine,
  Transaction,
  TransactionType,
  AuditLog,
} from '../types/finance';

export const EQUITY_NODE_ID = 'node_equity_opening';
export const FINANCE_COST_CATEGORY_ID = 'cat_financial_costs';
export const LOAN_INTEREST_CATEGORY_ID = 'cat_loan_interest';

/**
 * Validates that posting lines for a transaction sum to exactly zero (INV-13, T-23).
 * Within one transaction and one currency, Sum(Debits) must equal Sum(Credits).
 */
export function validateTransactionBalance(lines: PostingLine[]): {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  error?: string;
} {
  if (!lines || lines.length < 2) {
    return {
      isValid: false,
      totalDebits: 0,
      totalCredits: 0,
      error: 'Transaction must contain at least two posting lines (Section 2).',
    };
  }

  // Group by currency
  const currencies = Array.from(new Set(lines.map((l) => l.currency)));
  if (currencies.length > 1) {
    return {
      isValid: false,
      totalDebits: 0,
      totalCredits: 0,
      error: 'Multi-currency single transactions rejected without explicit conversion (INV-09, T-19).',
    };
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    if (line.amount_minor <= 0) {
      return {
        isValid: false,
        totalDebits,
        totalCredits,
        error: `Posting line ${line.id} amount must be positive minor units (got ${line.amount_minor}).`,
      };
    }

    if (line.direction === 'debit') {
      totalDebits += line.amount_minor;
    } else if (line.direction === 'credit') {
      totalCredits += line.amount_minor;
    }
  }

  const isValid = totalDebits === totalCredits;
  return {
    isValid,
    totalDebits,
    totalCredits,
    error: isValid
      ? undefined
      : `Unbalanced transaction: Debits (${totalDebits}) do not equal Credits (${totalCredits}). Net difference: ${totalDebits - totalCredits} minor units.`,
  };
}

/**
 * Generates posting lines for standard transaction templates
 */
export function buildPostingLinesForTemplate(params: {
  transactionId: string;
  type: TransactionType;
  amountMinor: number;
  currency: Currency;
  accountId?: string;
  destinationAccountId?: string;
  categoryId?: string;
  debtLiabilityNodeId?: string;
  interestMinor?: number;
  feeMinor?: number;
}): PostingLine[] {
  const {
    transactionId,
    type,
    amountMinor,
    currency,
    accountId,
    destinationAccountId,
    categoryId,
    debtLiabilityNodeId,
    interestMinor = 0,
    feeMinor = 0,
  } = params;

  const lines: PostingLine[] = [];

  switch (type) {
    case 'expense':
      // Debit Category (Expense increases), Credit Account (Asset decreases)
      if (!categoryId || !accountId) throw new Error('Expense requires categoryId and accountId');
      lines.push({
        id: `${transactionId}_line_1`,
        transaction_id: transactionId,
        ledger_node_id: categoryId,
        node_type: 'category',
        direction: 'debit',
        amount_minor: amountMinor,
        currency,
      });
      lines.push({
        id: `${transactionId}_line_2`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'income':
      // Debit Account (Asset increases), Credit Category (Income increases)
      if (!accountId || !categoryId) throw new Error('Income requires accountId and categoryId');
      lines.push({
        id: `${transactionId}_line_1`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'debit',
        amount_minor: amountMinor,
        currency,
      });
      lines.push({
        id: `${transactionId}_line_2`,
        transaction_id: transactionId,
        ledger_node_id: categoryId,
        node_type: 'category',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'transfer':
      // Debit Destination Account (Asset increases), Credit Source Account (Asset decreases)
      // INV-02: Transfers between own accounts are never income or spending!
      if (!accountId || !destinationAccountId) throw new Error('Transfer requires source and destination accounts');
      lines.push({
        id: `${transactionId}_line_1`,
        transaction_id: transactionId,
        ledger_node_id: destinationAccountId,
        node_type: 'account',
        direction: 'debit',
        amount_minor: amountMinor,
        currency,
      });
      lines.push({
        id: `${transactionId}_line_2`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'debt_drawdown':
      // Debit Bank (Net received), Debit Expense: Financial costs (Upfront fee), Credit Liability (Total debt)
      // Example Section 2: Drawdown ₦50,000 with ₦2,500 fee:
      // Debit Bank 47,500, Debit Expense: Financial costs 2,500 / Credit Liability: debt 50,000
      if (!accountId || !debtLiabilityNodeId) throw new Error('Debt drawdown requires accountId and debtLiabilityNodeId');
      const netCashMinor = amountMinor - feeMinor;
      if (netCashMinor < 0) throw new Error('Fee cannot exceed loan amount');

      if (netCashMinor > 0) {
        lines.push({
          id: `${transactionId}_line_1`,
          transaction_id: transactionId,
          ledger_node_id: accountId,
          node_type: 'account',
          direction: 'debit',
          amount_minor: netCashMinor,
          currency,
        });
      }

      if (feeMinor > 0) {
        lines.push({
          id: `${transactionId}_line_fee`,
          transaction_id: transactionId,
          ledger_node_id: FINANCE_COST_CATEGORY_ID,
          node_type: 'category',
          direction: 'debit',
          amount_minor: feeMinor,
          currency,
        });
      }

      lines.push({
        id: `${transactionId}_line_liability`,
        transaction_id: transactionId,
        ledger_node_id: debtLiabilityNodeId,
        node_type: 'debt_liability',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'debt_repayment':
      // Debit Liability (Principal repaid), Debit Expense: Loan interest (Interest paid), Credit Bank (Total payment)
      // Example Section 2: Repayment ₦26,902.71 (principal 23,902.71, interest 3,000.00):
      // Debit Liability 23,902.71, Debit Expense: Loan interest 3,000.00 / Credit Bank 26,902.71
      if (!accountId || !debtLiabilityNodeId) throw new Error('Debt repayment requires accountId and debtLiabilityNodeId');
      const principalPaidMinor = amountMinor - interestMinor;
      if (principalPaidMinor < 0) throw new Error('Interest cannot exceed total payment');

      if (principalPaidMinor > 0) {
        lines.push({
          id: `${transactionId}_line_prin`,
          transaction_id: transactionId,
          ledger_node_id: debtLiabilityNodeId,
          node_type: 'debt_liability',
          direction: 'debit',
          amount_minor: principalPaidMinor,
          currency,
        });
      }

      if (interestMinor > 0) {
        lines.push({
          id: `${transactionId}_line_int`,
          transaction_id: transactionId,
          ledger_node_id: LOAN_INTEREST_CATEGORY_ID,
          node_type: 'category',
          direction: 'debit',
          amount_minor: interestMinor,
          currency,
        });
      }

      lines.push({
        id: `${transactionId}_line_bank`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'refund':
      // Debit Account (Asset increases), Credit Category: Expense (Reduces that category's spend)
      if (!accountId || !categoryId) throw new Error('Refund requires accountId and categoryId');
      lines.push({
        id: `${transactionId}_line_1`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'debit',
        amount_minor: amountMinor,
        currency,
      });
      lines.push({
        id: `${transactionId}_line_2`,
        transaction_id: transactionId,
        ledger_node_id: categoryId,
        node_type: 'category',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;

    case 'opening_balance':
      // Debit Account, Credit Equity Node
      if (!accountId) throw new Error('Opening balance requires accountId');
      lines.push({
        id: `${transactionId}_line_1`,
        transaction_id: transactionId,
        ledger_node_id: accountId,
        node_type: 'account',
        direction: 'debit',
        amount_minor: amountMinor,
        currency,
      });
      lines.push({
        id: `${transactionId}_line_2`,
        transaction_id: transactionId,
        ledger_node_id: EQUITY_NODE_ID,
        node_type: 'equity',
        direction: 'credit',
        amount_minor: amountMinor,
        currency,
      });
      break;
  }

  // Validate double-entry balance immediately (T-23)
  const validation = validateTransactionBalance(lines);
  if (!validation.isValid) {
    throw new Error(`Database rejected unbalanced posting lines: ${validation.error}`);
  }

  return lines;
}

/**
 * Calculates Account Balances per Section 3:
 * 1. Ledger balance = opening balance plus all posted lines on the account (Pending and planned excluded).
 * 2. Reserved = goal allocations held in that account + unpaid approved commitments (Section 4).
 * 3. Spendable balance = ledger balance minus reserved. May be negative (UI notes in words).
 * 4. Available balance = only from trusted reconciliation. Never guessed.
 */
export function calculateAccountBalances(
  account: Account,
  transactions: Transaction[],
  allocations: GoalAllocation[],
  commitments: Commitment[]
): {
  ledgerBalanceMinor: number;
  reservedMinor: number;
  spendableMinor: number;
  availableBalanceMinor: number | null;
  activeGoalAllocationsMinor: number;
  unpaidCommitmentsMinor: number;
  isSpendableNegative: boolean;
} {
  // Only posted transactions affect the ledger (INV-01, INV-05, INV-12)
  let ledgerBalanceMinor = 0;

  for (const tx of transactions) {
    if (tx.status !== 'posted') continue;
    for (const line of tx.posting_lines) {
      if (line.ledger_node_id === account.id) {
        if (line.direction === 'debit') {
          // For asset accounts (Bank, Wallet, Cash), Debits increase balance
          ledgerBalanceMinor += line.amount_minor;
        } else if (line.direction === 'credit') {
          // Credits decrease asset balance
          ledgerBalanceMinor -= line.amount_minor;
        }
      }
    }
  }

  // Reserved: Goal allocations held in that account
  const activeGoalAllocationsMinor = allocations
    .filter((a) => a.account_id === account.id)
    .reduce((sum, a) => sum + a.allocated_minor, 0);

  // Reserved: Approved unpaid commitments for this account
  const unpaidCommitmentsMinor = commitments
    .filter((c) => c.account_id === account.id && c.status === 'approved')
    .reduce((sum, c) => sum + c.amount_minor, 0);

  const reservedMinor = activeGoalAllocationsMinor + unpaidCommitmentsMinor;
  const spendableMinor = ledgerBalanceMinor - reservedMinor;
  const isSpendableNegative = spendableMinor < 0;

  // Available balance is only shown if reconciled via trusted manual reconciliation (Section 3)
  const availableBalanceMinor = account.is_reconciled && account.last_reconciled_balance_minor !== undefined
    ? account.last_reconciled_balance_minor
    : null;

  return {
    ledgerBalanceMinor,
    reservedMinor,
    spendableMinor,
    availableBalanceMinor,
    activeGoalAllocationsMinor,
    unpaidCommitmentsMinor,
    isSpendableNegative,
  };
}

/**
 * Calculates debt balance derived strictly from liability node posting lines (Section 2, INV-04)
 */
export function calculateDebtOutstandingBalance(
  liabilityNodeId: string,
  transactions: Transaction[]
): {
  openingPrincipalMinor: number;
  totalRepaidPrincipalMinor: number;
  outstandingBalanceMinor: number;
} {
  let openingPrincipalMinor = 0;
  let totalRepaidPrincipalMinor = 0;

  for (const tx of transactions) {
    if (tx.status !== 'posted') continue;
    for (const line of tx.posting_lines) {
      if (line.ledger_node_id === liabilityNodeId) {
        if (line.direction === 'credit') {
          // Drawdown credits liability (increases debt)
          openingPrincipalMinor += line.amount_minor;
        } else if (line.direction === 'debit') {
          // Repayment debits liability (decreases debt)
          totalRepaidPrincipalMinor += line.amount_minor;
        }
      }
    }
  }

  const outstandingBalanceMinor = Math.max(0, openingPrincipalMinor - totalRepaidPrincipalMinor);
  return {
    openingPrincipalMinor,
    totalRepaidPrincipalMinor,
    outstandingBalanceMinor,
  };
}

/**
 * Calculates Category Spend in a given period (INV-02, INV-03, INV-06)
 * Respects "exclude project-tagged spending" setting on budgets (Section 4).
 */
export function calculateCategorySpend(
  categoryId: string,
  transactions: Transaction[],
  filter?: {
    startDate?: string;
    endDate?: string;
    excludeProjectSpending?: boolean;
    visibleUserIds?: string[];
  }
): number {
  let totalSpendMinor = 0;

  for (const tx of transactions) {
    if (tx.status !== 'posted') continue;

    // Filter by effective date (INV-08: backdated entries affect period of effective date)
    if (filter?.startDate && tx.effective_date < filter.startDate) continue;
    if (filter?.endDate && tx.effective_date > filter.endDate) continue;

    // Check project exclusion if specified
    if (filter?.excludeProjectSpending && tx.project_id) continue;

    // Check visibility permissions
    if (filter?.visibleUserIds && !filter.visibleUserIds.includes(tx.owner_user_id) && tx.visibility === 'private') {
      continue;
    }

    for (const line of tx.posting_lines) {
      if (line.ledger_node_id === categoryId) {
        if (line.direction === 'debit') {
          // Expense increases
          totalSpendMinor += line.amount_minor;
        } else if (line.direction === 'credit') {
          // Refund reduces category spend (Section 2 refund line)
          totalSpendMinor -= line.amount_minor;
        }
      }
    }
  }

  return Math.max(0, totalSpendMinor);
}

/**
 * Immutable Revision / Edit Generator (Section 6, INV-07)
 * Posted transactions are immutable. An "edit" in the UI creates a reversal
 * of the original and a replacement, linked in one revision group.
 */
export function executeTransactionEdit(
  originalTx: Transaction,
  updatedData: {
    description: string;
    effective_date: string;
    amount_minor: number;
    account_id: string;
    category_id?: string;
    destination_account_id?: string;
    payee?: string;
    project_id?: string;
  },
  userId: string,
  userName: string
): {
  reversalTx: Transaction;
  replacementTx: Transaction;
  auditLogs: AuditLog[];
} {
  const timestamp = new Date().toISOString();
  const revisionGroupId = originalTx.revision_group_id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Create Reversal Transaction (inverting all posting lines)
  const reversalId = `rev_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const reversalLines: PostingLine[] = originalTx.posting_lines.map((line, idx) => ({
    id: `${reversalId}_line_${idx + 1}`,
    transaction_id: reversalId,
    ledger_node_id: line.ledger_node_id,
    node_name: line.node_name,
    node_type: line.node_type,
    direction: line.direction === 'debit' ? 'credit' : 'debit', // Exact inversion
    amount_minor: line.amount_minor,
    currency: line.currency,
  }));

  const reversalTx: Transaction = {
    id: reversalId,
    workspace_id: originalTx.workspace_id,
    type: originalTx.type,
    description: `Reversal of: ${originalTx.description}`,
    effective_date: originalTx.effective_date,
    created_at: timestamp,
    status: 'reversed',
    revision_group_id: revisionGroupId,
    reversal_of_id: originalTx.id,
    amount_minor: originalTx.amount_minor,
    currency: originalTx.currency,
    owner_user_id: originalTx.owner_user_id,
    visibility: originalTx.visibility,
    posting_lines: reversalLines,
    account_id: originalTx.account_id,
    category_id: originalTx.category_id,
    project_id: originalTx.project_id,
    payee: originalTx.payee,
  };

  // 2. Create Replacement Transaction with updated fields
  const replacementId = `rep_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const replacementLines = buildPostingLinesForTemplate({
    transactionId: replacementId,
    type: originalTx.type,
    amountMinor: updatedData.amount_minor,
    currency: originalTx.currency,
    accountId: updatedData.account_id,
    destinationAccountId: updatedData.destination_account_id,
    categoryId: updatedData.category_id,
  });

  const replacementTx: Transaction = {
    id: replacementId,
    workspace_id: originalTx.workspace_id,
    type: originalTx.type,
    description: updatedData.description,
    effective_date: updatedData.effective_date,
    created_at: timestamp,
    status: 'posted',
    revision_group_id: revisionGroupId,
    replaces_id: originalTx.id,
    amount_minor: updatedData.amount_minor,
    currency: originalTx.currency,
    owner_user_id: originalTx.owner_user_id,
    visibility: originalTx.visibility,
    posting_lines: replacementLines,
    account_id: updatedData.account_id,
    category_id: updatedData.category_id,
    project_id: updatedData.project_id,
    payee: updatedData.payee,
  };

  const auditLogs: AuditLog[] = [
    {
      id: `audit_${Date.now()}_1`,
      timestamp,
      user_id: userId,
      user_name: userName,
      action: 'REVERSE_TRANSACTION',
      entity_type: 'transaction',
      entity_id: originalTx.id,
      details: `Reversed transaction '${originalTx.description}' (${formatMinor(originalTx.amount_minor, originalTx.currency)}) via reversal transaction ${reversalId}`,
      revision_group_id: revisionGroupId,
    },
    {
      id: `audit_${Date.now()}_2`,
      timestamp,
      user_id: userId,
      user_name: userName,
      action: 'REPLACE_TRANSACTION',
      entity_type: 'transaction',
      entity_id: replacementId,
      details: `Posted replacement transaction '${updatedData.description}' (${formatMinor(updatedData.amount_minor, originalTx.currency)}) replacing ${originalTx.id}`,
      revision_group_id: revisionGroupId,
    },
  ];

  return { reversalTx, replacementTx, auditLogs };
}

/**
 * Currency Minor Unit Formatter (Section 7)
 * Strictly formats integer minor units (kobo/cents). Never binary floating-point artifacts.
 */
export function formatMinor(minor: number, currency: Currency = 'NGN'): string {
  const sign = minor < 0 ? '-' : '';
  const absMinor = Math.abs(Math.round(minor));
  const major = Math.floor(absMinor / 100);
  const cents = absMinor % 100;
  const majorFormatted = major.toLocaleString('en-US');
  const centsFormatted = cents.toString().padStart(2, '0');
  const symbol = currency === 'NGN' ? '₦' : '$';

  return `${sign}${symbol}${majorFormatted}.${centsFormatted}`;
}

export function parseMinor(amountString: string): number {
  const cleaned = amountString.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}
