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

  if (!mounted) return null;

  return (
    <Link
      href="/projects/review"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors min-h-[44px] whitespace-nowrap flex-shrink-0 ${
        isMonday
          ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm'
          : 'bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'
      }`}
    >
      📋 {isMonday ? 'Start Monday Review' : 'Review Projects'}
    </Link>
  );
}
