'use client';

import { createTodo } from '@/lib/actions';
import { TODO_CATEGORIES } from '@/lib/categories';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };

export function AddTodoForm({ users, projects }: { users: User[]; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    await createTodo(formData);
    setOpen(false);
    router.refresh();
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
    <form action={handleSubmit} className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-lg border border-warm-200 dark:border-warm-700 space-y-3 animate-fade-in">
      <input name="title" placeholder="What needs to be done?" required autoFocus
        className="w-full text-lg font-medium bg-transparent outline-none placeholder-warm-400 text-warm-800 dark:text-warm-100" />
      <textarea name="notes" placeholder="Notes (optional)" rows={2}
        className="w-full text-sm bg-transparent outline-none placeholder-warm-400 text-warm-600 dark:text-warm-300 resize-none" />
      <div className="flex flex-wrap gap-3">
        <select name="category" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none">
          <option value="">No category</option>
          {TODO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
        <select name="priority" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none">
          <option value="">No priority</option>
          <option value="low">🔵 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
        </select>
        <input name="dueDate" type="date" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none" />
        <select name="assigneeId" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none">
          <option value="">Anyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.avatarEmoji} {u.name}</option>)}
        </select>
        {projects.length > 0 && (
          <select name="projectId" className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors">Cancel</button>
        <button type="submit"
          className="px-4 py-2 text-sm bg-sage-500 hover:bg-sage-600 text-white rounded-xl transition-colors font-medium">Add</button>
      </div>
    </form>
  );
}
