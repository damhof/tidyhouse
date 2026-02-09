'use server';

import { db } from '@/db';
import { rooms, chores, choreCompletions, users, todos, projects, projectTasks, projectNotes, projectActivity, projectTags, projectAssignees, pushSubscriptions, notificationPreferences } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- User Actions ---
export async function updateUserEmoji(userId: number, emoji: string) {
  db.update(users).set({ avatarEmoji: emoji }).where(eq(users.id, userId)).run();
  revalidatePath('/');
  revalidatePath('/settings');
}

// --- Room Actions ---
export async function createRoom(name: string, icon: string) {
  const maxOrder = db.select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` }).from(rooms).get();
  db.insert(rooms).values({
    name,
    icon,
    sortOrder: (maxOrder?.max ?? 0) + 1,
  }).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

export async function updateRoom(roomId: number, name: string, icon: string) {
  db.update(rooms).set({ name, icon }).where(eq(rooms.id, roomId)).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

export async function deleteRoom(roomId: number) {
  // Delete chore completions for chores in this room
  const roomChores = db.select({ id: chores.id }).from(chores).where(eq(chores.roomId, roomId)).all();
  for (const c of roomChores) {
    db.delete(choreCompletions).where(eq(choreCompletions.choreId, c.id)).run();
  }
  db.delete(chores).where(eq(chores.roomId, roomId)).run();
  db.delete(rooms).where(eq(rooms.id, roomId)).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

export async function reorderRooms(roomIds: number[]) {
  for (let i = 0; i < roomIds.length; i++) {
    db.update(rooms).set({ sortOrder: i }).where(eq(rooms.id, roomIds[i])).run();
  }
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

// --- Chore Actions ---
export async function createChore(roomId: number, name: string, frequencyDays: number, effort: 'quick' | 'medium' | 'intensive', pinnedDays?: string | null) {
  db.insert(chores).values({
    roomId,
    name,
    frequencyDays,
    effort,
    pinnedDays: pinnedDays || null,
    createdAt: new Date().toISOString(),
  }).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

export async function updateChore(choreId: number, name: string, frequencyDays: number, effort: 'quick' | 'medium' | 'intensive', pinnedDays?: string | null) {
  db.update(chores).set({ name, frequencyDays, effort, pinnedDays: pinnedDays || null }).where(eq(chores.id, choreId)).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

export async function deleteChore(choreId: number) {
  db.delete(choreCompletions).where(eq(choreCompletions.choreId, choreId)).run();
  db.delete(chores).where(eq(chores.id, choreId)).run();
  revalidatePath('/settings');
  revalidatePath('/chores');
  revalidatePath('/');
}

// --- Data Import ---
export async function importData(jsonString: string) {
  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON');
  }

  // Validate structure
  const requiredKeys = ['users', 'rooms', 'chores'];
  for (const key of requiredKeys) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Missing or invalid "${key}" array in backup`);
    }
  }

  // Clear all tables in dependency order
  db.run(sql`DELETE FROM push_subscriptions`);
  db.run(sql`DELETE FROM notification_preferences`);
  db.run(sql`DELETE FROM chore_completions`);
  db.run(sql`DELETE FROM chores`);
  db.run(sql`DELETE FROM rooms`);
  db.run(sql`DELETE FROM project_activity`);
  db.run(sql`DELETE FROM project_tags`);
  db.run(sql`DELETE FROM project_assignees`);
  db.run(sql`DELETE FROM project_notes`);
  db.run(sql`DELETE FROM project_tasks`);
  db.run(sql`DELETE FROM todos`);
  db.run(sql`DELETE FROM projects`);
  db.run(sql`DELETE FROM users`);

  // Re-insert users
  for (const u of data.users) {
    db.insert(users).values({
      id: u.id,
      name: u.name,
      avatarEmoji: u.avatarEmoji || u.avatar_emoji || '👤',
    }).run();
  }

  // Re-insert rooms
  for (const r of data.rooms) {
    db.insert(rooms).values({
      id: r.id,
      name: r.name,
      icon: r.icon,
      sortOrder: r.sortOrder ?? r.sort_order ?? 0,
    }).run();
  }

  // Re-insert chores
  for (const c of data.chores) {
    db.insert(chores).values({
      id: c.id,
      roomId: c.roomId ?? c.room_id,
      name: c.name,
      frequencyDays: c.frequencyDays ?? c.frequency_days,
      effort: c.effort || 'medium',
      pinnedDays: c.pinnedDays ?? c.pinned_days ?? null,
      createdAt: c.createdAt ?? c.created_at ?? new Date().toISOString(),
    }).run();
  }

  // Re-insert completions
  if (Array.isArray(data.choreCompletions)) {
    for (const cc of data.choreCompletions) {
      db.insert(choreCompletions).values({
        id: cc.id,
        choreId: cc.choreId ?? cc.chore_id,
        userId: cc.userId ?? cc.user_id,
        completedAt: cc.completedAt ?? cc.completed_at,
      }).run();
    }
  }

  // Re-insert todos
  if (Array.isArray(data.todos)) {
    for (const t of data.todos) {
      db.insert(todos).values({
        id: t.id,
        title: t.title,
        notes: t.notes || null,
        category: t.category || null,
        dueDate: t.dueDate ?? t.due_date ?? null,
        priority: t.priority || null,
        assigneeId: t.assigneeId ?? t.assignee_id ?? null,
        projectId: t.projectId ?? t.project_id ?? null,
        completed: t.completed ?? false,
        completedAt: t.completedAt ?? t.completed_at ?? null,
        completedBy: t.completedBy ?? t.completed_by ?? null,
        createdAt: t.createdAt ?? t.created_at ?? new Date().toISOString(),
        createdBy: t.createdBy ?? t.created_by ?? null,
      }).run();
    }
  }

  // Re-insert projects
  if (Array.isArray(data.projects)) {
    for (const p of data.projects) {
      db.insert(projects).values({
        id: p.id,
        title: p.title,
        description: p.description || null,
        status: p.status || 'backlog',
        priority: p.priority || 'medium',
        targetDate: p.targetDate ?? p.target_date ?? null,
        createdAt: p.createdAt ?? p.created_at ?? new Date().toISOString(),
        createdBy: p.createdBy ?? p.created_by ?? null,
      }).run();
    }
  }

  // Re-insert project tasks
  if (Array.isArray(data.projectTasks)) {
    for (const t of data.projectTasks) {
      db.insert(projectTasks).values({
        id: t.id,
        projectId: t.projectId ?? t.project_id,
        title: t.title,
        assigneeId: t.assigneeId ?? t.assignee_id ?? null,
        dueDate: t.dueDate ?? t.due_date ?? null,
        status: t.status || 'todo',
        showInTodos: t.showInTodos ?? t.show_in_todos ?? false,
        sortOrder: t.sortOrder ?? t.sort_order ?? 0,
      }).run();
    }
  }

  // Re-insert project notes
  if (Array.isArray(data.projectNotes)) {
    for (const n of data.projectNotes) {
      db.insert(projectNotes).values({
        id: n.id,
        projectId: n.projectId ?? n.project_id,
        contentMd: n.contentMd ?? n.content_md ?? '',
        contentHtml: n.contentHtml ?? n.content_html ?? null,
        createdAt: n.createdAt ?? n.created_at ?? new Date().toISOString(),
        updatedAt: n.updatedAt ?? n.updated_at ?? null,
        createdBy: n.createdBy ?? n.created_by ?? null,
      }).run();
    }
  }

  // Re-insert project activity
  if (Array.isArray(data.projectActivity)) {
    for (const a of data.projectActivity) {
      db.insert(projectActivity).values({
        id: a.id,
        projectId: a.projectId ?? a.project_id,
        userId: a.userId ?? a.user_id ?? null,
        action: a.action,
        details: a.details || null,
        createdAt: a.createdAt ?? a.created_at ?? new Date().toISOString(),
      }).run();
    }
  }

  // Re-insert project tags
  if (Array.isArray(data.projectTags)) {
    for (const t of data.projectTags) {
      db.insert(projectTags).values({
        id: t.id,
        projectId: t.projectId ?? t.project_id,
        tag: t.tag,
      }).run();
    }
  }

  // Re-insert project assignees
  if (Array.isArray(data.projectAssignees)) {
    for (const a of data.projectAssignees) {
      db.insert(projectAssignees).values({
        projectId: a.projectId ?? a.project_id,
        userId: a.userId ?? a.user_id,
      }).run();
    }
  }

  // Re-insert push subscriptions
  if (Array.isArray(data.pushSubscriptions)) {
    for (const s of data.pushSubscriptions) {
      db.insert(pushSubscriptions).values({
        id: s.id,
        userId: s.userId ?? s.user_id,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
        createdAt: s.createdAt ?? s.created_at ?? new Date().toISOString(),
      }).run();
    }
  }

  // Re-insert notification preferences
  if (Array.isArray(data.notificationPreferences)) {
    for (const p of data.notificationPreferences) {
      db.insert(notificationPreferences).values({
        userId: p.userId ?? p.user_id,
        morningDigest: p.morningDigest ?? p.morning_digest ?? true,
        morningDigestTime: p.morningDigestTime ?? p.morning_digest_time ?? '08:00',
        urgencyAlerts: p.urgencyAlerts ?? p.urgency_alerts ?? true,
        lastUrgencyAlert: p.lastUrgencyAlert ?? p.last_urgency_alert ?? null,
        weeklySummary: p.weeklySummary ?? p.weekly_summary ?? true,
        weeklySummaryDay: p.weeklySummaryDay ?? p.weekly_summary_day ?? 'sunday',
        weeklySummaryTime: p.weeklySummaryTime ?? p.weekly_summary_time ?? '19:00',
        lastWeeklySummary: p.lastWeeklySummary ?? p.last_weekly_summary ?? null,
      }).run();
    }
  }

  revalidatePath('/');
  revalidatePath('/chores');
  revalidatePath('/todos');
  revalidatePath('/projects');
  revalidatePath('/settings');
}
