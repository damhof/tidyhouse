'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CompleteChoreButton } from './CompleteChoreButton';
import { HouseHealthBar } from './HouseHealthBar';
import { RoomIcon } from './RoomIcon';
import { useRouter } from 'next/navigation';

type Chore = {
  id: number; name: string; effort: string; frequencyDays: number;
  level: string; ratio: number; lastCompleted: string | null; lastUserId: number | null;
  pinnedDays?: string | null;
};
type Room = {
  id: number; name: string; icon: string; score: number;
  chores: Chore[];
};
type User = { id: number; name: string; avatarEmoji: string };

/**
 * Map room score (0-100) to a gradient urgency background.
 * Uses the spec's urgency spectrum: green → yellow-green → amber → orange → red.
 * Returns an rgba tint for the entire card surface.
 */
function urgencyGradientBg(score: number, opacity = 0.12): string {
  // Interpolate between urgency colors based on score
  let r: number, g: number, b: number;
  if (score >= 80) {
    // Green #4CAF50
    r = 76; g = 175; b = 80;
  } else if (score >= 60) {
    // Yellow-green #8BC34A
    const t = (score - 60) / 20;
    r = lerp(139, 76, t); g = lerp(195, 175, t); b = lerp(74, 80, t);
  } else if (score >= 40) {
    // Amber #FFC107
    const t = (score - 40) / 20;
    r = lerp(255, 139, t); g = lerp(193, 195, t); b = lerp(7, 74, t);
  } else if (score >= 20) {
    // Orange #FF9800
    const t = (score - 20) / 20;
    r = lerp(255, 255, t); g = lerp(152, 193, t); b = lerp(0, 7, t);
  } else {
    // Red #F44336
    const t = score / 20;
    r = lerp(244, 255, t); g = lerp(67, 152, t); b = lerp(54, 0, t);
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${opacity})`;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function urgencyBorderColor(score: number): string {
  if (score >= 80) return 'rgba(76,175,80,0.25)';
  if (score >= 60) return 'rgba(139,195,74,0.3)';
  if (score >= 40) return 'rgba(255,193,7,0.3)';
  if (score >= 20) return 'rgba(255,152,0,0.3)';
  return 'rgba(244,67,54,0.3)';
}

function urgencyIconColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#7CB342';
  if (score >= 40) return '#FFA000';
  if (score >= 20) return '#F57C00';
  return '#E53935';
}

function stalenessColor(level: string) {
  const map: Record<string, string> = { green: '#4CAF50', yellow: '#8BC34A', orange: '#FF9800', red: '#F44336' };
  return map[level] || '#737373';
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function getLastActivity(room: Room): string | null {
  const completions = room.chores
    .filter(c => c.lastCompleted)
    .map(c => c.lastCompleted!)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return completions[0] || null;
}

function getChoreSummary(room: Room): { text: string; isClean: boolean } {
  const total = room.chores.length;
  if (total === 0) return { text: 'No chores', isClean: true };
  const overdue = room.chores.filter(c => c.level === 'red' || c.level === 'orange').length;
  if (overdue === 0) return { text: 'All clean ✓', isClean: true };
  return { text: `${overdue} of ${total} chores overdue`, isClean: false };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatPinnedDays(pinned: string | null | undefined): string | null {
  if (!pinned) return null;
  return pinned.split(',').map(d => DAY_LABELS[parseInt(d)] || d).join(', ');
}

/* ─── Chore Row ─── */
function ChoreRow({ chore, onComplete, users, isExpanded, onToggleExpand }: { chore: Chore; onComplete: () => void; users?: User[]; isExpanded: boolean; onToggleExpand: () => void }) {
  const [justCompleted, setJustCompleted] = useState(false);
  const ago = chore.lastCompleted ? formatTimeAgo(chore.lastCompleted) : 'Never done';

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(() => {
    setJustCompleted(true);
    onComplete();
  }, [onComplete]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || justCompleted) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!isSwiping && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      touchStartRef.current = null;
      return;
    }

    if (dx > 10) {
      setIsSwiping(true);
      setSwipeX(Math.min(dx, 120));
    }
  }, [isSwiping, justCompleted]);

  const handleTouchEnd = useCallback(() => {
    if (swipeX > 80 && !justCompleted) {
      setSwipeX(0);
      handleComplete();
    } else {
      setSwipeX(0);
    }
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [swipeX, justCompleted, handleComplete]);

  const swipeProgress = Math.min(swipeX / 80, 1);
  const lastUser = chore.lastUserId && users ? users.find(u => u.id === chore.lastUserId) : null;

  return (
    <div className="relative overflow-hidden rounded-xl" ref={rowRef}>
      {/* Swipe background */}
      <div
        className="absolute inset-0 flex items-center pl-4 rounded-xl transition-opacity duration-150"
        style={{
          backgroundColor: `rgba(76, 175, 80, ${0.15 + swipeProgress * 0.35})`,
          opacity: swipeX > 5 ? 1 : 0,
        }}
      >
        <span className={`text-sm font-semibold transition-all duration-150 ${swipeProgress >= 1 ? 'text-green-700 dark:text-green-300 scale-110' : 'text-green-600/70 dark:text-green-400/70'}`}>
          {swipeProgress >= 1 ? '✓ Done!' : '→ Swipe to complete'}
        </span>
      </div>

      <div
        className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all hover:bg-warm-50 dark:hover:bg-warm-700/50 relative bg-white dark:bg-warm-800 cursor-pointer
          ${justCompleted ? 'opacity-50 bg-sage-50 dark:bg-sage-900/20' : ''}
          ${isExpanded ? 'ring-2 ring-sage-300 dark:ring-sage-700' : ''}
          ${isSwiping ? '' : 'duration-300'}`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isSwiping && onToggleExpand()}
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-700"
          style={{ backgroundColor: justCompleted ? '#4CAF50' : stalenessColor(chore.level) }}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium transition-all duration-500 ${justCompleted ? 'text-warm-400 line-through' : 'text-warm-800 dark:text-warm-100'}`}>
            {chore.name}
          </p>
          <p className="text-xs text-warm-400">
            Every {chore.frequencyDays}d · {chore.effort} · {justCompleted ? 'Just now' : ago}
            {chore.pinnedDays && <span className="hidden lg:inline"> · 📌 {formatPinnedDays(chore.pinnedDays)}</span>}
            {lastUser && <span className="hidden lg:inline"> · {lastUser.avatarEmoji}</span>}
          </p>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <CompleteChoreButton choreId={chore.id} choreName={chore.name} size="sm" onComplete={handleComplete} />
        </div>
      </div>

      {/* Inline detail card */}
      <ExpandableSection isExpanded={isExpanded}>
        <div className="bg-warm-50 dark:bg-warm-800/80 rounded-xl p-3 mt-1 border border-warm-200 dark:border-warm-700 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-warm-400">Last completed</span>
              <p className="font-medium text-warm-700 dark:text-warm-200">
                {chore.lastCompleted ? new Date(chore.lastCompleted).toLocaleDateString() : 'Never'}
                {lastUser && <span> by {lastUser.avatarEmoji} {lastUser.name}</span>}
              </p>
            </div>
            <div>
              <span className="text-warm-400">Frequency</span>
              <p className="font-medium text-warm-700 dark:text-warm-200">Every {chore.frequencyDays} days</p>
            </div>
            <div>
              <span className="text-warm-400">Effort</span>
              <p className="font-medium text-warm-700 dark:text-warm-200 capitalize">{chore.effort}</p>
            </div>
            {chore.pinnedDays && (
              <div>
                <span className="text-warm-400">Pinned days</span>
                <p className="font-medium text-warm-700 dark:text-warm-200">📌 {formatPinnedDays(chore.pinnedDays)}</p>
              </div>
            )}
          </div>
          <div className="pt-1 flex items-center justify-between" onClick={e => e.stopPropagation()}>
            <CompleteChoreButton choreId={chore.id} choreName={chore.name} size="sm" onComplete={handleComplete} />
            <button onClick={onToggleExpand} className="text-xs text-warm-400 hover:text-warm-600 transition-colors px-2 py-1">
              Close ✕
            </button>
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
}

/* ─── Chores List ─── */
function ChoresList({ room, onComplete, users }: { room: Room; onComplete: (choreId: number) => void; users?: User[] }) {
  const [expandedChoreId, setExpandedChoreId] = useState<number | null>(null);
  const sortedChores = [...room.chores].sort((a, b) => b.ratio - a.ratio);
  const allClean = sortedChores.every(c => c.level === 'green');
  return (
    <div className="space-y-0.5">
      {sortedChores.map((chore) => (
        <ChoreRow key={chore.id} chore={chore} onComplete={() => onComplete(chore.id)} users={users}
          isExpanded={expandedChoreId === chore.id}
          onToggleExpand={() => setExpandedChoreId(expandedChoreId === chore.id ? null : chore.id)} />
      ))}
      {sortedChores.length === 0 && (
        <div className="text-center py-8 text-warm-400">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-medium">No chores in this room yet</p>
        </div>
      )}
      {sortedChores.length > 0 && allClean && (
        <div className="text-center py-4 text-green-500">
          <p className="text-sm font-medium">All clean — great job! 🌟</p>
        </div>
      )}
    </div>
  );
}

/* ─── Expandable Section ─── */
function ExpandableSection({ isExpanded, children }: { isExpanded: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded]);

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
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

/* ─── Room Card (redesigned with full urgency tint) ─── */
function RoomCard({ room, isSelected, onClick }: { room: Room; isSelected: boolean; onClick: () => void }) {
  const summary = getChoreSummary(room);
  const lastActivity = getLastActivity(room);
  const iconColor = urgencyIconColor(room.score);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 lg:p-3 rounded-2xl transition-all duration-300 border
        ${isSelected
          ? 'ring-2 ring-sage-400 dark:ring-sage-600 shadow-lg scale-[1.01]'
          : 'hover:shadow-md hover:-translate-y-0.5'
        }`}
      style={{
        backgroundColor: urgencyGradientBg(room.score, isSelected ? 0.18 : 0.10),
        borderColor: urgencyBorderColor(room.score),
      }}
    >
      <div className="flex items-start gap-3">
        {/* Large room icon */}
        <div
          className="flex-shrink-0 mt-0.5 transition-colors duration-500"
          style={{ color: iconColor }}
        >
          <RoomIcon roomName={room.name} fallbackEmoji={room.icon} size={36} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-warm-800 dark:text-warm-100 leading-tight">
            {room.name}
          </h3>
          <p className={`text-sm mt-0.5 font-medium ${summary.isClean ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {summary.text}
          </p>
          {lastActivity && (
            <p className="text-xs text-warm-400 dark:text-warm-500 mt-1">
              Last activity {formatTimeAgo(lastActivity)}
            </p>
          )}
          {!lastActivity && (
            <p className="text-xs text-warm-400 dark:text-warm-500 mt-1">
              No activity yet
            </p>
          )}
        </div>

        {/* Expand indicator (mobile only) */}
        <span className={`text-warm-400 transition-transform duration-300 md:hidden text-xs mt-1 ${isSelected ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
    </button>
  );
}

/* ─── Main export ─── */
export function ExpandableRoomList({ rooms: initialRooms, users }: { rooms: Room[]; users?: User[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rooms, setRooms] = useState(initialRooms);
  const router = useRouter();

  // Sync with server data on prop change
  useEffect(() => { setRooms(initialRooms); }, [initialRooms]);

  const handleChoreComplete = useCallback((roomId: number, choreId: number) => {
    // Optimistically update the room's chore state
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      const updatedChores = room.chores.map(c =>
        c.id === choreId ? { ...c, level: 'green' as const, ratio: 0, lastCompleted: new Date().toISOString() } : c
      );
      const score = updatedChores.length === 0 ? 100 :
        Math.round(updatedChores.reduce((sum, c) => sum + Math.max(0, 1 - c.ratio), 0) / updatedChores.length * 100);
      return { ...room, chores: updatedChores, score };
    }).sort((a, b) => a.score - b.score));

    setTimeout(() => router.refresh(), 800);
  }, [router]);

  const selectedRoom = rooms.find(r => r.id === selectedId) || null;

  // Rooms are already sorted by score (worst first) from the server
  return (
    <>
      {/* House health summary */}
      <div className="mb-4">
        <HouseHealthBar rooms={rooms} />
      </div>

      {/* Empty state */}
      {rooms.length === 0 && (
        <div className="text-center py-16 text-warm-400">
          <p className="text-5xl mb-4">🏠</p>
          <p className="text-lg font-semibold text-warm-600 dark:text-warm-300">No rooms yet</p>
          <p className="text-sm mt-1">Add some rooms to start tracking chores!</p>
        </div>
      )}

      {/* No overdue message when all rooms are clean */}
      {rooms.length > 0 && rooms.every(r => r.score >= 80) && (
        <div className="text-center py-6 text-green-600 dark:text-green-400">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-medium">No overdue chores — the house is spotless!</p>
        </div>
      )}

      {/* Mobile (< 768px): single-column accordion */}
      <div className="md:hidden space-y-3">
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
                <div className="mt-1 bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 p-3">
                  <ChoresList room={room} onComplete={(choreId) => handleChoreComplete(room.id, choreId)} users={users} />
                </div>
              </ExpandableSection>
            </div>
          );
        })}
      </div>

      {/* Tablet (768px – 1024px): 2-column grid with slide-over panel */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-2 gap-3">
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              isSelected={selectedId === room.id}
              onClick={() => setSelectedId(selectedId === room.id ? null : room.id)}
            />
          ))}
        </div>
        {selectedRoom && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedId(null)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
              className="relative w-[380px] max-w-[85vw] h-full bg-white dark:bg-warm-800 shadow-2xl overflow-y-auto animate-slide-in-right"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="flex items-center gap-3 p-5 border-b border-warm-100 dark:border-warm-700 sticky top-0 z-10"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.15) }}
              >
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-warm-500">
                    {getChoreSummary(selectedRoom).text}
                  </p>
                </div>
                <button onClick={() => setSelectedId(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors text-warm-400">
                  ✕
                </button>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={(choreId) => handleChoreComplete(selectedRoom.id, choreId)} users={users} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop (> 1024px): master-detail */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_0.6fr] lg:gap-6 lg:items-start">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              isSelected={selectedId === room.id}
              onClick={() => setSelectedId(selectedId === room.id ? null : room.id)}
            />
          ))}
        </div>

        <div className="sticky top-20">
          {selectedRoom ? (
            <div className="bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 shadow-lg overflow-hidden transition-all duration-300">
              <div
                className="flex items-center gap-3 p-5 border-b border-warm-100 dark:border-warm-700"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.12) }}
              >
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-warm-500">{getChoreSummary(selectedRoom).text}</p>
                </div>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={(choreId) => handleChoreComplete(selectedRoom.id, choreId)} users={users} />
              </div>
            </div>
          ) : (
            <div className="bg-warm-50 dark:bg-warm-800/50 rounded-2xl border border-dashed border-warm-300 dark:border-warm-700 p-12 text-center">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-warm-500 dark:text-warm-400 font-medium">Select a room to see its chores</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
