import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  avatarEmoji: text('avatar_emoji').notNull(),
});

export const rooms = sqliteTable('rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const chores = sqliteTable('chores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull().references(() => rooms.id),
  name: text('name').notNull(),
  frequencyDays: integer('frequency_days').notNull(),
  effort: text('effort', { enum: ['quick', 'medium', 'intensive'] }).notNull().default('medium'),
  pinnedDays: text('pinned_days'),  // comma-separated day numbers (0=Sun, 1=Mon, ..., 6=Sat) or null
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const choreCompletions = sqliteTable('chore_completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  choreId: integer('chore_id').notNull().references(() => chores.id),
  userId: integer('user_id').notNull().references(() => users.id),
  completedAt: text('completed_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  notes: text('notes'),
  category: text('category'),
  dueDate: text('due_date'),
  priority: text('priority'),
  assigneeId: integer('assignee_id').references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at'),
  completedBy: integer('completed_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: integer('created_by').references(() => users.id),
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['backlog', 'active', 'waiting', 'done'] }).notNull().default('backlog'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  targetDate: text('target_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: integer('created_by').references(() => users.id),
});

export const projectAssignees = sqliteTable('project_assignees', {
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
});

export const projectTags = sqliteTable('project_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  tag: text('tag').notNull(),
});

export const projectNotes = sqliteTable('project_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

export const projectTasks = sqliteTable('project_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  assigneeId: integer('assignee_id').references(() => users.id),
  dueDate: text('due_date'),
  status: text('status', { enum: ['todo', 'done'] }).notNull().default('todo'),
  showInTodos: integer('show_in_todos', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#7C9A82'),
});

export const todoTags = sqliteTable('todo_tags', {
  todoId: integer('todo_id').notNull().references(() => todos.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: integer('user_id').primaryKey().references(() => users.id),
  morningDigest: integer('morning_digest', { mode: 'boolean' }).notNull().default(true),
  morningDigestTime: text('morning_digest_time').notNull().default('08:00'),
  urgencyAlerts: integer('urgency_alerts', { mode: 'boolean' }).notNull().default(true),
  lastUrgencyAlert: text('last_urgency_alert'),
  weeklySummary: integer('weekly_summary', { mode: 'boolean' }).notNull().default(true),
  weeklySummaryDay: text('weekly_summary_day').notNull().default('sunday'),
  weeklySummaryTime: text('weekly_summary_time').notNull().default('19:00'),
  lastWeeklySummary: text('last_weekly_summary'),
});

export const projectActivity = sqliteTable('project_activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
