'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function ReviewButton() {
  const [isMonday, setIsMonday] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMonday(new Date().getDay() === 1);
  }, []);

  // Render placeholder with same dimensions to prevent layout shift
  if (!mounted) {
    return (
      <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm min-h-[44px] min-w-[140px] bg-warm-100 dark:bg-warm-700 opacity-0" />
    );
  }

  return (
    <Link
      href="/projects/review"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] whitespace-nowrap flex-shrink-0 active:scale-[0.98] ${
        isMonday
          ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-md hover:shadow-lg ring-2 ring-sage-400/30'
          : 'bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'
      }`}
    >
      📋 {isMonday ? 'Monday Review' : 'Review'}
    </Link>
  );
}
