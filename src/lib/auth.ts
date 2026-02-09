import { cookies } from 'next/headers';

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
