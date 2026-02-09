'use client';

import { addProjectTask } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddTaskForm({ projectId }: { projectId: number }) {
  const [title, setTitle] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addProjectTask(projectId, title.trim());
    setTitle('');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a task..."
        className="flex-1 text-sm bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2 outline-none placeholder-warm-400 border border-transparent focus:border-sage-400 transition-colors" />
      <button type="submit" disabled={!title.trim()}
        className="px-3 py-2 text-sm bg-sage-500 hover:bg-sage-600 disabled:opacity-30 text-white rounded-xl font-medium transition-all duration-200 active:scale-95">Add</button>
    </form>
  );
}
