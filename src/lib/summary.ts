import { db } from '@/db';
import { users, rooms, chores, choreCompletions, todos, projects, projectTasks, projectActivity } from '@/db/schema';
import { sql, gte, and, eq, lte, lt } from 'drizzle-orm';
import { getStaleness } from './chores';

const EFFORT_WEIGHT: Record<string, number> = { quick: 1, medium: 2, intensive: 3 };

export type TimePeriod = 'week' | 'month' | '30days';

export type UserStats = {
  userId: number;
  userName: string;
  userEmoji: string;
  count: number;
  effortScore: number;
  // Enhanced stats
  topRoom: string | null;
  topChore: string | null;
  streak: number;
  bestStreak: number;
};

export type RoomStats = {
  name: string;
  icon: string;
  score: number;
  completions: number;
  trend: 'up' | 'down' | 'same'; // compared to previous period
};

export type DayActivity = {
  date: string;
  count: number;
  effortScore: number;
};

export type SummaryData = {
  period: TimePeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  
  // Core stats
  totalCompletions: number;
  totalEffort: number;
  activeDays: number;
  averagePerDay: number;
  
  // Streaks
  currentStreak: number;
  bestStreak: number;
  
  // Comparison to previous period
  prevPeriodCompletions: number;
  trend: 'up' | 'down' | 'same';
  trendPercent: number;
  
  // User breakdown
  userStats: UserStats[];
  
  // Room stats
  topRooms: RoomStats[];
  worstRooms: RoomStats[];
  
  // Todos
  todosCreated: number;
  todosCompleted: number;
  prevTodosCompleted: number;
  
  // Projects
  projectUpdates: {
    projectTitle: string;
    action: string;
    details: string | null;
  }[];
  tasksCompleted: number;
  
  // Activity heatmap data (last 12 weeks for heatmap)
  activityData: DayActivity[];
  
  // Friendly message
  friendlyMessage: string;
  
  // Achievements this period
  achievements: string[];
};

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDateRange(period: TimePeriod): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let start: Date;
  let end: Date = today;
  let prevStart: Date;
  let prevEnd: Date;
  
  if (period === 'week') {
    // Current week (Sunday to today)
    const dayOfWeek = today.getDay();
    start = new Date(today);
    start.setDate(start.getDate() - dayOfWeek);
    
    // Previous week
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
  } else if (period === 'month') {
    // Current month
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Previous month
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  } else {
    // Last 30 days
    start = new Date(today);
    start.setDate(start.getDate() - 29);
    
    // Previous 30 days
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 29);
  }
  
  return { start, end, prevStart, prevEnd };
}

function getPeriodLabel(period: TimePeriod, start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const endOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  if (period === 'week') {
    return `Week of ${start.toLocaleDateString('en-US', opts)}`;
  } else if (period === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', endOpts)}`;
  }
}

function calculateStreak(completionsByDate: Record<string, number>): { current: number; best: number } {
  const today = new Date();
  let current = 0;
  let best = 0;
  let tempStreak = 0;
  
  // Check if today or yesterday has completions (streak can continue)
  const todayKey = dateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  
  const hasToday = completionsByDate[todayKey] > 0;
  const hasYesterday = completionsByDate[yesterdayKey] > 0;
  
  // Calculate current streak going backwards
  let checkDate = hasToday ? today : (hasYesterday ? yesterday : null);
  
  if (checkDate) {
    while (true) {
      const key = dateKey(checkDate);
      if (completionsByDate[key] > 0) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      // Safety limit
      if (current > 365) break;
    }
  }
  
  // Calculate best streak by scanning all days in order
  const sortedDates = Object.keys(completionsByDate).filter(k => completionsByDate[k] > 0).sort();
  
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    best = Math.max(best, tempStreak);
  }
  
  return { current, best };
}

function calculateUserStreak(userId: number, allCompletions: { userId: number; completedAt: string }[]): { current: number; best: number } {
  const userCompletions = allCompletions.filter(c => c.userId === userId);
  const byDate: Record<string, number> = {};
  
  for (const c of userCompletions) {
    const key = c.completedAt.split('T')[0];
    byDate[key] = (byDate[key] || 0) + 1;
  }
  
  return calculateStreak(byDate);
}

export function getSummaryData(period: TimePeriod = 'week'): SummaryData {
  const { start, end, prevStart, prevEnd } = getDateRange(period);
  const startStr = start.toISOString();
  const endStr = new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Include end day
  const prevStartStr = prevStart.toISOString();
  const prevEndStr = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();
  
  const allUsers = db.select().from(users).all();
  const allRooms = db.select().from(rooms).all();
  const allChores = db.select().from(chores).all();
  const choreMap = new Map(allChores.map(c => [c.id, c]));
  const roomMap = new Map(allRooms.map(r => [r.id, r]));

  // All completions for streak calculation (last 365 days)
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const allCompletions = db
    .select()
    .from(choreCompletions)
    .where(gte(choreCompletions.completedAt, yearAgo.toISOString()))
    .all();

  // Current period completions
  const periodCompletions = db
    .select()
    .from(choreCompletions)
    .where(and(
      gte(choreCompletions.completedAt, startStr),
      lt(choreCompletions.completedAt, endStr)
    ))
    .all();

  // Previous period completions
  const prevCompletions = db
    .select()
    .from(choreCompletions)
    .where(and(
      gte(choreCompletions.completedAt, prevStartStr),
      lt(choreCompletions.completedAt, prevEndStr)
    ))
    .all();

  const totalCompletions = periodCompletions.length;
  const prevPeriodCompletions = prevCompletions.length;
  
  // Calculate trend
  let trend: 'up' | 'down' | 'same' = 'same';
  let trendPercent = 0;
  if (prevPeriodCompletions > 0) {
    trendPercent = Math.round(((totalCompletions - prevPeriodCompletions) / prevPeriodCompletions) * 100);
    trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'same';
  } else if (totalCompletions > 0) {
    trend = 'up';
    trendPercent = 100;
  }
  
  // Calculate total effort and active days
  let totalEffort = 0;
  const activeDaysSet = new Set<string>();
  const completionsByDate: Record<string, number> = {};
  
  for (const comp of periodCompletions) {
    const chore = choreMap.get(comp.choreId);
    totalEffort += EFFORT_WEIGHT[chore?.effort || 'medium'] || 2;
    const day = comp.completedAt.split('T')[0];
    activeDaysSet.add(day);
    completionsByDate[day] = (completionsByDate[day] || 0) + 1;
  }
  
  const activeDays = activeDaysSet.size;
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const averagePerDay = periodDays > 0 ? Number((totalCompletions / periodDays).toFixed(1)) : 0;
  
  // All-time completions by date for streak
  const allCompletionsByDate: Record<string, number> = {};
  for (const c of allCompletions) {
    const key = c.completedAt.split('T')[0];
    allCompletionsByDate[key] = (allCompletionsByDate[key] || 0) + 1;
  }
  const { current: currentStreak, best: bestStreak } = calculateStreak(allCompletionsByDate);
  
  // Per-user stats
  const userCountMap = new Map<number, { 
    count: number; 
    effortScore: number;
    roomCounts: Map<string, number>;
    choreCounts: Map<string, number>;
  }>();
  
  for (const comp of periodCompletions) {
    const entry = userCountMap.get(comp.userId) || { 
      count: 0, 
      effortScore: 0,
      roomCounts: new Map(),
      choreCounts: new Map(),
    };
    entry.count++;
    const chore = choreMap.get(comp.choreId);
    const room = chore ? roomMap.get(chore.roomId) : null;
    entry.effortScore += EFFORT_WEIGHT[chore?.effort || 'medium'] || 2;
    
    if (room) {
      entry.roomCounts.set(room.name, (entry.roomCounts.get(room.name) || 0) + 1);
    }
    if (chore) {
      entry.choreCounts.set(chore.name, (entry.choreCounts.get(chore.name) || 0) + 1);
    }
    
    userCountMap.set(comp.userId, entry);
  }

  const userStats: UserStats[] = allUsers.map(u => {
    const data = userCountMap.get(u.id);
    const userStreak = calculateUserStreak(u.id, allCompletions);
    
    let topRoom: string | null = null;
    let topChore: string | null = null;
    
    if (data) {
      // Find top room
      let maxRoomCount = 0;
      for (const [room, count] of data.roomCounts) {
        if (count > maxRoomCount) {
          maxRoomCount = count;
          topRoom = room;
        }
      }
      
      // Find top chore
      let maxChoreCount = 0;
      for (const [chore, count] of data.choreCounts) {
        if (count > maxChoreCount) {
          maxChoreCount = count;
          topChore = chore;
        }
      }
    }
    
    return {
      userId: u.id,
      userName: u.name,
      userEmoji: u.avatarEmoji,
      count: data?.count || 0,
      effortScore: data?.effortScore || 0,
      topRoom,
      topChore,
      streak: userStreak.current,
      bestStreak: userStreak.best,
    };
  });

  // Room stats with trend
  const latestCompletions = db
    .select({
      choreId: choreCompletions.choreId,
      lastCompleted: sql<string>`MAX(${choreCompletions.completedAt})`.as('last_completed'),
    })
    .from(choreCompletions)
    .groupBy(choreCompletions.choreId)
    .all();
  const completionMap = new Map(latestCompletions.map(c => [c.choreId, c.lastCompleted]));

  // Count completions per room in current and previous period
  const roomCompletionsCurrent = new Map<number, number>();
  const roomCompletionsPrev = new Map<number, number>();
  
  for (const c of periodCompletions) {
    const chore = choreMap.get(c.choreId);
    if (chore) {
      roomCompletionsCurrent.set(chore.roomId, (roomCompletionsCurrent.get(chore.roomId) || 0) + 1);
    }
  }
  
  for (const c of prevCompletions) {
    const chore = choreMap.get(c.choreId);
    if (chore) {
      roomCompletionsPrev.set(chore.roomId, (roomCompletionsPrev.get(chore.roomId) || 0) + 1);
    }
  }

  const roomStatsAll: RoomStats[] = allRooms.map(room => {
    const roomChores = allChores.filter(c => c.roomId === room.id);
    let score = 100;
    
    if (roomChores.length > 0) {
      const scores = roomChores.map(c => {
        const s = getStaleness(c.frequencyDays, completionMap.get(c.id) || null);
        return Math.max(0, 1 - s.ratio);
      });
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      score = Math.round(avg * 100);
    }
    
    const current = roomCompletionsCurrent.get(room.id) || 0;
    const prev = roomCompletionsPrev.get(room.id) || 0;
    let trend: 'up' | 'down' | 'same' = 'same';
    if (current > prev) trend = 'up';
    else if (current < prev) trend = 'down';
    
    return { name: room.name, icon: room.icon, score, completions: current, trend };
  }).sort((a, b) => b.score - a.score);

  const topRooms = roomStatsAll.slice(0, 3);
  const worstRooms = roomStatsAll.filter(r => r.score < 100).slice(-3).reverse();

  // Todo stats
  const todosCreated = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(gte(todos.createdAt, startStr), lt(todos.createdAt, endStr)))
    .get()?.count || 0;

  const todosCompleted = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      gte(todos.completedAt, startStr),
      lt(todos.completedAt, endStr),
      eq(todos.completed, true)
    ))
    .get()?.count || 0;

  const prevTodosCompleted = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      gte(todos.completedAt, prevStartStr),
      lt(todos.completedAt, prevEndStr),
      eq(todos.completed, true)
    ))
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
    .where(and(gte(projectActivity.createdAt, startStr), lt(projectActivity.createdAt, endStr)))
    .all();

  // Tasks completed in period (approximate - count done tasks with recent activity)
  const tasksCompleted = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(projectTasks)
    .where(eq(projectTasks.status, 'done'))
    .get()?.count || 0;

  // Activity heatmap data (last 12 weeks = 84 days)
  const heatmapStart = new Date();
  heatmapStart.setDate(heatmapStart.getDate() - 83);
  const activityData: DayActivity[] = [];
  
  for (let i = 0; i < 84; i++) {
    const d = new Date(heatmapStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    
    const dayCompletions = allCompletions.filter(c => c.completedAt.startsWith(key));
    let dayEffort = 0;
    for (const c of dayCompletions) {
      const chore = choreMap.get(c.choreId);
      dayEffort += EFFORT_WEIGHT[chore?.effort || 'medium'] || 2;
    }
    
    activityData.push({
      date: key,
      count: dayCompletions.length,
      effortScore: dayEffort,
    });
  }

  // Generate achievements
  const achievements: string[] = [];
  
  if (currentStreak >= 7) {
    achievements.push(`🔥 ${currentStreak}-day streak! Keep it going!`);
  }
  if (totalCompletions >= 50) {
    achievements.push(`🏆 50+ chores completed this ${period}!`);
  } else if (totalCompletions >= 30) {
    achievements.push(`⭐ 30+ chores completed!`);
  }
  if (trend === 'up' && trendPercent >= 20) {
    achievements.push(`📈 ${trendPercent}% more than last ${period}!`);
  }
  if (activeDays >= 7 && period === 'week') {
    achievements.push(`💪 Active every day this week!`);
  }
  
  // User achievements
  for (const u of userStats) {
    if (u.streak >= 5) {
      achievements.push(`${u.userEmoji} ${u.userName} has a ${u.streak}-day streak!`);
    }
  }

  // Friendly message
  const friendlyMessage = generateFriendlyMessage(totalCompletions, trend, trendPercent, currentStreak, topRooms, worstRooms, period);

  return {
    period,
    periodLabel: getPeriodLabel(period, start, end),
    startDate: dateKey(start),
    endDate: dateKey(end),
    totalCompletions,
    totalEffort,
    activeDays,
    averagePerDay,
    currentStreak,
    bestStreak,
    prevPeriodCompletions,
    trend,
    trendPercent,
    userStats,
    topRooms,
    worstRooms,
    todosCreated,
    todosCompleted,
    prevTodosCompleted,
    projectUpdates,
    tasksCompleted,
    activityData,
    friendlyMessage,
    achievements,
  };
}

function generateFriendlyMessage(
  totalChores: number,
  trend: 'up' | 'down' | 'same',
  trendPercent: number,
  streak: number,
  topRooms: RoomStats[],
  worstRooms: RoomStats[],
  period: TimePeriod,
): string {
  const parts: string[] = [];
  const periodName = period === 'week' ? 'week' : period === 'month' ? 'month' : '30 days';

  if (totalChores === 0) {
    parts.push(`Quiet ${periodName} on the chores front! Time to get back on track 💪`);
  } else if (totalChores >= 50) {
    parts.push(`Incredible! ${totalChores} chores knocked out 🎉`);
  } else if (totalChores >= 30) {
    parts.push(`Great effort! ${totalChores} chores completed 👍`);
  } else if (totalChores >= 10) {
    parts.push(`Good progress with ${totalChores} chores done!`);
  } else {
    parts.push(`${totalChores} chores completed — every bit counts!`);
  }

  if (trend === 'up' && trendPercent >= 10) {
    parts.push(`That's ${trendPercent}% more than last ${periodName} 📈`);
  } else if (trend === 'down' && trendPercent <= -20) {
    parts.push(`A bit quieter than last ${periodName}, but that's okay`);
  }

  if (streak >= 7) {
    parts.push(`Amazing ${streak}-day streak going! 🔥`);
  } else if (streak >= 3) {
    parts.push(`Nice ${streak}-day streak!`);
  }

  if (topRooms.length > 0 && topRooms[0].score >= 80) {
    parts.push(`The ${topRooms[0].name} is looking pristine 🥬`);
  }

  if (worstRooms.length > 0 && worstRooms[0].score < 30) {
    parts.push(`The ${worstRooms[0].name} could use some attention 🧹`);
  }

  return parts.slice(0, 3).join('. ') + '.';
}

// Legacy function for backward compatibility
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
  const data = getSummaryData('week');
  return {
    weekStart: data.startDate,
    weekEnd: data.endDate,
    totalCompletions: data.totalCompletions,
    userStats: data.userStats.map(u => ({
      userId: u.userId,
      userName: u.userName,
      userEmoji: u.userEmoji,
      count: u.count,
      effortScore: u.effortScore,
    })),
    topRooms: data.topRooms.map(r => ({ name: r.name, icon: r.icon, score: r.score })),
    worstRooms: data.worstRooms.map(r => ({ name: r.name, icon: r.icon, score: r.score })),
    todosCreated: data.todosCreated,
    todosCompleted: data.todosCompleted,
    projectUpdates: data.projectUpdates,
    tasksCompleted: data.tasksCompleted,
    friendlyMessage: data.friendlyMessage,
  };
}
