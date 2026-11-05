import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { parseQuickAddInput, ParsedDraft } from '../services/quickAddParser';
import { formatMinor } from '../services/ledgerEngine';
import {
  X,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { TransactionType } from '../types/finance';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const { accounts, categories, postTransaction, currentUser } = useFinance();

  const [inputVal, setInputVal] = useState('Transport to Aba 3000');
  const [draft, setDraft] = useState<ParsedDraft | null>(null);

  // Editable fields on review card
  const [confirmedType, setConfirmedType] = useState<TransactionType>('expense');
  const [confirmedAmountNaira, setConfirmedAmountNaira] = useState<number>(3000);
  const [confirmedDescription, setConfirmedDescription] = useState('Transport to Aba');
  const [confirmedDate, setConfirmedDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmedAccountId, setConfirmedAccountId] = useState<string>('');
  const [confirmedCategoryId, setConfirmedCategoryId] = useState<string>('');
  const [confirmedDestinationAccountId, setConfirmedDestinationAccountId] = useState<string>('');

  // Optional LLM fallback state
  const [enableLLMFallback, setEnableLLMFallback] = useState(false);
  const [isLLMProcessing, setIsLLMProcessing] = useState(false);

  // Ambiguity selection
  const [selectedAmbiguityIndex, setSelectedAmbiguityIndex] = useState<number | null>(null);

  // Run deterministic parser as user types
  useEffect(() => {
    if (!inputVal.trim()) {
      setDraft(null);
      return;
    }
    const parsed = parseQuickAddInput(inputVal, accounts, categories);
    setDraft(parsed);

    // Populate draft fields into review card
    setConfirmedType(parsed.type);
    setConfirmedAmountNaira(parsed.amountMinor / 100);
    setConfirmedDescription(parsed.description);
    setConfirmedDate(parsed.effectiveDate);
    if (parsed.accountId) setConfirmedAccountId(parsed.accountId);
    if (parsed.categoryId) setConfirmedCategoryId(parsed.categoryId);

    if (parsed.isAmbiguous) {
      setSelectedAmbiguityIndex(null);
    }
  }, [inputVal, accounts, categories]);

  if (!isOpen) return null;

  const handleApplySamplePhrase = (phrase: string) => {
    setInputVal(phrase);
  };

  const handleAmbiguitySelect = (idx: number) => {
    setSelectedAmbiguityIndex(idx);
    if (draft?.ambiguityOptions && draft.ambiguityOptions[idx]) {
      const opt = draft.ambiguityOptions[idx];
      setConfirmedType(opt.type);
      if (opt.categoryId) setConfirmedCategoryId(opt.categoryId);
      if (opt.isTransfer) {
        // Set default destination account
        const otherAcc = accounts.find((a) => a.id !== confirmedAccountId);
        if (otherAcc) setConfirmedDestinationAccountId(otherAcc.id);
      }
    }
  };

  const handleConfirmAndPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedAmountNaira || confirmedAmountNaira <= 0) {
      alert('Please provide a valid transaction amount.');
      return;
    }
    if (!confirmedAccountId) {
      alert('Please select an account for this transaction.');
      return;
    }
    if (confirmedType === 'expense' && !confirmedCategoryId) {
      alert('Please select a category for this expense.');
      return;
    }
    if (confirmedType === 'transfer' && !confirmedDestinationAccountId) {
      alert('Please select a destination account for this transfer.');
      return;
    }

    const amountMinor = Math.round(confirmedAmountNaira * 100);

    postTransaction({
      workspace_id: 'ws_main',
      type: confirmedType,
      description: confirmedDescription,
      effective_date: confirmedDate,
      amount_minor: amountMinor,
      currency: 'NGN',
      owner_user_id: currentUser.id,
      visibility: 'shared',
      account_id: confirmedAccountId,
      category_id: confirmedType !== 'transfer' ? confirmedCategoryId : undefined,
      destination_account_id: confirmedType === 'transfer' ? confirmedDestinationAccountId : undefined,
    } as any);

    onClose();
  };

  const currentAccount = accounts.find((a) => a.id === confirmedAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Deterministic Quick Add (Nigerian Phrasing)
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Blueprint Section 10</span>
              <span aria-hidden="true">·</span>
              <span>Draft Review Mandatory</span>
              <span aria-hidden="true">·</span>
              <span>Zero Silent Posts</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Phrasing Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Nigerian Everyday Test Phrases (Click to try)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Transport to Aba 3000',
                'I buy fuel 5k',
                'Bought airtime 2000',
                'Paid light bill 20k',
                'Sent Mum 15000',
                'Received salary 250k',
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleApplySamplePhrase(phrase)}
                  className={`text-xs px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${
                    inputVal === phrase
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-medium'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* Natural Text Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Type natural expression
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. Transport to Aba 3000 or Bought fuel 5k"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                autoFocus
              />
            </div>
          </div>

          {/* Ambiguity Resolution Alert (Section 10.4) */}
          {draft?.isAmbiguous && (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Ambiguity Detected: {draft.ambiguityReason}</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Please clarify your intent before creating the ledger draft:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {draft.ambiguityOptions?.map((opt, idx) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleAmbiguitySelect(idx)}
                    className={`flex items-center justify-between text-xs p-2.5 rounded-md border text-left cursor-pointer transition-colors ${
                      selectedAmbiguityIndex === idx
                        ? 'border-emerald-600 bg-white text-emerald-900 font-semibold shadow-xs dark:bg-slate-800 dark:text-emerald-300 dark:border-emerald-500'
                        : 'border-amber-200 bg-amber-100/50 hover:bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedAmbiguityIndex === idx && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parser Confidence Strip */}
          {draft && (
            <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  Amount confidence: <strong className="font-mono text-slate-900 dark:text-white">{Math.round(draft.confidence.amount * 100)}%</strong>
                </span>
                <span>
                  Category: <strong className="font-mono text-slate-900 dark:text-white">{Math.round(draft.confidence.category * 100)}%</strong>
                </span>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Deterministic Rule Match</span>
            </div>
          )}

          {/* Mandatory Review Card (Section 10.5) */}
          <form onSubmit={handleConfirmAndPost} className="space-y-4 pt-1">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 bg-slate-50/50 dark:bg-slate-850/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Review Ledger Posting Draft
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Status: <strong>DRAFT (Unposted)</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Transaction Type */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Movement Type
                  </label>
                  <select
                    value={confirmedType}
                    onChange={(e) => setConfirmedType(e.target.value as TransactionType)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="expense">Expense (Spend)</option>
                    <option value="income">Income (Earnings)</option>
                    <option value="transfer">Transfer (Own Accounts)</option>
                  </select>
                </div>

                {/* Amount in Naira */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (₦ NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₦</span>
                    <input
                      type="number"
                      step="any"
                      value={confirmedAmountNaira || ''}
                      onChange={(e) => setConfirmedAmountNaira(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-3 py-2 text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={confirmedDescription}
                    onChange={(e) => setConfirmedDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Effective Date (INV-08 Backdating) */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Account */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    {confirmedType === 'transfer' ? 'Source Account' : 'Account'}
                  </label>
                  <select
                    value={confirmedAccountId}
                    onChange={(e) => setConfirmedAccountId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
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

                {/* Category (if expense or income) */}
                {confirmedType !== 'transfer' ? (
                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Ledger Category
                    </label>
                    <select
                      value={confirmedCategoryId}
                      onChange={(e) => setConfirmedCategoryId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((c) =>
                          confirmedType === 'income' ? c.type === 'income' : c.type === 'expense'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.is_essential ? '(Essential)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Destination Account
                    </label>
                    <select
                      value={confirmedDestinationAccountId}
                      onChange={(e) => setConfirmedDestinationAccountId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none"
                      required
                    >
                      <option value="">Select Destination</option>
                      {accounts
                        .filter((a) => a.id !== confirmedAccountId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Posting Lines Double-Entry Preview */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Double-Entry Ledger Impact (Zero-Sum Guaranteed)
                </span>
                <div className="text-xs font-mono space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {confirmedType === 'expense' && (
                    <>
                      <div className="flex justify-between">
                        <span>DEBIT Category: {categories.find((c) => c.id === confirmedCategoryId)?.name || 'Selected Category'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CREDIT Account: {currentAccount?.name || 'Selected Account'}</span>
                        <span className="text-rose-600 dark:text-rose-400 tabular-nums">-{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                    </>
                  )}
                  {confirmedType === 'income' && (
                    <>
                      <div className="flex justify-between">
                        <span>DEBIT Account: {currentAccount?.name || 'Selected Account'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CREDIT Category: {categories.find((c) => c.id === confirmedCategoryId)?.name || 'Income Category'}</span>
                        <span className="text-slate-500 tabular-nums">+{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                    </>
                  )}
                  {confirmedType === 'transfer' && (
                    <>
                      <div className="flex justify-between">
                        <span>DEBIT Dest Account: {accounts.find((a) => a.id === confirmedDestinationAccountId)?.name || 'Dest Account'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CREDIT Source Account: {currentAccount?.name || 'Source Account'}</span>
                        <span className="text-rose-600 dark:text-rose-400 tabular-nums">-{formatMinor(confirmedAmountNaira * 100)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 italic mt-1 font-sans">
                        INV-02: Transfer between own accounts leaves income and expense totals unchanged.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Optional LLM Fallback Section (Section 10.6) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/60 dark:bg-slate-850/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Optional Gemini AI Semantic Assistant
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLLMFallback}
                    onChange={(e) => setEnableLLMFallback(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Per Section 10.6: Off by default. When enabled, sends only the entry string. Never sees account balances, account names, or bank records.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Post to Ledger (T-01)</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
