import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMinor } from '../services/ledgerEngine';
import {
  Target,
  Flame,
  CheckCircle2,
  Plus,
  Edit2,
  Check,
  PiggyBank,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const DailySavingsCard: React.FC = () => {
  const { dailySavings, updateDailySavingsTarget, recordDailySavingsDeposit, savingsGoals } = useFinance();

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetNairaInput, setTargetNairaInput] = useState<number>(dailySavings.target_minor / 100);
  const [customDepositNaira, setCustomDepositNaira] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const targetMinor = dailySavings.target_minor;
  const savedMinor = dailySavings.saved_today_minor;
  const progressPct = Math.min(100, Math.round((savedMinor / (targetMinor || 1)) * 100));
  const remainingMinor = Math.max(0, targetMinor - savedMinor);
  const isGoalMet = savedMinor >= targetMinor && targetMinor > 0;

  const handleSaveTarget = () => {
    const newMinor = Math.max(10000, Math.round(targetNairaInput * 100)); // Minimum ₦100
    updateDailySavingsTarget(newMinor);
    setIsEditingTarget(false);
  };

  const handleQuickDeposit = (amountNaira: number) => {
    const depositMinor = Math.round(amountNaira * 100);
    recordDailySavingsDeposit(depositMinor, dailySavings.target_goal_id);
    setSuccessToast(`+₦${amountNaira.toLocaleString()} saved towards today's target!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleCustomDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customDepositNaira);
    if (!isNaN(val) && val > 0) {
      handleQuickDeposit(val);
      setCustomDepositNaira('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D111C] p-5.5 border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      {/* Background Accent Glow */}
      <div className="absolute right-0 top-0 -mr-8 -mt-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Daily Savings Target</span>
              {isGoalMet && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Met Today
                </span>
              )}
            </h3>
            <span className="text-[11px] text-slate-500">
              Build daily financial discipline into your emergency vaults
            </span>
          </div>
        </div>

        {/* Streak Counter */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{dailySavings.streak_days} Day Streak</span>
        </div>
      </div>

      {/* Target & Saved Stats */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold tracking-wider">
            Saved Today
          </span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatMinor(savedMinor)}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold tracking-wider flex items-center justify-end gap-1">
            <span>Daily Goal</span>
            {!isEditingTarget && (
              <button
                onClick={() => {
                  setTargetNairaInput(targetMinor / 100);
                  setIsEditingTarget(true);
                }}
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5 transition-colors cursor-pointer"
                title="Edit Daily Target"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </span>

          {isEditingTarget ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-mono text-slate-400">₦</span>
              <input
                type="number"
                value={targetNairaInput}
                onChange={(e) => setTargetNairaInput(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-0.5 text-xs font-mono font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveTarget}
                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                title="Save Target"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-sm font-bold font-mono text-slate-600 dark:text-slate-300 tabular-nums">
              {formatMinor(targetMinor)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isGoalMet
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
            {progressPct}% Completed
          </span>
          <span>
            {isGoalMet ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Daily Target Achieved! 🎉
              </span>
            ) : (
              <span>
                <strong>{formatMinor(remainingMinor)}</strong> remaining to hit target
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Quick Deposit Actions */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Quick Savings Deposit:
          </span>
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
          >
            {showCustomInput ? 'Preset amounts' : 'Custom amount'}
          </button>
        </div>

        {!showCustomInput ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDeposit(500)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              +₦500
            </button>
            <button
              onClick={() => handleQuickDeposit(1000)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              +₦1,000
            </button>
            <button
              onClick={() => handleQuickDeposit(2000)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              +₦2,000
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomDepositSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">₦</span>
              <input
                type="number"
                value={customDepositNaira}
                onChange={(e) => setCustomDepositNaira(e.target.value)}
                placeholder="Deposit amount..."
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors cursor-pointer shrink-0"
            >
              Save Now
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
