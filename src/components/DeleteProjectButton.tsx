'use client';

import { deleteProject } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteProjectButton({ projectId, projectTitle }: { projectId: number; projectTitle: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <span className="text-xs text-red-500">Delete?</span>
        <button onClick={async () => { await deleteProject(projectId); router.push('/projects'); }}
          className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Yes</button>
        <button onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">No</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      title="Delete project">
      🗑
    </button>
  );
}
