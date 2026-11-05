import React from 'react';
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
  } = useFinance();

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
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-200">
            {activeFeatureRequested ? `${activeFeatureRequested} is not available as a paid feature yet. ` : ''}
            Paid upgrades are temporarily unavailable. Checkout must verify payments on a trusted server before activating an account.
          </div>
        </div>
      </div>
    </div>
  );
};
