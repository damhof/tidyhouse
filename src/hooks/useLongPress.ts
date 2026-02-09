'use client';

import { useRef, useCallback } from 'react';

type LongPressOptions = {
  onLongPress: () => void;
  onPress?: () => void;
  threshold?: number;
  moveThreshold?: number;
};

export function useLongPress({
  onLongPress,
  onPress,
  threshold = 500,
  moveThreshold = 10,
}: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    timerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      clear();
    }
  }, [clear, moveThreshold]);

  const onTouchEnd = useCallback(() => {
    clear();
    if (!longPressTriggered.current && onPress) {
      onPress();
    }
    startPos.current = null;
  }, [clear, onPress]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: () => { clear(); startPos.current = null; },
  };
}
