import { db } from '@/db';
import { chores, choreCompletions, rooms, todos, users } from '@/db/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { CalendarClient } from './CalendarClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  // Get date range: current month ± 1 month for navigation
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  // Fetch chore completions in range
  const completions = db.select({
    id: choreCompletions.id,
    choreId: choreCompletions.choreId,
    userId: choreCompletions.userId,
    completedAt: choreCompletions.completedAt,
    choreName: chores.name,
    roomName: rooms.name,
    roomIcon: rooms.icon,
    effort: chores.effort,
  })
    .from(choreCompletions)
    .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
    .innerJoin(rooms, eq(chores.roomId, rooms.id))
    .where(and(gte(choreCompletions.completedAt, startStr), lte(choreCompletions.completedAt, endStr)))
    .orderBy(desc(choreCompletions.completedAt))
    .all();

  // Fetch chores with pinned days
  const pinnedChores = db.select({
    id: chores.id,
    name: chores.name,
    pinnedDays: chores.pinnedDays,
    roomName: rooms.name,
    roomIcon: rooms.icon,
    effort: chores.effort,
  })
    .from(chores)
    .innerJoin(rooms, eq(chores.roomId, rooms.id))
    .all()
    .filter(c => c.pinnedDays);

  // Fetch todos with due dates in range
  const dueTodos = db.select({
    id: todos.id,
    title: todos.title,
    dueDate: todos.dueDate,
    completed: todos.completed,
    priority: todos.priority,
    assigneeId: todos.assigneeId,
  })
    .from(todos)
    .all()
    .filter(t => t.dueDate);

  const allUsers = db.select().from(users).all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">📅 Calendar</h1>
      <CalendarClient
        completions={completions}
        pinnedChores={pinnedChores}
        dueTodos={dueTodos}
        users={allUsers}
      />
    </div>
  );
}
