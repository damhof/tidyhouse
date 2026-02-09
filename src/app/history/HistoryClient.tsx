'use client';

import { useState } from 'react';

type HistoryEntry = {
  id: number;
  choreId: number;
  userId: number;
  completedAt: string;
  choreName: string;
  roomName: string;
  roomIcon: string;
};
type DistEntry = { userId: number; count: number };
type User = { id: number; name: string; avatarEmoji: string };

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

export function HistoryClient({ history, weekDist, monthDist, users }: {
  history: HistoryEntry[];
  weekDist: DistEntry[];
  monthDist: DistEntry[];
  users: User[];
}) {
  const [userFilter, setUserFilter] = useState<number | null>(null);
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Get unique rooms from history
  const rooms = [...new Set(history.map(h => h.roomName))].sort();

  // Apply filters
  const filtered = history.filter(entry => {
    if (userFilter !== null && entry.userId !== userFilter) return false;
    if (roomFilter !== null && entry.roomName !== roomFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">History</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {users.map(u => {
          const week = weekDist.find(d => d.userId === u.id)?.count || 0;
          const month = monthDist.find(d => d.userId === u.id)?.count || 0;
          return (
            <div key={u.id} className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700 text-center">
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {/* User filter */}
        <button
          onClick={() => setUserFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            userFilter === null
              ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 ring-1 ring-sage-400'
              : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-600'
          }`}
        >
          All users
        </button>
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => setUserFilter(userFilter === u.id ? null : u.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              userFilter === u.id
                ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 ring-1 ring-sage-400'
                : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-600'
            }`}
          >
            {u.avatarEmoji} {u.name}
          </button>
        ))}

        <div className="w-px bg-warm-300 dark:bg-warm-600 mx-1" />

        {/* Room filter */}
        <button
          onClick={() => setRoomFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            roomFilter === null
              ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 ring-1 ring-sage-400'
              : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-600'
          }`}
        >
          All rooms
        </button>
        {rooms.map(room => (
          <button
            key={room}
            onClick={() => setRoomFilter(roomFilter === room ? null : room)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              roomFilter === room
                ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 ring-1 ring-sage-400'
                : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-600'
            }`}
          >
            {room}
          </button>
        ))}
      </div>

      {/* Log */}
      <div className="space-y-1">
        {filtered.map(entry => (
          <div key={entry.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white dark:hover:bg-warm-800 transition-all duration-200">
            <span className="text-lg">{userMap[entry.userId]?.avatarEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 dark:text-warm-100">{entry.choreName}</p>
              <p className="text-xs text-warm-500">{entry.roomIcon} {entry.roomName}</p>
            </div>
            <span className="text-xs text-warm-400 flex-shrink-0">{formatDate(entry.completedAt)}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-warm-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-medium">{history.length === 0 ? 'No history yet.' : 'No entries match your filters.'}</p>
            {history.length === 0 && <p className="text-sm mt-1">Start completing chores to see your stats!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
