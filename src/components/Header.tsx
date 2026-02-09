'use client';

import { useTheme } from './ThemeProvider';
import { switchUser } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export function Header({ userName, userEmoji, userId }: { userName: string | null; userEmoji: string | null; userId: number | null }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleSwitch = async (id: number) => {
    await switchUser(id);
    setShowMenu(false);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-warm-900/80 backdrop-blur-lg border-b border-warm-200/80 dark:border-warm-800/80 px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-sage-700 dark:text-sage-400 md:hidden tracking-tight">🏡 TidyHouse</h1>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200"
          title={`Theme: ${theme}`}>
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓'}
        </button>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)}
            className="min-h-[44px] flex items-center gap-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200 px-3">
            <span className="text-xl">{userEmoji || '👤'}</span>
            <span className="hidden sm:inline text-sm font-medium text-warm-600 dark:text-warm-300">{userName || 'Choose'}</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-warm-800 rounded-xl shadow-lg border border-warm-200 dark:border-warm-700 py-1.5 min-w-[160px] animate-fade-in">
              {[{ id: 1, name: 'User 1', emoji: '👨' }, { id: 2, name: 'User 2', emoji: '👩' }].map(u => (
                <button key={u.id} onClick={() => handleSwitch(u.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors ${userId === u.id ? 'bg-sage-50 dark:bg-sage-900/30' : ''}`}>
                  <span className="text-xl">{u.emoji}</span>
                  <span className="font-medium text-sm">{u.name}</span>
                  {userId === u.id && <span className="ml-auto text-sage-600 dark:text-sage-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
