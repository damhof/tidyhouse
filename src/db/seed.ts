import { db } from './index';
import { users, rooms, chores } from './schema';

export function seed() {
  // Check if already seeded
  const existing = db.select().from(users).all();
  if (existing.length > 0) return;

  // Users
  db.insert(users).values([
    { id: 1, name: 'User 1', avatarEmoji: '👤' },
    { id: 2, name: 'User 2', avatarEmoji: '👤' },
  ]).run();

  // Rooms
  const roomData = [
    { name: 'Kitchen', icon: '🍳', sortOrder: 1 },
    { name: 'Bathroom', icon: '🛁', sortOrder: 2 },
    { name: 'Living Room', icon: '🛋️', sortOrder: 3 },
    { name: 'Bedroom', icon: '🛏️', sortOrder: 4 },
    { name: 'Laundry', icon: '👕', sortOrder: 5 },
    { name: 'General', icon: '🏠', sortOrder: 6 },
  ];
  db.insert(rooms).values(roomData).run();

  const allRooms = db.select().from(rooms).all();
  const roomMap = Object.fromEntries(allRooms.map(r => [r.name, r.id]));

  const choreData: { roomId: number; name: string; frequencyDays: number; effort: 'quick' | 'medium' | 'intensive' }[] = [
    // Kitchen
    { roomId: roomMap['Kitchen'], name: 'Wash dishes', frequencyDays: 1, effort: 'quick' },
    { roomId: roomMap['Kitchen'], name: 'Clean countertops', frequencyDays: 2, effort: 'quick' },
    { roomId: roomMap['Kitchen'], name: 'Clean stove', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Kitchen'], name: 'Mop floor', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Kitchen'], name: 'Clean fridge', frequencyDays: 14, effort: 'intensive' },
    { roomId: roomMap['Kitchen'], name: 'Empty bin', frequencyDays: 3, effort: 'quick' },
    // Bathroom
    { roomId: roomMap['Bathroom'], name: 'Clean toilet', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Bathroom'], name: 'Clean sink & mirror', frequencyDays: 7, effort: 'quick' },
    { roomId: roomMap['Bathroom'], name: 'Clean shower/tub', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bathroom'], name: 'Mop floor', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bathroom'], name: 'Replace towels', frequencyDays: 7, effort: 'quick' },
    // Living Room
    { roomId: roomMap['Living Room'], name: 'Vacuum/mop floor', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Living Room'], name: 'Dust surfaces', frequencyDays: 7, effort: 'quick' },
    { roomId: roomMap['Living Room'], name: 'Tidy up', frequencyDays: 2, effort: 'quick' },
    { roomId: roomMap['Living Room'], name: 'Clean windows', frequencyDays: 30, effort: 'intensive' },
    // Bedroom
    { roomId: roomMap['Bedroom'], name: 'Change bedsheets', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bedroom'], name: 'Vacuum floor', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['Bedroom'], name: 'Dust surfaces', frequencyDays: 14, effort: 'quick' },
    { roomId: roomMap['Bedroom'], name: 'Tidy nightstands', frequencyDays: 7, effort: 'quick' },
    // Laundry
    { roomId: roomMap['Laundry'], name: 'Do laundry', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Laundry'], name: 'Fold & put away', frequencyDays: 3, effort: 'medium' },
    { roomId: roomMap['Laundry'], name: 'Iron', frequencyDays: 7, effort: 'medium' },
    // General
    { roomId: roomMap['General'], name: 'Vacuum hallway', frequencyDays: 7, effort: 'medium' },
    { roomId: roomMap['General'], name: 'Take out recycling', frequencyDays: 7, effort: 'quick' },
    { roomId: roomMap['General'], name: 'Water plants', frequencyDays: 3, effort: 'quick' },
    { roomId: roomMap['General'], name: 'Dust/clean entryway', frequencyDays: 14, effort: 'quick' },
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
