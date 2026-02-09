import { db } from '@/db';
import { todos, users, projects, projectTasks, tags, todoTags } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { TodoList } from '@/components/TodoList';
import { AddTodoForm } from '@/components/AddTodoForm';
import { TodoSortFilter } from '@/components/TodoSortFilter';

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
  const allTags = db.select().from(tags).all();
  const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p]));

  // Fetch all todo-tag associations
  const allTodoTags = db.select({
    todoId: todoTags.todoId,
    tagId: tags.id,
    tagName: tags.name,
    tagColor: tags.color,
  }).from(todoTags).innerJoin(tags, eq(todoTags.tagId, tags.id)).all();

  const todoTagMap: Record<number, { id: number; name: string; color: string }[]> = {};
  for (const tt of allTodoTags) {
    if (!todoTagMap[tt.todoId]) todoTagMap[tt.todoId] = [];
    todoTagMap[tt.todoId].push({ id: tt.tagId, name: tt.tagName, color: tt.tagColor });
  }

  // Fetch project tasks that are marked "show in todos"
  const linkedProjectTasks = db.select().from(projectTasks)
    .where(eq(projectTasks.showInTodos, true))
    .all();

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
    tags: [] as { id: number; name: string; color: string }[],
  }));

  const regularTodoItems = allTodos.map(t => ({
    ...t,
    isProjectTask: false as const,
    projectTitle: t.projectId && projectMap[t.projectId] ? projectMap[t.projectId].title : undefined,
    tags: todoTagMap[t.id] || [],
  }));

  const allItems = [...regularTodoItems, ...projectTaskItems];
  const activeTodos = sortByPriority(allItems.filter(t => !t.completed));
  const completedTodos = allItems.filter(t => t.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">To-Do&apos;s</h1>
      </div>

      <AddTodoForm users={allUsers} projects={allProjects} tags={allTags} />

      <TodoSortFilter
        activeTodos={activeTodos}
        completedTodos={completedTodos}
        users={allUsers}
        projects={allProjects}
        allTags={allTags}
      />
    </div>
  );
}
