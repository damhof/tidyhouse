'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CompleteChoreButton } from './CompleteChoreButton';
import { useRouter } from 'next/navigation';

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

function urgencyBg(score: number, opacity: number = 0.08) {
  if (score >= 80) return `rgba(34,197,94,${opacity})`;
  if (score >= 60) return `rgba(139,195,74,${opacity})`;
  if (score >= 40) return `rgba(234,179,8,${opacity})`;
  if (score >= 20) return `rgba(249,115,22,${opacity})`;
  return `rgba(239,68,68,${opacity})`;
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

function ChoreRow({ chore, onComplete }: { chore: Chore; onComplete: () => void }) {
  const [justCompleted, setJustCompleted] = useState(false);
  const ago = chore.lastCompleted ? formatTimeAgo(chore.lastCompleted) : 'Never done';

  const handleComplete = useCallback(() => {
    setJustCompleted(true);
    onComplete();
  }, [onComplete]);

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50
        ${justCompleted ? 'opacity-50 bg-sage-50 dark:bg-sage-900/20' : ''}`}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-700"
        style={{ backgroundColor: justCompleted ? '#22C55E' : stalenessColor(chore.level) }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-all duration-500 ${justCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800 dark:text-neutral-100'}`}>
          {chore.name}
        </p>
        <p className="text-xs text-neutral-400">
          Every {chore.frequencyDays}d · {chore.effort} · {justCompleted ? 'Just now' : ago}
        </p>
      </div>
      <CompleteChoreButton choreId={chore.id} choreName={chore.name} size="sm" onComplete={handleComplete} />
    </div>
  );
}

function ChoresList({ room, onComplete }: { room: Room; onComplete: () => void }) {
  const sortedChores = [...room.chores].sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="space-y-0.5">
      {sortedChores.map((chore) => (
        <ChoreRow key={chore.id} chore={chore} onComplete={onComplete} />
      ))}
      {sortedChores.length === 0 && (
        <div className="text-center py-8 text-neutral-400">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-medium">No chores in this room yet</p>
        </div>
      )}
    </div>
  );
}

function ExpandableSection({ isExpanded, children }: { isExpanded: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded]);

  // Update height when content might change
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const observer = new ResizeObserver(() => {
        if (contentRef.current) setHeight(contentRef.current.scrollHeight);
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [isExpanded]);

  return (
    <div
      className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ height, opacity: isExpanded ? 1 : 0 }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

function RoomCard({ room, isSelected, onClick }: { room: Room; isSelected: boolean; onClick: () => void }) {
  const overdue = room.chores.filter(c => c.level === 'red' || c.level === 'orange').length;
  const total = room.chores.length;
  const clean = room.chores.filter(c => c.level === 'green').length;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left
        ${isSelected
          ? 'bg-sage-50 dark:bg-sage-900/20 ring-2 ring-sage-400 dark:ring-sage-600 shadow-md'
          : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:shadow-md hover:-translate-y-0.5'
        }`}
      style={{ background: isSelected ? undefined : urgencyBg(room.score, 0.04) }}
    >
      <span className="text-3xl">{room.icon}</span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{room.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-0.5">
            {room.chores.map(c => (
              <span key={c.id} className="w-2 h-2 rounded-full transition-colors duration-700" style={{ backgroundColor: stalenessColor(c.level) }} />
            ))}
          </div>
          {overdue > 0 ? (
            <span className="text-xs text-red-500 font-medium">{overdue} overdue</span>
          ) : total > 0 ? (
            <span className="text-xs text-green-500 font-medium">All clean ✓</span>
          ) : null}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-2xl font-bold tabular-nums" style={{ color: room.score >= 50 ? '#22C55E' : room.score >= 25 ? '#F97316' : '#EF4444' }}>
          {room.score}
        </div>
        <div className="text-[10px] text-neutral-400 font-medium">/ 100</div>
      </div>
      <span className={`text-neutral-400 transition-transform duration-300 lg:hidden ${isSelected ? 'rotate-180' : ''}`}>
        ▼
      </span>
    </button>
  );
}

export function ExpandableRoomList({ rooms }: { rooms: Room[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  const handleComplete = useCallback(() => {
    // Refresh server data after a short delay to let the animation play
    setTimeout(() => router.refresh(), 800);
  }, [router]);

  const selectedRoom = rooms.find(r => r.id === selectedId) || null;

  return (
    <>
      {/* Mobile/Tablet: accordion layout */}
      <div className="lg:hidden space-y-3">
        {rooms.map(room => {
          const isExpanded = selectedId === room.id;
          return (
            <div key={room.id} className="transition-all duration-300">
              <RoomCard
                room={room}
                isSelected={isExpanded}
                onClick={() => setSelectedId(isExpanded ? null : room.id)}
              />
              <ExpandableSection isExpanded={isExpanded}>
                <div className="mt-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <ChoresList room={room} onComplete={handleComplete} />
                </div>
              </ExpandableSection>
            </div>
          );
        })}
      </div>

      {/* Desktop: master-detail layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_0.7fr] lg:gap-6 lg:items-start">
        {/* Room grid */}
        <div className="space-y-3">
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              isSelected={selectedId === room.id}
              onClick={() => setSelectedId(selectedId === room.id ? null : room.id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        <div className="sticky top-4">
          {selectedRoom ? (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden transition-all duration-300">
              <div className="flex items-center gap-3 p-5 border-b border-neutral-100 dark:border-neutral-800" style={{ background: urgencyBg(selectedRoom.score, 0.06) }}>
                <span className="text-3xl">{selectedRoom.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-neutral-500">
                    {selectedRoom.chores.filter(c => c.level === 'red' || c.level === 'orange').length} of {selectedRoom.chores.length} chores need attention
                  </p>
                </div>
                <div className="text-3xl font-bold tabular-nums" style={{ color: selectedRoom.score >= 50 ? '#22C55E' : '#EF4444' }}>
                  {selectedRoom.score}
                </div>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={handleComplete} />
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-neutral-500 dark:text-neutral-400 font-medium">Select a room to see its chores</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
