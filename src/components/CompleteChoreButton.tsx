'use client';

import { completeChore, undoChoreCompletion } from '@/lib/actions';
import { useState, useCallback } from 'react';
import { showToast } from './Toast';

type Props = {
  choreId: number;
  choreName?: string;
  size?: 'sm' | 'md';
  onComplete?: () => void;
};

export function CompleteChoreButton({ choreId, choreName, size = 'md', onComplete }: Props) {
  const [state, setState] = useState<'idle' | 'completing' | 'done'>('idle');

  const handleClick = useCallback(async () => {
    if (state !== 'idle') return;

    // Optimistic: immediately show done state
    setState('completing');
    onComplete?.();

    // Bounce animation then settle
    setTimeout(() => setState('done'), 350);

    try {
      const completionId = await completeChore(choreId);

      showToast({
        id: `chore-${choreId}-${Date.now()}`,
        message: `✓ ${choreName || 'Chore'} — done!`,
        onUndo: async () => {
          await undoChoreCompletion(completionId);
        },
      });
    } catch {
      // Revert on error
      setState('idle');
    }

    // Reset after animation
    setTimeout(() => setState('idle'), 2000);
  }, [choreId, choreName, state, onComplete]);

  const sizeClass = size === 'sm' ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg';

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
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
  );
}
