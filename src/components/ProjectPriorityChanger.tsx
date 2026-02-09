'use client';

import { updateProjectPriority } from '@/lib/actions';
import { useRouter } from 'next/navigation';

const priorities = [
  { value: 'low', label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high', label: '🟠 High' },
  { value: 'urgent', label: '🔴 Urgent' },
];

export function ProjectPriorityChanger({ projectId, currentPriority }: { projectId: number; currentPriority: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-warm-400 dark:text-warm-500 uppercase tracking-wider">Priority</label>
      <select value={currentPriority}
        onChange={async (e) => { await updateProjectPriority(projectId, e.target.value); router.refresh(); }}
        className="text-sm bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2 outline-none font-medium border border-warm-200 dark:border-warm-700 focus:border-sage-400 transition-colors">
        {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    </div>
  );
}
