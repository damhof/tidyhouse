'use client';

import { addProjectNote } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderMarkdown } from '@/lib/markdown';

export function AddNoteForm({ projectId }: { projectId: number }) {
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await addProjectNote(projectId, content.trim());
    setContent('');
    setOpen(false);
    setPreview(false);
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
    <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
      <div className="flex gap-1 text-xs mb-1">
        <button type="button" onClick={() => setPreview(false)}
          className={`px-3 py-1.5 rounded-lg transition-colors ${!preview ? 'bg-neutral-200 dark:bg-neutral-700 font-medium' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
          Write
        </button>
        <button type="button" onClick={() => setPreview(true)}
          className={`px-3 py-1.5 rounded-lg transition-colors ${preview ? 'bg-neutral-200 dark:bg-neutral-700 font-medium' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
          Preview
        </button>
      </div>
      {preview ? (
        <div className="min-h-[100px] text-sm bg-neutral-50 dark:bg-neutral-800 rounded-xl px-4 py-3 prose-sm"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '*Nothing to preview*') }} />
      ) : (
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Write a note... (markdown supported: **bold**, *italic*, - lists, # headers)"
          rows={5} autoFocus
          className="w-full text-sm bg-neutral-50 dark:bg-neutral-800 rounded-xl px-4 py-3 outline-none placeholder-neutral-400 resize-none font-mono border border-neutral-200 dark:border-neutral-700 focus:border-emerald-400 dark:focus:border-emerald-500 transition-colors" />
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => { setOpen(false); setContent(''); setPreview(false); }}
          className="px-3 py-1.5 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
        <button type="submit" disabled={!content.trim()}
          className="px-4 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-xl font-medium transition-colors">Save note</button>
      </div>
    </form>
  );
}
