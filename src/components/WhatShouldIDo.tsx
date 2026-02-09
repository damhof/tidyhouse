'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchSuggestedChores, fetchSessionPlan, completeChore, undoChoreCompletion } from '@/lib/actions';
import { showToast } from './Toast';

type SuggestedChore = {
  id: number;
  name: string;
  effort: string;
  roomName: string;
  roomIcon: string;
  level: string;
  ratio: number;
  estimatedMinutes: number;
};

type Mode = 'closed' | 'menu' | 'quickpick' | 'planner-select' | 'planner-session';

const EFFORT_EMOJI: Record<string, string> = { quick: '⚡', medium: '🔧', intensive: '💪' };
const LEVEL_COLORS: Record<string, string> = {
  green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

export function WhatShouldIDo() {
  const [mode, setMode] = useState<Mode>('closed');
  const [suggestions, setSuggestions] = useState<SuggestedChore[]>([]);
  const [quickPickIndex, setQuickPickIndex] = useState(0);
  const [sessionPlan, setSessionPlan] = useState<SuggestedChore[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [timeBudget, setTimeBudget] = useState(0);
  const [loading, setLoading] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);

  const openMenu = useCallback(() => setMode('menu'), []);
  const close = useCallback(() => {
    setMode('closed');
    setSuggestions([]);
    setSessionPlan([]);
    setCompletedIds(new Set());
    setCelebrating(false);
    setJustCompleted(null);
  }, []);

  const startQuickPick = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSuggestedChores();
      setSuggestions(data);
      setQuickPickIndex(0);
      setMode('quickpick');
    } finally {
      setLoading(false);
    }
  }, []);

  const startPlannerSelect = useCallback(() => setMode('planner-select'), []);

  const startSession = useCallback(async (minutes: number) => {
    setLoading(true);
    setTimeBudget(minutes);
    try {
      const plan = await fetchSessionPlan(minutes);
      setSessionPlan(plan);
      setCompletedIds(new Set());
      setMode('planner-session');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleComplete = useCallback(async (choreId: number, choreName: string) => {
    setJustCompleted(choreId);
    setTimeout(() => setJustCompleted(null), 600);

    try {
      const completionId = await completeChore(choreId);
      showToast({
        id: `wsid-${choreId}-${Date.now()}`,
        message: `✓ ${choreName} — done!`,
        onUndo: async () => {
          await undoChoreCompletion(completionId);
          // Remove from completed set if in session
          setCompletedIds(prev => {
            const next = new Set(prev);
            next.delete(choreId);
            return next;
          });
        },
      });
    } catch {
      setJustCompleted(null);
    }
  }, []);

  const completeQuickPick = useCallback(async () => {
    const chore = suggestions[quickPickIndex];
    if (!chore) return;
    await handleComplete(chore.id, chore.name);
    // Auto-advance after a moment
    setTimeout(() => {
      if (quickPickIndex < suggestions.length - 1) {
        setQuickPickIndex(i => i + 1);
      } else {
        close();
      }
    }, 800);
  }, [suggestions, quickPickIndex, handleComplete, close]);

  const skipQuickPick = useCallback(() => {
    if (quickPickIndex < suggestions.length - 1) {
      setQuickPickIndex(i => i + 1);
    } else {
      close();
    }
  }, [quickPickIndex, suggestions.length, close]);

  const completeSessionItem = useCallback(async (chore: SuggestedChore) => {
    setCompletedIds(prev => new Set(prev).add(chore.id));
    await handleComplete(chore.id, chore.name);
  }, [handleComplete]);

  // Check if all session items done
  const sessionDone = mode === 'planner-session' && sessionPlan.length > 0 && sessionPlan.every(c => completedIds.has(c.id));
  useEffect(() => {
    if (sessionDone) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 3000);
      return () => clearTimeout(t);
    }
  }, [sessionDone]);

  const completedCount = sessionPlan.filter(c => completedIds.has(c.id)).length;
  const progressPct = sessionPlan.length > 0 ? (completedCount / sessionPlan.length) * 100 : 0;
  const currentChore = suggestions[quickPickIndex];

  if (mode === 'closed') {
    return (
      <button
        onClick={openMenu}
        className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-sage-500 hover:bg-sage-600 active:scale-95 text-white shadow-lg shadow-sage-500/25 flex items-center justify-center transition-all duration-200"
        aria-label="What should I do?"
        title="What should I do?"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={close}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md mx-auto bg-white dark:bg-warm-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100">
            {mode === 'menu' && '🤔 What should I do?'}
            {mode === 'quickpick' && '⚡ Quick Pick'}
            {mode === 'planner-select' && '📋 Session Planner'}
            {mode === 'planner-session' && `📋 ${timeBudget} min Session`}
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="px-5 pb-8 flex items-center justify-center gap-3 py-12">
            <div className="w-5 h-5 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-warm-500 dark:text-warm-400 text-sm">Finding the best chores…</span>
          </div>
        )}

        {/* Menu */}
        {mode === 'menu' && !loading && (
          <div className="px-5 pb-6 space-y-3">
            <button
              onClick={startQuickPick}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/40 transition-colors text-left"
            >
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-semibold text-warm-800 dark:text-warm-100">Quick Pick</div>
                <div className="text-sm text-warm-500 dark:text-warm-400">Show me the most urgent chore</div>
              </div>
            </button>
            <button
              onClick={startPlannerSelect}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/40 transition-colors text-left"
            >
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-semibold text-warm-800 dark:text-warm-100">Session Planner</div>
                <div className="text-sm text-warm-500 dark:text-warm-400">Plan a focused cleaning session</div>
              </div>
            </button>
          </div>
        )}

        {/* Quick Pick */}
        {mode === 'quickpick' && !loading && currentChore && (
          <div className="px-5 pb-6">
            <div className={`rounded-xl p-5 mb-4 ${justCompleted === currentChore.id ? 'animate-complete-pulse' : ''} ${LEVEL_COLORS[currentChore.level] || LEVEL_COLORS.green}`}>
              <div className="flex items-center gap-2 text-sm opacity-75 mb-2">
                <span>{currentChore.roomIcon}</span>
                <span>{currentChore.roomName}</span>
                <span className="ml-auto">{EFFORT_EMOJI[currentChore.effort]} ~{currentChore.estimatedMinutes}min</span>
              </div>
              <div className="text-xl font-bold">{currentChore.name}</div>
              <div className="text-sm mt-1 opacity-75">
                {currentChore.ratio >= 1.5 ? 'Very overdue!' : currentChore.ratio >= 1 ? 'Overdue' : 'Due soon'}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={skipQuickPick}
                className="flex-1 py-3 rounded-xl border-2 border-warm-200 dark:border-warm-700 text-warm-600 dark:text-warm-300 font-medium hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
              >
                Skip →
              </button>
              <button
                onClick={completeQuickPick}
                className="flex-1 py-3 rounded-xl bg-sage-500 hover:bg-sage-600 text-white font-medium transition-colors active:scale-[0.98]"
              >
                ✓ Done!
              </button>
            </div>

            <div className="text-center text-xs text-warm-400 mt-3">
              {quickPickIndex + 1} of {suggestions.length} suggestions
            </div>
          </div>
        )}

        {mode === 'quickpick' && !loading && !currentChore && (
          <div className="px-5 pb-6 text-center py-8">
            <div className="text-4xl mb-3">✨</div>
            <div className="font-semibold text-warm-800 dark:text-warm-100">All caught up!</div>
            <div className="text-sm text-warm-500 dark:text-warm-400 mt-1">No chores need attention right now.</div>
          </div>
        )}

        {/* Planner: Time Select */}
        {mode === 'planner-select' && !loading && (
          <div className="px-5 pb-6 space-y-3">
            <p className="text-sm text-warm-500 dark:text-warm-400 mb-2">How much time do you have?</p>
            {[15, 30, 60].map(min => (
              <button
                key={min}
                onClick={() => startSession(min)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{min === 15 ? '🏃' : min === 30 ? '🧹' : '🏠'}</span>
                  <span className="font-semibold text-warm-800 dark:text-warm-100">{min} minutes</span>
                </div>
                <span className="text-warm-400">→</span>
              </button>
            ))}
          </div>
        )}

        {/* Planner: Active Session */}
        {mode === 'planner-session' && !loading && (
          <div className="px-5 pb-6">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-warm-500 dark:text-warm-400 mb-1.5">
                <span>{completedCount} of {sessionPlan.length} chores</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2.5 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Celebration */}
            {celebrating && (
              <div className="text-center py-6 animate-fade-in">
                <div className="text-5xl mb-3" style={{ animation: 'bounce 0.6s ease-out' }}>🎉</div>
                <div className="text-xl font-bold text-warm-800 dark:text-warm-100">All done!</div>
                <div className="text-sm text-warm-500 dark:text-warm-400 mt-1">Great job! Your house thanks you.</div>
                <button
                  onClick={close}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-sage-500 hover:bg-sage-600 text-white font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {/* Checklist */}
            {!celebrating && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {sessionPlan.map(chore => {
                  const done = completedIds.has(chore.id);
                  const isJustDone = justCompleted === chore.id;
                  return (
                    <button
                      key={chore.id}
                      onClick={() => !done && completeSessionItem(chore)}
                      disabled={done}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-300 ${
                        done
                          ? 'bg-sage-50 dark:bg-sage-900/10 opacity-60'
                          : 'bg-warm-50 dark:bg-warm-800/50 hover:bg-warm-100 dark:hover:bg-warm-800 active:scale-[0.98]'
                      } ${isJustDone ? 'animate-complete-pulse' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        done
                          ? 'bg-sage-500 border-sage-500 text-white'
                          : 'border-warm-300 dark:border-warm-600'
                      }`}>
                        {done && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${done ? 'line-through text-warm-400 dark:text-warm-500' : 'text-warm-800 dark:text-warm-100'}`}>
                          {chore.name}
                        </div>
                        <div className="text-xs text-warm-400 dark:text-warm-500 flex items-center gap-1.5">
                          <span>{chore.roomIcon}</span>
                          <span>{chore.roomName}</span>
                          <span>·</span>
                          <span>{EFFORT_EMOJI[chore.effort]} ~{chore.estimatedMinutes}min</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {sessionPlan.length === 0 && !celebrating && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✨</div>
                <div className="font-semibold text-warm-800 dark:text-warm-100">Nothing to do!</div>
                <div className="text-sm text-warm-500 dark:text-warm-400 mt-1">Your house is in great shape.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
