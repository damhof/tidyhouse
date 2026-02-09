'use client';

import { deleteProjectNote, updateProjectNote } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './TiptapEditor';

type Note = { id: number; contentMd: string; contentHtml: string | null; createdAt: string; updatedAt: string | null; createdBy: number | null };
type User = { id: number; name: string; avatarEmoji: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ProjectNoteList({ notes, userMap }: { notes: Note[]; userMap: Record<number, User> }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const saveEdit = async (html: string) => {
    if (editingId === null) return;
    await updateProjectNote(editingId, html);
    setEditingId(null);
    router.refresh();
  };

  const handleDelete = async (noteId: number) => {
    setDeletingId(noteId);
    setConfirmDeleteId(null);
    await deleteProjectNote(noteId);
    setDeletingId(null);
    router.refresh();
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-400">
        <p className="text-3xl mb-2">📝</p>
        <p className="text-sm">No notes yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map(note => {
        const isEditing = editingId === note.id;
        const isDeleting = deletingId === note.id;
        const isConfirmingDelete = confirmDeleteId === note.id;
        const user = note.createdBy ? userMap[note.createdBy] : null;
        const displayHtml = note.contentHtml || note.contentMd;

        return (
          <div key={note.id}
            className={`bg-neutral-50 dark:bg-neutral-800/50 rounded-xl overflow-hidden group border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all ${isDeleting ? 'opacity-30 scale-95' : ''}`}>
            {isEditing ? (
              <TiptapEditor
                content={displayHtml}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                {/* Note header */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  {user && (
                    <span className="text-lg" title={user.name}>{user.avatarEmoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {user?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-neutral-400 ml-2" title={formatDate(note.createdAt)}>
                      {timeAgo(note.createdAt)}
                    </span>
                    {note.updatedAt && (
                      <span className="text-xs text-neutral-400 ml-1" title={formatDate(note.updatedAt)}>
                        (edited)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(note.id); }}
                      className="text-xs px-2 py-1 rounded-lg text-neutral-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                      Edit
                    </button>
                    {isConfirmingDelete ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(note.id)}
                          className="text-xs px-2 py-1 rounded-lg text-red-600 bg-red-50 dark:bg-red-900/30 font-medium">
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(note.id)}
                        className="text-xs px-2 py-1 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Note content */}
                <div className="px-4 pb-3 prose prose-sm dark:prose-invert max-w-none [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li_label]:mt-0.5"
                  dangerouslySetInnerHTML={{ __html: displayHtml }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
