import { db } from './index';
import { users, rooms, chores } from './schema';
import { sql } from 'drizzle-orm';

export function seed() {
  // Check if already seeded
  const existing = db.select().from(users).all();
  if (existing.length > 0) return;

  // Users
  db.insert(users).values([
    { id: 1, name: 'User 1', avatarEmoji: '👨' },
    { id: 2, name: 'User 2', avatarEmoji: '👩' },
  ]).run();

  // Rooms
  const roomData = [
    { name: 'Kitchen', icon: '🍳', sortOrder: 1 },
    { name: 'Bathroom', icon: '🚿', sortOrder: 2 },
    { name: 'Living Room', icon: '🛋️', sortOrder: 3 },
    { name: 'Bedroom', icon: '🛏️', sortOrder: 4 },
    { name: 'Hallway', icon: '🚪', sortOrder: 5 },
    { name: 'Laundry', icon: '👕', sortOrder: 6 },
  ];
  db.insert(rooms).values(roomData).run();

  const allRooms = db.select().from(rooms).all();
  const roomMap = Object.fromEntries(allRooms.map(r => [r.name, r.id]));

  const choreData: { roomId: number; name: string; frequencyDays: number; effort: 'quick' | 'medium' | 'intensive' }[] = [
    // Kitchen
    { roomId: roomMap['Kitchen'], name: 'Wash dishes', frequencyDays: 1, effort: 'medium' },
    { roomId: roomMap['Kitchen'], name: 'Clean countertops', frequencyDays: 2, effort: 'quick' },
    { roomId: roomMap['Kitchen'], name: 'Clean stovetop', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Kitchen'], name: 'Mop floor', frequencyDays: 7, effort: 'intensive' },
    { roomId: roomMap['Kitchen'], name: 'Clean fridge', frequencyDays: 14, effort: 'intensive' },
    { roomId: roomMap['Kitchen'], name: 'Clean oven', frequencyDays: 30, effort: 'intensive' },
    // Bathroom
    { roomId: roomMap['Bathroom'], name: 'Clean toilet', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Bathroom'], name: 'Clean shower', frequencyDays: 7, effort: 'intensive' },
    { roomId: roomMap['Bathroom'], name: 'Clean sink', frequencyDays: 3, effort: 'quick' },
    { roomId: roomMap['Bathroom'], name: 'Mop floor', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bathroom'], name: 'Wash towels', frequencyDays: 7, effort: 'medium' },
    // Living Room
    { roomId: roomMap['Living Room'], name: 'Vacuum', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Living Room'], name: 'Dust surfaces', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Living Room'], name: 'Clean windows', frequencyDays: 30, effort: 'intensive' },
    { roomId: roomMap['Living Room'], name: 'Tidy up', frequencyDays: 1, effort: 'quick' },
    // Bedroom
    { roomId: roomMap['Bedroom'], name: 'Make bed', frequencyDays: 1, effort: 'quick' },
    { roomId: roomMap['Bedroom'], name: 'Change sheets', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bedroom'], name: 'Vacuum', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bedroom'], name: 'Dust', frequencyDays: 14, effort: 'medium' },
    // Hallway
    { roomId: roomMap['Hallway'], name: 'Vacuum', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Hallway'], name: 'Mop', frequencyDays: 14, effort: 'medium' },
    { roomId: roomMap['Hallway'], name: 'Organize shoes', frequencyDays: 7, effort: 'quick' },
    // Laundry
    { roomId: roomMap['Laundry'], name: 'Do laundry', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Laundry'], name: 'Iron clothes', frequencyDays: 7, effort: 'intensive' },
    { roomId: roomMap['Laundry'], name: 'Clean machine', frequencyDays: 30, effort: 'medium' },
  ];

  for (const c of choreData) {
    db.insert(chores).values({
      roomId: c.roomId,
      name: c.name,
      frequencyDays: c.frequencyDays,
      effort: c.effort,
      createdAt: new Date().toISOString(),
    }).run();
  }
}
