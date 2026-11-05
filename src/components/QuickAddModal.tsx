import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { parseQuickAddInput, ParsedDraft } from '../services/quickAddParser';
import { formatMinor } from '../services/ledgerEngine';
import {
  X,
  Sparkles,
  Check,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Building,
  Tag,
  Hash,
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
  const currentCategory = categories.find((c) => c.id === confirmedCategoryId);
  const destinationAccount = accounts.find((a) => a.id === confirmedDestinationAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Accent Glow Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 px-6 py-4.5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Deterministic Quick Add</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Nigerian Phrasing
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Blueprint Section 10 · Draft Review Mandatory · Zero Silent Posts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Phrasing Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Nigerian Everyday Phrases (Click to test)
              </label>
              <span className="text-[11px] text-slate-400">Section 10.2</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'Transport to Aba 3000',
                'I buy fuel 5k',
                'Bought airtime 2000',
                'Paid light bill 20k',
                'Sent Mum 15000',
                'Received salary 250k',
              ].map((phrase) => {
                const isSelected = inputVal === phrase;
                return (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleApplySamplePhrase(phrase)}
                    className={`text-xs px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {phrase}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Natural Text Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Type or speak natural expense in Naira
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. Transport to Aba 3000, Sent Mum 15k, Paid light bill 20000"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0E131F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                autoFocus
              />
              <div className="absolute right-3 top-3 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-white/10">
                ENTER
              </div>
            </div>
          </div>

          {/* Ambiguity Resolution Alert (Section 10.4) */}
          {draft?.isAmbiguous && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Clarification Required: {draft.ambiguityReason}</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
                Nigerian context detected multiple possible meanings. Pick your intended movement:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {draft.ambiguityOptions?.map((opt, idx) => {
                  const isOptSelected = selectedAmbiguityIndex === idx;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleAmbiguitySelect(idx)}
                      className={`flex items-center justify-between text-xs p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isOptSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs'
                          : 'border-amber-500/20 bg-white/70 dark:bg-white/5 hover:border-amber-500/40 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isOptSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parser Confidence Strip */}
          {draft && (
            <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Amount Match:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {Math.round(draft.confidence.amount * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Category:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {Math.round(draft.confidence.category * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Deterministic Grammar Match</span>
              </div>
            </div>
          )}

          {/* Mandatory Review Card (Section 10.5) */}
          <form onSubmit={handleConfirmAndPost} className="space-y-4 pt-1">
            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-4 bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Review Posting Draft Before Commitment
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  DRAFT · UNPOSTED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Movement Type */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Movement Type
                  </label>
                  <select
                    value={confirmedType}
                    onChange={(e) => setConfirmedType(e.target.value as TransactionType)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="expense">Expense (Spend)</option>
                    <option value="income">Income (Earnings)</option>
                    <option value="transfer">Transfer (Between Own Accounts)</option>
                  </select>
                </div>

                {/* Amount in Naira */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (₦ NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold">₦</span>
                    <input
                      type="number"
                      step="any"
                      value={confirmedAmountNaira || ''}
                      onChange={(e) => setConfirmedAmountNaira(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] pl-8 pr-3 py-2.5 text-slate-900 dark:text-white font-mono font-bold tabular-nums text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={confirmedDescription}
                    onChange={(e) => setConfirmedDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Effective Date (INV-08 Backdating) */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Effective Date (INV-08)
                  </label>
                  <input
                    type="date"
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Account */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {confirmedType === 'transfer' ? 'Source Account' : 'Account'}
                  </label>
                  <select
                    value={confirmedAccountId}
                    onChange={(e) => setConfirmedAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
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
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Ledger Category
                    </label>
                    <select
                      value={confirmedCategoryId}
                      onChange={(e) => setConfirmedCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((c) =>
                          confirmedType === 'income' ? c.type === 'income' : c.type === 'expense'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.is_essential ? '(Essential Living)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Destination Account
                    </label>
                    <select
                      value={confirmedDestinationAccountId}
                      onChange={(e) => setConfirmedDestinationAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131926] p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
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

              {/* Posting Lines Double-Entry Preview Card */}
              <div className="border-t border-slate-200/80 dark:border-white/10 pt-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Double-Entry Ledger Impact (Zero-Sum Invariant INV-13)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Net: ₦0.00
                  </span>
                </div>
                
                <div className="text-xs font-mono space-y-1.5 bg-white dark:bg-[#080B11] p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
                  {confirmedType === 'expense' && (
                    <>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          DEBIT Category ({currentCategory?.name || 'Selected Category'})
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          +{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          CREDIT Account ({currentAccount?.name || 'Selected Account'})
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          -{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                    </>
                  )}
                  {confirmedType === 'income' && (
                    <>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          DEBIT Account ({currentAccount?.name || 'Selected Account'})
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          +{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          CREDIT Category ({currentCategory?.name || 'Income Category'})
                        </span>
                        <span className="text-slate-500 font-bold tabular-nums">
                          +{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                    </>
                  )}
                  {confirmedType === 'transfer' && (
                    <>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          DEBIT Destination ({destinationAccount?.name || 'Dest Account'})
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          +{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-700 dark:text-slate-300">
                          CREDIT Source ({currentAccount?.name || 'Source Account'})
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          -{formatMinor(confirmedAmountNaira * 100)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 italic pt-1 font-sans">
                        INV-02: Transfer between own accounts leaves income and expense totals unchanged.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Optional LLM Fallback Section (Section 10.6) */}
            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Optional Gemini AI Assistant
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Off by default · Privacy-preserving raw text only
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLLMFallback}
                    onChange={(e) => setEnableLLMFallback(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all transform active:scale-98"
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
