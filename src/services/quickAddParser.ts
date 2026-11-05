/**
 * Deterministic Quick-Add Parser for Nigerian Phrasing (Section 10, T-01)
 * Extracts:
 * - Amount: ₦3000, N3000, 3,000, 3k, 3.5k, 50k, 1.2m
 * - Phrasing: "Transport to Aba 3000", "I buy fuel 5k", "Bought airtime 2000", "Paid light bill 20k", "Sent Mum 15000"
 * - Ambiguity detection: Flags dual-intent phrases like "Sent Mum 15000" for user confirmation
 * - Confidence scores per field
 * - Generates DRAFT for review card. Nothing is ever posted automatically!
 */

import { Account, Category, TransactionType } from '../types/finance';

export interface ParsedDraft {
  rawText: string;
  type: TransactionType;
  amountMinor: number;
  description: string;
  effectiveDate: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
  payee?: string;
  confidence: {
    amount: number;
    category: number;
    account: number;
    type: number;
  };
  isAmbiguous: boolean;
  ambiguityReason?: string;
  ambiguityOptions?: {
    label: string;
    type: TransactionType;
    categoryId?: string;
    isTransfer?: boolean;
  }[];
}

// Nigerian keyword dictionary for deterministic matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cat_transport: [
    'transport', 'aba', 'fuel', 'petrol', 'bus', 'uber', 'bolt', 'danfo', 'brt', 'flight',
    'fare', 'cab', 'taxi', 'locomotion', 'filling station', 'conoil', 'total', 'nnpc'
  ],
  cat_utilities: [
    'light', 'bill', 'airtime', 'data', 'mtn', 'airtel', 'glo', '9mobile', 'nepa', 'ekedc',
    'ikedc', 'phcn', 'dstv', 'gotv', 'startimes', 'water', 'waste', 'internet', 'spectranet'
  ],
  cat_food: [
    'food', 'rice', 'garri', 'soup', 'market', 'chicken', 'meat', 'fish', 'groceries',
    'lunch', 'dinner', 'breakfast', 'kfc', 'sweet sensation', 'supermarket', 'yam', 'beans', 'bread'
  ],
  cat_family: [
    'mum', 'mom', 'dad', 'mama', 'papa', 'brother', 'sister', 'family', 'parents', 'home',
    'allowance', 'upkeep', 'support'
  ],
  cat_rent: [
    'rent', 'landlord', 'estate', 'apartment', 'flat', 'service charge'
  ],
  cat_healthcare: [
    'hospital', 'drugs', 'pharmacy', 'chemist', 'doctor', 'clinic', 'meds', 'paracetamol'
  ],
  cat_income_salary: [
    'salary', 'wage', 'allowance', 'stipend', 'bonus', 'client', 'payment received'
  ],
};

/**
 * Parses numeric amount from Nigerian colloquial expressions:
 * "5k" -> 500000 kobo (5,000 NGN)
 * "3.5k" -> 350000 kobo (3,500 NGN)
 * "₦3000" / "N3000" / "3,000" -> 300000 kobo
 * "20k" -> 2000000 kobo (20,000 NGN)
 */
export function extractAmountMinor(text: string): { amountMinor: number; matchedText: string; confidence: number } {
  // Regex patterns
  // 1. "3.5k", "5k", "20k", "100k", "1.5m"
  const kPattern = /(?:[₦N#]\s*)?(\d+(?:\.\d+)?)\s*([kKmM])\b/;
  const kMatch = text.match(kPattern);
  if (kMatch) {
    const num = parseFloat(kMatch[1]);
    const unit = kMatch[2].toLowerCase();
    const multiplier = unit === 'm' ? 1_000_000 : 1_000;
    const nairaVal = num * multiplier;
    return {
      amountMinor: Math.round(nairaVal * 100),
      matchedText: kMatch[0],
      confidence: 1.0,
    };
  }

  // 2. Standard numbers: "₦3,000", "N3000", "3000", "3,500.00"
  const numPattern = /(?:[₦N#]\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/;
  const numMatch = text.match(numPattern);
  if (numMatch) {
    const rawNum = numMatch[1].replace(/,/g, '');
    const nairaVal = parseFloat(rawNum);
    if (!isNaN(nairaVal) && nairaVal > 0) {
      return {
        amountMinor: Math.round(nairaVal * 100),
        matchedText: numMatch[0],
        confidence: 0.95,
      };
    }
  }

  return { amountMinor: 0, matchedText: '', confidence: 0 };
}

/**
 * Extracts date reference (today, yesterday, Monday, etc.)
 */
export function extractDate(text: string): { dateStr: string; matchedText: string } {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes('yesterday')) {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    return { dateStr: yest.toISOString().split('T')[0], matchedText: 'yesterday' };
  }

  // Default to today
  return { dateStr: today.toISOString().split('T')[0], matchedText: 'today' };
}

/**
 * Main Deterministic Parser Function (Section 10)
 */
export function parseQuickAddInput(
  rawInput: string,
  accounts: Account[],
  categories: Category[]
): ParsedDraft {
  const trimmed = rawInput.trim();
  const lower = trimmed.toLowerCase();

  // 1. Amount
  const { amountMinor, matchedText: amountMatched, confidence: amountConfidence } = extractAmountMinor(trimmed);

  // 2. Effective date
  const { dateStr, matchedText: dateMatched } = extractDate(trimmed);

  // 3. Clean description by removing matched amount & date words
  let cleanDesc = trimmed;
  if (amountMatched) {
    cleanDesc = cleanDesc.replace(amountMatched, '');
  }
  if (dateMatched && dateMatched !== 'today') {
    cleanDesc = cleanDesc.replace(new RegExp(`\\b${dateMatched}\\b`, 'i'), '');
  }
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();
  if (!cleanDesc) cleanDesc = 'Quick Transaction';

  // 4. Match Account (Check if user mentioned wallet, bank, cash, kuda, etc.)
  let matchedAccount = accounts.find((a) => lower.includes(a.name.toLowerCase()));
  if (!matchedAccount) {
    if (lower.includes('wallet') || lower.includes('cash')) {
      matchedAccount = accounts.find((a) => a.type === 'wallet');
    } else if (lower.includes('bank') || lower.includes('gtb') || lower.includes('access') || lower.includes('zenith')) {
      matchedAccount = accounts.find((a) => a.type === 'bank');
    }
  }
  // Default to first wallet or bank if not specified
  const chosenAccount = matchedAccount || accounts.find((a) => a.type === 'wallet') || accounts[0];
  const accountConfidence = matchedAccount ? 0.9 : 0.6;

  // 5. Match Category
  let matchedCategoryId: string | undefined;
  let categoryConfidence = 0;

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matchedCategoryId = catId;
        categoryConfidence = 0.85;
        break;
      }
    }
    if (matchedCategoryId) break;
  }

  // If no category matched via keywords, attempt name matching
  if (!matchedCategoryId) {
    const directCat = categories.find((c) => lower.includes(c.name.toLowerCase()));
    if (directCat) {
      matchedCategoryId = directCat.id;
      categoryConfidence = 0.8;
    }
  }

  // 6. Ambiguity Detection (Section 10.4)
  // Example: "Sent Mum 15000" could be family support expense or transfer
  let isAmbiguous = false;
  let ambiguityReason: string | undefined;
  let ambiguityOptions: ParsedDraft['ambiguityOptions'];

  if (lower.includes('sent mum') || lower.includes('sent dad') || lower.includes('send money') || lower.includes('transferred to')) {
    isAmbiguous = true;
    ambiguityReason = 'Could be family support living expense or an account transfer.';
    ambiguityOptions = [
      {
        label: 'Family Support (Living Expense)',
        type: 'expense',
        categoryId: 'cat_family',
        isTransfer: false,
      },
      {
        label: 'Own Account Transfer (Capital Move)',
        type: 'transfer',
        isTransfer: true,
      },
    ];
  }

  // Determine primary transaction type
  let type: TransactionType = 'expense';
  if (lower.includes('received') || lower.includes('salary') || lower.includes('got paid') || lower.includes('income')) {
    type = 'income';
    if (!matchedCategoryId) matchedCategoryId = 'cat_income_salary';
  } else if (lower.includes('transfer to') || lower.includes('moved to')) {
    type = 'transfer';
  }

  return {
    rawText: trimmed,
    type,
    amountMinor,
    description: cleanDesc,
    effectiveDate: dateStr,
    accountId: chosenAccount?.id,
    categoryId: matchedCategoryId,
    confidence: {
      amount: amountConfidence,
      category: categoryConfidence,
      account: accountConfidence,
      type: 0.85,
    },
    isAmbiguous,
    ambiguityReason,
    ambiguityOptions,
  };
}
