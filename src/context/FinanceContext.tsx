/**
 * KoboLedger Global State & Context Provider
 * Implements persistent local storage, double-entry ledger state, privacy switching,
 * offline synchronization, and deterministic quick-add flows.
 */

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import {
  Account,
  AuditLog,
  Budget,
  BudgetAlert,
  Category,
  Commitment,
  Debt,
  GoalAllocation,
  Project,
  ProjectItem,
  SavingsGoal,
  StatementReconciliation,
  Transaction,
  UserProfile,
  UserSubscription,
  RecurringTransaction,
  DailySavingsSetting,
  TodoItem,
} from '../types/finance';
import {
  buildPostingLinesForTemplate,
  calculateAccountBalances,
  executeTransactionEdit,
  validateTransactionBalance,
} from '../services/ledgerEngine';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  testConnection,
} from '../services/firebase';
import {
  persistTransaction,
  persistUserProfile,
  listenToTransactions,
  ensureWorkspace,
  listMyWorkspaces,
  listHouseholdMembers,
  createHouseholdInvite,
  acceptHouseholdInvite,
  removeHouseholdMember,
  setActiveWorkspace as setSyncWorkspace,
  listenToSubscription,
  startPaystackCheckout,
  verifyPaystackCheckout,
  persistRecords,
  listenToRecords,
  WorkspaceMembership,
  HouseholdMember,
  PlatformAccount,
  listPlatformAccounts,
  setPlatformAccountDisabled,
  refreshPlatformAdminAccess,
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  updatePlatformSettings,
  setPlatformSubscription,
  saveGlobalCategory,
  listenToGlobalCategories,
  persistTodoItem,
  deleteTodoItem as deleteRemoteTodoItem,
} from '../services/firebaseSync';
import { getIdTokenResult, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Seed Users for Household Sharing & Corporate Audit (Section 5, T-21)
export const SEED_USERS: UserProfile[] = [
  {
    id: 'user_ada',
    name: 'Adaeze Okafor',
    role: 'owner',
    avatar_initials: 'AO',
    email: 'adaeze.okafor@jeneconk.com',
    workspace_id: 'ws_household_jeneconk_01',
    workspace_type: 'household',
    subscription: {
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'active',
      paymentMethod: 'paystack',
    },
    details: {
      designation: 'Head of Household & Managing Director',
      department: 'Family Office & Executive Corporate Governance',
      affiliation: 'JENECONK INTEGRATED GLOBAL SOLUTIONS LIMITED',
      email: 'adaeze.okafor@jeneconk.com',
      phoneNumber: '+234 803 555 0192',
      workspaceType: 'household',
      workspaceName: 'Okafor Family Office & Treasury',
      scopeDescription: 'Owner access to shared household records and workspace settings.',
      permissions: {
        canPostTransactions: true,
        canReverseTransactions: true,
        canManageAccounts: true,
        canViewPrivateRecords: true,
        canManageBudgets: true,
        canManageSavings: true,
        canManageDebts: true,
        canManageSubscriptions: true,
        canExportAuditStatements: true,
        canReconcileAccounts: true,
        isReadOnly: false,
      },
      assignedAccounts: [
        'GTBank Main Salary Current',
        'Daily Cash Wallet',
        'Stanbic Wealth Savings',
        'Piggyvest SafeLock (Private Vault)',
      ],
    },
  },
  {
    id: 'user_chidi',
    name: 'Chidi Okafor',
    role: 'member',
    avatar_initials: 'CO',
    email: 'chidi.okafor@gmail.com',
    workspace_id: 'ws_household_jeneconk_01',
    workspace_type: 'household',
    subscription: {
      tier: 'free',
      status: 'free',
    },
    details: {
      designation: 'Household Associate & Logistics Manager',
      department: 'Household Daily Operations & Grocery Logistics',
      affiliation: 'Okafor Household Workspace',
      email: 'chidi.okafor@gmail.com',
      phoneNumber: '+234 812 444 8820',
      workspaceType: 'household',
      workspaceName: 'Okafor Family Office & Treasury',
      scopeDescription: 'Authorized to record shared grocery, utility, and commute expenses via Kuda Mobile Money and Daily Cash Wallet. Private savings reserves, owner debts, and confidential wealth accounts are strictly restricted and hidden.',
      permissions: {
        canPostTransactions: true,
        canReverseTransactions: false,
        canManageAccounts: false,
        canViewPrivateRecords: false,
        canManageBudgets: false,
        canManageSavings: false,
        canManageDebts: false,
        canManageSubscriptions: false,
        canExportAuditStatements: false,
        canReconcileAccounts: false,
        isReadOnly: false,
      },
      assignedAccounts: [
        'Kuda Mobile Money',
        'Daily Cash Wallet',
      ],
    },
  },
  {
    id: 'user_auditor',
    name: 'Babajide Adeleke, FCA',
    role: 'auditor',
    avatar_initials: 'BA',
    email: 'b.adeleke@ernstaudit-ng.com',
    workspace_id: 'ws_household_jeneconk_01',
    workspace_type: 'company',
    subscription: {
      tier: 'pro',
      status: 'active',
    },
    details: {
      designation: 'Independent Financial Auditor & Compliance Officer',
      department: 'Statutory Financial Assurance & Invariant Verification',
      affiliation: 'Ernst & Audit Compliance Consultants (ICAN #ICAN/2024/9821)',
      email: 'b.adeleke@ernstaudit-ng.com',
      phoneNumber: '+234 802 119 7300',
      workspaceType: 'company',
      workspaceName: 'JENECONK & Okafor Financial Audit',
      scopeDescription: 'Independent read-only supervisory access to all shared general ledger postings, double-entry equality invariants (INV-01 to INV-13), bank reconciliations, and official PDF/CSV statement certification. Write, edit, and deletion privileges are strictly prohibited.',
      permissions: {
        canPostTransactions: false,
        canReverseTransactions: false,
        canManageAccounts: false,
        canViewPrivateRecords: false,
        canManageBudgets: false,
        canManageSavings: false,
        canManageDebts: false,
        canManageSubscriptions: false,
        canExportAuditStatements: true,
        canReconcileAccounts: true,
        isReadOnly: true,
      },
      assignedAccounts: [
        'GTBank Main Salary Current',
        'Daily Cash Wallet',
        'Kuda Mobile Money',
        'Stanbic Wealth Savings (Audit View)',
      ],
    },
  },
];

// Seed Categories
export const SEED_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Staple Foods & Groceries', type: 'expense', is_essential: true, color: '#16A34A' },
  { id: 'cat_rent', name: 'House Rent & Estate Fees', type: 'expense', is_essential: true, color: '#0284C7' },
  { id: 'cat_utilities', name: 'Power, Light & Utilities', type: 'expense', is_essential: true, color: '#D97706' },
  { id: 'cat_transport', name: 'Commute, Transport & Fuel', type: 'expense', is_essential: true, color: '#EA580C' },
  { id: 'cat_healthcare', name: 'Healthcare & Medications', type: 'expense', is_essential: true, color: '#DC2626' },
  { id: 'cat_tuition', name: 'School Fees & Education', type: 'expense', is_essential: true, color: '#7C3AED' },
  { id: 'cat_family', name: 'Family Support & Upkeep', type: 'expense', is_essential: true, color: '#059669' },
  { id: 'cat_dining', name: 'Dining Out & Fast Food', type: 'expense', is_essential: false, color: '#E11D48' },
  { id: 'cat_tech', name: 'Gadgets & Tech Upgrades', type: 'expense', is_essential: false, color: '#4F46E5' },
  { id: 'cat_shopping', name: 'Shopping & Apparel', type: 'expense', is_essential: false, color: '#9333EA' },
  { id: 'cat_financial_costs', name: 'Bank & Transaction Fees', type: 'financial_cost', is_essential: false, color: '#64748B' },
  { id: 'cat_loan_interest', name: 'Loan Interest Costs', type: 'financial_cost', is_essential: false, color: '#B91C1C' },
  { id: 'cat_income_salary', name: 'Salary & Core Income', type: 'income', is_essential: false, color: '#15803D' },
  { id: 'cat_income_business', name: 'Side Business & Consulting', type: 'income', is_essential: false, color: '#047857' },
];

// Seed Accounts
export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'acc_wallet',
    name: 'Daily Cash Wallet',
    type: 'wallet',
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    opening_balance_minor: 20000000, // ₦200,000 (Section 3 & T-05 Worked Example)
    is_reconciled: true,
    last_reconciled_balance_minor: 20000000,
    last_reconciled_date: '2026-11-01',
  },
  {
    id: 'acc_bank',
    name: 'GTBank Main Salary Current',
    type: 'bank',
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    opening_balance_minor: 45000000, // ₦450,000
    institution_name: 'Guaranty Trust Bank',
    account_number_mask: '****4921',
    is_reconciled: true,
    last_reconciled_balance_minor: 45000000,
    last_reconciled_date: '2026-11-01',
  },
  {
    id: 'acc_kuda',
    name: 'Kuda Mobile Money',
    type: 'mobile_money',
    currency: 'NGN',
    owner_user_id: 'user_chidi',
    visibility: 'shared',
    opening_balance_minor: 7500000, // ₦75,000
    institution_name: 'Kuda Microfinance Bank',
    account_number_mask: '****8102',
    is_reconciled: false,
  },
  {
    id: 'acc_stanbic',
    name: 'Stanbic Wealth Savings',
    type: 'savings',
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    opening_balance_minor: 60000000, // ₦600,000
    institution_name: 'Stanbic IBTC Bank',
    account_number_mask: '****0339',
    is_reconciled: true,
    last_reconciled_balance_minor: 60000000,
    last_reconciled_date: '2026-11-01',
  },
  {
    id: 'acc_ada_private',
    name: 'Ada Secret Contingency',
    type: 'savings',
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'private', // Demonstrates T-21 Privacy Boundary
    opening_balance_minor: 12000000, // ₦120,000
    institution_name: 'Piggyvest SafeLock',
    account_number_mask: '****7712',
    is_reconciled: true,
    last_reconciled_balance_minor: 12000000,
    last_reconciled_date: '2026-11-01',
  },
];

// Initial Opening Balance Transactions (Balancing strictly to zero per INV-13)
const initialOpeningTxs: Transaction[] = SEED_ACCOUNTS.map((acc) => {
  const lines = buildPostingLinesForTemplate({
    transactionId: `tx_init_${acc.id}`,
    type: 'opening_balance',
    amountMinor: acc.opening_balance_minor,
    currency: acc.currency,
    accountId: acc.id,
  });
  return {
    id: `tx_init_${acc.id}`,
    workspace_id: 'ws_main',
    type: 'opening_balance',
    description: `Opening balance for ${acc.name}`,
    effective_date: '2026-06-01',
    created_at: '2026-06-01T08:00:00Z',
    status: 'posted',
    revision_group_id: `rev_init_${acc.id}`,
    amount_minor: acc.opening_balance_minor,
    currency: acc.currency,
    owner_user_id: acc.owner_user_id,
    visibility: acc.visibility,
    posting_lines: lines,
    account_id: acc.id,
  };
});

// Historical 6-Month Ledger Transactions (Jun 2026 to Nov 2026) for Trend Analytics
export const HISTORICAL_SEED_TRANSACTIONS: Transaction[] = [
  // June 2026
  {
    id: 'tx_hist_2026_06_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'June Monthly Professional Salary',
    effective_date: '2026-06-25',
    created_at: '2026-06-25T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_06_1',
    amount_minor: 32000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_06_inc1',
      type: 'income',
      amountMinor: 32000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_06_inc2',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'Client Web Consulting Project',
    effective_date: '2026-06-18',
    created_at: '2026-06-18T14:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_06_2',
    amount_minor: 6500000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_business',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_06_inc2',
      type: 'income',
      amountMinor: 6500000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_business',
    }),
  },
  {
    id: 'tx_hist_2026_06_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'June Family Foodstuff & Groceries',
    effective_date: '2026-06-08',
    created_at: '2026-06-08T11:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_06_3',
    amount_minor: 6200000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_06_exp1',
      type: 'expense',
      amountMinor: 6200000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_06_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Commute Fuel & Monthly Servicing',
    effective_date: '2026-06-15',
    created_at: '2026-06-15T09:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_06_4',
    amount_minor: 3800000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_06_exp2',
      type: 'expense',
      amountMinor: 3800000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },
  {
    id: 'tx_hist_2026_06_exp3',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Power Token & High-Speed Data',
    effective_date: '2026-06-20',
    created_at: '2026-06-20T16:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_06_5',
    amount_minor: 2200000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_utilities',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_06_exp3',
      type: 'expense',
      amountMinor: 2200000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_utilities',
    }),
  },

  // July 2026
  {
    id: 'tx_hist_2026_07_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'July Monthly Professional Salary',
    effective_date: '2026-07-25',
    created_at: '2026-07-25T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_07_1',
    amount_minor: 34000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_07_inc1',
      type: 'income',
      amountMinor: 34000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_07_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Quarterly Estate Service Charge',
    effective_date: '2026-07-05',
    created_at: '2026-07-05T12:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_07_2',
    amount_minor: 7500000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_rent',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_07_exp1',
      type: 'expense',
      amountMinor: 7500000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_rent',
    }),
  },
  {
    id: 'tx_hist_2026_07_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'July Foodstuffs, Protein & Grains',
    effective_date: '2026-07-14',
    created_at: '2026-07-14T11:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_07_3',
    amount_minor: 6800000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_07_exp2',
      type: 'expense',
      amountMinor: 6800000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_07_exp3',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Fuel & Interstate Tolls',
    effective_date: '2026-07-22',
    created_at: '2026-07-22T08:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_07_4',
    amount_minor: 4200000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_07_exp3',
      type: 'expense',
      amountMinor: 4200000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },

  // August 2026
  {
    id: 'tx_hist_2026_08_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'August Monthly Professional Salary',
    effective_date: '2026-08-25',
    created_at: '2026-08-25T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_08_1',
    amount_minor: 35000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_08_inc1',
      type: 'income',
      amountMinor: 35000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_08_inc2',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'August Side Hustle & Advisory Fee',
    effective_date: '2026-08-14',
    created_at: '2026-08-14T15:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_08_2',
    amount_minor: 9500000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_business',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_08_inc2',
      type: 'income',
      amountMinor: 9500000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_business',
    }),
  },
  {
    id: 'tx_hist_2026_08_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'School Books & Uniforms Preparation',
    effective_date: '2026-08-19',
    created_at: '2026-08-19T13:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_08_3',
    amount_minor: 5500000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_tuition',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_08_exp1',
      type: 'expense',
      amountMinor: 5500000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_tuition',
    }),
  },
  {
    id: 'tx_hist_2026_08_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'August Foodstuff & Market Basket',
    effective_date: '2026-08-11',
    created_at: '2026-08-11T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_08_4',
    amount_minor: 7200000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_08_exp2',
      type: 'expense',
      amountMinor: 7200000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_08_exp3',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Commuting Fuel & Car Maintenance',
    effective_date: '2026-08-28',
    created_at: '2026-08-28T17:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_08_5',
    amount_minor: 4100000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_08_exp3',
      type: 'expense',
      amountMinor: 4100000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },

  // September 2026
  {
    id: 'tx_hist_2026_09_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'September Monthly Professional Salary',
    effective_date: '2026-09-25',
    created_at: '2026-09-25T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_09_1',
    amount_minor: 36000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_09_inc1',
      type: 'income',
      amountMinor: 36000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_09_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'First Term School Tuition & Levies',
    effective_date: '2026-09-06',
    created_at: '2026-09-06T09:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_09_2',
    amount_minor: 12000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_tuition',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_09_exp1',
      type: 'expense',
      amountMinor: 12000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_tuition',
    }),
  },
  {
    id: 'tx_hist_2026_09_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'September Foodstuffs & Protein Cart',
    effective_date: '2026-09-15',
    created_at: '2026-09-15T11:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_09_3',
    amount_minor: 7400000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_09_exp2',
      type: 'expense',
      amountMinor: 7400000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_09_exp3',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Transport & Commuting Fuel',
    effective_date: '2026-09-22',
    created_at: '2026-09-22T08:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_09_4',
    amount_minor: 4300000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_09_exp3',
      type: 'expense',
      amountMinor: 4300000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },

  // October 2026
  {
    id: 'tx_hist_2026_10_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'October Monthly Professional Salary',
    effective_date: '2026-10-25',
    created_at: '2026-10-25T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_10_1',
    amount_minor: 38000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_10_inc1',
      type: 'income',
      amountMinor: 38000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_10_inc2',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'Contract Engineering Milestone Payment',
    effective_date: '2026-10-12',
    created_at: '2026-10-12T14:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_10_2',
    amount_minor: 11000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_business',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_10_inc2',
      type: 'income',
      amountMinor: 11000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_business',
    }),
  },
  {
    id: 'tx_hist_2026_10_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Bulk Market Food Supplies',
    effective_date: '2026-10-09',
    created_at: '2026-10-09T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_10_3',
    amount_minor: 7600000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_10_exp1',
      type: 'expense',
      amountMinor: 7600000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_10_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Fuel, Tolls & Maintenance',
    effective_date: '2026-10-18',
    created_at: '2026-10-18T16:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_10_4',
    amount_minor: 4400000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_10_exp2',
      type: 'expense',
      amountMinor: 4400000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },
  {
    id: 'tx_hist_2026_10_exp3',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Power Units & Fiber Internet',
    effective_date: '2026-10-24',
    created_at: '2026-10-24T18:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_10_5',
    amount_minor: 2800000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_utilities',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_10_exp3',
      type: 'expense',
      amountMinor: 2800000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_utilities',
    }),
  },

  // November 2026 (Current Month)
  {
    id: 'tx_hist_2026_11_inc1',
    workspace_id: 'ws_main',
    type: 'income',
    description: 'November Primary Salary Advance',
    effective_date: '2026-11-02',
    created_at: '2026-11-02T10:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_11_1',
    amount_minor: 25000000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_11_inc1',
      type: 'income',
      amountMinor: 25000000,
      currency: 'NGN',
      accountId: 'acc_bank',
      categoryId: 'cat_income_salary',
    }),
  },
  {
    id: 'tx_hist_2026_11_exp1',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'First Week Groceries & Market Restock',
    effective_date: '2026-11-03',
    created_at: '2026-11-03T11:00:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_11_2',
    amount_minor: 3200000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_11_exp1',
      type: 'expense',
      amountMinor: 3200000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
    }),
  },
  {
    id: 'tx_hist_2026_11_exp2',
    workspace_id: 'ws_main',
    type: 'expense',
    description: 'Fuel Fill-Up for Commute',
    effective_date: '2026-11-04',
    created_at: '2026-11-04T08:30:00Z',
    status: 'posted',
    revision_group_id: 'rev_h_11_3',
    amount_minor: 2500000,
    currency: 'NGN',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    posting_lines: buildPostingLinesForTemplate({
      transactionId: 'tx_hist_2026_11_exp2',
      type: 'expense',
      amountMinor: 2500000,
      currency: 'NGN',
      accountId: 'acc_wallet',
      categoryId: 'cat_transport',
    }),
  },
];

export const ALL_INITIAL_SEED_TRANSACTIONS: Transaction[] = [
  ...initialOpeningTxs,
  ...HISTORICAL_SEED_TRANSACTIONS,
];

// Seed Savings Goals (Section 2, 3, T-05, T-10)
export const SEED_GOALS: SavingsGoal[] = [
  {
    id: 'goal_ef',
    name: 'Emergency Fund',
    target_amount_minor: 25000000, // ₦250,000
    target_date: '2027-04-30',
    access_mode: 'protected', // Protected mode (T-10)
    is_locked: false,
    allocation_type: 'virtual_earmark',
    linked_account_id: 'acc_wallet',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    notes: 'Protected cushion for urgent medical or unforeseen incidents.',
  },
  {
    id: 'goal_xmas',
    name: 'Christmas & Holiday Festivities',
    target_amount_minor: 10000000, // ₦100,000
    target_date: '2026-12-24',
    access_mode: 'flexible', // Flexible mode
    is_locked: false,
    allocation_type: 'virtual_earmark',
    linked_account_id: 'acc_wallet',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    notes: 'Holiday celebrations, village travel and gifts.',
  },
  {
    id: 'goal_land',
    name: 'Epe Land Investment SafeLock',
    target_amount_minor: 150000000, // ₦1.5M
    target_date: '2027-12-31',
    access_mode: 'locked', // Locked mode (T-10)
    is_locked: true,
    allocation_type: 'virtual_earmark',
    linked_account_id: 'acc_stanbic',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    notes: 'Locked until target closing date.',
  },
];

// Seed Goal Allocations (T-05: Emergency ₦30k + Xmas ₦20k = ₦50k in acc_wallet)
export const SEED_ALLOCATIONS: GoalAllocation[] = [
  {
    id: 'ga_1',
    goal_id: 'goal_ef',
    account_id: 'acc_wallet',
    allocated_minor: 3000000, // ₦30,000
    updated_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'ga_2',
    goal_id: 'goal_xmas',
    account_id: 'acc_wallet',
    allocated_minor: 2000000, // ₦20,000
    updated_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'ga_3',
    goal_id: 'goal_land',
    account_id: 'acc_stanbic',
    allocated_minor: 15000000, // ₦150,000
    updated_at: '2026-11-01T09:00:00Z',
  },
];

// Seed Commitments (Section 4, T-05: ₦40,000 in Wallet for Light Bill)
export const SEED_COMMITMENTS: Commitment[] = [
  {
    id: 'com_light',
    workspace_id: 'ws_main',
    source_type: 'bill',
    source_id: 'bill_nepa_nov',
    title: 'IKEDC Monthly Electricity Bill',
    account_id: 'acc_wallet',
    amount_minor: 4000000, // ₦40,000 (completes T-05 Spendable = 200k - 50k - 40k = ₦110,000)
    due_date: '2026-11-12',
    status: 'approved',
    category_id: 'cat_utilities',
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'com_proj_gift',
    workspace_id: 'ws_main',
    source_type: 'project_item',
    source_id: 'item_gift_hampers',
    title: 'Christmas Extended Family Hampers (T-12)',
    account_id: 'acc_bank',
    amount_minor: 10000000, // ₦100,000 (T-12)
    due_date: '2026-12-15',
    status: 'approved',
    category_id: 'cat_shopping',
    created_at: '2026-11-01T10:00:00Z',
  },
];

// Seed Debts (Section 8: D-1, D-2, D-3, D-4)
export const SEED_DEBTS: Debt[] = [
  {
    id: 'debt_d1_chuka',
    name: 'Brother Chuka Family Soft Loan (D-1)',
    creditor: 'Chuka Okafor',
    term_type: 'D-1_interest_free',
    principal_minor: 10000000, // ₦100,000 (T-13)
    monthly_rate_pct: 0,
    tenure_months: 4,
    start_date: '2026-11-01',
    status: 'active',
    urgency_flag: 'low',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    liability_node_id: 'node_debt_d1',
    notes: 'Interest-free family loan. 4 monthly payments of ₦25,000.',
  },
  {
    id: 'debt_d2_gtb',
    name: 'GTBank Vehicle Asset Loan (D-2)',
    creditor: 'GTBank SME',
    term_type: 'D-2_reducing_balance',
    principal_minor: 10000000, // ₦100,000 (T-14)
    monthly_rate_pct: 3.0,
    tenure_months: 4,
    start_date: '2026-11-01',
    status: 'active',
    urgency_flag: 'medium',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    liability_node_id: 'node_debt_d2',
    notes: 'Reducing balance at 3%/mo. Monthly equal payment ₦26,902.71; Month 4 payment ₦26,902.69 absorbs kobo residual.',
  },
  {
    id: 'debt_d3_fastcash',
    name: 'FastCredit Business Working Capital (D-3)',
    creditor: 'FastCredit Nigeria',
    term_type: 'D-3_flat_rate',
    principal_minor: 10000000, // ₦100,000 (T-14)
    monthly_rate_pct: 3.0,
    tenure_months: 4,
    start_date: '2026-11-01',
    status: 'active',
    urgency_flag: 'high',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    liability_node_id: 'node_debt_d3',
    notes: 'Flat rate 3%/mo. Total interest ₦12,000 vs ₦7,610.82 reducing. Demonstrates stealth cost warning.',
  },
  {
    id: 'debt_private_ada',
    name: 'Personal Urgent Peer Borrowing',
    creditor: 'Private Lender',
    term_type: 'D-1_interest_free',
    principal_minor: 5000000, // ₦50,000
    monthly_rate_pct: 0,
    tenure_months: 2,
    start_date: '2026-11-01',
    status: 'active',
    urgency_flag: 'low',
    owner_user_id: 'user_ada',
    visibility: 'private', // T-21 Private Debt
    liability_node_id: 'node_debt_priv',
    notes: 'Private debt not visible to Chidi or auditor.',
  },
];

// Seed Budgets (Section 6)
export const SEED_BUDGETS: Budget[] = [
  {
    id: 'bgt_food',
    name: 'Staple Foods Monthly Budget',
    period: 'monthly',
    category_id: 'cat_food',
    limit_minor: 8000000, // ₦80,000
    limit_version: 1,
    exclude_project_spending: false,
  },
  {
    id: 'bgt_transport',
    name: 'Commute & Fuel Monthly Budget',
    period: 'monthly',
    category_id: 'cat_transport',
    limit_minor: 4500000, // ₦45,000
    limit_version: 1,
    exclude_project_spending: false,
  },
  {
    id: 'bgt_utilities',
    name: 'Power & Utilities Monthly Budget',
    period: 'monthly',
    category_id: 'cat_utilities',
    limit_minor: 3000000, // ₦30,000
    limit_version: 1,
    exclude_project_spending: false,
  },
  {
    id: 'bgt_dining',
    name: 'Dining & Entertainment Budget',
    period: 'monthly',
    category_id: 'cat_dining',
    limit_minor: 2500000, // ₦25,000
    limit_version: 1,
    exclude_project_spending: false,
  },
];

// Christmas Project Template (Section 17)
export const SEED_PROJECT: Project = {
  id: 'proj_xmas_2026',
  title: 'Christmas 2026 Family & Village Workbook',
  description: 'Master Christmas project plan with budget, confirmed funds, gifts, food, shopping and savings schedule.',
  status: 'active',
  master_budget_minor: 35000000, // ₦350,000
  template_type: 'christmas',
  created_at: '2026-11-01T09:00:00Z',
};

export const SEED_PROJECT_ITEMS: ProjectItem[] = [
  { id: 'pi_1', project_id: 'proj_xmas_2026', section: 'master_budget', title: 'Approved Master Christmas Ceiling', estimated_minor: 35000000, is_paid: false },
  { id: 'pi_2', project_id: 'proj_xmas_2026', section: 'confirmed_funds', title: 'Confirmed Savings Earmarks Available', estimated_minor: 20000000, is_paid: true },
  { id: 'pi_3', project_id: 'proj_xmas_2026', section: 'protected_reserve', title: 'Emergency Return & Contingency Reserve', estimated_minor: 5000000, is_paid: false },
  { id: 'pi_4', project_id: 'proj_xmas_2026', section: 'gifts', title: 'Extended Family Gift Hampers', estimated_minor: 10000000, is_paid: false, commitment_id: 'com_proj_gift' },
  { id: 'pi_5', project_id: 'proj_xmas_2026', section: 'gifts', title: 'Children & Nieces Toy Packages', estimated_minor: 2500000, is_paid: false },
  { id: 'pi_6', project_id: 'proj_xmas_2026', section: 'food', title: 'Live Goat & 2 Bags of Rice', estimated_minor: 12000000, is_paid: false },
  { id: 'pi_7', project_id: 'proj_xmas_2026', section: 'shopping', title: 'Holiday Outfits & Traditional Attire', estimated_minor: 5000000, is_paid: false },
  { id: 'pi_8', project_id: 'proj_xmas_2026', section: 'monthly_savings', title: 'November Contribution Schedule', estimated_minor: 4000000, is_paid: true },
];

export const SEED_RECURRING: RecurringTransaction[] = [
  {
    id: 'rec_salary',
    description: 'Monthly Engineering & Consulting Salary',
    amount_minor: 35000000, // ₦350,000
    currency: 'NGN',
    type: 'income',
    interval: 'monthly',
    account_id: 'acc_bank',
    category_id: 'cat_income_salary',
    next_due_date: '2026-11-25',
    status: 'active',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'rec_internet',
    description: 'Fiber Internet & Power Token Recurring Subscription',
    amount_minor: 2500000, // ₦25,000
    currency: 'NGN',
    type: 'expense',
    interval: 'monthly',
    account_id: 'acc_bank',
    category_id: 'cat_utilities',
    next_due_date: '2026-11-15',
    status: 'active',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'rec_groceries',
    description: 'Weekly Staple Food & Protein Provisions',
    amount_minor: 2000000, // ₦20,000
    currency: 'NGN',
    type: 'expense',
    interval: 'weekly',
    account_id: 'acc_wallet',
    category_id: 'cat_food',
    next_due_date: '2026-11-08',
    status: 'active',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'rec_transport',
    description: 'Daily Commute & Vehicle Fuel Allowance',
    amount_minor: 250000, // ₦2,500
    currency: 'NGN',
    type: 'expense',
    interval: 'daily',
    account_id: 'acc_wallet',
    category_id: 'cat_transport',
    next_due_date: '2026-11-05',
    status: 'active',
    owner_user_id: 'user_ada',
    visibility: 'shared',
    created_at: '2026-10-01T08:00:00Z',
  },
];

export const DEFAULT_DAILY_SAVINGS: DailySavingsSetting = {
  target_minor: 200000, // ₦2,000 daily target
  saved_today_minor: 150000, // ₦1,500 saved today
  last_reset_date: '2026-11-05',
  target_goal_id: 'goal_emergency',
  streak_days: 5,
};

interface FinanceContextType {
  currentUser: UserProfile;
  switchUser: (userId: string) => void;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  goalAllocations: GoalAllocation[];
  commitments: Commitment[];
  debts: Debt[];
  budgets: Budget[];
  budgetAlerts: BudgetAlert[];
  projects: Project[];
  projectItems: ProjectItem[];
  auditLogs: AuditLog[];
  // Recurring Transactions
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (rec: Omit<RecurringTransaction, 'id' | 'created_at' | 'status'>) => void;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  executeRecurringTransaction: (id: string) => void;
  // Daily Savings Target
  dailySavings: DailySavingsSetting;
  updateDailySavingsTarget: (targetMinor: number) => void;
  recordDailySavingsDeposit: (amountMinor: number, goalId?: string) => void;
  // Subscription & Commercial Tier
  subscription: UserSubscription;
  updateSubscription: (sub: Partial<UserSubscription>) => void;
  isFeatureAllowed: (feature: 'unlimited_accounts' | 'debt_reducing_engine' | 'four_tier_alerts' | 'cloud_sync' | 'christmas_planner' | 'vault_earmarks') => boolean;
  isSubscriptionModalOpen: boolean;
  openSubscriptionModal: (featureReason?: string) => void;
  closeSubscriptionModal: () => void;
  requestedFeature: string | undefined;
  // User Profile & Role Matrix Modal
  isUserProfileModalOpen: boolean;
  openUserProfileModal: (user?: UserProfile) => void;
  closeUserProfileModal: () => void;
  selectedUserProfile: UserProfile | null;
  // Firebase Auth & Live Sync State (Phase 1)
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  isSyncing: boolean;
  authError: string | null;
  workspaceSetupError: string | null;
  isPlatformAdmin: boolean;
  platformSettings: PlatformSettings;
  savePlatformSettings: (settings: PlatformSettings) => Promise<void>;
  changeCustomerSubscription: (uid: string, action: 'grant' | 'revoke', reason: string, days: number) => Promise<void>;
  saveCategoryForAll: (category: Category) => Promise<void>;
  platformAccounts: PlatformAccount[];
  refreshPlatformAccounts: () => Promise<void>;
  setPlatformAccountStatus: (uid: string, disabled: boolean) => Promise<void>;
  isAdminModalOpen: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  signInGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  workspaces: WorkspaceMembership[];
  activeWorkspace: WorkspaceMembership | null;
  householdMembers: HouseholdMember[];
  refreshHousehold: () => Promise<void>;
  inviteHouseholdMember: (email: string, role: 'member' | 'auditor') => Promise<string>;
  removeHouseholdMemberById: (memberId: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  isHouseholdModalOpen: boolean;
  openHouseholdModal: () => void;
  closeHouseholdModal: () => void;
  startSubscriptionCheckout: (plan: 'weekly' | 'monthly' | 'annual') => Promise<void>;
  todoItems: TodoItem[];
  addTodoItem: (input: Pick<TodoItem, 'title' | 'notes' | 'dueAt' | 'reminderAt' | 'visibility'>) => void;
  updateTodoItem: (id: string, updates: Partial<Pick<TodoItem, 'title' | 'notes' | 'dueAt' | 'reminderAt' | 'completed' | 'visibility'>>) => void;
  deleteTodoItem: (id: string) => void;
  enableTodoReminders: () => Promise<NotificationPermission | 'unsupported'>;
  // Actions
  postTransaction: (tx: Omit<Transaction, 'id' | 'created_at' | 'status' | 'posting_lines'>, postingLines?: any[]) => void;
  editTransaction: (originalTx: Transaction, updated: any) => void;
  postGoalContribution: (goalId: string, accountId: string, amountMinor: number) => void;
  withdrawGoalFunds: (goalId: string, accountId: string, amountMinor: number, reason: string) => { success: boolean; error?: string };
  toggleGoalLock: (goalId: string) => void;
  markCommitmentPaid: (commitmentId: string, categoryId: string, accountId: string) => void;
  addAccount: (acc: Omit<Account, 'id'>) => string;
  reconcileAccount: (accountId: string, statementBalanceMinor: number, statementDate: string) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'limit_version'>) => void;
  updateBudgetLimit: (budgetId: string, newLimitMinor: number) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'liability_node_id' | 'status'>) => void;
  recordDebtPayment: (debtId: string, accountId: string, amountMinor: number, interestMinor: number) => void;
  resetToDefaultSeed: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const FINANCE_STORAGE_KEYS = [
  'accounts', 'transactions', 'categories', 'goals', 'allocations', 'commitments',
  'debts', 'budgets', 'budget_alerts', 'project_items', 'audit_logs', 'subscription',
  'recurring', 'daily_savings', 'todo_items',
] as const;

function financeStorageKey(userId: string | null, key: string): string {
  return userId ? `kl_user_${userId}_${key}` : `kl_demo_${key}`;
}

function readFinanceStorage<T>(userId: string | null, key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(financeStorageKey(userId, key));
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(SEED_USERS[0]);

  const [accounts, setAccounts] = useState<Account[]>(() => {
    return readFinanceStorage(null, 'accounts', SEED_ACCOUNTS);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return readFinanceStorage(null, 'transactions', ALL_INITIAL_SEED_TRANSACTIONS);
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    return readFinanceStorage(null, 'categories', SEED_CATEGORIES);
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    return readFinanceStorage(null, 'goals', SEED_GOALS);
  });

  const [goalAllocations, setGoalAllocations] = useState<GoalAllocation[]>(() => {
    return readFinanceStorage(null, 'allocations', SEED_ALLOCATIONS);
  });

  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    return readFinanceStorage(null, 'commitments', SEED_COMMITMENTS);
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    return readFinanceStorage(null, 'debts', SEED_DEBTS);
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    return readFinanceStorage(null, 'budgets', SEED_BUDGETS);
  });

  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>(() => {
    return readFinanceStorage<BudgetAlert[]>(null, 'budget_alerts', []);
  });

  const [projects] = useState<Project[]>([SEED_PROJECT]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>(() => {
    return readFinanceStorage(null, 'project_items', SEED_PROJECT_ITEMS);
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return readFinanceStorage<AuditLog[]>(null, 'audit_logs', [
      {
        id: 'audit_init',
        timestamp: new Date().toISOString(),
        user_id: 'user_ada',
        user_name: 'Adaeze Okafor',
        action: 'SYSTEM_BOOTSTRAP',
        entity_type: 'workspace',
        entity_id: 'ws_main',
        details: 'Initialized KoboLedger double-entry posting ledger with seed accounts and opening balances.',
      },
    ]);
  });

  // Recurring Transactions State
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    return readFinanceStorage(null, 'recurring', SEED_RECURRING);
  });

  // Daily Savings Setting State
  const [dailySavings, setDailySavings] = useState<DailySavingsSetting>(() => {
    return readFinanceStorage(null, 'daily_savings', DEFAULT_DAILY_SAVINGS);
  });
  const [todoItems, setTodoItems] = useState<TodoItem[]>(() => readFinanceStorage(null, 'todo_items', []));
  const todoCloudReady = React.useRef(false);

  const addTodoItem = (input: Pick<TodoItem, 'title' | 'notes' | 'dueAt' | 'reminderAt' | 'visibility'>) => {
    const timestamp = new Date().toISOString();
    const item: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      dueAt: input.dueAt || undefined,
      reminderAt: input.reminderAt || undefined,
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      owner_user_id: firebaseUser?.uid || currentUser.id,
      workspace_id: activeWorkspace?.id || firebaseUser?.uid || 'ws_main',
      visibility: input.visibility || 'private',
    };
    setTodoItems((items) => [...items, item]);
    if (firebaseUser) persistTodoItem(item).catch(() => console.warn('Could not save the task to cloud storage.'));
  };

  const updateTodoItem = (id: string, updates: Partial<Pick<TodoItem, 'title' | 'notes' | 'dueAt' | 'reminderAt' | 'completed' | 'visibility'>>) => {
    setTodoItems((items) => items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
      if (firebaseUser) persistTodoItem(updated).catch(() => console.warn('Could not update the task in cloud storage.'));
      return updated;
    }));
  };

  const deleteTodoItem = (id: string) => {
    setTodoItems((items) => items.filter((item) => item.id !== id));
    if (firebaseUser) deleteRemoteTodoItem(id).catch(() => console.warn('Could not delete the task from cloud storage.'));
  };

  const enableTodoReminders = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  };

  // Subscription State & Commercial Monetization
  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    return readFinanceStorage<UserSubscription>(null, 'subscription', {
          tier: 'free',
          status: 'free',
        });
  });
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [requestedFeature, setRequestedFeature] = useState<string | undefined>(undefined);

  const openSubscriptionModal = (featureReason?: string) => {
    setRequestedFeature(featureReason);
    setIsSubscriptionModalOpen(true);
  };

  const closeSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
    setRequestedFeature(undefined);
  };

  // User Profile & Role Matrix Modal State
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);

  const openUserProfileModal = (user?: UserProfile) => {
    setSelectedUserProfile(user || currentUser);
    setIsUserProfileModalOpen(true);
  };

  const closeUserProfileModal = () => {
    setIsUserProfileModalOpen(false);
    setSelectedUserProfile(null);
  };

  const updateSubscription = (sub: Partial<UserSubscription>) => {
    if (firebaseUser) return; // Paid access is granted only from the verified server entitlement.
    setSubscription((prev) => {
      const updated = { ...prev, ...sub } as UserSubscription;
      return updated;
    });
  };

  const isFeatureAllowed = (
    feature: 'unlimited_accounts' | 'debt_reducing_engine' | 'four_tier_alerts' | 'cloud_sync' | 'christmas_planner' | 'vault_earmarks'
  ): boolean => {
    if (subscription.tier === 'pro' && subscription.status === 'active') {
      return true;
    }
    return false;
  };

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [hydratedStorageId, setHydratedStorageId] = useState<string | null>('demo');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceSetupError, setWorkspaceSetupError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const cloudSnapshotReady = React.useRef(false);
  const transactionCloudReady = React.useRef(false);
  const clearedLegacyCacheFor = React.useRef<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceMembership | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);

  const refreshPlatformAccounts = async () => {
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    setPlatformAccounts(await listPlatformAccounts());
  };

  const setPlatformAccountStatus = async (uid: string, disabled: boolean) => {
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    await setPlatformAccountDisabled(uid, disabled);
    await refreshPlatformAccounts();
  };

  const savePlatformSettings = async (settings: PlatformSettings) => {
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    setPlatformSettings(await updatePlatformSettings(settings));
  };

  const changeCustomerSubscription = async (uid: string, action: 'grant' | 'revoke', reason: string, days: number) => {
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    await setPlatformSubscription(uid, action, reason, days);
    await refreshPlatformAccounts();
  };

  const saveCategoryForAll = async (category: Category) => {
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    await saveGlobalCategory(category);
  };

  const refreshHousehold = async () => {
    const memberships = await listMyWorkspaces();
    setWorkspaces(memberships);
    const chosen = memberships.find((workspace) => workspace.id === activeWorkspace?.id) || memberships[0] || null;
    setActiveWorkspaceState(chosen);
    if (chosen) {
      const members = await listHouseholdMembers(chosen.id);
      setHouseholdMembers(members);
      setSyncWorkspace(chosen.id, members.map((member) => member.uid));
    }
  };

  const selectWorkspace = async (workspaceId: string) => {
    const chosen = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!chosen) return;
    setActiveWorkspaceState(chosen);
    const members = await listHouseholdMembers(chosen.id);
    setHouseholdMembers(members);
    setSyncWorkspace(chosen.id, members.map((member) => member.uid));
    setCurrentUser((previous) => ({ ...previous, role: chosen.role }));
  };

  const inviteHouseholdMember = async (email: string, role: 'member' | 'auditor') => {
    if (!activeWorkspace) throw new Error('Choose a workspace first.');
    const invite = await createHouseholdInvite(activeWorkspace.id, email, role);
    return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(invite.token)}`;
  };

  const removeHouseholdMemberById = async (memberId: string) => {
    if (!activeWorkspace) throw new Error('Choose a workspace first.');
    await removeHouseholdMember(activeWorkspace.id, memberId);
    await refreshHousehold();
  };

  const startSubscriptionCheckout = async (plan: 'weekly' | 'monthly' | 'annual') => {
    const result = await startPaystackCheckout(plan);
    window.location.assign(result.authorizationUrl);
  };

  const openHouseholdModal = () => setIsHouseholdModalOpen(true);
  const closeHouseholdModal = () => setIsHouseholdModalOpen(false);
  const openAdminModal = () => setIsAdminModalOpen(true);
  const closeAdminModal = () => setIsAdminModalOpen(false);

  useEffect(() => {
    getPublicPlatformSettings().then(setPlatformSettings).catch(() => {
      // Fall back to the published defaults if public settings are not deployed yet.
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser || !isWorkspaceReady) return;
    return listenToGlobalCategories(setCategories);
  }, [firebaseUser, isWorkspaceReady]);

  const persistFinanceState = (key: string, value: unknown) => {
    const userId = firebaseUser?.uid ?? null;
    if (hydratedStorageId !== (userId ?? 'demo')) return;
    if (userId) return; // Authenticated finance state lives in Firestore, not plaintext browser storage.
    localStorage.setItem(financeStorageKey(userId, key), JSON.stringify(value));
  };

  const clearLegacyCacheIfCloudReady = (uid: string) => {
    if (!cloudSnapshotReady.current || !transactionCloudReady.current || clearedLegacyCacheFor.current === uid) return;
    for (const key of FINANCE_STORAGE_KEYS) localStorage.removeItem(financeStorageKey(uid, key));
    clearedLegacyCacheFor.current = uid;
  };

  // Connection & Auth subscription (Phase 1)
  useEffect(() => {
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setIsWorkspaceReady(false);
      if (user) {
        if (auth.currentUser?.uid !== user.uid) return;
        const initials = user.displayName
          ? user.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : 'US';

        const updatedProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || user.email || 'Authenticated User',
          // Until membership is confirmed by trusted workspace data, never assume owner rights.
          role: 'member',
          avatar_initials: initials,
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        };
        setCurrentUser(updatedProfile);

        try {
          setWorkspaceSetupError(null);
          await persistUserProfile(updatedProfile);
          await ensureWorkspace(`${user.displayName || 'My'} Workspace`);
          const platformAdmin = await refreshPlatformAdminAccess();
          const token = await getIdTokenResult(user, true);
          setIsPlatformAdmin(platformAdmin && token.claims.platformAdmin === true);
          const pendingInvite = new URLSearchParams(window.location.search).get('invite');
          let invitedWorkspaceId: string | undefined;
          if (pendingInvite && user.emailVerified) {
            invitedWorkspaceId = (await acceptHouseholdInvite(pendingInvite)).workspaceId;
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, '', url.toString());
          }
          const memberships = await listMyWorkspaces();
          if (auth.currentUser?.uid !== user.uid) return;
          setWorkspaces(memberships);
          const chosen = memberships.find((workspace) => workspace.id === invitedWorkspaceId) || memberships[0] || null;
          setActiveWorkspaceState(chosen);
          if (chosen) {
            const members = await listHouseholdMembers(chosen.id);
            setHouseholdMembers(members);
            setSyncWorkspace(chosen.id, members.map((member) => member.uid));
            setCurrentUser({ ...updatedProfile, role: chosen.role });
          }
          if (auth.currentUser?.uid === user.uid) setIsWorkspaceReady(true);
        } catch (err) {
          const token = await getIdTokenResult(user).catch(() => null);
          const platformAdmin = await refreshPlatformAdminAccess().catch(() => false);
          setIsPlatformAdmin(platformAdmin && token?.claims.platformAdmin === true);
          setWorkspaceSetupError('Sign-in succeeded, but workspace setup failed. If you opened a household invitation, verify this email address and try the invitation again. Household sync is unavailable until the Firebase backend responds.');
          console.warn('Could not initialize cloud workspace.');
        }
      } else {
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setHouseholdMembers([]);
        setIsPlatformAdmin(false);
        setPlatformAccounts([]);
        setWorkspaceSetupError(null);
        setSyncWorkspace(null);
        setIsWorkspaceReady(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Keep each signed-in customer's local cache separate on shared devices.
  // The demo namespace remains separate from authenticated user namespaces.
  useLayoutEffect(() => {
    const userId = firebaseUser?.uid ?? null;
    const storageId = userId ?? 'demo';
    setHydratedStorageId(null);
    const demoMode = !userId;
    setAccounts(readFinanceStorage(userId, 'accounts', demoMode ? SEED_ACCOUNTS : []));
    setTransactions(readFinanceStorage(userId, 'transactions', demoMode ? ALL_INITIAL_SEED_TRANSACTIONS : []));
    setCategories(readFinanceStorage(userId, 'categories', SEED_CATEGORIES));
    setSavingsGoals(readFinanceStorage(userId, 'goals', demoMode ? SEED_GOALS : []));
    setGoalAllocations(readFinanceStorage(userId, 'allocations', demoMode ? SEED_ALLOCATIONS : []));
    setCommitments(readFinanceStorage(userId, 'commitments', demoMode ? SEED_COMMITMENTS : []));
    setDebts(readFinanceStorage(userId, 'debts', demoMode ? SEED_DEBTS : []));
    setBudgets(readFinanceStorage(userId, 'budgets', demoMode ? SEED_BUDGETS : []));
    setBudgetAlerts(readFinanceStorage<BudgetAlert[]>(userId, 'budget_alerts', []));
    setProjectItems(readFinanceStorage(userId, 'project_items', demoMode ? SEED_PROJECT_ITEMS : []));
    setAuditLogs(readFinanceStorage<AuditLog[]>(userId, 'audit_logs', []));
    setRecurringTransactions(readFinanceStorage(userId, 'recurring', demoMode ? SEED_RECURRING : []));
    setDailySavings(readFinanceStorage<DailySavingsSetting>(userId, 'daily_savings', demoMode ? DEFAULT_DAILY_SAVINGS : {
      target_minor: 0, saved_today_minor: 0, last_reset_date: new Date().toISOString().slice(0, 10), streak_days: 0,
    }));
    setTodoItems(readFinanceStorage<TodoItem[]>(userId, 'todo_items', []));
    todoCloudReady.current = false;
    setSubscription(userId ? { tier: 'free', status: 'free' } : readFinanceStorage<UserSubscription>(null, 'subscription', { tier: 'free', status: 'free' }));
    setHydratedStorageId(storageId);
  }, [firebaseUser?.uid]);

  // Real-time Firestore transaction sync
  useEffect(() => {
    if (!firebaseUser || !isWorkspaceReady) return;
    transactionCloudReady.current = false;
    setIsSyncing(true);
    const userId = firebaseUser.uid;
    const unsub = listenToTransactions(userId, (remoteTxs) => {
      setIsSyncing(false);
      if (remoteTxs.length === 0 && transactions.length > 0) {
        Promise.all(transactions.map((transaction) => persistTransaction(transaction)))
          .then(() => {
            transactionCloudReady.current = true;
            clearLegacyCacheIfCloudReady(userId);
          })
          .catch(() => console.warn('Existing browser transactions could not be migrated to cloud storage.'));
      } else {
        setTransactions(remoteTxs);
        transactionCloudReady.current = true;
        clearLegacyCacheIfCloudReady(userId);
      }
    });
    return () => unsub();
  }, [firebaseUser, isWorkspaceReady]);

  useEffect(() => {
    if (!firebaseUser) return;
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference) return;
    verifyPaystackCheckout(reference).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('reference');
      url.searchParams.delete('trxref');
      window.history.replaceState({}, '', url.toString());
    }).catch(() => console.warn('Payment verification did not complete. The account will update after provider confirmation.'));
  }, [firebaseUser]);

  // Cloud backed finance records. Local storage remains an offline cache; server snapshots
  // replace it after sign-in, and subsequent local edits are written to Firestore.
  useEffect(() => {
    if (!firebaseUser || !isWorkspaceReady) return;
    cloudSnapshotReady.current = false;
    let firstSnapshots = 11;
    const hydrate = (setter: (items: any[]) => void) => (items: any[]) => {
      setter(items);
      firstSnapshots -= 1;
      if (firstSnapshots === 0) cloudSnapshotReady.current = true;
    };
    const collections: Array<[string, (items: any[]) => void, any[]]> = [
      ['accounts', hydrate(setAccounts), accounts], ['debts', hydrate(setDebts), debts], ['budgets', hydrate(setBudgets), budgets],
      ['savings_goals', hydrate(setSavingsGoals), savingsGoals], ['commitments', hydrate(setCommitments), commitments],
      ['recurring_transactions', hydrate(setRecurringTransactions), recurringTransactions], ['goal_allocations', hydrate(setGoalAllocations), goalAllocations],
      ['project_items', hydrate(setProjectItems), projectItems], ['audit_logs', hydrate(setAuditLogs), auditLogs], ['daily_savings', hydrate((items) => {
        if (items[0]) setDailySavings(items[0] as DailySavingsSetting);
      }), [{ id: firebaseUser.uid, ...dailySavings }]],
      ['todo_items', hydrate((items) => {
        setTodoItems(items as TodoItem[]);
        todoCloudReady.current = true;
      }), todoItems],
    ];
    const unsubscribers = collections.map(([name, setter, cachedItems]) => listenToRecords(name, firebaseUser.uid, (items) => {
      if (items.length === 0 && cachedItems.length > 0) {
        persistRecords(name, cachedItems).catch(() => console.warn('Existing browser finance data could not be migrated to cloud storage.'));
        setter(cachedItems);
      } else setter(items);
    }));
    const unsubSubscription = listenToSubscription(firebaseUser.uid, (remote) => {
      if (!remote) {
        setSubscription({ tier: 'free', status: 'free' });
        return;
      }
      const expiresAt = typeof remote.expiresAt === 'string' ? remote.expiresAt : undefined;
      const expired = expiresAt ? new Date(`${expiresAt}T23:59:59Z`).getTime() < Date.now() : false;
      setSubscription({
        tier: !expired && remote.tier === 'pro' ? 'pro' : 'free',
        status: !expired && remote.status === 'active' ? 'active' : 'free',
        billingCycle: remote.billingCycle as UserSubscription['billingCycle'],
        expiresAt,
      });
    });
    return () => { unsubscribers.forEach((unsubscribe) => unsubscribe()); unsubSubscription(); };
  }, [firebaseUser, isWorkspaceReady]);

  useEffect(() => {
    if (!firebaseUser || !isWorkspaceReady || !cloudSnapshotReady.current) return;
    const writes: Array<[string, any[]]> = [
      ['accounts', accounts], ['debts', debts], ['budgets', budgets], ['savings_goals', savingsGoals],
      ['commitments', commitments], ['recurring_transactions', recurringTransactions],
      ['goal_allocations', goalAllocations], ['project_items', projectItems], ['audit_logs', auditLogs],
      ['daily_savings', [{ id: firebaseUser.uid, ...dailySavings }]],
      ['todo_items', todoItems],
    ];
    Promise.all(writes.map(([collectionName, records]) => persistRecords(collectionName, records)))
      .then(() => clearLegacyCacheIfCloudReady(firebaseUser.uid))
      .catch(() => console.warn('Cloud sync could not save a finance record.'));
  }, [firebaseUser, isWorkspaceReady, accounts, debts, budgets, savingsGoals, commitments, recurringTransactions, goalAllocations, projectItems, auditLogs, dailySavings, todoItems]);

  const signInGoogle = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
      const messages: Record<string, string> = {
        'auth/unauthorized-domain': 'This website is not enabled for Firebase sign-in. Add koboledger.vercel.app to Firebase Authentication’s Authorized domains.',
        'auth/operation-not-allowed': 'Google sign-in is disabled for this Firebase project. Enable Google in Authentication → Sign-in method.',
        'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this website and try again.',
        'auth/popup-closed-by-user': 'The Google sign-in window closed before sign-in finished.',
        'auth/network-request-failed': 'The sign-in request could not reach Firebase. Check your connection and try again.',
        'auth/invalid-api-key': 'Firebase rejected this app’s API key. Check the Firebase web app configuration.',
      };
      setAuthError(messages[code] || `Google sign-in could not complete${code ? ` (${code})` : ''}. Check the Firebase Authentication settings and try again.`);
    }
  };

  const signOutGoogle = async () => {
    try {
      await logoutUser();
      setCurrentUser(SEED_USERS[0]);
    } catch (e) {
      console.error('Sign-Out failed:', e);
      throw e;
    }
  };

  // Save changes to localStorage
  useEffect(() => {
    persistFinanceState('accounts', accounts);
  }, [accounts, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('transactions', transactions);
  }, [transactions, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('categories', categories);
  }, [categories, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('goals', savingsGoals);
  }, [savingsGoals, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('allocations', goalAllocations);
  }, [goalAllocations, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('commitments', commitments);
  }, [commitments, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('debts', debts);
  }, [debts, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('budgets', budgets);
  }, [budgets, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('budget_alerts', budgetAlerts);
  }, [budgetAlerts, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('project_items', projectItems);
  }, [projectItems, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('audit_logs', auditLogs);
  }, [auditLogs, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('subscription', subscription);
  }, [subscription, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('recurring', recurringTransactions);
  }, [recurringTransactions, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('daily_savings', dailySavings);
  }, [dailySavings, firebaseUser?.uid, hydratedStorageId]);
  useEffect(() => {
    persistFinanceState('todo_items', todoItems);
  }, [todoItems, firebaseUser?.uid, hydratedStorageId]);

  // Check budget thresholds on transaction updates with Deduplication Key (Section 6, T-04)
  useEffect(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7); // '2026-11'
    const thresholds = [50, 75, 90, 100];
    const newAlerts: BudgetAlert[] = [];

    for (const budget of budgets) {
      let categorySpend = 0;
      for (const tx of transactions) {
        if (tx.status !== 'posted') continue;
        if (!tx.effective_date.startsWith(currentPeriod)) continue;
        if (budget.exclude_project_spending && tx.project_id) continue;
        for (const line of tx.posting_lines) {
          if (line.ledger_node_id === budget.category_id && line.direction === 'debit') {
            categorySpend += line.amount_minor;
          }
        }
      }

      const usagePct = (categorySpend / budget.limit_minor) * 100;
      for (const th of thresholds) {
        if (usagePct >= th) {
          // Stable deduplication key: budgetId + period + threshold + limitVersion (Section 6, T-04)
          const dedupKey = `${budget.id}_${currentPeriod}_${th}_v${budget.limit_version}`;
          const alreadyFired = budgetAlerts.some((a) => a.dedup_key === dedupKey);

          if (!alreadyFired && !newAlerts.some((a) => a.dedup_key === dedupKey)) {
            const cat = categories.find((c) => c.id === budget.category_id);
            newAlerts.push({
              id: `alert_${Date.now()}_${th}`,
              dedup_key: dedupKey,
              budget_id: budget.id,
              period: currentPeriod,
              threshold_pct: th,
              limit_version: budget.limit_version,
              timestamp: new Date().toISOString(),
              message: `Budget Alert: ${budget.name} (${cat?.name || 'Category'}) has reached ${th}% of its ₦${(budget.limit_minor / 100).toLocaleString()} limit (current spend: ₦${(categorySpend / 100).toLocaleString()}).`,
            });
          }
        }
      }
    }

    if (newAlerts.length > 0) {
      setBudgetAlerts((prev) => [...prev, ...newAlerts]);
    }
  }, [transactions, budgets, categories]);

  const switchUser = (userId: string) => {
    if (firebaseUser) return;
    const found = SEED_USERS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (selectedUserProfile) {
        setSelectedUserProfile(found);
      }
    }
  };

  const postTransaction = (
    txData: Omit<Transaction, 'id' | 'created_at' | 'status' | 'posting_lines'>,
    customPostingLines?: any[]
  ) => {
    if (currentUser.role === 'auditor') {
      throw new Error('Auditor role is restricted to read-only attestation. Creating transactions is prohibited.');
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();

    const lines = customPostingLines || buildPostingLinesForTemplate({
      transactionId: txId,
      type: txData.type,
      amountMinor: txData.amount_minor,
      currency: txData.currency,
      accountId: txData.account_id,
      destinationAccountId: (txData as any).destination_account_id,
      categoryId: txData.category_id,
      debtLiabilityNodeId: (txData as any).debt_liability_node_id,
      interestMinor: (txData as any).interest_minor,
      feeMinor: (txData as any).fee_minor,
    });

    // Validate zero-sum
    const validation = validateTransactionBalance(lines);
    if (!validation.isValid) {
      throw new Error(`Transaction rejected: ${validation.error}`);
    }

    const newTx: Transaction = {
      ...txData,
      id: txId,
      created_at: timestamp,
      status: 'posted',
      revision_group_id: txData.revision_group_id || `rev_${txId}`,
      owner_user_id: currentUser.id,
      posting_lines: lines,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Persist to Firestore
    persistTransaction(newTx).catch((e) =>
      console.warn('Firestore transaction persist skipped:', e)
    );

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp,
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'POST_TRANSACTION',
        entity_type: 'transaction',
        entity_id: txId,
        details: `Posted ${txData.type} transaction '${txData.description}' of ₦${(txData.amount_minor / 100).toLocaleString()}`,
        revision_group_id: newTx.revision_group_id,
      },
      ...prev,
    ]);
  };

  const editTransaction = (originalTx: Transaction, updated: any) => {
    const { reversalTx, replacementTx, auditLogs: newLogs } = executeTransactionEdit(
      originalTx,
      updated,
      currentUser.id,
      currentUser.name
    );

    // Update transactions list: replace original with reversal + replacement
    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== originalTx.id);
      return [replacementTx, reversalTx, { ...originalTx, status: 'reversed' }, ...filtered];
    });

    // Persist immutable revisions to Firestore
    persistTransaction(reversalTx).catch((e) =>
      console.warn('Firestore reversal persist skipped:', e)
    );
    persistTransaction(replacementTx).catch((e) =>
      console.warn('Firestore replacement persist skipped:', e)
    );

    setAuditLogs((prev) => [...newLogs, ...prev]);
  };

  const postGoalContribution = (goalId: string, accountId: string, amountMinor: number) => {
    // Goals are virtual earmarks, not posting lines (Section 2, INV-03)
    setGoalAllocations((prev) => {
      const existing = prev.find((a) => a.goal_id === goalId && a.account_id === accountId);
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id
            ? { ...a, allocated_minor: a.allocated_minor + amountMinor, updated_at: new Date().toISOString() }
            : a
        );
      }
      return [
        ...prev,
        {
          id: `ga_${Date.now()}`,
          goal_id: goalId,
          account_id: accountId,
          allocated_minor: amountMinor,
          updated_at: new Date().toISOString(),
        },
      ];
    });

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'CONTRIBUTE_GOAL_EARMARK',
        entity_type: 'savings_goal',
        entity_id: goalId,
        details: `Earmarked ₦${(amountMinor / 100).toLocaleString()} virtual allocation for goal from account ${accountId}`,
      },
      ...prev,
    ]);
  };

  const withdrawGoalFunds = (
    goalId: string,
    accountId: string,
    amountMinor: number,
    reason: string
  ): { success: boolean; error?: string } => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return { success: false, error: 'Goal not found' };

    // T-10: Locked goals reject ordinary withdrawal until deliberately unlocked
    if (goal.access_mode === 'locked' && goal.is_locked) {
      return {
        success: false,
        error: 'Locked Goal: Ordinary withdrawal is strictly rejected while goal is in locked status. Deliberately toggle lock to unlock.',
      };
    }

    // T-10: Protected goals require confirmation and a reason
    if (goal.access_mode === 'protected' && (!reason || reason.trim().length === 0)) {
      return {
        success: false,
        error: 'Protected Goal: A clear justification reason is mandatory to withdraw funds from this protected reserve.',
      };
    }

    setGoalAllocations((prev) => {
      return prev.map((a) => {
        if (a.goal_id === goalId && a.account_id === accountId) {
          const newAlloc = Math.max(0, a.allocated_minor - amountMinor);
          return { ...a, allocated_minor: newAlloc, updated_at: new Date().toISOString() };
        }
        return a;
      });
    });

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'WITHDRAW_GOAL_EARMARK',
        entity_type: 'savings_goal',
        entity_id: goalId,
        details: `Withdrew ₦${(amountMinor / 100).toLocaleString()} from goal ${goal.name}. Reason: '${reason || 'Standard withdrawal'}'`,
      },
      ...prev,
    ]);

    return { success: true };
  };

  const toggleGoalLock = (goalId: string) => {
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const nextLocked = !g.is_locked;
          setAuditLogs((aPrev) => [
            {
              id: `audit_${Date.now()}`,
              timestamp: new Date().toISOString(),
              user_id: currentUser.id,
              user_name: currentUser.name,
              action: nextLocked ? 'LOCK_GOAL' : 'UNLOCK_GOAL',
              entity_type: 'savings_goal',
              entity_id: goalId,
              details: `Deliberately set goal '${g.name}' lock status to: ${nextLocked ? 'LOCKED' : 'UNLOCKED'}`,
            },
            ...aPrev,
          ]);
          return { ...g, is_locked: nextLocked };
        }
        return g;
      })
    );
  };

  const markCommitmentPaid = (commitmentId: string, categoryId: string, accountId: string) => {
    const com = commitments.find((c) => c.id === commitmentId);
    if (!com) return;

    // Create the actual ledger expense transaction (Section 4, INV-05, INV-06)
    const txId = `tx_com_paid_${Date.now()}`;
    const txLines = buildPostingLinesForTemplate({
      transactionId: txId,
      type: 'expense',
      amountMinor: com.amount_minor,
      currency: 'NGN',
      accountId: accountId || com.account_id,
      categoryId: categoryId || com.category_id || 'cat_utilities',
    });

    const newTx: Transaction = {
      id: txId,
      workspace_id: com.workspace_id,
      type: 'expense',
      description: `Payment for obligation: ${com.title}`,
      effective_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      status: 'posted',
      revision_group_id: `rev_${txId}`,
      amount_minor: com.amount_minor,
      currency: 'NGN',
      owner_user_id: currentUser.id,
      visibility: 'shared',
      posting_lines: txLines,
      account_id: accountId || com.account_id,
      category_id: categoryId || com.category_id,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Link commitment to transaction and mark paid
    setCommitments((prev) =>
      prev.map((c) =>
        c.id === commitmentId ? { ...c, status: 'paid', linked_transaction_id: txId } : c
      )
    );

    // If linked to project item, mark project item paid too
    setProjectItems((prev) =>
      prev.map((pi) => (pi.commitment_id === commitmentId ? { ...pi, is_paid: true } : pi))
    );

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'PAY_COMMITMENT',
        entity_type: 'commitment',
        entity_id: commitmentId,
        details: `Approved commitment '${com.title}' paid via posted transaction ${txId} (₦${(com.amount_minor / 100).toLocaleString()})`,
      },
      ...prev,
    ]);
  };

  const addAccount = (acc: Omit<Account, 'id'>) => {
    const id = `acc_${Date.now()}`;
    const newAcc: Account = { ...acc, id };
    setAccounts((prev) => [...prev, newAcc]);

    if (acc.opening_balance_minor > 0) {
      const txLines = buildPostingLinesForTemplate({
        transactionId: `tx_init_${id}`,
        type: 'opening_balance',
        amountMinor: acc.opening_balance_minor,
        currency: acc.currency,
        accountId: id,
      });

      const initTx: Transaction = {
        id: `tx_init_${id}`,
        workspace_id: 'ws_main',
        type: 'opening_balance',
        description: `Initial opening balance for ${acc.name}`,
        effective_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        status: 'posted',
        revision_group_id: `rev_init_${id}`,
        amount_minor: acc.opening_balance_minor,
        currency: acc.currency,
        owner_user_id: acc.owner_user_id,
        visibility: acc.visibility,
        posting_lines: txLines,
        account_id: id,
      };
      setTransactions((prev) => [initTx, ...prev]);
      persistTransaction(initTx).catch(() => console.warn('Opening balance could not be saved to cloud storage.'));
    }
    return id;
  };

  const reconcileAccount = (accountId: string, statementBalanceMinor: number, statementDate: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? {
              ...a,
              is_reconciled: true,
              last_reconciled_balance_minor: statementBalanceMinor,
              last_reconciled_date: statementDate,
            }
          : a
      )
    );

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'STATEMENT_RECONCILIATION',
        entity_type: 'account',
        entity_id: accountId,
        details: `Reconciled account statement balance to ₦${(statementBalanceMinor / 100).toLocaleString()} as of ${statementDate}`,
      },
      ...prev,
    ]);
  };

  const addBudget = (budget: Omit<Budget, 'id' | 'limit_version'>) => {
    const id = `bgt_${Date.now()}`;
    const newBgt: Budget = { ...budget, id, limit_version: 1 };
    setBudgets((prev) => [...prev, newBgt]);
  };

  const updateBudgetLimit = (budgetId: string, newLimitMinor: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === budgetId ? { ...b, limit_minor: newLimitMinor, limit_version: b.limit_version + 1 } : b))
    );
  };

  const addDebt = (debtData: Omit<Debt, 'id' | 'liability_node_id' | 'status'>) => {
    const id = `debt_${Date.now()}`;
    const liabilityNodeId = `node_liability_${id}`;
    const newDebt: Debt = {
      ...debtData,
      id,
      liability_node_id: liabilityNodeId,
      status: 'active',
    };
    setDebts((prev) => [...prev, newDebt]);

    // Record drawdown transaction (Section 2)
    // Debit Bank, Debit Fee (if any), Credit Liability
    const drawdownTxId = `tx_dd_${id}`;
    const feeMinor = debtData.drawdown_fee_minor || 0;
    const defaultBank = accounts.find((a) => a.type === 'bank') || accounts[0];

    const lines = buildPostingLinesForTemplate({
      transactionId: drawdownTxId,
      type: 'debt_drawdown',
      amountMinor: debtData.principal_minor,
      currency: 'NGN',
      accountId: defaultBank.id,
      debtLiabilityNodeId: liabilityNodeId,
      feeMinor,
    });

    const tx: Transaction = {
      id: drawdownTxId,
      workspace_id: 'ws_main',
      type: 'debt_drawdown',
      description: `Loan Drawdown: ${debtData.name} from ${debtData.creditor}`,
      effective_date: debtData.start_date,
      created_at: new Date().toISOString(),
      status: 'posted',
      revision_group_id: `rev_${drawdownTxId}`,
      amount_minor: debtData.principal_minor,
      currency: 'NGN',
      owner_user_id: debtData.owner_user_id,
      visibility: debtData.visibility,
      posting_lines: lines,
      account_id: defaultBank.id,
    };

    setTransactions((prev) => [tx, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'DEBT_DRAWDOWN',
        entity_type: 'debt',
        entity_id: id,
        details: `Recorded loan drawdown for ${debtData.name} (Principal ₦${(debtData.principal_minor / 100).toLocaleString()})`,
      },
      ...prev,
    ]);
  };

  const recordDebtPayment = (
    debtId: string,
    accountId: string,
    amountMinor: number,
    interestMinor: number
  ) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const txId = `tx_repay_${Date.now()}`;
    const lines = buildPostingLinesForTemplate({
      transactionId: txId,
      type: 'debt_repayment',
      amountMinor,
      currency: 'NGN',
      accountId,
      debtLiabilityNodeId: debt.liability_node_id,
      interestMinor,
    });

    const tx: Transaction = {
      id: txId,
      workspace_id: 'ws_main',
      type: 'debt_repayment',
      description: `Loan Repayment: ${debt.name} (${debt.creditor})`,
      effective_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      status: 'posted',
      revision_group_id: `rev_${txId}`,
      amount_minor: amountMinor,
      currency: 'NGN',
      owner_user_id: currentUser.id,
      visibility: debt.visibility,
      posting_lines: lines,
      account_id: accountId,
    };

    setTransactions((prev) => [tx, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'DEBT_REPAYMENT',
        entity_type: 'debt',
        entity_id: debtId,
        details: `Recorded debt repayment of ₦${(amountMinor / 100).toLocaleString()} (Principal: ₦${((amountMinor - interestMinor) / 100).toLocaleString()}, Interest: ₦${(interestMinor / 100).toLocaleString()})`,
      },
      ...prev,
    ]);
  };

  // Recurring Transactions Handlers
  const addRecurringTransaction = (rec: Omit<RecurringTransaction, 'id' | 'created_at' | 'status'>) => {
    const newRec: RecurringTransaction = {
      ...rec,
      id: `rec_${Date.now()}`,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setRecurringTransactions((prev) => {
      const updated = [newRec, ...prev];
      return updated;
    });
  };

  const updateRecurringTransaction = (id: string, updates: Partial<RecurringTransaction>) => {
    setRecurringTransactions((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      return updated;
    });
  };

  const deleteRecurringTransaction = (id: string) => {
    setRecurringTransactions((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      return updated;
    });
  };

  const executeRecurringTransaction = (id: string) => {
    const rec = recurringTransactions.find((r) => r.id === id);
    if (!rec) return;

    const todayStr = new Date().toISOString().split('T')[0];

    const postingLines = buildPostingLinesForTemplate({
      transactionId: `tx_rec_${Date.now()}`,
      type: rec.type,
      amountMinor: rec.amount_minor,
      currency: rec.currency,
      accountId: rec.account_id,
      categoryId: rec.category_id,
      destinationAccountId: rec.destination_account_id,
    });

    postTransaction(
      {
        workspace_id: 'ws_main',
        type: rec.type,
        revision_group_id: `rev_rec_${Date.now()}`,
        description: `[Scheduled ${rec.interval}] ${rec.description}`,
        effective_date: todayStr,
        amount_minor: rec.amount_minor,
        currency: rec.currency,
        owner_user_id: rec.owner_user_id,
        visibility: rec.visibility,
        account_id: rec.account_id,
        category_id: rec.category_id,
      },
      postingLines
    );

    // Calculate next due date
    const currentDate = new Date(rec.next_due_date || todayStr);
    const nextDate = new Date(currentDate);
    if (rec.interval === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (rec.interval === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    updateRecurringTransaction(id, {
      next_due_date: nextDate.toISOString().split('T')[0],
      last_executed_date: todayStr,
    });
  };

  // Daily Savings Handlers
  const updateDailySavingsTarget = (targetMinor: number) => {
    setDailySavings((prev) => {
      const updated = { ...prev, target_minor: targetMinor };
      return updated;
    });
  };

  const recordDailySavingsDeposit = (amountMinor: number, goalId?: string) => {
    const targetGoal = savingsGoals.find((g) => g.id === goalId) || savingsGoals[0];
    if (targetGoal) {
      postGoalContribution(targetGoal.id, targetGoal.linked_account_id, amountMinor);
    }

    setDailySavings((prev) => {
      const newSaved = prev.saved_today_minor + amountMinor;
      const isTargetMet = newSaved >= prev.target_minor;
      const updated: DailySavingsSetting = {
        ...prev,
        saved_today_minor: newSaved,
        streak_days: isTargetMet ? (prev.saved_today_minor < prev.target_minor ? prev.streak_days + 1 : prev.streak_days) : prev.streak_days,
      };
      return updated;
    });
  };

  const resetToDefaultSeed = () => {
    const userId = firebaseUser?.uid ?? null;
    for (const key of FINANCE_STORAGE_KEYS) {
      localStorage.removeItem(financeStorageKey(userId, key));
    }
    setAccounts(SEED_ACCOUNTS);
    setTransactions(ALL_INITIAL_SEED_TRANSACTIONS);
    setCategories(SEED_CATEGORIES);
    setSavingsGoals(SEED_GOALS);
    setGoalAllocations(SEED_ALLOCATIONS);
    setCommitments(SEED_COMMITMENTS);
    setDebts(SEED_DEBTS);
    setBudgets(SEED_BUDGETS);
    setBudgetAlerts([]);
    setProjectItems(SEED_PROJECT_ITEMS);
    setRecurringTransactions(SEED_RECURRING);
    setDailySavings(DEFAULT_DAILY_SAVINGS);
    setTodoItems([]);
    setAuditLogs([
      {
        id: `audit_reset_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'SYSTEM_RESET',
        entity_type: 'workspace',
        entity_id: 'ws_main',
        details: 'Reset KoboLedger database to clean default seed state.',
      },
    ]);
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        switchUser,
        accounts,
        transactions,
        categories,
        savingsGoals,
        goalAllocations,
        commitments,
        debts,
        budgets,
        budgetAlerts,
        projects,
        projectItems,
        auditLogs,
        recurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        executeRecurringTransaction,
        dailySavings,
        updateDailySavingsTarget,
        recordDailySavingsDeposit,
        subscription,
        updateSubscription,
        isFeatureAllowed,
        isSubscriptionModalOpen,
        openSubscriptionModal,
        closeSubscriptionModal,
        requestedFeature,
        isUserProfileModalOpen,
        openUserProfileModal,
        closeUserProfileModal,
        selectedUserProfile,
        firebaseUser,
        isFirebaseConnected,
        isSyncing,
        authError,
        workspaceSetupError,
        isPlatformAdmin,
        platformSettings,
        savePlatformSettings,
        changeCustomerSubscription,
        saveCategoryForAll,
        platformAccounts,
        refreshPlatformAccounts,
        setPlatformAccountStatus,
        isAdminModalOpen,
        openAdminModal,
        closeAdminModal,
        signInGoogle,
        signOutGoogle,
        workspaces,
        activeWorkspace,
        householdMembers,
        refreshHousehold,
        inviteHouseholdMember,
        removeHouseholdMemberById,
        selectWorkspace,
        isHouseholdModalOpen,
        openHouseholdModal,
        closeHouseholdModal,
        startSubscriptionCheckout,
        todoItems,
        addTodoItem,
        updateTodoItem,
        deleteTodoItem,
        enableTodoReminders,
        postTransaction,
        editTransaction,
        postGoalContribution,
        withdrawGoalFunds,
        toggleGoalLock,
        markCommitmentPaid,
        addAccount,
        reconcileAccount,
        addBudget,
        updateBudgetLimit,
        addDebt,
        recordDebtPayment,
        resetToDefaultSeed,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
