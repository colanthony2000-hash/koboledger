import React, { useEffect, useState } from 'react';
import { Copy, Home, UserMinus, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const HouseholdModal: React.FC = () => {
  const {
    firebaseUser, isHouseholdModalOpen, closeHouseholdModal, workspaces, activeWorkspace,
    householdMembers, refreshHousehold, selectWorkspace, inviteHouseholdMember, removeHouseholdMemberById,
  } = useFinance();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'auditor'>('member');
  const [inviteLink, setInviteLink] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const owner = activeWorkspace?.role === 'owner';

  useEffect(() => {
    if (isHouseholdModalOpen && firebaseUser) refreshHousehold().catch(() => setNotice('Could not load household access.'));
  }, [isHouseholdModalOpen, firebaseUser?.uid]);

  if (!isHouseholdModalOpen) return null;
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice('');
    try { setInviteLink(await inviteHouseholdMember(email, role)); setNotice('Invite link created. It expires in 7 days and only works for the invited email address.'); setEmail(''); }
    catch { setNotice('Could not create invite. Confirm the email and try again.'); }
    finally { setBusy(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setNotice('Invite link copied. Send it to the invited person.'); }
    catch { setNotice('Copy failed. Select and copy the invite link below.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="household-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0E131F]">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3"><Home className="h-5 w-5 text-emerald-600"/><div><h2 id="household-title" className="font-bold text-slate-900 dark:text-white">Household access</h2><p className="text-xs text-slate-500">Manage who can view and help manage shared finances.</p></div></div>
        <button onClick={closeHouseholdModal} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4"/></button>
      </header>
      {!firebaseUser ? <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">Sign in or create a KoboLedger account to manage household access.</p> : <>
        {workspaces.length > 1 && <label className="mb-4 block text-xs font-semibold text-slate-600 dark:text-slate-300">Workspace<select value={activeWorkspace?.id || ''} onChange={(e) => selectWorkspace(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900">{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label>}
        <div className="space-y-2">{householdMembers.map((member) => <div key={member.uid} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-white/10"><div><div className="text-sm font-semibold text-slate-800 dark:text-white">{member.name || member.email || 'Household member'}</div><div className="text-xs text-slate-500">{member.email} {member.role !== 'owner' && `· ${member.role}`}</div></div>{owner && member.role !== 'owner' && <button title="Remove access" disabled={busy} onClick={async () => { setBusy(true); try { await removeHouseholdMemberById(member.uid); setNotice('Household access removed.'); } catch { setNotice('Could not remove access.'); } finally { setBusy(false); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><UserMinus className="h-4 w-4"/></button>}</div>)}</div>
        {owner && <form onSubmit={invite} className="mt-5 space-y-3 border-t border-slate-200 pt-5 dark:border-white/10"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Invite someone</h3><label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="name@example.com"/></label><div className="flex gap-2"><select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'auditor')} className="rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900"><option value="member">Can manage shared finances</option><option value="auditor">Read only</option></select><button disabled={busy} className="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Working…' : 'Create invite link'}</button></div></form>}
        {inviteLink && <div className="mt-3 flex gap-2"><input readOnly value={inviteLink} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-white/10 dark:bg-slate-900"/><button onClick={copyLink} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-white/10"><Copy className="h-3.5 w-3.5"/>Copy</button></div>}
        {notice && <p role="status" className="mt-3 text-xs text-slate-600 dark:text-slate-300">{notice}</p>}
      </>}
    </section>
  </div>;
};
