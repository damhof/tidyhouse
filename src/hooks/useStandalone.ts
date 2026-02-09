'use client';

import { useState, useEffect } from 'react';

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mq.matches || (navigator as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isStandalone;
}
