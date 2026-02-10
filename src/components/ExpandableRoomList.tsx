'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CompleteChoreButton } from './CompleteChoreButton';
import { HouseHealthBar } from './HouseHealthBar';
import { RoomIcon } from './RoomIcon';
import { BottomSheet, BottomSheetItem } from './BottomSheet';
import { useRouter } from 'next/navigation';
import { getChoreHistory, updateChoreInline } from '@/lib/actions';
import { useLongPress } from '@/hooks/useLongPress';
import { incrementCompletionCount } from './NotificationPrompt';

type Chore = {
  id: number; name: string; effort: string; frequencyDays: number;
  level: string; ratio: number; lastCompleted: string | null; lastUserId: number | null;
  pinnedDays?: string | null; assignedTo?: number | null;
};
type Room = {
  id: number; name: string; icon: string; score: number;
  chores: Chore[];
};
type User = { id: number; name: string; avatarEmoji: string };

function urgencyGradientBg(score: number, opacity = 0.12): string {
  let r: number, g: number, b: number;
  if (score >= 80) { r = 76; g = 175; b = 80; }
  else if (score >= 60) { const t = (score - 60) / 20; r = lerp(139, 76, t); g = lerp(195, 175, t); b = lerp(74, 80, t); }
  else if (score >= 40) { const t = (score - 40) / 20; r = lerp(255, 139, t); g = lerp(193, 195, t); b = lerp(7, 74, t); }
  else if (score >= 20) { const t = (score - 20) / 20; r = lerp(255, 255, t); g = lerp(152, 193, t); b = lerp(0, 7, t); }
  else { const t = score / 20; r = lerp(244, 255, t); g = lerp(67, 152, t); b = lerp(54, 0, t); }
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
function urgencyLabel(level: string): string {
  const map: Record<string, string> = { green: '✅ Fresh', yellow: '🟡 Due soon', orange: '🟠 Overdue', red: '🔴 Critical' };
  return map[level] || level;
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
  const completions = room.chores.filter(c => c.lastCompleted).map(c => c.lastCompleted!).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
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
const DAY_LABELS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatPinnedDays(pinned: string | null | undefined): string | null {
  if (!pinned) return null;
  return pinned.split(',').map(d => DAY_LABELS[parseInt(d)] || d).join(', ');
}

function daysSinceLastDone(lastCompleted: string | null): string {
  if (!lastCompleted) return 'Never done';
  const days = Math.floor((Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/* ─── Chore Edit Form (inline) ─── */
function ChoreEditForm({ chore, users, onSave, onCancel }: {
  chore: Chore;
  users?: User[];
  onSave: (data: { name: string; frequencyDays: number; effort: 'quick' | 'medium' | 'intensive'; pinnedDays: string | null; assignedTo: number | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(chore.name);
  const [freq, setFreq] = useState(chore.frequencyDays);
  const [effort, setEffort] = useState<'quick' | 'medium' | 'intensive'>(chore.effort as 'quick' | 'medium' | 'intensive');
  const [pinnedDays, setPinnedDays] = useState(chore.pinnedDays || '');
  const [assignedTo, setAssignedTo] = useState<number | null>(chore.assignedTo || null);
  const selectedDays = new Set(pinnedDays ? pinnedDays.split(',').map(Number) : []);
  const toggleDay = (day: number) => {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    setPinnedDays(next.size > 0 ? Array.from(next).sort().join(',') : '');
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 shadow-sm">
      {/* Chore Name */}
      <div>
        <label className="text-xs font-medium text-warm-500 block mb-1.5">Chore Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Chore name"
          className="w-full px-4 py-3 rounded-xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-base focus:outline-none focus:ring-2 focus:ring-sage-400" autoFocus />
      </div>

      {/* Frequency & Effort */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-warm-500 block mb-1.5">Frequency</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={365} value={freq} onChange={e => setFreq(parseInt(e.target.value) || 1)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-base text-center focus:outline-none focus:ring-2 focus:ring-sage-400" />
            <span className="text-sm text-warm-500">days</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-warm-500 block mb-1.5">Effort</label>
          <select value={effort} onChange={e => setEffort(e.target.value as 'quick' | 'medium' | 'intensive')}
            className="w-full px-3 py-2.5 rounded-xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-base focus:outline-none focus:ring-2 focus:ring-sage-400">
            <option value="quick">⚡ Quick</option>
            <option value="medium">🔧 Medium</option>
            <option value="intensive">💪 Intensive</option>
          </select>
        </div>
      </div>

      {/* Assign to */}
      {users && users.length > 0 && (
        <div>
          <label className="text-xs font-medium text-warm-500 block mb-1.5">Assign to</label>
          <select value={assignedTo ?? ''} onChange={e => setAssignedTo(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-base focus:outline-none focus:ring-2 focus:ring-sage-400">
            <option value="">👥 Anyone</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.avatarEmoji} {u.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Pin to Days */}
      <div>
        <label className="text-xs font-medium text-warm-500 block mb-1.5">Pin to specific days</label>
        <div className="flex gap-1.5 justify-between">
          {DAY_LABELS_SHORT.map((label, i) => (
            <button key={i} type="button" onClick={() => toggleDay(i)}
              className={`flex-1 min-w-[40px] h-10 rounded-xl text-sm font-medium transition-all active:scale-95 ${selectedDays.has(i)
                ? 'bg-sage-500 text-white shadow-sm' : 'bg-warm-100 dark:bg-warm-700 text-warm-500 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-600'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-warm-400 mt-1.5">Leave empty to show every day based on frequency</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 inline-flex items-center justify-center min-h-[48px] px-4 py-3 text-warm-600 dark:text-warm-300 text-base rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors font-medium border border-warm-200 dark:border-warm-600">
          Cancel
        </button>
        <button onClick={() => onSave({ name, frequencyDays: freq, effort, pinnedDays: pinnedDays || null, assignedTo })}
          className="flex-1 inline-flex items-center justify-center min-h-[48px] px-4 py-3 bg-sage-500 text-white rounded-xl text-base font-medium hover:bg-sage-600 transition-colors shadow-sm">
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ─── Chore Row ─── */
function ChoreRow({ chore, onComplete, users, isExpanded, onToggleExpand, onLongPress }: {
  chore: Chore; onComplete: () => void; users?: User[]; isExpanded: boolean; onToggleExpand: () => void; onLongPress: () => void;
}) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [history, setHistory] = useState<{ id: number; userId: number; completedAt: string }[] | null>(null);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const ago = chore.lastCompleted ? formatTimeAgo(chore.lastCompleted) : 'Never done';

  // Swipe state (for swipe-to-complete gesture)
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Assigned user
  const assignedUser = chore.assignedTo && users ? users.find(u => u.id === chore.assignedTo) : null;

  const handleComplete = useCallback(() => {
    setJustCompleted(true);
    onComplete();
  }, [onComplete]);

  // Use the reliable long-press hook
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!justCompleted) {
        onLongPress();
      }
    },
    onClick: () => {
      if (!justCompleted && !isSwiping) {
        onToggleExpand();
      }
    },
    threshold: 500,
    moveThreshold: 20,
  });

  // Swipe handling (separate from long-press)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-complete-btn]')) return;
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current || justCompleted) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartRef.current.x;
    const dy = touch.clientY - swipeStartRef.current.y;

    // If scrolling vertically, cancel swipe
    if (!isSwiping && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 15) {
      swipeStartRef.current = null;
      return;
    }
    // Horizontal swipe for completion
    if (dx > 15) {
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
    setTimeout(() => setIsSwiping(false), 50);
    swipeStartRef.current = null;
  }, [swipeX, justCompleted, handleComplete]);

  // Load history when expanded
  useEffect(() => {
    if (isExpanded && history === null) {
      getChoreHistory(chore.id, 5).then(setHistory).catch(() => setHistory([]));
    }
  }, [isExpanded, chore.id, history]);

  // Reset history when collapsed
  useEffect(() => {
    if (!isExpanded) setHistory(null);
  }, [isExpanded]);

  const handleSaveEdit = useCallback(async (data: { name: string; frequencyDays: number; effort: 'quick' | 'medium' | 'intensive'; pinnedDays: string | null; assignedTo: number | null }) => {
    await updateChoreInline(chore.id, data);
    setEditing(false);
    router.refresh();
  }, [chore.id, router]);

  const swipeProgress = Math.min(swipeX / 80, 1);
  const lastUser = chore.lastUserId && users ? users.find(u => u.id === chore.lastUserId) : null;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background */}
      <div className="absolute inset-0 flex items-center pl-4 rounded-xl transition-opacity duration-150"
        style={{ backgroundColor: `rgba(76, 175, 80, ${0.15 + swipeProgress * 0.35})`, opacity: swipeX > 5 ? 1 : 0 }}>
        <span className={`text-sm font-semibold transition-all duration-150 ${swipeProgress >= 1 ? 'text-green-700 dark:text-green-300 scale-110' : 'text-green-600/70 dark:text-green-400/70'}`}>
          {swipeProgress >= 1 ? '✓ Done!' : '→ Swipe to complete'}
        </span>
      </div>

      <div
        ref={rowRef}
        className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all hover:bg-warm-50 dark:hover:bg-warm-700/50 relative bg-white dark:bg-warm-800 cursor-pointer select-none longpress-target
          ${justCompleted ? 'opacity-50 bg-sage-50 dark:bg-sage-900/20' : ''}
          ${isExpanded ? 'ring-2 ring-sage-300 dark:ring-sage-700' : ''}
          ${isSwiping ? '' : 'duration-300'}`}
        style={{ transform: `translateX(${swipeX}px)`, touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { setSwipeX(0); setIsSwiping(false); swipeStartRef.current = null; }}
        {...longPressHandlers}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-700"
          style={{ backgroundColor: justCompleted ? '#4CAF50' : stalenessColor(chore.level) }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm font-medium transition-all duration-500 ${justCompleted ? 'text-warm-400 line-through' : 'text-warm-800 dark:text-warm-100'}`}>{chore.name}</p>
            {assignedUser && (
              <span className="text-xs flex-shrink-0" title={`Assigned to ${assignedUser.name}`}>{assignedUser.avatarEmoji}</span>
            )}
          </div>
          <p className="text-xs text-warm-400">
            Every {chore.frequencyDays}d · {chore.effort} · {justCompleted ? 'Just now' : ago}
            {chore.pinnedDays && <span className="hidden lg:inline"> · 📌 {formatPinnedDays(chore.pinnedDays)}</span>}
            {lastUser && <span className="hidden lg:inline"> · {lastUser.avatarEmoji}</span>}
          </p>
        </div>
        <div onClick={e => e.stopPropagation()} data-complete-btn>
          <CompleteChoreButton choreId={chore.id} choreName={chore.name} size="sm" onComplete={handleComplete} />
        </div>
      </div>

      {/* Expanded detail card */}
      <ExpandableSection isExpanded={isExpanded}>
        <div className="bg-warm-50 dark:bg-warm-800/80 rounded-xl p-3 mt-1 border border-warm-200 dark:border-warm-700 space-y-3">
          {editing ? (
            <ChoreEditForm chore={chore} users={users} onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
          ) : (
            <>
              {/* Status info - tappable cells to edit */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-warm-400">Status</span>
                  <p className="font-medium text-warm-700 dark:text-warm-200">{urgencyLabel(chore.level)}</p>
                </div>
                <div>
                  <span className="text-warm-400">Last completed</span>
                  <p className="font-medium text-warm-700 dark:text-warm-200">
                    {daysSinceLastDone(chore.lastCompleted)}
                    {lastUser && <span> · {lastUser.avatarEmoji} {lastUser.name}</span>}
                  </p>
                </div>
                <button onClick={() => setEditing(true)} className="text-left p-1.5 -m-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors group">
                  <span className="text-warm-400 group-hover:text-sage-500 transition-colors">Frequency ✏️</span>
                  <p className="font-medium text-warm-700 dark:text-warm-200">Every {chore.frequencyDays} days</p>
                </button>
                <button onClick={() => setEditing(true)} className="text-left p-1.5 -m-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors group">
                  <span className="text-warm-400 group-hover:text-sage-500 transition-colors">Effort ✏️</span>
                  <p className="font-medium text-warm-700 dark:text-warm-200 capitalize">{chore.effort}</p>
                </button>
                <button onClick={() => setEditing(true)} className="col-span-2 text-left p-1.5 -m-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors group">
                  <span className="text-warm-400 group-hover:text-sage-500 transition-colors">Pinned days ✏️</span>
                  <p className="font-medium text-warm-700 dark:text-warm-200">
                    {chore.pinnedDays ? `📌 ${formatPinnedDays(chore.pinnedDays)}` : 'Not pinned'}
                  </p>
                </button>
              </div>

              {/* Recent history */}
              {history && history.length > 0 && (
                <div>
                  <span className="text-xs text-warm-400 block mb-1">Recent completions</span>
                  <div className="space-y-0.5">
                    {history.map(h => {
                      const u = users?.find(u => u.id === h.userId);
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-warm-500">
                          <span className="text-green-500">✓</span>
                          <span>{new Date(h.completedAt).toLocaleDateString()}</span>
                          {u && <span>{u.avatarEmoji} {u.name}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {history && history.length === 0 && (
                <p className="text-xs text-warm-400 italic">No completion history yet</p>
              )}

              {/* Action buttons - larger touch targets for mobile */}
              <div className="pt-1 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <CompleteChoreButton choreId={chore.id} choreName={chore.name} size="sm" onComplete={handleComplete} />
                  <button onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-sm px-4 py-2 rounded-xl bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 hover:bg-sage-200 dark:hover:bg-sage-800/50 transition-colors font-medium border border-sage-200 dark:border-sage-700">
                    ✏️ Edit Settings
                  </button>
                </div>
                <button onClick={onToggleExpand} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-sm text-warm-400 hover:text-warm-600 transition-colors px-3 py-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700">
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      </ExpandableSection>
    </div>
  );
}

/* ─── Chores List ─── */
function ChoresList({ room, onComplete, users, onChoreLongPress }: {
  room: Room; onComplete: (choreId: number) => void; users?: User[];
  onChoreLongPress: (chore: Chore) => void;
}) {
  const [expandedChoreId, setExpandedChoreId] = useState<number | null>(null);
  const sortedChores = [...room.chores].sort((a, b) => b.ratio - a.ratio);
  const allClean = sortedChores.every(c => c.level === 'green');
  return (
    <div className="space-y-0.5">
      {sortedChores.map((chore) => (
        <ChoreRow key={chore.id} chore={chore} onComplete={() => onComplete(chore.id)} users={users}
          isExpanded={expandedChoreId === chore.id}
          onToggleExpand={() => setExpandedChoreId(expandedChoreId === chore.id ? null : chore.id)}
          onLongPress={() => onChoreLongPress(chore)} />
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
  useEffect(() => { if (contentRef.current) setHeight(isExpanded ? contentRef.current.scrollHeight : 0); }, [isExpanded]);
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const observer = new ResizeObserver(() => { if (contentRef.current) setHeight(contentRef.current.scrollHeight); });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [isExpanded]);
  return (
    <div className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ height, opacity: isExpanded ? 1 : 0 }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

/* ─── Room Card ─── */
function RoomCard({ room, isSelected, onClick }: { room: Room; isSelected: boolean; onClick: () => void }) {
  const summary = getChoreSummary(room);
  const lastActivity = getLastActivity(room);
  const iconColor = urgencyIconColor(room.score);
  return (
    <button onClick={onClick}
      className={`w-full text-left p-4 lg:p-3 rounded-2xl transition-all duration-300 border
        ${isSelected ? 'ring-2 ring-sage-400 dark:ring-sage-600 shadow-lg scale-[1.01]' : 'hover:shadow-md hover:-translate-y-0.5'}`}
      style={{ backgroundColor: urgencyGradientBg(room.score, isSelected ? 0.18 : 0.10), borderColor: urgencyBorderColor(room.score) }}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 transition-colors duration-500" style={{ color: iconColor }}>
          <RoomIcon roomName={room.name} fallbackEmoji={room.icon} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-warm-800 dark:text-warm-100 leading-tight">{room.name}</h3>
          <p className={`text-sm mt-0.5 font-medium ${summary.isClean ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{summary.text}</p>
          <p className="text-xs text-warm-400 dark:text-warm-500 mt-1">{lastActivity ? `Last activity ${formatTimeAgo(lastActivity)}` : 'No activity yet'}</p>
        </div>
        <span className={`text-warm-400 transition-transform duration-300 md:hidden text-xs mt-1 ${isSelected ? 'rotate-180' : ''}`}>▼</span>
      </div>
    </button>
  );
}

/* ─── Main export ─── */
export function ExpandableRoomList({ rooms: initialRooms, users }: { rooms: Room[]; users?: User[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rooms, setRooms] = useState(initialRooms);
  const [bottomSheetChore, setBottomSheetChore] = useState<Chore | null>(null);
  const [showPastDatePicker, setShowPastDatePicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [choreHistory, setChoreHistory] = useState<{ id: number; userId: number; completedAt: string }[]>([]);
  const [pastDate, setPastDate] = useState('');
  const [pastTime, setPastTime] = useState('');
  const router = useRouter();

  useEffect(() => { setRooms(initialRooms); }, [initialRooms]);

  const handleChoreComplete = useCallback((roomId: number, choreId: number) => {
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

  const handleChoreLongPress = useCallback(async (chore: Chore) => {
    setBottomSheetChore(chore);
    // Preload history
    try {
      const h = await getChoreHistory(chore.id, 5);
      setChoreHistory(h);
    } catch {
      setChoreHistory([]);
    }
  }, []);

  const handlePastComplete = useCallback(async () => {
    if (!bottomSheetChore || !pastDate) return;
    const { completeChore } = await import('@/lib/actions');
    const dateStr = pastTime
      ? new Date(`${pastDate}T${pastTime}`).toISOString()
      : new Date(`${pastDate}T12:00:00`).toISOString();
    await completeChore(bottomSheetChore.id, dateStr);
    incrementCompletionCount();
    setBottomSheetChore(null);
    setShowPastDatePicker(false);
    router.refresh();
  }, [bottomSheetChore, pastDate, pastTime, router]);

  const handleAssignChore = useCallback(async (userId: number | null) => {
    if (!bottomSheetChore) return;
    await updateChoreInline(bottomSheetChore.id, { assignedTo: userId });
    setBottomSheetChore(null);
    setShowAssignPicker(false);
    router.refresh();
  }, [bottomSheetChore, router]);

  const selectedRoom = rooms.find(r => r.id === selectedId) || null;

  return (
    <>
      <div className="mb-4"><HouseHealthBar rooms={rooms} /></div>

      {rooms.length === 0 && (
        <div className="text-center py-16 text-warm-400">
          <p className="text-5xl mb-4">🏠</p>
          <p className="text-lg font-semibold text-warm-600 dark:text-warm-300">No rooms yet</p>
          <p className="text-sm mt-1">Add some rooms to start tracking chores!</p>
        </div>
      )}

      {rooms.length > 0 && rooms.every(r => r.score >= 80) && (
        <div className="text-center py-6 text-green-600 dark:text-green-400">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-medium">No overdue chores — the house is spotless!</p>
        </div>
      )}

      {/* Mobile accordion */}
      <div className="md:hidden space-y-3">
        {rooms.map(room => {
          const isExpanded = selectedId === room.id;
          return (
            <div key={room.id} className="transition-all duration-300">
              <RoomCard room={room} isSelected={isExpanded} onClick={() => setSelectedId(isExpanded ? null : room.id)} />
              <ExpandableSection isExpanded={isExpanded}>
                <div className="mt-1 bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 p-3">
                  <ChoresList room={room} onComplete={(choreId) => handleChoreComplete(room.id, choreId)} users={users}
                    onChoreLongPress={handleChoreLongPress} />
                </div>
              </ExpandableSection>
            </div>
          );
        })}
      </div>

      {/* Tablet slide-over */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-2 gap-3">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} isSelected={selectedId === room.id}
              onClick={() => setSelectedId(selectedId === room.id ? null : room.id)} />
          ))}
        </div>
        {selectedRoom && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedId(null)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[85vw] h-full bg-white dark:bg-warm-800 shadow-2xl overflow-y-auto animate-slide-in-right"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 p-5 border-b border-warm-100 dark:border-warm-700 sticky top-0 z-10"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.15) }}>
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-warm-500">{getChoreSummary(selectedRoom).text}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors text-warm-400">✕</button>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={(choreId) => handleChoreComplete(selectedRoom.id, choreId)} users={users}
                  onChoreLongPress={handleChoreLongPress} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop master-detail */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_0.6fr] lg:gap-6 lg:items-start">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} isSelected={selectedId === room.id}
              onClick={() => setSelectedId(selectedId === room.id ? null : room.id)} />
          ))}
        </div>
        <div className="sticky top-20">
          {selectedRoom ? (
            <div className="bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 shadow-lg overflow-hidden transition-all duration-300">
              <div className="flex items-center gap-3 p-5 border-b border-warm-100 dark:border-warm-700"
                style={{ backgroundColor: urgencyGradientBg(selectedRoom.score, 0.12) }}>
                <div style={{ color: urgencyIconColor(selectedRoom.score) }}>
                  <RoomIcon roomName={selectedRoom.name} fallbackEmoji={selectedRoom.icon} size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">{selectedRoom.name}</h2>
                  <p className="text-xs text-warm-500">{getChoreSummary(selectedRoom).text}</p>
                </div>
              </div>
              <div className="p-4">
                <ChoresList room={selectedRoom} onComplete={(choreId) => handleChoreComplete(selectedRoom.id, choreId)} users={users}
                  onChoreLongPress={handleChoreLongPress} />
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

      {/* Chore long-press bottom sheet */}
      <BottomSheet isOpen={!!bottomSheetChore} onClose={() => { setBottomSheetChore(null); setShowPastDatePicker(false); setShowAssignPicker(false); }}
        title={bottomSheetChore?.name}>
        {bottomSheetChore && !showPastDatePicker && !showAssignPicker && (
          <div className="pb-2">
            <BottomSheetItem icon="📅" label="Complete (past date)" description="Mark as done on a different date"
              onClick={() => { const now = new Date(); setPastDate(now.toISOString().split('T')[0]); setPastTime(now.toTimeString().slice(0, 5)); setShowPastDatePicker(true); }} />
            <BottomSheetItem icon="✏️" label="Edit chore" description="Change name, frequency, effort, pinned days"
              onClick={() => {
                setBottomSheetChore(null);
                // Find the chore's room and expand it, then trigger edit via the detail panel
                const room = rooms.find(r => r.chores.some(c => c.id === bottomSheetChore.id));
                if (room) setSelectedId(room.id);
              }} />
            <BottomSheetItem icon="👤" label="Assign to..."
              description={bottomSheetChore.assignedTo && users ? `Currently: ${users.find(u => u.id === bottomSheetChore.assignedTo)?.name || 'Unknown'}` : 'Anyone can do this'}
              onClick={() => setShowAssignPicker(true)} />
            <BottomSheetItem icon="📜" label="View history" description={`${choreHistory.length} recent completions`}
              onClick={() => { /* Show inline */ }} />

            {/* Inline history display */}
            {choreHistory.length > 0 && (
              <div className="px-4 py-2 space-y-1">
                {choreHistory.map(h => {
                  const u = users?.find(u => u.id === h.userId);
                  return (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-warm-500">
                      <span className="text-green-500">✓</span>
                      <span>{new Date(h.completedAt).toLocaleDateString()}</span>
                      <span>{new Date(h.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {u && <span className="ml-auto">{u.avatarEmoji} {u.name}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2">
              <BottomSheetItem icon="✕" label="Cancel" onClick={() => setBottomSheetChore(null)} />
            </div>
          </div>
        )}
        {bottomSheetChore && showPastDatePicker && (
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-200">When did you do this?</p>
            <input type="date" value={pastDate} onChange={e => setPastDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full text-sm bg-warm-50 dark:bg-warm-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-sage-400" />
            <input type="time" value={pastTime} onChange={e => setPastTime(e.target.value)}
              className="w-full text-sm bg-warm-50 dark:bg-warm-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-sage-400" />
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setShowPastDatePicker(false)}
                className="flex-1 inline-flex items-center justify-center text-sm py-2.5 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors font-medium min-h-[48px]">Back</button>
              <button onClick={handlePastComplete}
                className="flex-1 inline-flex items-center justify-center text-sm py-2.5 rounded-xl bg-sage-500 text-white font-medium hover:bg-sage-600 transition-colors min-h-[48px]">Complete</button>
            </div>
          </div>
        )}
        {bottomSheetChore && showAssignPicker && (
          <div className="p-4 space-y-2">
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-200 mb-3">Assign this chore to:</p>
            <button onClick={() => handleAssignChore(null)}
              className={`w-full text-left px-4 py-3.5 flex items-center gap-3 rounded-xl transition-colors min-h-[48px] ${!bottomSheetChore.assignedTo ? 'bg-sage-100 dark:bg-sage-900/30 ring-2 ring-sage-400' : 'hover:bg-warm-100 dark:hover:bg-warm-700'}`}>
              <span className="text-lg">👥</span>
              <span className="text-sm font-medium">Anyone</span>
              {!bottomSheetChore.assignedTo && <span className="ml-auto text-xs text-sage-600 dark:text-sage-400">Current</span>}
            </button>
            {users?.map(u => (
              <button key={u.id} onClick={() => handleAssignChore(u.id)}
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3 rounded-xl transition-colors min-h-[48px] ${bottomSheetChore.assignedTo === u.id ? 'bg-sage-100 dark:bg-sage-900/30 ring-2 ring-sage-400' : 'hover:bg-warm-100 dark:hover:bg-warm-700'}`}>
                <span className="text-lg">{u.avatarEmoji}</span>
                <span className="text-sm font-medium">{u.name}</span>
                {bottomSheetChore.assignedTo === u.id && <span className="ml-auto text-xs text-sage-600 dark:text-sage-400">Current</span>}
              </button>
            ))}
            <button onClick={() => setShowAssignPicker(false)}
              className="w-full text-center px-4 py-3 text-warm-500 text-sm rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors mt-2 min-h-[48px]">
              Back
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
