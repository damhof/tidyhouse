'use client';

import { useEffect, useRef } from 'react';

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

  // Ensure menu stays on screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - items.length * 44 - 16),
    zIndex: 100,
  };

  return (
    <div ref={ref} style={style}
      className="bg-white dark:bg-warm-800 rounded-xl shadow-xl border border-warm-200 dark:border-warm-700 py-1.5 min-w-[180px] animate-fade-in">
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors active:scale-97 ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-700'
          }`}>
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
