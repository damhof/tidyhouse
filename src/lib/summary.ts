import { db } from '@/db';
import { users, rooms, chores, choreCompletions, todos, projects, projectTasks, projectActivity } from '@/db/schema';
import { sql, gte, and, eq } from 'drizzle-orm';
import { getStaleness } from './chores';

const EFFORT_WEIGHT: Record<string, number> = { quick: 1, medium: 2, intensive: 3 };

export type WeeklySummaryData = {
  weekStart: string;
  weekEnd: string;
  totalCompletions: number;
  userStats: {
    userId: number;
    userName: string;
    userEmoji: string;
    count: number;
    effortScore: number;
  }[];
  topRooms: { name: string; icon: string; score: number }[];
  worstRooms: { name: string; icon: string; score: number }[];
  todosCreated: number;
  todosCompleted: number;
  projectUpdates: {
    projectTitle: string;
    action: string;
    details: string | null;
  }[];
  tasksCompleted: number;
  friendlyMessage: string;
};

export function getWeeklySummary(): WeeklySummaryData {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = weekAgo.toISOString();
  const weekEnd = now.toISOString();

  const allUsers = db.select().from(users).all();
  const allRooms = db.select().from(rooms).all();
  const allChores = db.select().from(chores).all();
  const choreMap = new Map(allChores.map(c => [c.id, c]));
  const roomMap = new Map(allRooms.map(r => [r.id, r]));

  // Chore completions in last 7 days
  const recentCompletions = db
    .select()
    .from(choreCompletions)
    .where(gte(choreCompletions.completedAt, weekStart))
    .all();

  const totalCompletions = recentCompletions.length;

  // Per-user stats
  const userCountMap = new Map<number, { count: number; effortScore: number }>();
  for (const comp of recentCompletions) {
    const entry = userCountMap.get(comp.userId) || { count: 0, effortScore: 0 };
    entry.count++;
    const chore = choreMap.get(comp.choreId);
    entry.effortScore += EFFORT_WEIGHT[chore?.effort || 'medium'] || 2;
    userCountMap.set(comp.userId, entry);
  }

  const userStats = allUsers.map(u => ({
    userId: u.id,
    userName: u.name,
    userEmoji: u.avatarEmoji,
    count: userCountMap.get(u.id)?.count || 0,
    effortScore: userCountMap.get(u.id)?.effortScore || 0,
  }));

  // Room scores based on current staleness
  const latestCompletions = db
    .select({
      choreId: choreCompletions.choreId,
      lastCompleted: sql<string>`MAX(${choreCompletions.completedAt})`.as('last_completed'),
    })
    .from(choreCompletions)
    .groupBy(choreCompletions.choreId)
    .all();
  const completionMap = new Map(latestCompletions.map(c => [c.choreId, c.lastCompleted]));

  const roomScores = allRooms.map(room => {
    const roomChores = allChores.filter(c => c.roomId === room.id);
    if (roomChores.length === 0) return { name: room.name, icon: room.icon, score: 100 };
    const scores = roomChores.map(c => {
      const s = getStaleness(c.frequencyDays, completionMap.get(c.id) || null);
      return Math.max(0, 1 - s.ratio);
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { name: room.name, icon: room.icon, score: Math.round(avg * 100) };
  }).sort((a, b) => b.score - a.score);

  const topRooms = roomScores.slice(0, 3);
  const worstRooms = roomScores.filter(r => r.score < 100).slice(-3).reverse();

  // Todo stats
  const todosCreated = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(gte(todos.createdAt, weekStart))
    .get()?.count || 0;

  const todosCompleted = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(gte(todos.completedAt, weekStart), eq(todos.completed, true)))
    .get()?.count || 0;

  // Project activity
  const projectUpdates = db
    .select({
      projectTitle: projects.title,
      action: projectActivity.action,
      details: projectActivity.details,
    })
    .from(projectActivity)
    .innerJoin(projects, eq(projectActivity.projectId, projects.id))
    .where(gte(projectActivity.createdAt, weekStart))
    .all();

  // Tasks completed this week
  const tasksCompleted = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(projectTasks)
    .where(eq(projectTasks.status, 'done'))
    .get()?.count || 0;

  // Friendly message
  const friendlyMessage = generateFriendlyMessage(totalCompletions, topRooms, worstRooms, todosCompleted);

  return {
    weekStart,
    weekEnd,
    totalCompletions,
    userStats,
    topRooms,
    worstRooms,
    todosCreated,
    todosCompleted,
    projectUpdates,
    tasksCompleted,
    friendlyMessage,
  };
}

function generateFriendlyMessage(
  totalChores: number,
  topRooms: { name: string; score: number }[],
  worstRooms: { name: string; score: number }[],
  todosCompleted: number,
): string {
  const parts: string[] = [];

  if (totalChores === 0) {
    parts.push('Quiet week on the chores front! Time to get back on track 💪');
  } else if (totalChores >= 20) {
    parts.push(`Amazing week! ${totalChores} chores knocked out 🎉`);
  } else if (totalChores >= 10) {
    parts.push(`Good effort! ${totalChores} chores completed this week 👍`);
  } else {
    parts.push(`${totalChores} chores done this week — every bit counts!`);
  }

  if (topRooms.length > 0 && topRooms[0].score >= 80) {
    parts.push(`The ${topRooms[0].name} stayed green all week 🥬`);
  }

  if (worstRooms.length > 0 && worstRooms[0].score < 30) {
    parts.push(`The ${worstRooms[0].name} could use some love 🧹`);
  }

  if (todosCompleted > 0) {
    parts.push(`${todosCompleted} to-do${todosCompleted === 1 ? '' : 's'} checked off ✅`);
  }

  return parts.join('. ') + (parts.length > 0 ? '' : '');
}
