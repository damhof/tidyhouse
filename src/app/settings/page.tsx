import { db } from '@/db';
import { users, rooms, chores } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const allUsers = db.select().from(users).all();
  const allRooms = db.select().from(rooms).orderBy(asc(rooms.sortOrder)).all();
  const allChores = db.select().from(chores).all();
  const currentUser = userId ? allUsers.find(u => u.id === userId) ?? null : null;

  return (
    <SettingsClient
      currentUser={currentUser}
      allUsers={allUsers}
      rooms={allRooms}
      chores={allChores}
    />
  );
}
