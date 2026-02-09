'use client';

import { addProjectNote } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './TiptapEditor';

export function AddNoteForm({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSave = async (html: string) => {
    await addProjectNote(projectId, html);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full p-3 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-sm font-medium">
        + Add note
      </button>
    );
  }

  return (
    <TiptapEditor
      onSave={handleSave}
      onCancel={() => setOpen(false)}
      placeholder="Write a note..."
    />
  );
}
