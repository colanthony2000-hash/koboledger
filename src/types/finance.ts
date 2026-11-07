/**
 * Types & Data Models for Personal & Household Finance Platform (KoboLedger)
 * In accordance with Master Blueprint v1.0 and Addendum v1.1
 */

export type Currency = 'NGN' | 'USD';

export type AccountType = 'bank' | 'wallet' | 'mobile_money' | 'savings';
export type Visibility = 'private' | 'shared';
export type AccessMode = 'flexible' | 'protected' | 'locked';

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'debt_drawdown'
  | 'debt_repayment'
  | 'refund'
  | 'opening_balance';

export type TransactionStatus = 'posted' | 'reversed' | 'draft';

export type LedgerNodeType = 'account' | 'category' | 'debt_liability' | 'equity';
export type LineDirection = 'debit' | 'credit';

export interface PostingLine {
  id: string;
  transaction_id: string;
  ledger_node_id: string;
  node_name?: string;
  node_type: LedgerNodeType;
  direction: LineDirection;
  /** Amount in integer minor units (kobo for NGN) */
  amount_minor: number;
  currency: Currency;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  type: TransactionType;
  description: string;
  effective_date: string; // YYYY-MM-DD
  created_at: string; // ISO timestamp
  status: TransactionStatus;
  revision_group_id: string;
  reversal_of_id?: string;
  replaces_id?: string;
  project_id?: string;
  payee?: string;
  category_id?: string; // High-level primary category for quick reference
  account_id?: string;  // High-level source account for quick reference
  amount_minor: number; // Stated transaction value in minor units
  currency: Currency;
  owner_user_id: string;
  visibility: Visibility;
  posting_lines: PostingLine[];
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  owner_user_id: string;
  visibility: Visibility;
  opening_balance_minor: number;
  institution_name?: string;
  account_number_mask?: string;
  // Reconciliation fields (Section 3)
  is_reconciled?: boolean;
  last_reconciled_balance_minor?: number;
  last_reconciled_date?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'financial_cost';
  is_essential: boolean; // Affordability engine (Section 9)
  icon?: string;
  color?: string;
}

export interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  dueAt?: string;
  reminderAt?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  owner_user_id?: string;
  workspace_id?: string;
  visibility?: Visibility;
}

export type DebtTermType =
  | 'D-1_interest_free'
  | 'D-2_reducing_balance'
  | 'D-3_flat_rate'
  | 'D-4_daily_rate'
  | 'unknown';

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  term_type: DebtTermType;
  principal_minor: number;
  monthly_rate_pct: number;
  tenure_months: number;
  start_date: string;
  status: 'active' | 'paid_off';
  urgency_flag: 'high' | 'medium' | 'low';
  owner_user_id: string;
  visibility: Visibility;
  liability_node_id: string;
  drawdown_fee_minor?: number;
  daily_rate_pct?: number; // for D-4
  tenure_days?: number; // for D-4
  notes?: string;
}

export interface AmortizationRow {
  month: number;
  opening_balance_minor: number;
  interest_minor: number;
  principal_minor: number;
  payment_minor: number;
  closing_balance_minor: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount_minor: number;
  target_date: string;
  access_mode: AccessMode;
  is_locked: boolean;
  allocation_type: 'virtual_earmark' | 'dedicated_account';
  linked_account_id: string;
  owner_user_id: string;
  visibility: Visibility;
  notes?: string;
  icon?: string;
}

export interface GoalAllocation {
  id: string;
  goal_id: string;
  account_id: string;
  allocated_minor: number;
  updated_at: string;
}

export type CommitmentSourceType = 'project_item' | 'bill' | 'debt_instalment' | 'manual';
export type CommitmentStatus = 'approved' | 'paid' | 'cancelled' | 'expired';

export interface Commitment {
  id: string;
  workspace_id: string;
  source_type: CommitmentSourceType;
  source_id: string;
  title: string;
  account_id: string;
  amount_minor: number;
  due_date: string;
  status: CommitmentStatus;
  category_id?: string;
  linked_transaction_id?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  name: string;
  period: 'monthly' | 'weekly';
  category_id: string;
  limit_minor: number;
  limit_version: number;
  exclude_project_spending: boolean;
}

export interface BudgetAlert {
  id: string;
  dedup_key: string; // budgetId + period + threshold + limitVersion (Section 6)
  budget_id: string;
  period: string;
  threshold_pct: number;
  limit_version: number;
  timestamp: string;
  message: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed';
  master_budget_minor: number;
  template_type: 'christmas' | 'general';
  created_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  section: 'master_budget' | 'confirmed_funds' | 'protected_reserve' | 'gifts' | 'food' | 'shopping' | 'monthly_savings' | 'summary';
  title: string;
  estimated_minor: number;
  commitment_id?: string;
  is_paid: boolean;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  revision_group_id?: string;
}

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionBilling = 'weekly' | 'monthly' | 'annual';

export interface UserSubscription {
  tier: SubscriptionTier;
  billingCycle?: SubscriptionBilling;
  status: 'active' | 'free' | 'expired';
  expiresAt?: string;
  paymentMethod?: 'paystack' | 'manual_bank_transfer' | 'admin_comp';
  paymentReference?: string;
  amountPaidMinor?: number;
}

export type WorkspaceType = 'household' | 'company';

export interface UserRolePermissions {
  canPostTransactions: boolean;
  canReverseTransactions: boolean;
  canManageAccounts: boolean;
  canViewPrivateRecords: boolean;
  canManageBudgets: boolean;
  canManageSavings: boolean;
  canManageDebts: boolean;
  canManageSubscriptions: boolean;
  canExportAuditStatements: boolean;
  canReconcileAccounts: boolean;
  isReadOnly: boolean;
}

export interface UserRoleDetails {
  designation: string;
  department: string;
  affiliation: string;
  email: string;
  phoneNumber?: string;
  workspaceType: WorkspaceType;
  workspaceName: string;
  scopeDescription: string;
  permissions: UserRolePermissions;
  assignedAccounts: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'owner' | 'member' | 'auditor';
  avatar_initials: string;
  email?: string;
  photoURL?: string;
  subscription?: UserSubscription;
  details?: UserRoleDetails;
  workspace_id?: string;
  workspace_type?: WorkspaceType;
}

export interface StatementReconciliation {
  id: string;
  account_id: string;
  statement_date: string;
  statement_balance_minor: number;
  status: 'matched' | 'discrepancy';
  reconciled_at: string;
  reconciled_by: string;
}

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount_minor: number;
  currency: Currency;
  type: 'income' | 'expense' | 'transfer';
  interval: RecurrenceInterval;
  account_id: string;
  category_id?: string;
  destination_account_id?: string;
  next_due_date: string;
  last_executed_date?: string;
  status: 'active' | 'paused';
  owner_user_id: string;
  visibility: 'shared' | 'private';
  created_at: string;
}

export interface DailySavingsSetting {
  target_minor: number;
  saved_today_minor: number;
  last_reset_date: string;
  target_goal_id?: string;
  streak_days: number;
}

