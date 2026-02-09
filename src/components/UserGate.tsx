'use client';

import { switchUser } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export function UserGate() {
  const router = useRouter();

  const handleSelect = async (id: number) => {
    await switchUser(id);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 dark:bg-warm-950 p-4">
      <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-warm-200 dark:border-warm-800">
        <h1 className="text-4xl mb-3">🏡</h1>
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-100 mb-1 tracking-tight">TidyHouse</h2>
        <p className="text-warm-500 dark:text-warm-400 mb-8 text-sm">Who&apos;s cleaning today?</p>
        <div className="flex gap-4 justify-center">
          {[{ id: 1, name: 'User 1', emoji: '👨' }, { id: 2, name: 'User 2', emoji: '👩' }].map(u => (
            <button key={u.id} onClick={() => handleSelect(u.id)}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-warm-50 dark:bg-warm-800 hover:bg-sage-50 dark:hover:bg-sage-900/30 hover:ring-2 ring-sage-400 transition-all duration-200 min-w-[120px] active:scale-95">
              <span className="text-5xl">{u.emoji}</span>
              <span className="font-semibold text-lg">{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
