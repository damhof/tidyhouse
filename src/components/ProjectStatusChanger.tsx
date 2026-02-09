'use client';

import { updateProjectStatus } from '@/lib/actions';
import { useRouter } from 'next/navigation';

const statuses = [
  { value: 'backlog', label: '📥 Backlog' },
  { value: 'active', label: '🔵 Active' },
  { value: 'waiting', label: '⏳ Waiting' },
  { value: 'done', label: '✅ Done' },
];

export function ProjectStatusChanger({ projectId, currentStatus }: { projectId: number; currentStatus: string }) {
  const router = useRouter();
  return (
    <select value={currentStatus}
      onChange={async (e) => { await updateProjectStatus(projectId, e.target.value); router.refresh(); }}
      className="text-sm bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2 outline-none font-medium border border-warm-200 dark:border-warm-700 focus:border-sage-400 transition-colors">
      {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}
