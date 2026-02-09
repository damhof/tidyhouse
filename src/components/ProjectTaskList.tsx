'use client';

import { toggleProjectTask, deleteProjectTask, toggleProjectTaskShowInTodos } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Task = { id: number; title: string; status: string; assigneeId: number | null; dueDate: string | null; showInTodos: boolean };

export function ProjectTaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [completing, setCompleting] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      {tasks.map(task => (
        <div key={task.id}
          className={`flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-700/50 transition-all group ${completing === task.id ? 'scale-95 opacity-50' : ''}`}>
          <button
            onClick={async () => {
              setCompleting(task.id);
              await toggleProjectTask(task.id);
              setTimeout(() => { setCompleting(null); router.refresh(); }, 200);
            }}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              task.status === 'done'
                ? 'bg-sage-500 border-sage-500 text-white'
                : 'border-warm-300 dark:border-warm-500 hover:border-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/20'
            }`}>
            {task.status === 'done' && <span className="text-xs">✓</span>}
          </button>
          <span className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-warm-400' : 'text-warm-800 dark:text-warm-100'}`}>
            {task.title}
          </span>
          <button
            onClick={async () => {
              await toggleProjectTaskShowInTodos(task.id);
              router.refresh();
            }}
            className={`text-xs px-2 py-1 rounded-lg transition-all flex-shrink-0 ${
              task.showInTodos
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                : 'opacity-0 group-hover:opacity-100 bg-warm-100 dark:bg-warm-700 text-warm-400 hover:text-blue-500'
            }`}
            title={task.showInTodos ? 'Shown in To-Do\'s — click to hide' : 'Show in To-Do\'s'}
          >
            {task.showInTodos ? '✅ In To-Do\'s' : '📋 To-Do\'s'}
          </button>
          <button
            onClick={async () => {
              await deleteProjectTask(task.id);
              router.refresh();
            }}
            className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-500 transition-all w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      ))}
      {tasks.length === 0 && (
        <p className="text-sm text-warm-400 text-center py-6">No tasks yet. Add one below!</p>
      )}
    </div>
  );
}
