import { cookies } from 'next/headers';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// Authentication Configuration
// ═══════════════════════════════════════════════════════════════════
const AUTH_PASSWORD = process.env.TIDYHOUSE_PASSWORD || null;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_COOKIE = 'tidyhouse_session';

// In-memory stores
const sessions = new Map<string, { createdAt: number; expiresAt: number; ip: string }>();
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

/** Whether auth is enabled (password is configured) */
export function isAuthEnabled(): boolean {
  return !!AUTH_PASSWORD;
}

/** Timing-safe password comparison */
function verifyPassword(input: string): boolean {
  if (!AUTH_PASSWORD) return true;
  const inputBuf = Buffer.from(input || '');
  const passBuf = Buffer.from(AUTH_PASSWORD);
  if (inputBuf.length !== passBuf.length) {
    // Compare with self to avoid timing leak on length
    crypto.timingSafeEqual(inputBuf, inputBuf);
    return false;
  }
  return crypto.timingSafeEqual(inputBuf, passBuf);
}

/** Check if IP is rate-limited */
function isRateLimited(ip: string): { limited: boolean; remainingMinutes?: number } {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { limited: false };
  const elapsed = Date.now() - attempt.lastAttempt;
  if (elapsed > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(ip);
    return { limited: false };
  }
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return { limited: true, remainingMinutes: Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000) };
  }
  return { limited: false };
}

/** Record a failed login attempt */
function recordFailedAttempt(ip: string): number {
  const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  current.count++;
  current.lastAttempt = Date.now();
  loginAttempts.set(ip, current);
  return Math.max(0, MAX_LOGIN_ATTEMPTS - current.count);
}

/** Validate session token from cookies (for server components / middleware) */
export async function isAuthenticated(): Promise<boolean> {
  if (!AUTH_PASSWORD) return true;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/** Validate a session token string (for middleware, no async cookies) */
export function isValidSession(token: string | undefined): boolean {
  if (!AUTH_PASSWORD) return true;
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/** Login: returns cookie header value on success, or error */
export function login(password: string, ip: string): 
  { success: true; cookieValue: string; maxAge: number } | 
  { success: false; error: string; attemptsLeft?: number; status: number } {
  
  const rateCheck = isRateLimited(ip);
  if (rateCheck.limited) {
    return { 
      success: false, 
      error: `Too many attempts. Try again in ${rateCheck.remainingMinutes} minutes.`,
      status: 429 
    };
  }

  if (!verifyPassword(password)) {
    const attemptsLeft = recordFailedAttempt(ip);
    return { 
      success: false, 
      error: 'Incorrect password', 
      attemptsLeft,
      status: 401 
    };
  }

  // Clear failed attempts on success
  loginAttempts.delete(ip);

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
    ip,
  });

  return { 
    success: true, 
    cookieValue: token,
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

/** Logout: delete the session */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    sessions.delete(token);
  }
}

// ═══════════════════════════════════════════════════════════════════
// User identity (existing functionality)
// ═══════════════════════════════════════════════════════════════════

export async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get('tidyhouse_user')?.value;
  return uid ? parseInt(uid, 10) : null;
}

export async function requireUserId(): Promise<number> {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Not authenticated');
  return uid;
}
