'use client';

type Room = { score: number; chores: { level: string }[] };

function getUrgencyColor(score: number): string {
  // Map score 0-100 to urgency spectrum: red→orange→amber→yellow-green→green
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#8BC34A';
  if (score >= 40) return '#FFC107';
  if (score >= 20) return '#FF9800';
  return '#F44336';
}

export function HouseHealthBar({ rooms }: { rooms: Room[] }) {
  const totalChores = rooms.reduce((s, r) => s + r.chores.length, 0);
  const overdueChores = rooms.reduce(
    (s, r) => s + r.chores.filter(c => c.level === 'red' || c.level === 'orange').length,
    0
  );
  const avgScore = totalChores > 0
    ? Math.round(rooms.reduce((s, r) => s + r.score, 0) / rooms.length)
    : 100;
  const color = getUrgencyColor(avgScore);

  const message = overdueChores === 0
    ? 'Everything is clean! ✨'
    : overdueChores === 1
      ? '1 chore needs attention'
      : `${overdueChores} chores need attention`;

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏠</span>
          <span className="font-semibold text-warm-800 dark:text-warm-100 text-sm">
            House Health
          </span>
        </div>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {avgScore}%
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${avgScore}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-warm-500 dark:text-warm-400">{message}</p>
    </div>
  );
}
