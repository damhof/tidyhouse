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
          className="inline-flex items-center justify-center min-h-[32px] px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Yes</button>
        <button onClick={() => setConfirming(false)}
          className="inline-flex items-center justify-center min-h-[32px] px-3 py-1.5 text-xs bg-warm-100 dark:bg-warm-700 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors">No</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-warm-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      title="Delete project">
      🗑
    </button>
  );
}
