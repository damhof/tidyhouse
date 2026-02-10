'use client';

import { createTodo, setTodoTags } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };
type Tag = { id: number; name: string; color: string };

export function AddTodoForm({ users, projects, tags = [] }: { users: User[]; projects: Project[]; tags?: Tag[] }) {
  const [open, setOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      const todoId = await createTodo(formData);
      if (selectedTagIds.length > 0 && todoId) {
        await setTodoTags(todoId, selectedTagIds);
      }
      setSelectedTagIds([]);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full p-4 rounded-2xl border-2 border-dashed border-warm-300 dark:border-warm-700 text-warm-500 dark:text-warm-400 hover:border-sage-400 hover:text-sage-600 dark:hover:text-sage-400 hover:bg-sage-50/50 dark:hover:bg-sage-900/10 transition-all text-sm font-medium">
        + Add a to-do
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-lg border border-warm-200 dark:border-warm-700 space-y-4 animate-fade-in" aria-label="Add new to-do">
      <label className="sr-only" htmlFor="todo-title">To-do title</label>
      <input id="todo-title" name="title" placeholder="What needs to be done?" required autoFocus
        className="w-full text-lg font-medium bg-transparent outline-none placeholder-warm-400 text-warm-800 dark:text-warm-100 py-1" />
      <label className="sr-only" htmlFor="todo-notes">Notes</label>
      <textarea id="todo-notes" name="notes" placeholder="Notes (optional)" rows={2}
        className="w-full text-sm bg-transparent outline-none placeholder-warm-400 text-warm-600 dark:text-warm-300 resize-none py-1" />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="todo-priority">Priority</label>
        <select id="todo-priority" name="priority" aria-label="Priority" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400">
          <option value="">No priority</option>
          <option value="low">🔵 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
        </select>
        <label className="sr-only" htmlFor="todo-due-date">Due date</label>
        <input id="todo-due-date" name="dueDate" type="date" aria-label="Due date" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400" />
        <label className="sr-only" htmlFor="todo-assignee">Assignee</label>
        <select id="todo-assignee" name="assigneeId" aria-label="Assignee" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400">
          <option value="">Anyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.avatarEmoji} {u.name}</option>)}
        </select>
        {projects.length > 0 && (
          <>
            <label className="sr-only" htmlFor="todo-project">Project</label>
            <select id="todo-project" name="projectId" aria-label="Project" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </>
        )}
      </div>
      {tags.length > 0 && (
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="text-xs text-warm-400 self-center mr-1">Tags:</legend>
          {tags.map(tag => (
            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
              aria-pressed={selectedTagIds.includes(tag.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                selectedTagIds.includes(tag.id) ? 'text-white ring-2 ring-offset-1 ring-warm-400' : 'text-white/70 opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: tag.color }}>
              {tag.name}
            </button>
          ))}
        </fieldset>
      )}
      <div className="flex items-center gap-3 justify-end pt-2">
        <button type="button" onClick={() => { setOpen(false); setSelectedTagIds([]); }} disabled={saving}
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-sm rounded-xl text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors font-medium disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-sm bg-sage-500 hover:bg-sage-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50">
          {saving ? 'Adding...' : 'Add To-Do'}
        </button>
      </div>
    </form>
  );
}
