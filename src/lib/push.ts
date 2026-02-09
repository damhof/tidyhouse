import { db } from '@/db';
import { pushSubscriptions, notificationPreferences, chores, choreCompletions, rooms } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ensureVapid, webpush } from './vapid';
import { getStaleness } from './chores';
import { getWeeklySummary } from './summary';

type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
};

async function sendToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!ensureVapid()) return 0;

  const subs = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      // Remove expired/invalid subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
      }
    }
  }
  return sent;
}

function getOverdueChoresByRoom(): Map<string, string[]> {
  const allChores = db.select().from(chores).all();
  const allRooms = db.select().from(rooms).all();
  const roomMap = new Map(allRooms.map(r => [r.id, r.name]));

  const latestCompletions = db
    .select({
      choreId: choreCompletions.choreId,
      lastCompleted: sql<string>`MAX(${choreCompletions.completedAt})`.as('last_completed'),
    })
    .from(choreCompletions)
    .groupBy(choreCompletions.choreId)
    .all();
  const completionMap = new Map(latestCompletions.map(c => [c.choreId, c.lastCompleted]));

  const result = new Map<string, string[]>();

  for (const chore of allChores) {
    const staleness = getStaleness(chore.frequencyDays, completionMap.get(chore.id) || null);
    if (staleness.level === 'red') {
      const roomName = roomMap.get(chore.roomId) || 'Unknown';
      if (!result.has(roomName)) result.set(roomName, []);
      result.get(roomName)!.push(chore.name);
    }
  }
  return result;
}

export async function checkMorningDigest(currentTime?: string): Promise<number> {
  const now = currentTime || new Date().toTimeString().slice(0, 5);
  const allPrefs = db.select().from(notificationPreferences).all();

  // Also include users without preferences (defaults: morningDigest=true, time=08:00)
  const allUserIds = db.select({ id: sql<number>`id` }).from(sql`users`).all().map(u => u.id);
  const prefsMap = new Map(allPrefs.map(p => [p.userId, p]));

  const overdueByRoom = getOverdueChoresByRoom();
  if (overdueByRoom.size === 0) return 0;

  const totalOverdue = Array.from(overdueByRoom.values()).reduce((sum, arr) => sum + arr.length, 0);
  const roomSummary = Array.from(overdueByRoom.entries())
    .map(([room, chores]) => `${room} (${chores.length})`)
    .join(', ');

  let sent = 0;
  for (const userId of allUserIds) {
    const prefs = prefsMap.get(userId);
    const digestEnabled = prefs ? prefs.morningDigest : true;
    const digestTime = prefs?.morningDigestTime || '08:00';

    if (!digestEnabled || digestTime !== now) continue;

    sent += await sendToUser(userId, {
      title: '🏠 TidyHouse Morning Digest',
      body: `${totalOverdue} chore${totalOverdue === 1 ? '' : 's'} need${totalOverdue === 1 ? 's' : ''} attention: ${roomSummary}`,
      url: '/',
    });
  }
  return sent;
}

export async function checkUrgencyAlerts(): Promise<number> {
  const overdueByRoom = getOverdueChoresByRoom();
  if (overdueByRoom.size === 0) return 0;

  const allUserIds = db.select({ id: sql<number>`id` }).from(sql`users`).all().map(u => u.id);
  const allPrefs = db.select().from(notificationPreferences).all();
  const prefsMap = new Map(allPrefs.map(p => [p.userId, p]));

  const now = new Date();
  let sent = 0;

  for (const userId of allUserIds) {
    const prefs = prefsMap.get(userId);
    const alertsEnabled = prefs ? prefs.urgencyAlerts : true;
    if (!alertsEnabled) continue;

    // Check hourly batching
    if (prefs?.lastUrgencyAlert) {
      const lastAlert = new Date(prefs.lastUrgencyAlert);
      if (now.getTime() - lastAlert.getTime() < 60 * 60 * 1000) continue;
    }

    // Build message from all overdue rooms
    const lines = Array.from(overdueByRoom.entries())
      .map(([room, choreNames]) => `${room}: ${choreNames.join(' and ')}`)
      .join(', ');

    const count = await sendToUser(userId, {
      title: '🔴 Chores critically overdue',
      body: lines,
      url: '/',
    });

    if (count > 0) {
      // Update last urgency alert timestamp
      if (prefs) {
        db.update(notificationPreferences)
          .set({ lastUrgencyAlert: now.toISOString() })
          .where(eq(notificationPreferences.userId, userId))
          .run();
      } else {
        db.insert(notificationPreferences)
          .values({ userId, morningDigest: true, morningDigestTime: '08:00', urgencyAlerts: true, lastUrgencyAlert: now.toISOString() })
          .run();
      }
      sent += count;
    }
  }
  return sent;
}

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

export async function checkWeeklySummary(currentTime?: string): Promise<number> {
  const now = new Date();
  const time = currentTime || now.toTimeString().slice(0, 5);
  const currentDay = now.getDay(); // 0=Sunday

  const allUserIds = db.select({ id: sql<number>`id` }).from(sql`users`).all().map(u => u.id);
  const allPrefs = db.select().from(notificationPreferences).all();
  const prefsMap = new Map(allPrefs.map(p => [p.userId, p]));

  const summary = getWeeklySummary();
  let sent = 0;

  for (const userId of allUserIds) {
    const prefs = prefsMap.get(userId);
    const enabled = prefs ? prefs.weeklySummary : true;
    if (!enabled) continue;

    const summaryDay = DAY_MAP[prefs?.weeklySummaryDay || 'sunday'] ?? 0;
    const summaryTime = prefs?.weeklySummaryTime || '19:00';

    if (currentDay !== summaryDay || time !== summaryTime) continue;

    // Prevent duplicate sends: check if already sent today
    if (prefs?.lastWeeklySummary) {
      const lastSent = new Date(prefs.lastWeeklySummary);
      if (now.getTime() - lastSent.getTime() < 12 * 60 * 60 * 1000) continue;
    }

    const count = await sendToUser(userId, {
      title: '📊 Weekly Summary',
      body: summary.friendlyMessage,
      url: '/summary',
    });

    if (count > 0) {
      if (prefs) {
        db.update(notificationPreferences)
          .set({ lastWeeklySummary: now.toISOString() })
          .where(eq(notificationPreferences.userId, userId))
          .run();
      } else {
        db.insert(notificationPreferences)
          .values({
            userId,
            morningDigest: true,
            morningDigestTime: '08:00',
            urgencyAlerts: true,
            weeklySummary: true,
            weeklySummaryDay: 'sunday',
            weeklySummaryTime: '19:00',
            lastWeeklySummary: now.toISOString(),
          })
          .run();
      }
      sent += count;
    }
  }
  return sent;
}
