'use client';

import { useState } from 'react';
import type { SummaryData, TimePeriod } from '@/lib/summary';

const USER_COLORS = ['#7C9A82', '#6B8FBF', '#C77B5A', '#9B7CB8', '#5BADB5', '#D4A843'];

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

function TrendBadge({ trend, percent }: { trend: 'up' | 'down' | 'same'; percent: number }) {
  if (trend === 'same' || Math.abs(percent) < 5) return null;
  
  const color = trend === 'up' 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';
  const icon = trend === 'up' ? '↑' : '↓';
  
  return (
    <span className={`text-xs font-medium ${color}`}>
      {icon} {Math.abs(percent)}%
    </span>
  );
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'same' }) {
  if (trend === 'same') return null;
  const color = trend === 'up' 
    ? 'text-green-500' 
    : 'text-red-500';
  return <span className={`text-xs ${color}`}>{trend === 'up' ? '↑' : '↓'}</span>;
}

function ActivityHeatmap({ data }: { data: { date: string; count: number; effortScore: number }[] }) {
  // Group by week (7 days per row)
  const weeks: typeof data[] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  const getColor = (count: number) => {
    if (count === 0) return 'bg-warm-100 dark:bg-warm-800';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-500 dark:bg-green-600';
    if (intensity > 0.5) return 'bg-green-400 dark:bg-green-500';
    if (intensity > 0.25) return 'bg-green-300 dark:bg-green-600/60';
    return 'bg-green-200 dark:bg-green-700/50';
  };
  
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-warm-400">
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-1 hover:ring-warm-400`}
                title={`${day.date}: ${day.count} chores (${day.effortScore} effort)`}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-warm-400">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-warm-100 dark:bg-warm-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-700/50" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-600/60" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, trend, trendPercent }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'same';
  trendPercent?: number;
}) {
  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-warm-800 dark:text-warm-100">
            {value}{icon && <span className="ml-1">{icon}</span>}
          </p>
          <p className="text-xs text-warm-500 dark:text-warm-400">{label}</p>
          {subValue && <p className="text-xs text-warm-400 mt-0.5">{subValue}</p>}
        </div>
        {trend && trendPercent !== undefined && (
          <TrendBadge trend={trend} percent={trendPercent} />
        )}
      </div>
    </div>
  );
}

function UserCard({ user, color }: { 
  user: SummaryData['userStats'][0]; 
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          {user.userEmoji}
        </div>
        <div className="flex-1">
          <span className="font-medium text-warm-800 dark:text-warm-100">{user.userName}</span>
          <p className="text-xs text-warm-400">{user.count} chores · {user.effortScore} pts</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {user.streak > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2 py-1.5">
            <span className="font-medium text-amber-600 dark:text-amber-400">🔥 {user.streak} day streak</span>
          </div>
        )}
        {user.topRoom && (
          <div className="bg-sage-50 dark:bg-sage-950/20 rounded-lg px-2 py-1.5">
            <span className="text-warm-500 dark:text-warm-400">Top: </span>
            <span className="text-warm-700 dark:text-warm-200">{user.topRoom}</span>
          </div>
        )}
        {user.topChore && (
          <div className="bg-warm-50 dark:bg-warm-700/30 rounded-lg px-2 py-1.5 col-span-2 truncate">
            <span className="text-warm-500 dark:text-warm-400">Most done: </span>
            <span className="text-warm-700 dark:text-warm-200">{user.topChore}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SummaryClient({ 
  initialData, 
  allData 
}: { 
  initialData: SummaryData;
  allData: Record<TimePeriod, SummaryData>;
}) {
  const [period, setPeriod] = useState<TimePeriod>(initialData.period);
  const data = allData[period];
  
  // Sort alphabetically by name (non-competitive)
  const sortedUsers = [...data.userStats].sort((a, b) => a.userName.localeCompare(b.userName));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Period Selector */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">📊 Activity Summary</h1>
            <p className="text-sm text-warm-500 dark:text-warm-400 mt-1">{data.periodLabel}</p>
          </div>
          
          {/* Period Tabs */}
          <div className="flex rounded-xl bg-warm-100 dark:bg-warm-700 p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === 'week' 
                  ? 'bg-white dark:bg-warm-600 shadow-sm text-warm-800 dark:text-warm-100' 
                  : 'text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === 'month' 
                  ? 'bg-white dark:bg-warm-600 shadow-sm text-warm-800 dark:text-warm-100' 
                  : 'text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === '30days' 
                  ? 'bg-white dark:bg-warm-600 shadow-sm text-warm-800 dark:text-warm-100' 
                  : 'text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
        
        <p className="text-base leading-relaxed text-warm-700 dark:text-warm-200">{data.friendlyMessage}</p>
        
        {/* Achievements */}
        {data.achievements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {data.achievements.map((a, i) => (
              <span key={i} className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          label="Chores Done" 
          value={data.totalCompletions}
          trend={data.trend}
          trendPercent={data.trendPercent}
        />
        <StatCard 
          label="Effort Points" 
          value={data.totalEffort}
          subValue={`${data.averagePerDay}/day avg`}
        />
        <StatCard 
          label="Current Streak" 
          value={data.currentStreak}
          icon="🔥"
          subValue={`Best: ${data.bestStreak} days`}
        />
        <StatCard 
          label="Active Days" 
          value={data.activeDays}
          subValue={`of ${period === 'week' ? 7 : period === 'month' ? 'this month' : 30}`}
        />
      </div>

      {/* Activity Heatmap */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">📅 Activity (Last 12 Weeks)</h2>
        <ActivityHeatmap data={data.activityData} />
      </div>

      {/* Two-column layout for larger screens */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Chores Balance */}
        <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
          <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">🏠 Chores Balance</h2>
          
          {/* Count bar */}
          <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-1">By count</p>
          <SplitBar segments={sortedUsers.map((u, i) => ({
            label: `${u.userEmoji} ${u.userName}`,
            value: u.count,
            color: USER_COLORS[i % USER_COLORS.length],
          }))} />

          {/* Effort bar */}
          <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-1 mt-4">By effort points</p>
          <SplitBar segments={sortedUsers.map((u, i) => ({
            label: `${u.userEmoji} ${u.userName}`,
            value: u.effortScore,
            color: USER_COLORS[i % USER_COLORS.length],
          }))} />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {sortedUsers.map((u, i) => (
              <div key={u.userId} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: USER_COLORS[i % USER_COLORS.length] }} />
                <span className="text-warm-700 dark:text-warm-200">{u.userEmoji} {u.userName}</span>
                <span className="text-warm-400">({u.count} · {u.effortScore}pts)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Scores */}
        <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
          <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">🏆 Room Scores</h2>
          
          {data.topRooms.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-warm-500 dark:text-warm-400 mb-2">Best maintained</p>
              <div className="space-y-2">
                {data.topRooms.map(r => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.icon} {r.name}</span>
                      <TrendArrow trend={r.trend} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-warm-400">{r.completions} done</span>
                      <ScoreBadge score={r.score} />
                    </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.icon} {r.name}</span>
                      <TrendArrow trend={r.trend} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-warm-400">{r.completions} done</span>
                      <ScoreBadge score={r.score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Household Members */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">👥 Household Members</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedUsers.map((user, i) => (
            <UserCard key={user.userId} user={user} color={USER_COLORS[i % USER_COLORS.length]} />
          ))}
        </div>
      </div>

      {/* Todo Stats */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">✅ To-Do&apos;s</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data.todosCompleted}</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70">Completed</p>
            {data.prevTodosCompleted > 0 && (
              <p className="text-xs text-warm-400 mt-1">
                vs {data.prevTodosCompleted} last {period === 'week' ? 'week' : period === 'month' ? 'month' : 'period'}
              </p>
            )}
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.todosCreated}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Added</p>
          </div>
        </div>
      </div>

      {/* Project Updates */}
      <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4 text-warm-800 dark:text-warm-100">📋 Project Updates</h2>
        {data.projectUpdates.length === 0 && data.tasksCompleted === 0 ? (
          <p className="text-sm text-warm-500 dark:text-warm-400">No project activity this {period === 'week' ? 'week' : period === 'month' ? 'month' : 'period'}</p>
        ) : (
          <>
            {data.tasksCompleted > 0 && (
              <p className="text-sm mb-3 text-warm-700 dark:text-warm-200">{data.tasksCompleted} project task{data.tasksCompleted === 1 ? '' : 's'} completed</p>
            )}
            {data.projectUpdates.length > 0 && (
              <div className="space-y-2">
                {data.projectUpdates.slice(0, 10).map((u, i) => (
                  <div key={i} className="text-sm flex gap-2">
                    <span className="text-warm-400">•</span>
                    <span className="text-warm-700 dark:text-warm-200">
                      <span className="font-medium">{u.projectTitle}</span>: {u.action}{u.details ? ` — ${u.details}` : ''}
                    </span>
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
