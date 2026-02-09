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
  });
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { morningDigest, morningDigestTime, urgencyAlerts } = await req.json();

  const existing = db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get();

  if (existing) {
    db.update(notificationPreferences)
      .set({
        morningDigest: morningDigest ?? existing.morningDigest,
        morningDigestTime: morningDigestTime ?? existing.morningDigestTime,
        urgencyAlerts: urgencyAlerts ?? existing.urgencyAlerts,
      })
      .where(eq(notificationPreferences.userId, userId))
      .run();
  } else {
    db.insert(notificationPreferences).values({
      userId,
      morningDigest: morningDigest ?? true,
      morningDigestTime: morningDigestTime ?? '08:00',
      urgencyAlerts: urgencyAlerts ?? true,
    }).run();
  }

  return NextResponse.json({ ok: true });
}
