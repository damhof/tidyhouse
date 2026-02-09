'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CompleteChoreButton } from './CompleteChoreButton';
import { HouseHealthBar } from './HouseHealthBar';
import { RoomIcon } from './RoomIcon';
import { useRouter } from 'next/navigation';

type Chore = {
  id: number; name: string; effort: string; frequencyDays: number;
  level: string; ratio: number; lastCompleted: string | null; lastUserId: number | null;
};
type Room = {
  id: number; name: string; icon: string; score: number;
  chores: Chore[];
};

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

/* ─── Chore Row ─── */
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
        style={{ backgroundColor: justCompleted ? '#4CAF50' : stalenessColor(chore.level) }}
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

/* ─── Chores List ─── */
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
      className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border
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
          <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100 leading-tight">
            {room.name}
          </h3>
          <p className={`text-sm mt-0.5 font-medium ${summary.isClean ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {summary.text}
          </p>
          {lastActivity && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Last activity {formatTimeAgo(lastActivity)}
            </p>
          )}
          {!lastActivity && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              No activity yet
            </p>
          )}
        </div>

        {/* Expand indicator (mobile only) */}
        <span className={`text-neutral-400 transition-transform duration-300 md:hidden text-xs mt-1 ${isSelected ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
    </button>
  );
}

/* ─── Main export ─── */
export function ExpandableRoomList({ rooms }: { rooms: Room[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  const handleComplete = useCallback(() => {
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
                <div className="mt-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <ChoresList room={room} onComplete={handleComplete} />
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
              className="relative w-[380px] max-w-[85vw] h-full bg-white dark:bg-neutral-900 shadow-2xl overflow-y-auto animate-slide-in-right"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="flex items-center gap-3 p-5 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-10"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.15) }}
              >
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-neutral-500">
                    {getChoreSummary(selectedRoom).text}
                  </p>
                </div>
                <button onClick={() => setSelectedId(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400">
                  ✕
                </button>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={handleComplete} />
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
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden transition-all duration-300">
              <div
                className="flex items-center gap-3 p-5 border-b border-neutral-100 dark:border-neutral-800"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.12) }}
              >
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-neutral-500">{getChoreSummary(selectedRoom).text}</p>
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
