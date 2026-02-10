'use client';

import { useState, useMemo } from 'react';

type Completion = {
  id: number; choreId: number; userId: number; completedAt: string;
  choreName: string; roomName: string; roomIcon: string; effort: string;
};
type PinnedChore = {
  id: number; name: string; pinnedDays: string | null;
  roomName: string; roomIcon: string; effort: string;
};
type DueTodo = {
  id: number; title: string; dueDate: string | null;
  completed: boolean | null; priority: string | null; assigneeId: number | null;
};
type User = { id: number; name: string; avatarEmoji: string };

type ViewMode = 'month' | 'week';

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarClient({ completions, pinnedChores, dueTodos, users }: {
  completions: Completion[]; pinnedChores: PinnedChore[]; dueTodos: DueTodo[]; users: User[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = dateKey(new Date());
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Build completion map: date -> items
  const completionsByDate = useMemo(() => {
    const map: Record<string, Completion[]> = {};
    for (const c of completions) {
      const key = c.completedAt.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [completions]);

  // Build pinned chores map: dayOfWeek -> items
  const pinnedByDay = useMemo(() => {
    const map: Record<number, PinnedChore[]> = {};
    for (const c of pinnedChores) {
      if (!c.pinnedDays) continue;
      for (const d of c.pinnedDays.split(',')) {
        const day = parseInt(d);
        if (!map[day]) map[day] = [];
        map[day].push(c);
      }
    }
    return map;
  }, [pinnedChores]);

  // Build todo map: date -> items
  const todosByDate = useMemo(() => {
    const map: Record<string, DueTodo[]> = {};
    for (const t of dueTodos) {
      if (!t.dueDate) continue;
      const key = t.dueDate;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [dueTodos]);

  const getItemsForDate = (d: Date) => {
    const key = dateKey(d);
    const dayOfWeek = d.getDay();
    return {
      completions: completionsByDate[key] || [],
      pinned: pinnedByDay[dayOfWeek] || [],
      todos: todosByDate[key] || [],
    };
  };

  const navigate = (delta: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + delta);
    } else {
      d.setDate(d.getDate() + delta * 7);
    }
    setCurrentDate(d);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar grid
  const monthDays = getDaysInMonth(year, month);
  const weekDays = getWeekDays(currentDate);

  // Pad month grid to start on Sunday
  const firstDayOfWeek = monthDays[0].getDay();
  const paddedDays: (Date | null)[] = Array(firstDayOfWeek).fill(null).concat(monthDays);

  // Selected day detail
  const selectedItems = selectedDate ? getItemsForDate(new Date(selectedDate + 'T12:00:00')) : null;

  return (
    <div>
      {/* Header: nav + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors text-warm-500">
            ←
          </button>
          <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100 min-w-[160px] text-center">
            {viewMode === 'month' ? `${MONTH_NAMES[month]} ${year}` : `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </h2>
          <button onClick={() => navigate(1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors text-warm-500">
            →
          </button>
        </div>
        <div className="flex rounded-xl bg-warm-100 dark:bg-warm-800 p-0.5">
          <button onClick={() => setViewMode('week')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-warm-700 shadow-sm' : ''}`}>
            Week
          </button>
          <button onClick={() => setViewMode('month')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-warm-700 shadow-sm' : ''}`}>
            Month
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Calendar grid */}
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-xs font-medium text-warm-400 text-center py-1">{d}</div>
            ))}
          </div>

          {/* Month view */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-warm-200 dark:bg-warm-700 rounded-xl overflow-hidden">
              {paddedDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} className="bg-warm-50 dark:bg-warm-900 min-h-[48px] lg:min-h-[80px]" />;
                const key = dateKey(day);
                const items = getItemsForDate(day);
                const isToday = key === today;
                const isSelected = key === selectedDate;
                const hasCompletions = items.completions.length > 0;
                const hasTodos = items.todos.length > 0;
                const hasOverdue = items.todos.some(t => !t.completed && new Date(t.dueDate!) < new Date());
                const hasPinned = items.pinned.length > 0;

                // Determine cell background color
                const allDone = items.completions.length > 0 && items.todos.every(t => t.completed);
                const cellBg = hasOverdue
                  ? 'bg-red-50 dark:bg-red-950/20'
                  : (hasTodos && !allDone)
                    ? 'bg-amber-50 dark:bg-amber-950/10'
                    : hasCompletions
                      ? 'bg-green-50 dark:bg-green-950/10'
                      : 'bg-white dark:bg-warm-800';

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`${cellBg} min-h-[48px] lg:min-h-[80px] p-1 lg:p-2 text-left transition-all hover:brightness-95 dark:hover:brightness-110 ${
                      isSelected ? 'ring-2 ring-sage-400 ring-inset' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={`text-xs font-medium ${
                        isToday ? 'bg-sage-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-warm-600 dark:text-warm-300'
                      }`}>
                        {day.getDate()}
                      </div>
                      {items.completions.length > 0 && (
                        <span className="text-[9px] font-bold bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {items.completions.length}
                        </span>
                      )}
                    </div>
                    {/* Dots/indicators */}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {hasCompletions && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title={`${items.completions.length} completed`} />}
                      {hasPinned && <span className="w-1.5 h-1.5 rounded-full bg-warm-400" title="Scheduled chores" />}
                      {hasTodos && !hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Todos due" />}
                      {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Overdue" />}
                    </div>
                    {/* Desktop: show brief items */}
                    <div className="hidden lg:block mt-1 space-y-0.5">
                      {items.completions.slice(0, 2).map(c => (
                        <div key={c.id} className="text-[10px] text-green-600 dark:text-green-400 truncate">✓ {c.choreName}</div>
                      ))}
                      {items.todos.slice(0, 2).map(t => (
                        <div key={t.id} className={`text-[10px] truncate ${t.completed ? 'text-green-600 dark:text-green-400' : new Date(t.dueDate!) < new Date() ? 'text-red-500' : 'text-blue-500'}`}>
                          {t.completed ? '✓' : '○'} {t.title}
                        </div>
                      ))}
                      {(items.completions.length + items.todos.length) > 4 && (
                        <div className="text-[10px] text-warm-400">+{items.completions.length + items.todos.length - 4} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Week view */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const key = dateKey(day);
                const items = getItemsForDate(day);
                const isToday = key === today;
                const isSelected = key === selectedDate;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`rounded-xl p-2 min-h-[120px] border text-left transition-all ${
                      isToday ? 'border-sage-400 bg-sage-50/50 dark:bg-sage-900/10' : 'border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800'
                    } ${isSelected ? 'ring-2 ring-sage-400' : 'hover:shadow-md'}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-sage-600 dark:text-sage-400' : 'text-warm-700 dark:text-warm-200'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.completions.slice(0, 3).map(c => (
                        <div key={c.id} className="text-[11px] text-green-600 dark:text-green-400 truncate">✓ {c.choreName}</div>
                      ))}
                      {items.todos.slice(0, 3).map(t => (
                        <div key={t.id} className={`text-[11px] truncate ${t.completed ? 'text-green-600 dark:text-green-400' : new Date(t.dueDate!) < new Date() ? 'text-red-500' : 'text-warm-600 dark:text-warm-300'}`}>
                          {t.completed ? '✓' : '○'} {t.title}
                        </div>
                      ))}
                      {items.pinned.slice(0, 2).map(c => (
                        <div key={c.id} className="text-[11px] text-warm-400 truncate">📌 {c.name}</div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail panel (desktop only — mobile has its own below) */}
        <div className={`hidden lg:block`}>
          {selectedItems ? (
            <DayDetail
              date={selectedDate!}
              items={selectedItems}
              userMap={userMap}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <div className="hidden lg:block bg-warm-50 dark:bg-warm-800/50 rounded-xl border border-dashed border-warm-300 dark:border-warm-700 p-8 text-center">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-warm-400 text-sm">Select a day to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet only: day detail panel below calendar (desktop uses side panel) */}
      <div className="lg:hidden">
        {selectedDate && selectedItems && (
          <div className="mt-4">
            <DayDetail
              date={selectedDate}
              items={selectedItems}
              userMap={userMap}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DayDetail({ date, items, userMap, onClose }: {
  date: string;
  items: { completions: Completion[]; pinned: PinnedChore[]; todos: DueTodo[] };
  userMap: Record<number, User>;
  onClose: () => void;
}) {
  const d = new Date(date + 'T12:00:00');
  const total = items.completions.length + items.pinned.length + items.todos.length;

  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 dark:border-warm-700 bg-warm-50 dark:bg-warm-800">
        <div>
          <h3 className="font-semibold text-warm-800 dark:text-warm-100">
            {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <p className="text-xs text-warm-400">{total} items</p>
        </div>
        <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 text-warm-400">✕</button>
      </div>
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Completed chores */}
        {items.completions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5">✓ Completed Chores</h4>
            {items.completions.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-green-500">✓</span>
                <span>{c.roomIcon} {c.choreName}</span>
                {userMap[c.userId] && <span className="text-xs text-warm-400 ml-auto">{userMap[c.userId].avatarEmoji}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Scheduled chores */}
        {items.pinned.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-warm-500 mb-1.5">📌 Scheduled Chores</h4>
            {items.pinned.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm py-1 text-warm-600 dark:text-warm-300">
                <span>{c.roomIcon}</span>
                <span>{c.name}</span>
                <span className="text-xs text-warm-400 ml-auto">{c.effort}</span>
              </div>
            ))}
          </div>
        )}

        {/* Todos */}
        {items.todos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">📝 To-Do&apos;s</h4>
            {items.todos.map(t => {
              const isOverdue = !t.completed && new Date(t.dueDate!) < new Date();
              return (
                <div key={t.id} className={`flex items-center gap-2 text-sm py-1 ${t.completed ? 'text-green-500 line-through' : isOverdue ? 'text-red-500' : 'text-warm-700 dark:text-warm-200'}`}>
                  <span>{t.completed ? '✓' : isOverdue ? '⚠️' : '○'}</span>
                  <span>{t.title}</span>
                  {t.assigneeId && userMap[t.assigneeId] && <span className="text-xs ml-auto">{userMap[t.assigneeId].avatarEmoji}</span>}
                </div>
              );
            })}
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-6 text-warm-400">
            <p className="text-2xl mb-1">✨</p>
            <p className="text-sm">Nothing on this day</p>
          </div>
        )}
      </div>
    </div>
  );
}
