'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        let msg = data.error || 'Login failed';
        if (data.attemptsLeft !== undefined && data.attemptsLeft > 0) {
          msg += ` (${data.attemptsLeft} attempts left)`;
        }
        setError(msg);
        setPassword('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-warm-900 rounded-3xl shadow-lg p-10 text-center">
          <div className="text-5xl mb-4">🧹</div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-100 mb-2">
            TidyHouse
          </h1>
          <p className="text-warm-500 dark:text-warm-400 mb-8">
            Enter the household password
          </p>

          {error && (
            <div className="bg-red-500/10 text-red-500 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6 text-left">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-warm-500 dark:text-warm-400 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:outline-none focus:border-sage-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-full bg-sage-500 hover:bg-sage-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>

          <p className="mt-6 text-xs text-warm-400">🔒 Secure household access</p>
        </div>
      </div>
    </div>
  );
}
