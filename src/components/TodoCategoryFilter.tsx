'use client';

import { useState } from 'react';
import { getCategoryConfig, TODO_CATEGORIES } from '@/lib/categories';
import { TodoList } from './TodoList';

type Todo = {
  id: number; title: string; notes: string | null; category: string | null;
  dueDate: string | null; assigneeId: number | null; projectId: number | null;
  completed: boolean | null; completedAt: string | null; completedBy: number | null;
  createdAt: string;
};
type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };

export function TodoCategoryFilter({
  categories, activeTodos, completedTodos, users, projects,
}: {
  categories: string[];
  activeTodos: Todo[];
  completedTodos: Todo[];
  users: User[];
  projects: Project[];
}) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? activeTodos.filter(t => t.category === filter)
    : activeTodos;
  const filteredCompleted = filter
    ? completedTodos.filter(t => t.category === filter)
    : completedTodos;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            filter === null
              ? 'bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          All ({activeTodos.length})
        </button>
        {TODO_CATEGORIES.filter(c => categories.includes(c.value)).map(cat => {
          const count = activeTodos.filter(t => t.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter(filter === cat.value ? null : cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filter === cat.value
                  ? 'bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : `${cat.color} hover:opacity-80`
              }`}
            >
              {cat.emoji} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <TodoList todos={filtered} users={users} projects={projects} label="Active" />
      {filteredCompleted.length > 0 && (
        <TodoList todos={filteredCompleted} users={users} projects={projects} label="Completed" defaultCollapsed />
      )}
    </>
  );
}
