'use client';

import { completeChore } from '@/lib/actions';
import { useState } from 'react';

export function CompleteChoreButton({ choreId, size = 'md' }: { choreId: number; size?: 'sm' | 'md' }) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await completeChore(choreId);
    setCompleted(true);
    setTimeout(() => setCompleted(false), 2000);
    setLoading(false);
  };

  const sizeClass = size === 'sm' ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg';

  return (
    <button onClick={handleClick} disabled={loading}
      className={`${sizeClass} flex items-center justify-center rounded-xl bg-sage-500 hover:bg-sage-600 text-white transition-all duration-200 active:scale-90 disabled:opacity-50 ${completed ? 'animate-complete-pulse bg-emerald-500' : ''}`}>
      {completed ? <span className="animate-checkmark">✓</span> : loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : '✓'}
    </button>
  );
}
