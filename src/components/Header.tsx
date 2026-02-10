'use client';

import { useTheme } from './ThemeProvider';
import { switchUser, updateUserName } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { BottomSheet, BottomSheetItem } from './BottomSheet';

type UserInfo = { id: number; name: string; avatarEmoji: string };

export function Header({ userName, userEmoji, userId, allUsers }: {
  userName: string | null; userEmoji: string | null; userId: number | null; allUsers: UserInfo[];
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive detection
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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
    setShowSheet(false);
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

  const handleMenuClick = () => {
    if (isDesktop) {
      setShowMenu(!showMenu);
    } else {
      setShowSheet(true);
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
          aria-label="Settings">
          <span aria-hidden="true">⚙️</span>
        </Link>

        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200"
          aria-label={`Change theme, current: ${themeLabel}`}>
          <span aria-hidden="true">{themeIcon}</span>
        </button>

        {/* User switcher */}
        <div className="relative" ref={menuRef}>
          <button onClick={handleMenuClick}
            className="min-h-[44px] flex items-center gap-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800 transition-all duration-200 px-3">
            <span className="text-xl">{userEmoji || '👤'}</span>
            <span className="hidden sm:inline text-sm font-medium text-warm-600 dark:text-warm-300">{userName || 'Choose'}</span>
          </button>

          {/* Desktop dropdown */}
          {showMenu && isDesktop && (
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

      {/* Mobile bottom sheet for user switching */}
      <BottomSheet isOpen={showSheet} onClose={() => { setShowSheet(false); setEditingId(null); }} title="Switch User">
        <div className="pb-2">
          {allUsers.map(u => (
            <div key={u.id} className={`rounded-xl mb-1 ${userId === u.id ? 'bg-sage-50 dark:bg-sage-900/20' : ''}`}>
              {editingId === u.id ? (
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{u.avatarEmoji}</span>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      placeholder="Enter name..."
                      autoFocus
                      className="flex-1 text-base font-medium bg-white dark:bg-warm-900 border border-warm-300 dark:border-warm-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1 text-sm py-2 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700">
                      Cancel
                    </button>
                    <button onClick={saveEdit} className="flex-1 text-sm py-2 rounded-lg bg-sage-500 text-white font-medium hover:bg-sage-600">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => handleSwitch(u.id)}
                    className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors min-h-[56px]"
                  >
                    <span className="text-2xl">{u.avatarEmoji}</span>
                    <span className="font-medium text-base text-warm-800 dark:text-warm-100">{u.name}</span>
                    {userId === u.id && (
                      <span className="ml-auto text-sage-500 dark:text-sage-400 text-sm font-medium">Active ✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(u)}
                    className="min-w-[48px] min-h-[48px] flex items-center justify-center text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors mr-2"
                    title="Edit name"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {/* Theme info */}
          <div className="border-t border-warm-200 dark:border-warm-700 mt-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-warm-500">
                <span>{themeIcon}</span>
                <span>{themeLabel} theme</span>
              </div>
              <button 
                onClick={() => { setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors"
              >
                Change
              </button>
            </div>
          </div>

          {/* Cancel button */}
          <div className="mt-3">
            <BottomSheetItem icon="✕" label="Close" onClick={() => setShowSheet(false)} />
          </div>
        </div>
      </BottomSheet>
    </header>
  );
}
