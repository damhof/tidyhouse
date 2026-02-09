'use client';

import { completeChore, undoChoreCompletion } from '@/lib/actions';
import { useState, useCallback, useRef, useEffect } from 'react';
import { showToast } from './Toast';

type Props = {
  choreId: number;
  choreName?: string;
  size?: 'sm' | 'md';
  onComplete?: () => void;
};

export function CompleteChoreButton({ choreId, choreName, size = 'md', onComplete }: Props) {
  const [state, setState] = useState<'idle' | 'completing' | 'done'>('idle');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    if (!showDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDatePicker]);

  const doComplete = useCallback(async (completedAt?: string) => {
    if (state !== 'idle') return;
    setState('completing');
    onComplete?.();
    setTimeout(() => setState('done'), 350);

    try {
      const completionId = await completeChore(choreId, completedAt);
      const timeLabel = completedAt ? ` (${new Date(completedAt).toLocaleDateString()})` : '';
      showToast({
        id: `chore-${choreId}-${Date.now()}`,
        message: `✓ ${choreName || 'Chore'} — done!${timeLabel}`,
        onUndo: async () => {
          await undoChoreCompletion(completionId);
        },
      });
    } catch {
      setState('idle');
    }
    setTimeout(() => setState('idle'), 2000);
  }, [choreId, choreName, state, onComplete]);

  const handleClick = useCallback(() => {
    doComplete();
  }, [doComplete]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (state !== 'idle') return;
    const now = new Date();
    setCustomDate(now.toISOString().split('T')[0]);
    setCustomTime(now.toTimeString().slice(0, 5));
    setShowDatePicker(true);
  }, [state]);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (state !== 'idle') return;
      longPressTriggered.current = true;
      const now = new Date();
      setCustomDate(now.toISOString().split('T')[0]);
      setCustomTime(now.toTimeString().slice(0, 5));
      setShowDatePicker(true);
    }, 500);
  }, [state]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    if (Math.abs(touch.clientX - touchStartPos.current.x) > 10 || Math.abs(touch.clientY - touchStartPos.current.y) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handlePastComplete = useCallback(() => {
    if (!customDate) return;
    const dateStr = customTime
      ? new Date(`${customDate}T${customTime}`).toISOString()
      : new Date(`${customDate}T12:00:00`).toISOString();
    setShowDatePicker(false);
    doComplete(dateStr);
  }, [customDate, customTime, doComplete]);

  const sizeClass = size === 'sm' ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg';

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        disabled={state !== 'idle'}
        title="Click to complete · Long-press/right-click for past date"
        className={`${sizeClass} flex items-center justify-center rounded-full transition-all duration-300 
          ${state === 'idle'
            ? 'bg-sage-100 dark:bg-sage-900/30 border-2 border-sage-300 dark:border-sage-700 hover:bg-sage-200 dark:hover:bg-sage-800/50 hover:border-sage-400 text-sage-500 active:scale-90'
            : state === 'completing'
              ? 'bg-sage-500 border-2 border-sage-500 text-white scale-110'
              : 'bg-sage-500 border-2 border-sage-500 text-white scale-100'
          }
          disabled:cursor-default`}
      >
        {state === 'idle' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className="animate-checkmark-draw">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Past completion date picker */}
      {showDatePicker && (
        <div
          ref={datePickerRef}
          className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-warm-800 rounded-xl shadow-xl border border-warm-200 dark:border-warm-700 p-4 w-64 animate-fade-in"
        >
          <p className="text-sm font-semibold text-warm-700 dark:text-warm-200 mb-2">When did you do this?</p>
          <div className="space-y-2">
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full text-sm bg-warm-50 dark:bg-warm-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400"
            />
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="w-full text-sm bg-warm-50 dark:bg-warm-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowDatePicker(false)}
              className="flex-1 text-sm py-2 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePastComplete}
              className="flex-1 text-sm py-2 rounded-lg bg-sage-500 text-white font-medium hover:bg-sage-600 transition-colors"
            >
              Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
