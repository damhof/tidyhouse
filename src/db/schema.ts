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
  sortOrder: integer('sort_order').notNull().default(0),
});

export const projectActivity = sqliteTable('project_activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
