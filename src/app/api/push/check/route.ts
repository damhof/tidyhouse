import { NextRequest, NextResponse } from 'next/server';
import { checkMorningDigest, checkUrgencyAlerts } from '@/lib/push';

export async function GET(req: NextRequest) {
  // Optional secret to protect the endpoint
  const secret = process.env.PUSH_CHECK_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const currentTime = new Date().toTimeString().slice(0, 5);

  const digestSent = await checkMorningDigest(currentTime);
  const urgencySent = await checkUrgencyAlerts();

  return NextResponse.json({
    ok: true,
    time: currentTime,
    digestSent,
    urgencySent,
  });
}
