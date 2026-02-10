'use client';

import { completeChore, undoChoreCompletion } from '@/lib/actions';
import { useState, useCallback, useRef, useEffect } from 'react';
import { showToast } from './Toast';
import { BottomSheet } from './BottomSheet';

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

  const openDatePicker = useCallback(() => {
    if (state !== 'idle') return;
    const now = new Date();
    setCustomDate(now.toISOString().split('T')[0]);
    setCustomTime(now.toTimeString().slice(0, 5));
    setShowDatePicker(true);
  }, [state]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    openDatePicker();
  }, [openDatePicker]);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (state !== 'idle') return;
      longPressTriggered.current = true;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      openDatePicker();
    }, 500);
  }, [state, openDatePicker]);

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

  // Quick date buttons
  const setQuickDate = useCallback((daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setCustomDate(d.toISOString().split('T')[0]);
  }, []);

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

      {/* Past completion date picker - Bottom Sheet */}
      <BottomSheet isOpen={showDatePicker} onClose={() => setShowDatePicker(false)} title="When did you do this?">
        <div className="p-4 space-y-4">
          {/* Quick date buttons */}
          <div>
            <p className="text-xs text-warm-400 mb-2">Quick select</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setQuickDate(0)} className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${customDate === new Date().toISOString().split('T')[0] ? 'bg-sage-500 text-white' : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'}`}>
                Today
              </button>
              <button onClick={() => setQuickDate(1)} className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${(() => { const d = new Date(); d.setDate(d.getDate() - 1); return customDate === d.toISOString().split('T')[0]; })() ? 'bg-sage-500 text-white' : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'}`}>
                Yesterday
              </button>
              <button onClick={() => setQuickDate(2)} className="text-xs px-3 py-2 rounded-lg font-medium bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors">
                2 days ago
              </button>
              <button onClick={() => setQuickDate(7)} className="text-xs px-3 py-2 rounded-lg font-medium bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors">
                1 week ago
              </button>
            </div>
          </div>

          {/* Date input */}
          <div>
            <label className="text-xs font-medium text-warm-500 block mb-1.5">Date</label>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full text-base bg-warm-50 dark:bg-warm-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sage-400 border border-warm-200 dark:border-warm-600"
            />
          </div>

          {/* Time input */}
          <div>
            <label className="text-xs font-medium text-warm-500 block mb-1.5">Time (optional)</label>
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="w-full text-base bg-warm-50 dark:bg-warm-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sage-400 border border-warm-200 dark:border-warm-600"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowDatePicker(false)}
              className="flex-1 inline-flex items-center justify-center min-h-[48px] text-base py-3 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors font-medium border border-warm-200 dark:border-warm-600 text-warm-600 dark:text-warm-300"
            >
              Cancel
            </button>
            <button
              onClick={handlePastComplete}
              disabled={!customDate}
              className="flex-1 inline-flex items-center justify-center min-h-[48px] text-base py-3 rounded-xl bg-sage-500 text-white font-medium hover:bg-sage-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✓ Complete
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
