'use client';

import type { WeeklySummaryData } from '@/lib/summary';

function SplitBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="h-6 bg-warm-200 dark:bg-warm-700 rounded-full" />;
  return (
    <div className="flex h-6 rounded-full overflow-hidden">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="flex items-center justify-center text-xs font-medium text-white transition-all"
          style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color, minWidth: seg.value > 0 ? '2rem' : 0 }}
          title={`${seg.label}: ${seg.value}`}
        >
          {seg.value > 0 ? seg.value : ''}
        </div>
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>;
}

const USER_COLORS = ['#7C9A82', '#6B8FBF', '#C77B5A', '#9B7CB8', '#5BADB5', '#D4A843'];

export function SummaryClient({ data }: { data: WeeklySummaryData }) {
  const totalEffort = data.userStats.reduce((s, u) => s + u.effortScore, 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-6 shadow-sm border border-warm-200 dark:border-warm-700">
        <h1 className="text-2xl font-bold mb-1">📊 Weekly Summary</h1>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">
          {new Date(data.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(data.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-base leading-relaxed">{data.friendlyMessage}</p>
      </div>

      {/* Chores Balance */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">🏠 Chores Balance</h2>
        <p className="text-3xl font-bold mb-1">{data.totalCompletions}</p>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">chores completed this week</p>

        {/* Count bar */}
        <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-1">By count</p>
        <SplitBar segments={data.userStats.map((u, i) => ({
          label: `${u.userEmoji} ${u.userName}`,
          value: u.count,
          color: USER_COLORS[i % USER_COLORS.length],
        }))} />

        {/* Effort bar */}
        <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-1 mt-3">By effort</p>
        <SplitBar segments={data.userStats.map((u, i) => ({
          label: `${u.userEmoji} ${u.userName}`,
          value: u.effortScore,
          color: USER_COLORS[i % USER_COLORS.length],
        }))} />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {data.userStats.map((u, i) => (
            <div key={u.userId} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: USER_COLORS[i % USER_COLORS.length] }} />
              <span>{u.userEmoji} {u.userName}</span>
              <span className="text-warm-400">({u.count} · {u.effortScore}pts)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room Scores */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">🏆 Room Scores</h2>
        {data.topRooms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-2">Best maintained</p>
            <div className="space-y-2">
              {data.topRooms.map(r => (
                <div key={r.name} className="flex items-center justify-between">
                  <span className="text-sm">{r.icon} {r.name}</span>
                  <ScoreBadge score={r.score} />
                </div>
              ))}
            </div>
          </div>
        )}
        {data.worstRooms.length > 0 && (
          <div>
            <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-2">Needs attention</p>
            <div className="space-y-2">
              {data.worstRooms.map(r => (
                <div key={r.name} className="flex items-center justify-between">
                  <span className="text-sm">{r.icon} {r.name}</span>
                  <ScoreBadge score={r.score} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* To-Do Stats */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">✅ To-Do&apos;s</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{data.todosCompleted}</p>
            <p className="text-xs text-warm-500 dark:text-warm-400">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.todosCreated}</p>
            <p className="text-xs text-warm-500 dark:text-warm-400">Added</p>
          </div>
        </div>
      </div>

      {/* Project Updates */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">📋 Project Updates</h2>
        {data.projectUpdates.length === 0 && data.tasksCompleted === 0 ? (
          <p className="text-sm text-warm-500 dark:text-warm-400">No project activity this week</p>
        ) : (
          <>
            {data.tasksCompleted > 0 && (
              <p className="text-sm mb-3">{data.tasksCompleted} project task{data.tasksCompleted === 1 ? '' : 's'} completed</p>
            )}
            {data.projectUpdates.length > 0 && (
              <div className="space-y-2">
                {data.projectUpdates.slice(0, 10).map((u, i) => (
                  <div key={i} className="text-sm flex gap-2">
                    <span className="text-warm-400">•</span>
                    <span><span className="font-medium">{u.projectTitle}</span>: {u.action}{u.details ? ` — ${u.details}` : ''}</span>
                  </div>
                ))}
                {data.projectUpdates.length > 10 && (
                  <p className="text-xs text-warm-400">+{data.projectUpdates.length - 10} more</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
