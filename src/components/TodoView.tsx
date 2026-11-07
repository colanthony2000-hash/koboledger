import React, { useMemo, useState } from 'react';
import { Bell, CalendarClock, Check, CheckCircle2, Circle, ListTodo, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TodoItem, Visibility } from '../types/finance';

type Filter = 'open' | 'completed' | 'all';

function toLocalInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export const TodoView: React.FC = () => {
  const { todoItems, addTodoItem, updateTodoItem, deleteTodoItem, enableTodoReminders, firebaseUser, activeWorkspace } = useFinance();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [filter, setFilter] = useState<Filter>('open');
  const [notice, setNotice] = useState('');

  const completedCount = todoItems.filter((item) => item.completed).length;
  const openCount = todoItems.length - completedCount;
  const visibleItems = useMemo(() => todoItems
    .filter((item) => filter === 'all' || (filter === 'completed' ? item.completed : !item.completed))
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      return (a.dueAt || '9999').localeCompare(b.dueAt || '9999') || b.createdAt.localeCompare(a.createdAt);
    }), [todoItems, filter]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    addTodoItem({ title, notes, dueAt: toIso(dueAt), reminderAt: toIso(reminderAt), visibility });
    setTitle(''); setNotes(''); setDueAt(''); setReminderAt(''); setVisibility('private');
  };

  const turnOnReminders = async () => {
    const permission = await enableTodoReminders();
    if (permission === 'granted') {
      localStorage.setItem('kl_todo_notifications_enabled', 'true');
      setNotice('Reminders are on for this browser. KoboLedger needs to stay open to check scheduled reminders.');
    } else if (permission === 'unsupported') {
      setNotice('This browser does not support notifications. You can still see due times in your task list.');
    } else if (permission === 'denied') {
      setNotice('Notifications are blocked for this site. Allow them in your browser site settings to receive reminders.');
    } else setNotice('Allow notifications when your browser asks to enable reminders.');
  };

  const renderTask = (item: TodoItem) => {
    const overdue = !item.completed && item.dueAt && new Date(item.dueAt).getTime() < Date.now();
    return (
      <li key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <button type="button" aria-label={item.completed ? `Reopen ${item.title}` : `Complete ${item.title}`} onClick={() => updateTodoItem(item.id, { completed: !item.completed })} className="mt-0.5 shrink-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          {item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold ${item.completed ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{item.title}</h3>
            {item.visibility === 'shared' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">HOUSEHOLD</span>}
            {overdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">OVERDUE</span>}
          </div>
          {item.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{item.notes}</p>}
          {(item.dueAt || item.reminderAt) && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {item.dueAt && <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-rose-600 dark:text-rose-300' : ''}`}><CalendarClock className="h-3.5 w-3.5"/>Due {formatDate(item.dueAt)}</span>}
            {item.reminderAt && <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5"/>Reminder {formatDate(item.reminderAt)}</span>}
          </div>}
        </div>
        <button type="button" onClick={() => deleteTodoItem(item.id)} aria-label={`Delete ${item.title}`} className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10" title="Delete task"><Trash2 className="mx-auto h-4 w-4"/></button>
      </li>
    );
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-[#10172B] to-[#073B36] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300"><ListTodo className="h-4 w-4"/>PERSONAL & HOUSEHOLD TASKS</div><h1 className="text-3xl font-extrabold tracking-tight">To‑Do list</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Keep track of the small financial and household tasks that need doing.</p></div>
        <div className="flex gap-3"><div className="rounded-2xl bg-white/10 px-4 py-3"><div className="text-2xl font-bold">{openCount}</div><div className="text-xs text-slate-300">Open</div></div><div className="rounded-2xl bg-white/10 px-4 py-3"><div className="text-2xl font-bold">{completedCount}</div><div className="text-xs text-slate-300">Done</div></div></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0E131F] sm:p-6">
          <div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Add a task</h2><p className="mt-1 text-sm text-slate-500">Set an optional due date and browser alert.</p></div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Task title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pay electricity bill" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={500} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a detail to remember" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Due date & time<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"/></label><label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alert me at<input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"/></label></div>
          {firebaseUser && activeWorkspace && <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={visibility === 'shared'} onChange={(event) => setVisibility(event.target.checked ? 'shared' : 'private')} className="mt-1 accent-emerald-600"/><span>Share with my household members</span></label>}
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700"><Plus className="h-4 w-4"/>Add task</button>
        </form>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.02] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Your tasks</h2><p className="text-sm text-slate-500">{firebaseUser ? 'Synced to your KoboLedger account' : 'Saved in this browser'}</p></div><button onClick={turnOnReminders} type="button" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-300"><Bell className="h-3.5 w-3.5"/>Enable reminders</button></div>
          {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">{notice}</p>}
          <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-white/5">{(['open', 'completed', 'all'] as const).map((tab) => <button type="button" key={tab} onClick={() => setFilter(tab)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize ${filter === tab ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>{tab}</button>)}</div>
          {visibleItems.length ? <ul className="space-y-3">{visibleItems.map(renderTask)}</ul> : <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-white/10"><Check className="mx-auto h-8 w-8 text-emerald-500"/><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{filter === 'completed' ? 'No completed tasks yet' : filter === 'all' ? 'Your list is clear' : 'Nothing to do right now'}</p><p className="mt-1 text-sm text-slate-500">Add a task when something needs attention.</p></div>}
          <p className="text-xs leading-relaxed text-slate-500">Browser alerts are checked while KoboLedger is open. For reminders that arrive after the app is closed, a push-notification service needs to be added.</p>
        </div>
      </div>
    </section>
  );
};
