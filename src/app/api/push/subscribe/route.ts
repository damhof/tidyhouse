import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { getCurrentUserId } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { subscription } = await req.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  // Remove existing subscription with same endpoint for this user
  db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, subscription.endpoint)))
    .run();

  db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    createdAt: new Date().toISOString(),
  }).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { endpoint } = await req.json();
  if (endpoint) {
    db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .run();
  } else {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).run();
  }

  return NextResponse.json({ ok: true });
}
