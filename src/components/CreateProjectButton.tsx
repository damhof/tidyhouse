'use client';

import { createProject } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const id = await createProject(formData);
    setOpen(false);
    router.push(`/projects/${id}`);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center min-h-[44px] px-4 bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-medium text-sm transition-all duration-200 active:scale-95">
        + New Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <form action={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-warm-900 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in border border-warm-200 dark:border-warm-800">
            <h2 className="text-xl font-bold text-warm-900 dark:text-warm-100">New Project</h2>
            <input name="title" placeholder="Project title" required autoFocus
              className="w-full text-lg font-medium bg-transparent outline-none border-b border-warm-200 dark:border-warm-700 pb-2 placeholder-warm-400 focus:border-sage-400 transition-colors" />
            <textarea name="description" placeholder="Description (optional)" rows={3}
              className="w-full text-sm bg-transparent outline-none placeholder-warm-400 resize-none" />
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-warm-500 dark:text-warm-400">Priority</label>
                <select name="priority" defaultValue="medium" className="text-sm bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400">
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-warm-500 dark:text-warm-400">Target Date</label>
                <input name="targetDate" type="date" className="text-sm bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2.5 outline-none min-h-[42px] focus:ring-2 focus:ring-sage-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setOpen(false)}
                className="px-5 py-2.5 text-sm rounded-xl text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors font-medium min-h-[44px]">
                Cancel
              </button>
              <button type="submit"
                className="px-5 py-2.5 text-sm bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-medium transition-colors min-h-[44px]">
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
