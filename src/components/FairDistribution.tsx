'use client';

import { useState } from 'react';

type User = { id: number; name: string; avatarEmoji: string };
type DistEntry = { userId: number; count: number };

export function FairDistribution({ users, weekDist, monthDist }: {
  users: User[];
  weekDist: DistEntry[];
  monthDist: DistEntry[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const dist = period === 'week' ? weekDist : monthDist;
  const total = dist.reduce((s, d) => s + d.count, 0);

  if (users.length < 2) return null;

  return (
    <div className="bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-warm-50 dark:hover:bg-warm-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">⚖️</span>
          <span className="text-sm font-medium text-warm-700 dark:text-warm-200">Fair Distribution</span>
        </div>
        {total > 0 && !expanded && (
          <div className="flex items-center gap-1.5 text-xs text-warm-500">
            {users.map(u => {
              const count = dist.find(d => d.userId === u.id)?.count || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <span key={u.id}>
                  {u.avatarEmoji} {pct}%
                </span>
              );
            })}
          </div>
        )}
        <span className={`text-warm-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          {/* Period toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPeriod('week')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                period === 'week'
                  ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300'
                  : 'bg-warm-100 dark:bg-warm-700 text-warm-500'
              }`}
            >
              Past 7 days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                period === 'month'
                  ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300'
                  : 'bg-warm-100 dark:bg-warm-700 text-warm-500'
              }`}
            >
              Past 30 days
            </button>
          </div>

          {total === 0 ? (
            <p className="text-sm text-warm-400 text-center py-3">No completions yet in this period</p>
          ) : (
            <>
              {/* Split bar */}
              <div className="flex h-7 rounded-full overflow-hidden mb-3">
                {users.map((u, i) => {
                  const count = dist.find(d => d.userId === u.id)?.count || 0;
                  const pct = (count / total) * 100;
                  const colors = ['#7C9A82', '#6B8FBF', '#C77B5A', '#9B7CB8'];
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length], minWidth: count > 0 ? '2.5rem' : 0 }}
                    >
                      {pct >= 15 ? `${Math.round(pct)}%` : ''}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {users.map((u, i) => {
                  const count = dist.find(d => d.userId === u.id)?.count || 0;
                  const pct = Math.round((count / total) * 100);
                  const colors = ['#7C9A82', '#6B8FBF', '#C77B5A', '#9B7CB8'];
                  return (
                    <div key={u.id} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-sm">{u.avatarEmoji} {u.name}</span>
                      <span className="ml-auto text-sm font-medium text-warm-600 dark:text-warm-300">{count}</span>
                      <span className="text-xs text-warm-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
