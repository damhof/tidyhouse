import { db } from '@/db';
import { users, rooms, chores, choreCompletions, todos, projects, projectTasks, projectNotes, projectActivity, projectTags, projectAssignees, pushSubscriptions, notificationPreferences } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    users: db.select().from(users).all(),
    rooms: db.select().from(rooms).all(),
    chores: db.select().from(chores).all(),
    choreCompletions: db.select().from(choreCompletions).all(),
    todos: db.select().from(todos).all(),
    projects: db.select().from(projects).all(),
    projectTasks: db.select().from(projectTasks).all(),
    projectNotes: db.select().from(projectNotes).all(),
    projectActivity: db.select().from(projectActivity).all(),
    projectTags: db.select().from(projectTags).all(),
    projectAssignees: db.select().from(projectAssignees).all(),
    pushSubscriptions: db.select().from(pushSubscriptions).all(),
    notificationPreferences: db.select().from(notificationPreferences).all(),
  };

  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tidyhouse-backup-${date}.json"`,
    },
  });
}
