import { db } from '@/db';
import { chores, choreCompletions, rooms } from '@/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export type StalenessLevel = 'green' | 'yellow' | 'orange' | 'red';

export function getStaleness(frequencyDays: number, lastCompleted: string | null): { level: StalenessLevel; ratio: number } {
  if (!lastCompleted) return { level: 'red', ratio: 2 };
  const elapsed = (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24);
  const ratio = elapsed / frequencyDays;
  if (ratio <= 0.5) return { level: 'green', ratio };
  if (ratio <= 0.8) return { level: 'yellow', ratio };
  if (ratio <= 1.0) return { level: 'orange', ratio };
  return { level: 'red', ratio };
}

export function stalenessColor(level: StalenessLevel) {
  const map = { green: '#22C55E', yellow: '#EAB308', orange: '#F97316', red: '#EF4444' };
  return map[level];
}

export function getRoomScore(choresStaleness: { ratio: number }[]): number {
  if (choresStaleness.length === 0) return 100;
  const avg = choresStaleness.reduce((sum, c) => sum + Math.max(0, 1 - c.ratio), 0) / choresStaleness.length;
  return Math.round(avg * 100);
}

export async function getRoomsWithScores() {
  const allRooms = db.select().from(rooms).orderBy(rooms.sortOrder).all();
  const allChores = db.select().from(chores).all();

  // Get latest completion for each chore
  const latestCompletions = db
    .select({
      choreId: choreCompletions.choreId,
      lastCompleted: sql<string>`MAX(${choreCompletions.completedAt})`.as('last_completed'),
      lastUserId: sql<number>`(SELECT user_id FROM chore_completions c2 WHERE c2.chore_id = ${choreCompletions.choreId} ORDER BY completed_at DESC LIMIT 1)`.as('last_user_id'),
    })
    .from(choreCompletions)
    .groupBy(choreCompletions.choreId)
    .all();

  const completionMap = Object.fromEntries(latestCompletions.map(c => [c.choreId, c]));

  return allRooms.map(room => {
    const roomChores = allChores.filter(c => c.roomId === room.id);
    const choresWithStaleness = roomChores.map(chore => {
      const completion = completionMap[chore.id];
      const staleness = getStaleness(chore.frequencyDays, completion?.lastCompleted || null);
      return { ...chore, ...staleness, lastCompleted: completion?.lastCompleted || null, lastUserId: completion?.lastUserId || null };
    });
    const score = getRoomScore(choresWithStaleness);
    return { ...room, chores: choresWithStaleness, score };
  }).sort((a, b) => a.score - b.score);
}

export async function getSmartSuggestion() {
  const roomsData = await getRoomsWithScores();
  let bestChore = null;
  let bestScore = -1;

  for (const room of roomsData) {
    for (const chore of room.chores) {
      // Higher ratio = more overdue = higher priority
      // Prefer quick/medium over intensive for smart suggestion
      const effortWeight = chore.effort === 'quick' ? 1.2 : chore.effort === 'medium' ? 1.0 : 0.8;
      const score = chore.ratio * effortWeight;
      if (score > bestScore) {
        bestScore = score;
        bestChore = { ...chore, roomName: room.name, roomIcon: room.icon };
      }
    }
  }
  return bestChore;
}

export async function getDistribution(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const completions = db
    .select({
      userId: choreCompletions.userId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(choreCompletions)
    .where(gte(choreCompletions.completedAt, since))
    .groupBy(choreCompletions.userId)
    .all();
  return completions;
}

export async function getHistory(limit = 50) {
  return db
    .select({
      id: choreCompletions.id,
      choreId: choreCompletions.choreId,
      userId: choreCompletions.userId,
      completedAt: choreCompletions.completedAt,
      choreName: chores.name,
      roomName: rooms.name,
      roomIcon: rooms.icon,
    })
    .from(choreCompletions)
    .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
    .innerJoin(rooms, eq(chores.roomId, rooms.id))
    .orderBy(desc(choreCompletions.completedAt))
    .limit(limit)
    .all();
}
