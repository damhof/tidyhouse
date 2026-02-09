'use client';

import { useState, useEffect, useCallback } from 'react';

type Prefs = {
  morningDigest: boolean;
  morningDigestTime: string;
  urgencyAlerts: boolean;
  weeklySummary: boolean;
  weeklySummaryDay: string;
  weeklySummaryTime: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({
    morningDigest: true,
    morningDigestTime: '08:00',
    urgencyAlerts: true,
    weeklySummary: true,
    weeklySummaryDay: 'sunday',
    weeklySummaryTime: '19:00',
  });
  const [permissionState, setPermissionState] = useState<string>('default');

  useEffect(() => {
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isPushSupported);
    if (!isPushSupported) {
      setLoading(false);
      return;
    }

    setPermissionState(Notification.permission);

    // Load VAPID key and current subscription status
    Promise.all([
      fetch('/api/push/vapid-key').then(r => r.ok ? r.json() : null),
      fetch('/api/push/preferences').then(r => r.ok ? r.json() : null),
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()),
    ]).then(([vapidData, prefsData, existingSub]) => {
      if (vapidData?.publicKey) setVapidKey(vapidData.publicKey);
      if (prefsData) {
        setPrefs({
          morningDigest: prefsData.morningDigest ?? true,
          morningDigestTime: prefsData.morningDigestTime ?? '08:00',
          urgencyAlerts: prefsData.urgencyAlerts ?? true,
          weeklySummary: prefsData.weeklySummary ?? true,
          weeklySummaryDay: prefsData.weeklySummaryDay ?? 'sunday',
          weeklySummaryTime: prefsData.weeklySummaryTime ?? '19:00',
        });
      }
      setSubscribed(!!existingSub);
      setLoading(false);
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        setLoading(false);
        return;
      }

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

      setSubscribed(true);
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
    setLoading(false);
  }, [vapidKey]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
    setLoading(false);
  }, []);

  const updatePrefs = useCallback(async (updates: Partial<Prefs>) => {
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    await fetch('/api/push/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrefs),
    });
  }, [prefs]);

  if (!supported) {
    return (
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">🔔 Notifications</h2>
        <p className="text-sm text-warm-500 dark:text-warm-400">
          Push notifications are not supported in this browser.
        </p>
      </section>
    );
  }

  if (!vapidKey && !loading) {
    return (
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">🔔 Notifications</h2>
        <p className="text-sm text-warm-500 dark:text-warm-400">
          Push notifications are not configured. Set VAPID environment variables to enable.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
      <h2 className="text-lg font-semibold mb-4">🔔 Notifications</h2>

      {permissionState === 'denied' && (
        <p className="text-sm text-red-500 mb-4">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {/* Subscribe/Unsubscribe */}
      <div className="mb-5">
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading || permissionState === 'denied'}
          className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 ${
            subscribed
              ? 'bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200 hover:bg-warm-300 dark:hover:bg-warm-600'
              : 'bg-sage-600 text-white hover:bg-sage-700'
          }`}
        >
          {loading ? 'Loading...' : subscribed ? '🔕 Disable Push Notifications' : '🔔 Enable Push Notifications'}
        </button>
      </div>

      {/* Preferences (only shown when subscribed) */}
      {subscribed && (
        <div className="space-y-4">
          {/* Morning Digest */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">🌅 Morning Digest</p>
              <p className="text-xs text-warm-500 dark:text-warm-400">Daily summary of overdue chores</p>
            </div>
            <button
              onClick={() => updatePrefs({ morningDigest: !prefs.morningDigest })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                prefs.morningDigest ? 'bg-sage-500' : 'bg-warm-300 dark:bg-warm-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                prefs.morningDigest ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {/* Time picker for morning digest */}
          {prefs.morningDigest && (
            <div className="flex items-center gap-3 pl-4">
              <label className="text-xs text-warm-500">Send at</label>
              <input
                type="time"
                value={prefs.morningDigestTime}
                onChange={(e) => updatePrefs({ morningDigestTime: e.target.value })}
                className="px-2 py-1 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          )}

          {/* Urgency Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">🔴 Urgency Alerts</p>
              <p className="text-xs text-warm-500 dark:text-warm-400">When chores become critically overdue (max 1/hour)</p>
            </div>
            <button
              onClick={() => updatePrefs({ urgencyAlerts: !prefs.urgencyAlerts })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                prefs.urgencyAlerts ? 'bg-sage-500' : 'bg-warm-300 dark:bg-warm-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                prefs.urgencyAlerts ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {/* Weekly Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📊 Weekly Summary</p>
              <p className="text-xs text-warm-500 dark:text-warm-400">Chores balance, room scores &amp; more</p>
            </div>
            <button
              onClick={() => updatePrefs({ weeklySummary: !prefs.weeklySummary })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                prefs.weeklySummary ? 'bg-sage-500' : 'bg-warm-300 dark:bg-warm-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                prefs.weeklySummary ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {/* Weekly summary day/time picker */}
          {prefs.weeklySummary && (
            <div className="flex items-center gap-3 pl-4 flex-wrap">
              <label className="text-xs text-warm-500">Day</label>
              <select
                value={prefs.weeklySummaryDay}
                onChange={(e) => updatePrefs({ weeklySummaryDay: e.target.value })}
                className="px-2 py-1 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="saturday">Saturday</option>
              </select>
              <label className="text-xs text-warm-500">at</label>
              <input
                type="time"
                value={prefs.weeklySummaryTime}
                onChange={(e) => updatePrefs({ weeklySummaryTime: e.target.value })}
                className="px-2 py-1 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
