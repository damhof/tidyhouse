'use client';

import { useState, useMemo, useEffect } from 'react';

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
  const [isDesktop, setIsDesktop] = useState(false);
  const today = dateKey(new Date());
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Responsive detection for panel rendering
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

  // Monthly stats
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, '0')}-01`;
    
    const monthCompletions = completions.filter(c => c.completedAt >= monthStart && c.completedAt < nextMonth);
    const uniqueDays = new Set(monthCompletions.map(c => c.completedAt.split('T')[0]));
    
    // Calculate streak
    let streak = 0;
    const todayDate = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(todayDate);
      checkDate.setDate(checkDate.getDate() - i);
      const key = dateKey(checkDate);
      if (completionsByDate[key]?.length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Upcoming todos
    const upcoming = dueTodos.filter(t => !t.completed && t.dueDate && t.dueDate >= today).slice(0, 5);
    const overdue = dueTodos.filter(t => !t.completed && t.dueDate && t.dueDate < today);

    return {
      totalCompletions: monthCompletions.length,
      activeDays: uniqueDays.size,
      streak,
      upcomingTodos: upcoming.length,
      overdueTodos: overdue.length,
    };
  }, [completions, dueTodos, currentDate, completionsByDate, today]);

  const navigate = (delta: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + delta);
    } else {
      d.setDate(d.getDate() + delta * 7);
    }
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today);
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
      {/* Monthly Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800/30">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{monthStats.totalCompletions}</p>
          <p className="text-xs text-green-600/70 dark:text-green-400/70">Completions</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{monthStats.activeDays}</p>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Active Days</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 text-center border border-amber-200 dark:border-amber-800/30">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{monthStats.streak}🔥</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Day Streak</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${monthStats.overdueTodos > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30' : 'bg-sage-50 dark:bg-sage-950/20 border-sage-200 dark:border-sage-800/30'}`}>
          <p className={`text-2xl font-bold ${monthStats.overdueTodos > 0 ? 'text-red-600 dark:text-red-400' : 'text-sage-600 dark:text-sage-400'}`}>
            {monthStats.overdueTodos > 0 ? monthStats.overdueTodos : monthStats.upcomingTodos}
          </p>
          <p className={`text-xs ${monthStats.overdueTodos > 0 ? 'text-red-600/70 dark:text-red-400/70' : 'text-sage-600/70 dark:text-sage-400/70'}`}>
            {monthStats.overdueTodos > 0 ? 'Overdue' : 'Upcoming'}
          </p>
        </div>
      </div>

      {/* Header: nav + view toggle */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors text-warm-500">
            ←
          </button>
          <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100 min-w-[140px] sm:min-w-[160px] text-center">
            {viewMode === 'month' ? `${MONTH_NAMES[month]} ${year}` : `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </h2>
          <button onClick={() => navigate(1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors text-warm-500">
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 hover:bg-sage-200 dark:hover:bg-sage-800/50 transition-colors">
            Today
          </button>
          <div className="flex rounded-xl bg-warm-100 dark:bg-warm-800 p-0.5">
            <button onClick={() => setViewMode('week')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-warm-700 shadow-sm' : ''}`}>
              Week
            </button>
            <button onClick={() => setViewMode('month')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-warm-700 shadow-sm' : ''}`}>
              Month
            </button>
          </div>
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
                const completedTodos = items.todos.filter(t => t.completed).length;
                const totalTodos = items.todos.length;

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
                      {/* Show todo progress if any */}
                      {totalTodos > 0 && (
                        <div className="text-[9px] text-warm-400 mt-0.5">
                          {completedTodos}/{totalTodos} todos
                        </div>
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

        {/* Day detail panel - ONLY render one based on screen size */}
        {isDesktop ? (
          // Desktop: persistent side panel
          <div>
            {selectedItems ? (
              <DayDetail
                date={selectedDate!}
                items={selectedItems}
                userMap={userMap}
                onClose={() => setSelectedDate(null)}
              />
            ) : (
              <div className="bg-warm-50 dark:bg-warm-800/50 rounded-xl border border-dashed border-warm-300 dark:border-warm-700 p-8 text-center">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-warm-400 text-sm">Select a day to see details</p>
                <p className="text-warm-300 text-xs mt-2">Click any date in the calendar</p>
              </div>
            )}
          </div>
        ) : (
          // Mobile/Tablet: inline panel below calendar
          selectedDate && selectedItems && (
            <div className="mt-4 lg:hidden">
              <DayDetail
                date={selectedDate}
                items={selectedItems}
                userMap={userMap}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          )
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
  const today = dateKey(new Date());
  const isToday = date === today;
  const isPast = date < today;
  const isFuture = date > today;

  // Group completions by room
  const completionsByRoom = items.completions.reduce((acc, c) => {
    const key = c.roomName;
    if (!acc[key]) acc[key] = { icon: c.roomIcon, items: [] };
    acc[key].items.push(c);
    return acc;
  }, {} as Record<string, { icon: string; items: Completion[] }>);

  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 dark:border-warm-700 bg-warm-50 dark:bg-warm-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-warm-800 dark:text-warm-100">
              {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {isToday && <span className="text-xs bg-sage-500 text-white px-2 py-0.5 rounded-full">Today</span>}
          </div>
          <p className="text-xs text-warm-400 mt-0.5">
            {total === 0 ? 'No items' : `${total} item${total !== 1 ? 's' : ''}`}
            {items.completions.length > 0 && ` · ${items.completions.length} completed`}
          </p>
        </div>
        <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 text-warm-400">✕</button>
      </div>
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {/* Completed chores grouped by room */}
        {Object.keys(completionsByRoom).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
              <span>✓</span> Completed Chores
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full ml-1">
                {items.completions.length}
              </span>
            </h4>
            <div className="space-y-2">
              {Object.entries(completionsByRoom).map(([roomName, { icon, items: roomItems }]) => (
                <div key={roomName} className="bg-green-50/50 dark:bg-green-950/10 rounded-lg p-2">
                  <p className="text-xs font-medium text-warm-600 dark:text-warm-300 mb-1">{icon} {roomName}</p>
                  {roomItems.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm py-0.5">
                      <span className="text-green-500 text-xs">✓</span>
                      <span className="text-warm-700 dark:text-warm-200 flex-1">{c.choreName}</span>
                      {userMap[c.userId] && (
                        <span className="text-xs text-warm-400" title={userMap[c.userId].name}>
                          {userMap[c.userId].avatarEmoji}
                        </span>
                      )}
                      <span className="text-[10px] text-warm-400">
                        {new Date(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled chores */}
        {items.pinned.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-warm-500 mb-2 flex items-center gap-1">
              <span>📌</span> Scheduled Chores
              <span className="bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 px-1.5 py-0.5 rounded-full ml-1">
                {items.pinned.length}
              </span>
            </h4>
            <div className="space-y-1">
              {items.pinned.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-warm-50 dark:bg-warm-700/50">
                  <span>{c.roomIcon}</span>
                  <span className="flex-1 text-warm-700 dark:text-warm-200">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.effort === 'quick' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    c.effort === 'intensive' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>{c.effort}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos */}
        {items.todos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
              <span>📝</span> To-Do&apos;s
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full ml-1">
                {items.todos.filter(t => !t.completed).length}/{items.todos.length}
              </span>
            </h4>
            <div className="space-y-1">
              {items.todos.map(t => {
                const isOverdue = !t.completed && new Date(t.dueDate!) < new Date();
                return (
                  <div key={t.id} className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg transition-colors ${
                    t.completed 
                      ? 'bg-green-50 dark:bg-green-950/10' 
                      : isOverdue 
                        ? 'bg-red-50 dark:bg-red-950/10' 
                        : 'bg-blue-50/50 dark:bg-blue-950/10'
                  }`}>
                    <span className={`text-sm ${t.completed ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-blue-400'}`}>
                      {t.completed ? '✓' : isOverdue ? '⚠️' : '○'}
                    </span>
                    <span className={`flex-1 ${t.completed ? 'text-warm-400 line-through' : 'text-warm-700 dark:text-warm-200'}`}>
                      {t.title}
                    </span>
                    {t.priority && (
                      <span className={`w-2 h-2 rounded-full ${
                        t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-400'
                      }`} />
                    )}
                    {t.assigneeId && userMap[t.assigneeId] && (
                      <span className="text-xs" title={userMap[t.assigneeId].name}>
                        {userMap[t.assigneeId].avatarEmoji}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-8 text-warm-400">
            <p className="text-3xl mb-2">{isFuture ? '🔮' : isPast ? '📭' : '✨'}</p>
            <p className="text-sm font-medium">
              {isFuture ? 'Nothing scheduled' : isPast ? 'No activity recorded' : 'Free day!'}
            </p>
            <p className="text-xs mt-1 text-warm-300">
              {isFuture ? 'Add todos or pin chores to this day' : isPast ? 'Past completions will show here' : 'Enjoy your break'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
