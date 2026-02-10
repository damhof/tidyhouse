'use client';

import { useCallback, useRef } from 'react';

export type LongPressEvent = {
  clientX: number;
  clientY: number;
};

type Options = {
  onLongPress: (e: LongPressEvent) => void;
  onClick?: () => void;
  threshold?: number; // ms to trigger long-press (default 500)
  moveThreshold?: number; // px movement allowed before cancel (default 20)
};

/**
 * Hook for reliable long-press detection on both mobile and desktop.
 * Uses Pointer Events API for cross-platform compatibility.
 * Returns handlers to spread onto the target element.
 */
export function useLongPress(options: Options) {
  const {
    onLongPress,
    onClick,
    threshold = 500,
    moveThreshold = 20,
  } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const isPressingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary pointer (left mouse or first touch)
    if (!e.isPrimary) return;
    
    // Ignore if clicking on the complete button
    const target = e.target as HTMLElement;
    if (target.closest('[data-complete-btn]')) return;

    startPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTriggeredRef.current = false;
    isPressingRef.current = true;

    timerRef.current = setTimeout(() => {
      if (isPressingRef.current && startPosRef.current) {
        longPressTriggeredRef.current = true;
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
        onLongPress({ clientX: e.clientX, clientY: e.clientY });
      }
    }, threshold);
  }, [onLongPress, threshold]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || !startPosRef.current || !isPressingRef.current) return;

    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);

    // Cancel if moved beyond threshold
    if (dx > moveThreshold || dy > moveThreshold) {
      clearTimer();
      isPressingRef.current = false;
    }
  }, [clearTimer, moveThreshold]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    
    clearTimer();
    isPressingRef.current = false;

    // If long-press was triggered, don't fire click
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      // Reset after a short delay to prevent subsequent clicks
      setTimeout(() => {
        longPressTriggeredRef.current = false;
      }, 100);
      return;
    }

    // Fire click if we had a valid short press
    if (onClick && startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx < moveThreshold && dy < moveThreshold) {
        onClick();
      }
    }

    startPosRef.current = null;
  }, [clearTimer, onClick, moveThreshold]);

  const handlePointerCancel = useCallback(() => {
    clearTimer();
    isPressingRef.current = false;
    startPosRef.current = null;
    longPressTriggeredRef.current = false;
  }, [clearTimer]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Right-click also triggers long-press on desktop
    if (!longPressTriggeredRef.current) {
      onLongPress({ clientX: e.clientX, clientY: e.clientY });
    }
  }, [onLongPress]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerCancel,
    onContextMenu: handleContextMenu,
  };
}
