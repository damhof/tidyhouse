'use client';

import { useState } from 'react';
import { CompleteChoreButton } from './CompleteChoreButton';
import Link from 'next/link';

type Chore = {
  id: number; name: string; effort: string; frequencyDays: number;
  level: string; ratio: number; lastCompleted: string | null; lastUserId: number | null;
};
type Room = {
  id: number; name: string; icon: string; score: number;
  chores: Chore[];
};

function stalenessColor(level: string) {
  const map: Record<string, string> = { green: '#22C55E', yellow: '#EAB308', orange: '#F97316', red: '#EF4444' };
  return map[level] || '#737373';
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

export function ExpandableRoomList({ rooms }: { rooms: Room[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {rooms.map(room => {
        const isExpanded = expandedId === room.id;
        const overdue = room.chores.filter(c => c.level === 'red' || c.level === 'orange').length;

        return (
          <div key={room.id} className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all">
            {/* Room header - clickable to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : room.id)}
              className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
            >
              <span className="text-3xl">{room.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{room.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {room.chores.map(c => (
                      <span key={c.id} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: stalenessColor(c.level) }} />
                    ))}
                  </div>
                  {overdue > 0 && <span className="text-xs text-red-500 font-medium">{overdue} overdue</span>}
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: room.score >= 50 ? '#22C55E' : '#EF4444' }}>
                {room.score}
              </div>
              <span className={`text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Expanded chores list */}
            {isExpanded && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 animate-fade-in">
                <div className="p-3 space-y-1">
                  {room.chores
                    .sort((a, b) => b.ratio - a.ratio)
                    .map(chore => {
                      const ago = chore.lastCompleted ? formatTimeAgo(chore.lastCompleted) : 'Never done';
                      return (
                        <div key={chore.id}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stalenessColor(chore.level) }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{chore.name}</p>
                            <p className="text-xs text-neutral-400">
                              Every {chore.frequencyDays}d · {chore.effort} · {ago}
                            </p>
                          </div>
                          <CompleteChoreButton choreId={chore.id} size="sm" />
                        </div>
                      );
                    })}
                </div>
                <div className="px-4 pb-3">
                  <Link href={`/chores/${room.id}`}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    View full room →
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
