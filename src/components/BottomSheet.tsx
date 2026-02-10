'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [translateY, setTranslateY] = useState(100);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTranslateY(0));
      });
    } else {
      setTranslateY(100);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) {
      dragCurrentY.current = dy;
      setTranslateY(dy);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragCurrentY.current > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!mounted || !visible) return null;

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  const content = isDesktop ? (
    // Desktop: centered modal
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: translateY === 0 ? 1 : 0 }} />
      <div
        onClick={e => e.stopPropagation()}
        className="relative bg-white dark:bg-warm-800 rounded-2xl shadow-2xl border border-warm-200 dark:border-warm-700 w-full max-w-md mx-4 overflow-hidden transition-all duration-300"
        style={{ transform: `scale(${translateY === 0 ? 1 : 0.95})`, opacity: translateY === 0 ? 1 : 0 }}
      >
        {title && (
          <div className="px-6 pt-5 pb-3 border-b border-warm-100 dark:border-warm-700">
            <h3 className="text-lg font-semibold text-warm-800 dark:text-warm-100">{title}</h3>
          </div>
        )}
        <div className="p-2 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  ) : (
    // Mobile: bottom sheet
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: translateY === 0 ? 1 : 0 }} />
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-warm-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] overflow-hidden"
        style={{ transform: `translateY(${typeof translateY === 'number' && translateY <= 100 ? translateY : 100}px)` }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-warm-300 dark:bg-warm-600 rounded-full" />
        </div>
        {title && (
          <div className="px-5 pb-3 pt-1">
            <h3 className="text-lg font-semibold text-warm-800 dark:text-warm-100">{title}</h3>
          </div>
        )}
        <div className="px-2 pb-safe max-h-[70vh] overflow-y-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

type BottomSheetItemProps = {
  icon?: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  description?: string;
};

export function BottomSheetItem({ icon, label, onClick, danger, description }: BottomSheetItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 rounded-xl transition-colors active:scale-[0.98] min-h-[48px] ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30'
          : 'text-warm-700 dark:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-700 active:bg-warm-200 dark:active:bg-warm-600'
      }`}
    >
      {icon && <span className="text-xl flex-shrink-0 w-7 text-center">{icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-warm-400 mt-0.5">{description}</p>}
      </div>
    </button>
  );
}
