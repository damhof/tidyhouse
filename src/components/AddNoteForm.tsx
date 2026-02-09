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
        className="w-full p-3 rounded-xl border-2 border-dashed border-warm-300 dark:border-warm-700 text-warm-500 dark:text-warm-400 hover:border-sage-400 hover:text-sage-600 dark:hover:text-sage-400 hover:bg-sage-50/50 dark:hover:bg-sage-900/10 transition-all text-sm font-medium">
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
