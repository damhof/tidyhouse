import { db } from '@/db';
import { chores, choreCompletions, rooms } from '@/db/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';

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

const EFFORT_WEIGHT: Record<string, number> = { quick: 1, medium: 2, intensive: 3 };

export async function getEffortDistribution(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const completions = db
    .select({
      userId: choreCompletions.userId,
      choreId: choreCompletions.choreId,
    })
    .from(choreCompletions)
    .where(gte(choreCompletions.completedAt, since))
    .all();

  const allChores = db.select().from(chores).all();
  const choreMap = Object.fromEntries(allChores.map(c => [c.id, c]));

  const result: Record<number, number> = {};
  for (const c of completions) {
    const effort = choreMap[c.choreId]?.effort || 'medium';
    result[c.userId] = (result[c.userId] || 0) + (EFFORT_WEIGHT[effort] || 2);
  }
  return Object.entries(result).map(([userId, score]) => ({ userId: Number(userId), effortScore: score }));
}

export type SuggestedChore = {
  id: number;
  name: string;
  effort: string;
  frequencyDays: number;
  level: StalenessLevel;
  ratio: number;
  lastCompleted: string | null;
  lastUserId: number | null;
  roomName: string;
  roomIcon: string;
  estimatedMinutes: number;
};

const EFFORT_MINUTES: Record<string, number> = { quick: 5, medium: 15, intensive: 30 };

/**
 * Get a ranked list of suggested chores considering urgency, effort, and fairness.
 * Used by both Quick Pick (take first) and Session Planner (fill time budget).
 */
export async function getSuggestedChores(currentUserId?: number | null): Promise<SuggestedChore[]> {
  const roomsData = await getRoomsWithScores();

  // Get completion counts per user in last 7 days for fairness
  const dist = await getDistribution(7);
  const currentUserCount = dist.find(d => d.userId === currentUserId)?.count ?? 0;
  const otherMaxCount = Math.max(0, ...dist.filter(d => d.userId !== currentUserId).map(d => d.count));
  // fairnessBoost: if current user has done more than others, slightly deprioritize their common chores
  const fairnessBoost = currentUserCount > otherMaxCount ? 0.1 : 0;

  const suggestions: SuggestedChore[] = [];

  for (const room of roomsData) {
    for (const chore of room.chores) {
      const effortMin = EFFORT_MINUTES[chore.effort] ?? 15;
      // Score: higher = more urgent. Ratio > 1 means overdue.
      const urgencyScore = chore.ratio;
      // Slightly prefer tasks not last done by current user (fairness)
      const fairnessAdj = chore.lastUserId === currentUserId ? -fairnessBoost : 0;
      const score = urgencyScore + fairnessAdj;

      suggestions.push({
        id: chore.id,
        name: chore.name,
        effort: chore.effort,
        frequencyDays: chore.frequencyDays,
        level: chore.level as StalenessLevel,
        ratio: chore.ratio,
        lastCompleted: chore.lastCompleted,
        lastUserId: chore.lastUserId,
        roomName: room.name,
        roomIcon: room.icon,
        estimatedMinutes: effortMin,
        // Store score temporarily for sorting (we'll sort then remove)
      });
      // Attach score for sorting
      (suggestions[suggestions.length - 1] as any)._score = score;
    }
  }

  // Sort by score descending (most urgent first)
  suggestions.sort((a, b) => ((b as any)._score ?? 0) - ((a as any)._score ?? 0));

  // Clean up temp field
  for (const s of suggestions) delete (s as any)._score;

  return suggestions;
}

/**
 * Build a session plan fitting within a time budget (in minutes).
 * Distributes across rooms to avoid doing all chores in one room.
 */
export async function getSessionPlan(timeBudget: number, currentUserId?: number | null): Promise<SuggestedChore[]> {
  const allSuggestions = await getSuggestedChores(currentUserId);
  const plan: SuggestedChore[] = [];
  let remaining = timeBudget;
  const roomCounts: Record<string, number> = {};

  // Greedy: pick most urgent chore that fits, with room distribution penalty
  const available = [...allSuggestions];

  while (remaining > 0 && available.length > 0) {
    // Score each candidate with room distribution consideration
    let bestIdx = -1;
    let bestPriority = -Infinity;

    for (let i = 0; i < available.length; i++) {
      const c = available[i];
      if (c.estimatedMinutes > remaining) continue;
      // Penalize rooms that already have many chores in the plan
      const roomPenalty = (roomCounts[c.roomName] ?? 0) * 0.3;
      const priority = c.ratio - roomPenalty;
      if (priority > bestPriority) {
        bestPriority = priority;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const chosen = available.splice(bestIdx, 1)[0];
    plan.push(chosen);
    remaining -= chosen.estimatedMinutes;
    roomCounts[chosen.roomName] = (roomCounts[chosen.roomName] ?? 0) + 1;
  }

  return plan;
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
