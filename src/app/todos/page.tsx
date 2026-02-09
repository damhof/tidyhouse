import { db } from '@/db';
import { todos, users, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { TodoList } from '@/components/TodoList';
import { AddTodoForm } from '@/components/AddTodoForm';
import { TodoCategoryFilter } from '@/components/TodoCategoryFilter';

export const dynamic = 'force-dynamic';

export default async function TodosPage() {
  const userId = await getCurrentUserId();
  const allTodos = db.select({
    id: todos.id,
    title: todos.title,
    notes: todos.notes,
    category: todos.category,
    dueDate: todos.dueDate,
    assigneeId: todos.assigneeId,
    projectId: todos.projectId,
    completed: todos.completed,
    completedAt: todos.completedAt,
    completedBy: todos.completedBy,
    createdAt: todos.createdAt,
  }).from(todos).orderBy(desc(todos.createdAt)).all();

  const allUsers = db.select().from(users).all();
  const allProjects = db.select().from(projects).all();

  const activeTodos = allTodos.filter(t => !t.completed);
  const completedTodos = allTodos.filter(t => t.completed);

  // Gather unique categories in use
  const usedCategories = [...new Set(allTodos.map(t => t.category).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">To-Do&apos;s</h1>
      </div>

      <AddTodoForm users={allUsers} projects={allProjects} />

      {usedCategories.length > 0 && (
        <TodoCategoryFilter
          categories={usedCategories}
          activeTodos={activeTodos}
          completedTodos={completedTodos}
          users={allUsers}
          projects={allProjects}
        />
      )}

      {usedCategories.length === 0 && (
        <>
          {activeTodos.length === 0 && completedTodos.length === 0 && (
            <div className="text-center py-16 text-neutral-400">
              <p className="text-5xl mb-4">📝</p>
              <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-300">No to-do&apos;s yet</p>
              <p className="text-sm mt-1">Add your first task above to get started!</p>
            </div>
          )}
          {(activeTodos.length > 0 || completedTodos.length > 0) && (
            <>
              <TodoList todos={activeTodos} users={allUsers} projects={allProjects} label="Active" />
              {completedTodos.length > 0 && (
                <TodoList todos={completedTodos} users={allUsers} projects={allProjects} label="Completed" defaultCollapsed />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
