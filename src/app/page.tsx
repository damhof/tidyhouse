import { getRoomsWithScores, getSmartSuggestion, getDistribution, stalenessColor } from '@/lib/chores';
import { db } from '@/db';
import { users } from '@/db/schema';
import Link from 'next/link';
import { CompleteChoreButton } from '@/components/CompleteChoreButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const roomsData = await getRoomsWithScores();
  const suggestion = await getSmartSuggestion();
  const weekDist = await getDistribution(7);
  const allUsers = db.select().from(users).all();

  return (
    <div className="space-y-6">
      {/* Smart Suggestion */}
      {suggestion && (
        <div className="bg-gradient-to-br from-sage-50 to-sage-100/50 dark:from-sage-900/20 dark:to-sage-800/10 border border-sage-200 dark:border-sage-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sage-600 dark:text-sage-400 uppercase tracking-wider mb-1.5">💡 Suggested next</p>
              <p className="text-lg font-bold text-warm-900 dark:text-warm-100">{suggestion.name}</p>
              <p className="text-sm text-warm-500 dark:text-warm-400 mt-0.5">{suggestion.roomIcon} {suggestion.roomName} · {suggestion.effort}</p>
            </div>
            <CompleteChoreButton choreId={suggestion.id} />
          </div>
        </div>
      )}

      {/* Fair Distribution */}
      <div className="bg-white dark:bg-warm-900 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-800">
        <h2 className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-wider mb-3">This week&apos;s effort</h2>
        <div className="flex gap-4">
          {allUsers.map(u => {
            const count = weekDist.find(d => d.userId === u.id)?.count || 0;
            const total = weekDist.reduce((s, d) => s + d.count, 0) || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={u.id} className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{u.avatarEmoji}</span>
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="text-xs text-warm-400 ml-auto">{count}</span>
                </div>
                <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                  <div className="h-full bg-sage-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room Cards */}
      <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">Rooms</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roomsData.map(room => (
          <Link key={room.id} href={`/chores/${room.id}`}
            className="bg-white dark:bg-warm-900 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{room.icon}</span>
                <h3 className="font-semibold text-warm-800 dark:text-warm-100">{room.name}</h3>
              </div>
              <ScoreGauge score={room.score} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {room.chores.map(chore => (
                <span key={chore.id} className="w-2.5 h-2.5 rounded-full transition-colors" style={{ backgroundColor: stalenessColor(chore.level) }} title={`${chore.name}: ${chore.level}`} />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#22C55E' : score >= 50 ? '#EAB308' : score >= 25 ? '#F97316' : '#EF4444';
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
        <circle cx="18" cy="18" r="15.91" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-warm-200 dark:text-warm-700" />
        <circle cx="18" cy="18" r="15.91" fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}
