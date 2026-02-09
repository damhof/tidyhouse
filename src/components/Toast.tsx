'use client';

import { useState, useEffect, useCallback } from 'react';

export type ToastData = {
  id: string;
  message: string;
  onUndo?: () => void;
};

let toastListener: ((toast: ToastData) => void) | null = null;

export function showToast(toast: ToastData) {
  toastListener?.(toast);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastData & { exiting?: boolean })[]>([]);

  useEffect(() => {
    toastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => t.id === toast.id ? { ...t, exiting: true } : t));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 300);
      }, 5000);
    };
    return () => { toastListener = null; };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none lg:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 bg-warm-700 dark:bg-warm-100 text-white dark:text-warm-900 px-4 py-3 rounded-xl shadow-lg max-w-sm w-full transition-all duration-300 ${
            toast.exiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
          style={{ animation: toast.exiting ? undefined : 'slideUp 0.3s ease-out' }}
        >
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => { toast.onUndo?.(); dismiss(toast.id); }}
              className="text-sage-400 dark:text-sage-600 font-semibold text-sm hover:text-sage-300 dark:hover:text-sage-700 transition-colors"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            className="text-warm-400 dark:text-warm-500 hover:text-warm-200 dark:hover:text-warm-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
