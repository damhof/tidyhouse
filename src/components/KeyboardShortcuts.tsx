'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'n':
          // Navigate to add new item based on current page
          if (pathname.startsWith('/todos')) {
            // Focus the add todo button
            const addBtn = document.querySelector('[data-add-todo]') as HTMLButtonElement;
            addBtn?.click();
          } else if (pathname.startsWith('/projects') && !pathname.includes('/review')) {
            const addBtn = document.querySelector('[data-add-project]') as HTMLButtonElement;
            addBtn?.click();
          }
          break;
        case '/':
          // Could implement search in the future
          break;
        case '1':
          if (e.altKey) router.push('/chores');
          break;
        case '2':
          if (e.altKey) router.push('/todos');
          break;
        case '3':
          if (e.altKey) router.push('/projects');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, pathname]);

  return null;
}
