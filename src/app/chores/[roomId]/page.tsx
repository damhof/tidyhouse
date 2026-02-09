import { db } from '@/db';
import { rooms, chores, choreCompletions, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getStaleness, stalenessColor } from '@/lib/chores';
import { CompleteChoreButton } from '@/components/CompleteChoreButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const rid = parseInt(roomId);
  const room = db.select().from(rooms).where(eq(rooms.id, rid)).get();
  if (!room) return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold mb-2">Room not found</h2>
      <Link href="/chores" className="text-sage-600 dark:text-sage-400 hover:underline text-sm">← Back to rooms</Link>
    </div>
  );

  const roomChores = db.select().from(chores).where(eq(chores.roomId, rid)).all();
  const allUsers = db.select().from(users).all();
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const latestCompletions = db
    .select({
      choreId: choreCompletions.choreId,
      lastCompleted: sql<string>`MAX(${choreCompletions.completedAt})`.as('last_completed'),
      lastUserId: sql<number>`(SELECT user_id FROM chore_completions c2 WHERE c2.chore_id = ${choreCompletions.choreId} ORDER BY completed_at DESC LIMIT 1)`.as('last_user_id'),
    })
    .from(choreCompletions)
    .groupBy(choreCompletions.choreId)
    .all();
  const completionMap = Object.fromEntries(latestCompletions.map(c => [c.choreId, c]));

  const choresWithData = roomChores.map(chore => {
    const comp = completionMap[chore.id];
    const staleness = getStaleness(chore.frequencyDays, comp?.lastCompleted || null);
    return { ...chore, ...staleness, lastCompleted: comp?.lastCompleted || null, lastUser: comp?.lastUserId ? userMap[comp.lastUserId] : null };
  }).sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="space-y-4">
      <Link href="/chores" className="text-sage-600 dark:text-sage-400 hover:underline text-sm">← Back to rooms</Link>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{room.icon}</span>
        <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">{room.name}</h1>
      </div>

      <div className="space-y-2">
        {choresWithData.map(chore => {
          const ago = chore.lastCompleted ? formatTimeAgo(chore.lastCompleted) : 'Never done';
          return (
            <div key={chore.id} className="flex items-center gap-3 bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-3 h-3 rounded-full flex-shrink-0 transition-colors" style={{ backgroundColor: stalenessColor(chore.level) }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-warm-800 dark:text-warm-100">{chore.name}</p>
                <p className="text-xs text-warm-500 dark:text-warm-400">
                  Every {chore.frequencyDays}d · {chore.effort} · {ago}
                  {chore.lastUser && <span> by {chore.lastUser.avatarEmoji}</span>}
                </p>
              </div>
              <CompleteChoreButton choreId={chore.id} size="sm" />
            </div>
          );
        })}

        {choresWithData.length === 0 && (
          <div className="text-center py-12 text-warm-400">
            <p className="text-4xl mb-2">✨</p>
            <p className="font-medium">No chores in this room yet!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
