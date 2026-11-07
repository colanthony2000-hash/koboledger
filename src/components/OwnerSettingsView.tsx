import React from 'react';
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, House, Layers3, Settings2, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface OwnerTool {
  title: string;
  description: string;
  group: string;
  icon: LucideIcon;
  action: () => void;
  cta: string;
  disabled?: boolean;
}

interface OwnerSettingsViewProps {
  onOpenAudit: () => void;
}

export const OwnerSettingsView: React.FC<OwnerSettingsViewProps> = ({ onOpenAudit }) => {
  const {
    isPlatformAdmin,
    firebaseUser,
    currentUser,
    openAdminModal,
    openHouseholdModal,
    openUserProfileModal,
  } = useFinance();

  if (!isPlatformAdmin) return null;

  const tools: OwnerTool[] = [
    {
      title: 'Global categories',
      description: 'Create or update spending and income categories used across customer workspaces.',
      group: 'Platform controls',
      icon: Layers3,
      action: () => openAdminModal('categories'),
      cta: 'Manage global categories',
    },
    {
      title: 'Plans and announcements',
      description: 'Set subscription prices and publish an in-app notice to customers.',
      group: 'Platform controls',
      icon: Settings2,
      action: () => openAdminModal('settings'),
      cta: 'Open platform settings',
    },
    {
      title: 'Customer accounts',
      description: 'Review account status and restore or suspend access when needed.',
      group: 'Customer management',
      icon: Users,
      action: () => openAdminModal('customers'),
      cta: 'Manage customer accounts',
    },
    {
      title: 'Pro access',
      description: 'Grant or revoke a customer’s Pro access and record the reason.',
      group: 'Customer management',
      icon: CircleDollarSign,
      action: () => openAdminModal('subscriptions'),
      cta: 'Manage Pro access',
    },
    {
      title: 'Household access',
      description: 'Invite household members, review their roles, and remove access.',
      group: 'Workspace and controls',
      icon: House,
      action: openHouseholdModal,
      cta: 'Manage household members',
      disabled: !firebaseUser,
    },
    {
      title: 'Roles and permissions',
      description: 'Review the owner, member, and auditor permissions for this workspace.',
      group: 'Workspace and controls',
      icon: BadgeCheck,
      action: () => openUserProfileModal(currentUser),
      cta: 'View roles and permissions',
    },
    {
      title: 'Audit and integrity checks',
      description: 'Inspect ledger controls and run the accounting verification suite.',
      group: 'Workspace and controls',
      icon: ClipboardCheck,
      action: onOpenAudit,
      cta: 'Open audit checks',
    },
  ];

  const groups = ['Platform controls', 'Customer management', 'Workspace and controls'];

  return (
    <div className="space-y-7">
      <header className="rounded-2xl bg-gradient-to-br from-slate-950 via-[#10172b] to-emerald-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">JENECONK administrator</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Owner Settings &amp; Tools</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Choose the control you need from this page. Platform changes apply across KoboLedger; household controls apply to your current workspace.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/>Owner access verified</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><ChartNoAxesCombined className="h-3.5 w-3.5 text-amber-300"/>Changes are permission checked</span>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group} aria-labelledby={`owner-tools-${group.replaceAll(' ', '-')}`}>
          <h2 id={`owner-tools-${group.replaceAll(' ', '-')}`} className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tools.filter((tool) => tool.group === group).map((tool) => {
              const Icon = tool.icon;
              return (
                <article key={tool.title} className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-white/10 dark:bg-[#0E131F] dark:hover:border-emerald-500/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Icon className="h-5 w-5"/></span>
                    <h3 className="font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tool.description}</p>
                  <button type="button" disabled={tool.disabled} onClick={tool.action} className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-100 dark:hover:border-emerald-500 dark:hover:text-emerald-300">
                    <span>{tool.disabled ? 'Sign in to manage household' : tool.cta}</span><ArrowRight className="h-4 w-4 shrink-0"/>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
