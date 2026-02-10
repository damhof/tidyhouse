'use client';

import { useState, useEffect, useCallback } from 'react';

const PROMPT_DISMISSED_KEY = 'tidyhouse_notification_prompt_dismissed';
const COMPLETIONS_KEY = 'tidyhouse_completions_count';
const MIN_COMPLETIONS_TO_SHOW = 3;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    // Don't show if push not supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    // Don't show if already granted or denied
    if (Notification.permission !== 'default') return;
    
    // Don't show if dismissed before
    if (localStorage.getItem(PROMPT_DISMISSED_KEY)) return;

    // Don't show until user has done a few completions
    const completions = parseInt(localStorage.getItem(COMPLETIONS_KEY) || '0', 10);
    if (completions < MIN_COMPLETIONS_TO_SHOW) return;

    // Check if VAPID is configured
    fetch('/api/push/vapid-key')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.publicKey) {
          setVapidKey(data.publicKey);
          // Small delay before showing for smoother UX
          setTimeout(() => setShow(true), 1500);
        }
      })
      .catch(() => {});
  }, []);

  const handleEnable = useCallback(async () => {
    if (!vapidKey) return;
    setLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      }
      
      setShow(false);
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [vapidKey]);

  const handleDismiss = useCallback(() => {
    setShow(false);
  }, []);

  const handleNeverShow = useCallback(() => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-28 md:bottom-8 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-white dark:bg-warm-800 rounded-2xl shadow-xl border border-warm-200 dark:border-warm-700 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-warm-900 dark:text-warm-100 text-sm">
              Never miss a chore
            </h3>
            <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">
              Get morning reminders when chores are due and weekly summaries
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 p-1 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-sage-600 text-white rounded-xl font-medium text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </button>
          <button
            onClick={handleNeverShow}
            className="py-2.5 px-3 text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 text-xs font-medium"
          >
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to increment completion count (call this from chore completion)
export function incrementCompletionCount() {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem(COMPLETIONS_KEY) || '0', 10);
  localStorage.setItem(COMPLETIONS_KEY, String(count + 1));
}
