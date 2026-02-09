'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/chores', label: 'Chores', icon: '🧹' },
  { href: '/todos', label: 'To-Do\'s', icon: '✅' },
  { href: '/projects', label: 'Projects', icon: '📋' },
  { href: '/history', label: 'History', icon: '📊' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-warm-900/90 backdrop-blur-lg border-t border-warm-200 dark:border-warm-800 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] rounded-2xl px-3 py-1 transition-all duration-200 ${
                active
                  ? 'text-sage-700 dark:text-sage-300 bg-sage-100/80 dark:bg-sage-900/30'
                  : 'text-warm-400 dark:text-warm-500 hover:text-warm-600 dark:hover:text-warm-300'
              }`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideRail() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-20 lg:w-56 h-screen fixed left-0 top-0 bg-white dark:bg-warm-900 border-r border-warm-200 dark:border-warm-800 py-6 px-2 lg:px-4">
      <div className="text-center lg:text-left mb-8 px-2">
        <h1 className="text-xl font-bold text-sage-700 dark:text-sage-400 hidden lg:block tracking-tight">🏡 TidyHouse</h1>
        <span className="text-2xl lg:hidden">🏡</span>
      </div>
      <div className="flex flex-col gap-1">
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[48px] ${
                active
                  ? 'bg-sage-100/80 dark:bg-sage-900/30 text-sage-800 dark:text-sage-300 font-medium'
                  : 'text-warm-500 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200'
              }`}>
              <span className="text-xl">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
