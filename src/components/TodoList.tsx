'use client';

import { completeTodo, uncompleteTodo, deleteTodo } from '@/lib/actions';
import { getCategoryConfig } from '@/lib/categories';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Todo = {
  id: number; title: string; notes: string | null; category: string | null;
  dueDate: string | null; assigneeId: number | null; projectId: number | null;
  completed: boolean | null; completedAt: string | null; completedBy: number | null;
  createdAt: string;
};
type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };

export function TodoList({ todos, users, projects, label, defaultCollapsed = false }: {
  todos: Todo[]; users: User[]; projects: Project[]; label: string; defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const router = useRouter();
  const [completing, setCompleting] = useState<number | null>(null);

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
        <span className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        {label} ({todos.length})
      </button>
      {!collapsed && (
        <div className="space-y-2 animate-fade-in">
          {todos.length === 0 && (
            <div className="text-center py-10 text-neutral-400">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium">All done! Nothing here.</p>
              <p className="text-sm mt-1">Time for a break ☕</p>
            </div>
          )}
          {todos.map(todo => {
            const cat = getCategoryConfig(todo.category);
            const isCompleting = completing === todo.id;
            return (
              <div key={todo.id}
                className={`flex items-start gap-3 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${isCompleting ? 'scale-95 opacity-50' : ''}`}>
                <button
                  onClick={async () => {
                    setCompleting(todo.id);
                    if (todo.completed) await uncompleteTodo(todo.id);
                    else await completeTodo(todo.id);
                    setTimeout(() => { setCompleting(null); router.refresh(); }, 300);
                  }}
                  className={`w-6 h-6 mt-0.5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}>
                  {todo.completed && <span className="text-xs animate-checkmark">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${todo.completed ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{todo.title}</p>
                    {cat && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                  </div>
                  {todo.notes && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{todo.notes}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {todo.dueDate && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        new Date(todo.dueDate) < new Date() && !todo.completed
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}>📅 {todo.dueDate}</span>
                    )}
                    {todo.assigneeId && userMap[todo.assigneeId] && (
                      <span className="text-xs">{userMap[todo.assigneeId].avatarEmoji}</span>
                    )}
                    {todo.projectId && projectMap[todo.projectId] && (
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        📋 {projectMap[todo.projectId].title}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={async () => { await deleteTodo(todo.id); router.refresh(); }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all text-sm min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
