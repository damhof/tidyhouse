'use client';

import { useTheme } from './ThemeProvider';
import { switchUser, updateUserName } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type UserInfo = { id: number; name: string; avatarEmoji: string };

export function Header({ userName, userEmoji, userId, allUsers }: {
  userName: string | null; userEmoji: string | null; userId: number | null; allUsers: UserInfo[];
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showMenu) { setEditingId(null); return; }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const handleSwitch = async (id: number) => {
    if (editingId) return;
    await switchUser(id);
    setShowMenu(false);
    router.refresh();
  };

  const startEdit = (u: UserInfo) => {
    setEditingId(u.id);
    setEditName(u.name);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateUserName(editingId, editName);
      setEditingId(null);
      router.refresh();
    }
  };

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-warm-900/80 backdrop-blur-lg border-b border-warm-200/80 dark:border-warm-700/80 px-4 py-3 flex items-center justify-between" style={{ paddingTop: `max(0.75rem, env(safe-area-inset-top))` }}>
      <h1 className="text-lg font-semibold text-sage-600 dark:text-sage-400 md:hidden tracking-tight">🏡 TidyHouse</h1>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        {/* Settings gear */}
        <Link href="/settings"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200"
          title="Settings">
          ⚙️
        </Link>

        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200"
          title={`Theme: ${themeLabel}`}>
          {themeIcon}
        </button>

        {/* User switcher */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)}
            className="min-h-[44px] flex items-center gap-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200 px-3">
            <span className="text-xl">{userEmoji || '👤'}</span>
            <span className="hidden sm:inline text-sm font-medium text-warm-600 dark:text-warm-300">{userName || 'Choose'}</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-warm-800 rounded-xl shadow-lg border border-warm-200 dark:border-warm-700 py-1.5 min-w-[200px] animate-fade-in">
              <div className="px-3 py-1.5 text-xs font-semibold text-warm-400 uppercase tracking-wider">Switch user</div>
              {allUsers.map(u => (
                <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors ${userId === u.id ? 'bg-sage-50 dark:bg-sage-900/30' : ''}`}>
                  <button onClick={() => handleSwitch(u.id)} className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl">{u.avatarEmoji}</span>
                    {editingId === u.id ? (
                      <input
                        ref={inputRef}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="text-sm font-medium bg-white dark:bg-warm-900 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-sage-400"
                      />
                    ) : (
                      <span className="font-medium text-sm truncate">{u.name}</span>
                    )}
                    {userId === u.id && !editingId && <span className="ml-auto text-sage-500 dark:text-sage-400 text-xs">✓</span>}
                  </button>
                  {!editingId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(u); }}
                      className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 text-xs p-1 rounded hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors"
                      title="Edit name"
                    >✏️</button>
                  )}
                </div>
              ))}
              <div className="border-t border-warm-200 dark:border-warm-700 mt-1.5 pt-1.5 px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-warm-400">
                  <span>{themeIcon}</span>
                  <span>{themeLabel} theme</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
