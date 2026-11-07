import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, UserRoundX, UserRoundCheck, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Category } from '../types/finance';

export const PlatformAdminModal: React.FC = () => {
  const {
    isAdminModalOpen, closeAdminModal, isPlatformAdmin, platformAccounts,
    refreshPlatformAccounts, setPlatformAccountStatus, platformSettings,
    savePlatformSettings, changeCustomerSubscription,
    firebaseUser,
    categories,
    saveCategoryForAll,
  } = useFinance();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [reason, setReason] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [prices, setPrices] = useState({ weekly: '1500', monthly: '5000', annual: '50000' });
  const [announcement, setAnnouncement] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<Category['type']>('expense');
  const [categoryEssential, setCategoryEssential] = useState(false);
  const [categoryColor, setCategoryColor] = useState('#2563EB');

  useEffect(() => {
    if (isAdminModalOpen && isPlatformAdmin) {
      setMessage('');
      refreshPlatformAccounts().catch(() => setMessage('Could not load customer account details. Check that the Firebase admin functions are deployed.'));
    }
  }, [isAdminModalOpen, isPlatformAdmin]);

  useEffect(() => {
    setPrices({
      weekly: String(platformSettings.plans.weekly.amountMinor / 100),
      monthly: String(platformSettings.plans.monthly.amountMinor / 100),
      annual: String(platformSettings.plans.annual.amountMinor / 100),
    });
    setAnnouncement(platformSettings.announcement);
  }, [platformSettings]);

  if (!isAdminModalOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="platform-admin-title" className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0E131F]">
      <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
        <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-amber-600"/><div><h2 id="platform-admin-title" className="font-bold text-slate-900 dark:text-white">JENECONK platform administration</h2><p className="text-xs text-slate-500">Customer access, subscription and product controls</p></div></div>
        <div className="flex gap-2"><button onClick={() => refreshPlatformAccounts().catch(() => setMessage('Could not refresh accounts.'))} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-white/10 dark:text-slate-300" aria-label="Refresh accounts"><RefreshCw className="h-4 w-4"/></button><button onClick={closeAdminModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close"><X className="h-4 w-4"/></button></div>
      </header>
      <div className="max-h-[70vh] space-y-4 overflow-auto p-5">
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">Admins can make platform-wide pricing and announcement changes, suspend accounts, and grant or revoke Pro access. Private household ledgers, debts, budgets and transactions stay outside this console. Every admin change is recorded with the acting admin and its reason where relevant.</p>
        {message && <p role="status" className="text-sm text-rose-700 dark:text-rose-300">{message}</p>}
        <form className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10" onSubmit={async (event) => {
          event.preventDefault(); setMessage('');
          try {
            await savePlatformSettings({
              plans: {
                weekly: { ...platformSettings.plans.weekly, amountMinor: Math.round(Number(prices.weekly) * 100) },
                monthly: { ...platformSettings.plans.monthly, amountMinor: Math.round(Number(prices.monthly) * 100) },
                annual: { ...platformSettings.plans.annual, amountMinor: Math.round(Number(prices.annual) * 100) },
              },
              announcement,
              maintenanceMode: platformSettings.maintenanceMode,
            });
            setMessage('Platform settings saved. New checkouts use these prices.');
          } catch { setMessage('Could not save settings. Check that the admin functions are deployed and prices are valid.'); }
        }}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product settings</h3>
          <div className="grid grid-cols-3 gap-2">{(['weekly', 'monthly', 'annual'] as const).map((plan) => <label key={plan} className="text-[11px] font-semibold capitalize text-slate-600 dark:text-slate-300">{plan} plan · ₦<input type="number" min="10" step="0.01" required value={prices[plan]} onChange={(event) => setPrices((current) => ({ ...current, [plan]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/></label>)}</div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Customer announcement<textarea maxLength={280} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} rows={2} placeholder="Optional notice shown in KoboLedger" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/></label>
          <button className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">Save platform settings</button>
        </form>
        <form className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10" onSubmit={async (event) => {
          event.preventDefault(); setMessage('');
          const id = categoryId || `cat_${categoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50)}`;
          try {
            await saveCategoryForAll({ id, name: categoryName.trim(), type: categoryType, is_essential: categoryEssential, color: categoryColor });
            setCategoryId(id); setMessage('Global category saved. It is now available in every customer workspace.');
          } catch { setMessage('Could not save this category. Check for a duplicate name and try again.'); }
        }}>
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Global categories</h3><p className="text-[11px] text-slate-500">Create or edit categories used by every customer.</p></div><button type="button" onClick={() => { setCategoryId(''); setCategoryName(''); setCategoryType('expense'); setCategoryEssential(false); setCategoryColor('#2563EB'); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">New</button></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Edit existing<select value={categoryId} onChange={(event) => { const chosen = categories.find((category) => category.id === event.target.value); setCategoryId(event.target.value); if (chosen) { setCategoryName(chosen.name); setCategoryType(chosen.type); setCategoryEssential(chosen.is_essential); setCategoryColor(chosen.color || '#2563EB'); } }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"><option value="">Create a new category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Category name<input required minLength={2} maxLength={60} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/></label>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Type<select value={categoryType} onChange={(event) => setCategoryType(event.target.value as Category['type'])} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"><option value="expense">Expense</option><option value="income">Income</option><option value="financial_cost">Financial cost</option></select></label>
            <div className="flex items-end gap-3"><label className="flex flex-1 items-center gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={categoryEssential} onChange={(event) => setCategoryEssential(event.target.checked)}/>Essential spending</label><label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Color<input type="color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} className="mt-1 block h-9 w-14 rounded border border-slate-200 p-1 dark:border-white/10"/></label></div>
          </div>
          <button className="justify-self-start rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Save category for all customers</button>
        </form>
        {platformAccounts.length === 0 && !message ? <p className="text-sm text-slate-500">No customer accounts are listed yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-slate-500"><tr><th className="p-2">Customer</th><th className="p-2">Plan</th><th className="p-2">Last sign-in</th><th className="p-2">Account</th><th className="p-2">Control</th></tr></thead><tbody>{platformAccounts.map((account) => <tr key={account.uid} className="border-t border-slate-100 dark:border-white/5"><td className="p-2"><div className="font-semibold text-slate-800 dark:text-white">{account.displayName}</div><div className="text-slate-500">{account.email}</div></td><td className="p-2">{account.tier === 'pro' ? `Pro · ${account.expiresAt || 'active'}` : 'Free'}</td><td className="p-2">{account.lastSignInAt ? new Date(account.lastSignInAt).toLocaleDateString() : 'Not available'}</td><td className="p-2">{account.disabled ? <span className="text-rose-600">Suspended</span> : <span className="text-emerald-700 dark:text-emerald-300">Active</span>}</td><td className="flex gap-1 p-2"><button onClick={() => { setSelectedUid(account.uid); setMessage(''); }} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold dark:border-white/10">Select</button><button disabled={busyUid === account.uid} onClick={async () => { setBusyUid(account.uid); setMessage(''); try { await setPlatformAccountStatus(account.uid, !account.disabled); } catch { setMessage('Could not change this account.'); } finally { setBusyUid(null); } }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200">{account.disabled ? <><UserRoundCheck className="h-3.5 w-3.5"/>Restore</> : <><UserRoundX className="h-3.5 w-3.5"/>Suspend</>}</button></td></tr>)}</tbody></table></div>}
        {selectedUid && <form className="grid gap-3 rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 dark:border-amber-400/20 dark:bg-amber-500/5" onSubmit={(event) => event.preventDefault()}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pro access override</h3>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Selected customer<select value={selectedUid} onChange={(event) => setSelectedUid(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900">{platformAccounts.filter((account) => account.uid !== firebaseUser?.uid).map((account) => <option key={account.uid} value={account.uid}>{account.email || account.displayName}</option>)}</select></label>
          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Grant days<input type="number" min="1" max="3650" value={grantDays} onChange={(event) => setGrantDays(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/></label>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Required reason<textarea minLength={8} required value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="e.g. approved promotional access" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/></label>
          </div>
          <div className="flex gap-2"><button disabled={!reason.trim() || busyUid === selectedUid} onClick={async () => { setBusyUid(selectedUid); try { await changeCustomerSubscription(selectedUid, 'grant', reason, grantDays); setMessage('Pro access granted and recorded.'); } catch { setMessage('Could not grant Pro access.'); } finally { setBusyUid(null); } }} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Grant Pro access</button><button disabled={!reason.trim() || busyUid === selectedUid} onClick={async () => { setBusyUid(selectedUid); try { await changeCustomerSubscription(selectedUid, 'revoke', reason, grantDays); setMessage('Pro access revoked and recorded.'); } catch { setMessage('Could not revoke Pro access.'); } finally { setBusyUid(null); } }} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Revoke Pro access</button></div>
        </form>}
      </div>
    </section>
  </div>;
};
