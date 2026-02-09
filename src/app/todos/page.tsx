import { db } from '@/db';
import { todos, users, projects, projectTasks } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { TodoList } from '@/components/TodoList';
import { AddTodoForm } from '@/components/AddTodoForm';
import { TodoCategoryFilter } from '@/components/TodoCategoryFilter';

export const dynamic = 'force-dynamic';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriority<T extends { priority?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.priority ? (PRIORITY_ORDER[a.priority] ?? 3) : 3;
    const pb = b.priority ? (PRIORITY_ORDER[b.priority] ?? 3) : 3;
    return pa - pb;
  });
}

export default async function TodosPage() {
  const userId = await getCurrentUserId();

  // Auto-purge completed todos older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  db.delete(todos).where(
    and(
      eq(todos.completed, true),
      sql`${todos.completedAt} IS NOT NULL AND ${todos.completedAt} < ${cutoff}`
    )
  ).run();

  const allTodos = db.select({
    id: todos.id,
    title: todos.title,
    notes: todos.notes,
    category: todos.category,
    dueDate: todos.dueDate,
    priority: todos.priority,
    assigneeId: todos.assigneeId,
    projectId: todos.projectId,
    completed: todos.completed,
    completedAt: todos.completedAt,
    completedBy: todos.completedBy,
    createdAt: todos.createdAt,
  }).from(todos).orderBy(desc(todos.createdAt)).all();

  const allUsers = db.select().from(users).all();
  const allProjects = db.select().from(projects).all();
  const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p]));

  // Fetch project tasks that are marked "show in todos"
  const linkedProjectTasks = db.select().from(projectTasks)
    .where(eq(projectTasks.showInTodos, true))
    .all();

  // Convert project tasks to todo-like items
  const projectTaskItems = linkedProjectTasks.map(pt => ({
    id: pt.id,
    title: pt.title,
    notes: null,
    category: null,
    dueDate: pt.dueDate,
    priority: null as string | null,
    assigneeId: pt.assigneeId,
    projectId: pt.projectId,
    completed: pt.status === 'done',
    completedAt: null,
    completedBy: null,
    createdAt: '',
    isProjectTask: true as const,
    projectTitle: projectMap[pt.projectId]?.title || 'Project',
  }));

  // Merge regular todos with project task items
  const regularTodoItems = allTodos.map(t => ({
    ...t,
    isProjectTask: false as const,
    projectTitle: t.projectId && projectMap[t.projectId] ? projectMap[t.projectId].title : undefined,
  }));

  const allItems = [...regularTodoItems, ...projectTaskItems];
  const activeTodos = sortByPriority(allItems.filter(t => !t.completed));
  const completedTodos = allItems.filter(t => t.completed);

  // Gather unique categories in use (from regular todos only)
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
                <TodoList todos={completedTodos} users={allUsers} projects={allProjects} label="Done" defaultCollapsed />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
