'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type MenuItem = {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
};

export function ContextMenu({ items, position, onClose }: {
  items: MenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(i => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(i => (i - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[focusedIndex]?.onClick();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        onClose();
        break;
    }
  }, [items, focusedIndex, onClose]);

  // Focus management
  useEffect(() => {
    ref.current?.focus();
  }, []);

  // Focus the correct menu item when index changes
  useEffect(() => {
    const buttons = ref.current?.querySelectorAll('button');
    (buttons?.[focusedIndex] as HTMLButtonElement)?.focus();
  }, [focusedIndex]);

  // Ensure menu stays on screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - items.length * 44 - 16),
    zIndex: 100,
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={style}
      className="bg-white dark:bg-warm-800 rounded-xl shadow-xl border border-warm-200 dark:border-warm-700 py-1.5 min-w-[180px] animate-fade-in outline-none"
    >
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          tabIndex={focusedIndex === i ? 0 : -1}
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors active:scale-97 ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20'
              : 'text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-700 focus:bg-warm-100 dark:focus:bg-warm-700'
          } outline-none focus:ring-2 focus:ring-inset focus:ring-sage-400`}
        >
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
