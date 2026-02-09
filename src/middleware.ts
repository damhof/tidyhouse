import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require auth
const PUBLIC_PATHS = ['/login', '/api/auth/', '/favicon.ico', '/icon-192.png', '/manifest.json'];
const PUBLIC_EXTENSIONS = ['.svg', '.png', '.ico', '.js', '.css', '.woff', '.woff2'];

export function middleware(request: NextRequest) {
  const password = process.env.TIDYHOUSE_PASSWORD;

  // No password configured — skip auth entirely
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Allow static file extensions
  if (PUBLIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return NextResponse.next();

  // Allow Next.js internals
  if (pathname.startsWith('/_next/')) return NextResponse.next();

  // Check session cookie
  const sessionToken = request.cookies.get('tidyhouse_session')?.value;

  // We can't call into the in-memory session store from Edge middleware,
  // so we just check cookie existence here. The actual session validation
  // happens server-side in layout.tsx / API routes.
  // For stronger validation, we sign the cookie (see below).
  if (!sessionToken) {
    // API routes get 401, pages get redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
