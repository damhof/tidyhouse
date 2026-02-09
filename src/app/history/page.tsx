import { getHistory, getDistribution } from '@/lib/chores';
import { db } from '@/db';
import { users } from '@/db/schema';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const history = await getHistory(100);
  const weekDist = await getDistribution(7);
  const monthDist = await getDistribution(30);
  const allUsers = db.select().from(users).all();
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">History</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {allUsers.map(u => {
          const week = weekDist.find(d => d.userId === u.id)?.count || 0;
          const month = monthDist.find(d => d.userId === u.id)?.count || 0;
          return (
            <div key={u.id} className="bg-white dark:bg-warm-900 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-800 text-center">
              <span className="text-3xl">{u.avatarEmoji}</span>
              <p className="font-semibold mt-2">{u.name}</p>
              <div className="flex justify-center gap-4 mt-2 text-sm text-warm-500">
                <div><span className="font-bold text-warm-800 dark:text-warm-200">{week}</span> this week</div>
                <div><span className="font-bold text-warm-800 dark:text-warm-200">{month}</span> this month</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log */}
      <div className="space-y-1">
        {history.map(entry => (
          <div key={entry.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white dark:hover:bg-warm-900 transition-all duration-200">
            <span className="text-lg">{userMap[entry.userId]?.avatarEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 dark:text-warm-100">{entry.choreName}</p>
              <p className="text-xs text-warm-500">{entry.roomIcon} {entry.roomName}</p>
            </div>
            <span className="text-xs text-warm-400 flex-shrink-0">{formatDate(entry.completedAt)}</span>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center py-12 text-warm-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-medium">No history yet.</p>
            <p className="text-sm mt-1">Start completing chores to see your stats!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
