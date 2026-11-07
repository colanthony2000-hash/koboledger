import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { X } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  featureRequested?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  featureRequested: propFeatureRequested,
}) => {
  const {
    isSubscriptionModalOpen,
    closeSubscriptionModal,
    requestedFeature,
    firebaseUser,
    startSubscriptionCheckout,
    platformSettings,
  } = useFinance();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  // Payment Functions are deployed only after PAYSTACK_SECRET_KEY is stored in Secret Manager.
  const secureCheckoutReady = false;

  const isOpen = propIsOpen !== undefined ? propIsOpen : isSubscriptionModalOpen;
  const onClose = propOnClose || closeSubscriptionModal;
  const activeFeatureRequested = propFeatureRequested || requestedFeature;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500" />

        {/* Modal Header with Company Brand Identity */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_bf2c43a3.png"
              alt="JENECONK Logo"
              className="w-10 h-10 object-contain drop-shadow-sm rounded-full"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Upgrade to KoboLedger Pro
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Premium
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                JENECONK INTEGRATED GLOBAL SOLUTIONS LIMITED
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">{activeFeatureRequested ? `Unlock ${activeFeatureRequested} and more with KoboLedger Pro.` : 'Choose a plan to unlock the full KoboLedger experience.'} Payment is securely verified before Pro access is enabled.</p>
          {!firebaseUser && <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-sm text-blue-900 dark:text-blue-200">Sign in or create a KoboLedger account before purchasing so your plan is attached to your account.</div>}
          {!secureCheckoutReady && <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-200">Secure checkout is not activated yet. Your plan options are shown, but payment will open after JENECONK finishes connecting Paystack.</div>}
          {checkoutError && <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-700 dark:text-rose-300">{checkoutError}</div>}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'weekly', name: 'Weekly', price: platformSettings.plans.weekly.amountMinor, detail: `${platformSettings.plans.weekly.durationDays} days` },
              { id: 'monthly', name: 'Monthly', price: platformSettings.plans.monthly.amountMinor, detail: `${platformSettings.plans.monthly.durationDays} days` },
              { id: 'annual', name: 'Annual', price: platformSettings.plans.annual.amountMinor, detail: `${platformSettings.plans.annual.durationDays} days` },
            ].map((plan) => <div key={plan.id} className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-2">
              <div className="font-semibold text-slate-900 dark:text-white">{plan.name}</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(plan.price / 100)}<span className="text-xs font-medium text-slate-500"> / {plan.detail}</span></div>
              <button disabled={!firebaseUser || !secureCheckoutReady || loadingPlan !== null} onClick={async () => {
                setCheckoutError(''); setLoadingPlan(plan.id);
                try { await startSubscriptionCheckout(plan.id as 'weekly' | 'monthly' | 'annual'); }
                catch { setCheckoutError('Checkout could not start. Please try again later.'); setLoadingPlan(null); }
              }} className="mt-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2 text-sm font-bold disabled:opacity-50">
                {loadingPlan === plan.id ? 'Opening checkout…' : 'Choose plan'}
              </button>
            </div>)}
          </div>
          <p className="text-xs text-slate-500">You’ll complete payment on Paystack. KoboLedger activates your subscription only after the server confirms payment.</p>
        </div>
      </div>
    </div>
  );
};
