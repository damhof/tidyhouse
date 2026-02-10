import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationPreferences } from '@/db/schema';
import { getCurrentUserId } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const prefs = db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get();
  return NextResponse.json(prefs || {
    userId,
    morningDigest: true,
    morningDigestTime: '08:00',
    urgencyAlerts: true,
    lastUrgencyAlert: null,
    weeklySummary: true,
    weeklySummaryDay: 'sunday',
    weeklySummaryTime: '19:00',
    lastWeeklySummary: null,
  });
}

// Validate time format (HH:MM)
function isValidTimeFormat(time: string): boolean {
  if (typeof time !== 'string') return false;
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return !!match;
}

// Validate day of week
const VALID_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function isValidDay(day: string): boolean {
  return typeof day === 'string' && VALID_DAYS.includes(day.toLowerCase());
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  
  const { morningDigest, morningDigestTime, urgencyAlerts, weeklySummary, weeklySummaryDay, weeklySummaryTime } = body;

  // Validate time formats if provided
  if (morningDigestTime !== undefined && !isValidTimeFormat(morningDigestTime)) {
    return NextResponse.json({ error: 'Invalid morning digest time format (use HH:MM)' }, { status: 400 });
  }
  if (weeklySummaryTime !== undefined && !isValidTimeFormat(weeklySummaryTime)) {
    return NextResponse.json({ error: 'Invalid weekly summary time format (use HH:MM)' }, { status: 400 });
  }
  if (weeklySummaryDay !== undefined && !isValidDay(weeklySummaryDay)) {
    return NextResponse.json({ error: 'Invalid weekly summary day' }, { status: 400 });
  }
  
  // Validate boolean types
  if (morningDigest !== undefined && typeof morningDigest !== 'boolean') {
    return NextResponse.json({ error: 'morningDigest must be a boolean' }, { status: 400 });
  }
  if (urgencyAlerts !== undefined && typeof urgencyAlerts !== 'boolean') {
    return NextResponse.json({ error: 'urgencyAlerts must be a boolean' }, { status: 400 });
  }
  if (weeklySummary !== undefined && typeof weeklySummary !== 'boolean') {
    return NextResponse.json({ error: 'weeklySummary must be a boolean' }, { status: 400 });
  }

  const existing = db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get();

  if (existing) {
    db.update(notificationPreferences)
      .set({
        morningDigest: morningDigest ?? existing.morningDigest,
        morningDigestTime: morningDigestTime ?? existing.morningDigestTime,
        urgencyAlerts: urgencyAlerts ?? existing.urgencyAlerts,
        weeklySummary: weeklySummary ?? existing.weeklySummary,
        weeklySummaryDay: weeklySummaryDay ?? existing.weeklySummaryDay,
        weeklySummaryTime: weeklySummaryTime ?? existing.weeklySummaryTime,
      })
      .where(eq(notificationPreferences.userId, userId))
      .run();
  } else {
    db.insert(notificationPreferences).values({
      userId,
      morningDigest: morningDigest ?? true,
      morningDigestTime: morningDigestTime ?? '08:00',
      urgencyAlerts: urgencyAlerts ?? true,
      weeklySummary: weeklySummary ?? true,
      weeklySummaryDay: weeklySummaryDay ?? 'sunday',
      weeklySummaryTime: weeklySummaryTime ?? '19:00',
    }).run();
  }

  return NextResponse.json({ ok: true });
}
