import { NextRequest, NextResponse } from 'next/server';
import { login, isAuthEnabled } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ success: true });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  
  const { password } = body;
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }
  
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';

  const result = login(password, ip);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, attemptsLeft: result.attemptsLeft },
      { status: result.status }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('tidyhouse_session', result.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: result.maxAge,
  });
  return response;
}
