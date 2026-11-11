import React, { useMemo, useState } from 'react';
import { Bell, BellRing, Check, ListTodo, Mic, MicOff, Volume2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TodoItem } from '../types/finance';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function taskTime(item: TodoItem) {
  return item.dueAt ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(item.dueAt)) : 'Any time';
}

export const TodayTodoCard: React.FC<{ onOpenTasks: () => void }> = ({ onOpenTasks }) => {
  const { todoItems, updateTodoItem, enableTodoReminders } = useFinance();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remindersOn, setRemindersOn] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('kl_todo_notifications_enabled') === 'true');
  const [notice, setNotice] = useState('');
  const todaysTasks = useMemo(() => todoItems
    .filter((item) => !item.completed && item.dueAt && localDateKey(new Date(item.dueAt)) === localDateKey())
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || '')),
  [todoItems]);

  const readList = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const lines = todaysTasks.length
      ? todaysTasks.map((task) => `${taskTime(task)}. ${task.title}.`).join(' ')
      : 'You have no tasks scheduled for today.';
    const speech = new SpeechSynthesisUtterance(`Your list for today. ${lines}`);
    speech.lang = 'en-NG';
    speech.onend = () => setIsSpeaking(false);
    speech.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(speech);
  };

  const stopReading = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const turnOnReminders = async () => {
    const permission = await enableTodoReminders();
    if (permission === 'granted') {
      localStorage.setItem('kl_todo_notifications_enabled', 'true');
      setRemindersOn(true);
      setNotice('Alerts are on. Keep KoboLedger open for scheduled reminders.');
    } else if (permission === 'denied') setNotice('Notifications are blocked. Allow them in your phone or browser settings.');
    else setNotice('Notifications are not available in this browser.');
  };

  return (
    <section id="today-todo-list" aria-labelledby="today-todo-title" className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><ListTodo className="h-5 w-5"/><h2 id="today-todo-title" className="text-lg font-bold text-slate-900 dark:text-white">Today’s to-do list</h2></div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{todaysTasks.length ? `${todaysTasks.length} task${todaysTasks.length === 1 ? '' : 's'} planned for today` : 'Nothing scheduled for today yet.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={turnOnReminders} disabled={remindersOn} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-70 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-200 dark:hover:bg-white/10">
            <Bell className="h-4 w-4"/>{remindersOn ? 'Alerts on' : 'Turn on alerts'}
          </button>
          <button type="button" onClick={isSpeaking ? stopReading : readList} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-200 dark:hover:bg-white/10">
            {isSpeaking ? <MicOff className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}{isSpeaking ? 'Stop reading' : 'Read aloud'}
          </button>
          <button type="button" onClick={onOpenTasks} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <Mic className="h-4 w-4"/>Add a task
          </button>
        </div>
      </div>

      {notice && <p role="status" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">{notice}</p>}

      {todaysTasks.length > 0 && <ul className="mt-4 divide-y divide-emerald-200/70 dark:divide-emerald-500/10">
        {todaysTasks.slice(0, 5).map((task) => <li key={task.id} className="flex min-h-12 items-center gap-3 py-2.5">
          <button type="button" onClick={() => updateTodoItem(task.id, { completed: true })} aria-label={`Mark ${task.title} done`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-white/5 dark:text-emerald-300"><Check className="h-4 w-4"/></button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</span>
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{taskTime(task)}</span>
        </li>)}
        {todaysTasks.length > 5 && <li className="pt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">+ {todaysTasks.length - 5} more tasks <button type="button" onClick={onOpenTasks} className="ml-1 underline">View list</button></li>}
      </ul>}
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400"><BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Scheduled tasks can alert you 30 minutes and 10 minutes before. Keep KoboLedger open and allow notifications; your phone controls the alert sound and vibration.</p>
    </section>
  );
};
