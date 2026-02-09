'use client';

import { useEffect } from 'react';

export function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60000);
      }).catch(() => {});
    }
  }, []);
  return null;
}
