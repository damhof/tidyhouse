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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
        isMonday
          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}
    >
      📋 {isMonday ? 'Start Monday Review' : 'Review Projects'}
    </Link>
  );
}
