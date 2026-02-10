'use server';

import { db } from '@/db';
import { choreCompletions, todos, projects, projectTasks, projectNotes, projectActivity, projectTags, projectAssignees, users, tags, todoTags } from '@/db/schema';
import { requireUserId, getCurrentUserId } from './auth';
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';

// --- Chore Actions ---
export async function completeChore(choreId: number, completedAt?: string): Promise<number> {
  const userId = await requireUserId();
  
  // Validate choreId is a positive integer
  if (!Number.isInteger(choreId) || choreId <= 0) {
    throw new Error('Invalid chore ID');
  }
  
  // Verify the chore exists
  const { chores } = await import('@/db/schema');
  const chore = db.select().from(chores).where(eq(chores.id, choreId)).get();
  if (!chore) {
    throw new Error('Chore not found');
  }
  
  // Validate completedAt if provided (should not be in the future)
  if (completedAt) {
    const date = new Date(completedAt);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid completion date');
    }
    if (date > new Date()) {
      throw new Error('Completion date cannot be in the future');
    }
  }
  
  const result = db.insert(choreCompletions).values({
    choreId,
    userId,
    completedAt: completedAt || new Date().toISOString(),
  }).run();
  revalidatePath('/');
  revalidatePath('/chores');
  revalidatePath('/history');
  revalidatePath('/calendar');
  return Number(result.lastInsertRowid);
}

export async function undoChoreCompletion(completionId: number) {
  const userId = await requireUserId();
  
  // Validate completionId
  if (!Number.isInteger(completionId) || completionId <= 0) {
    throw new Error('Invalid completion ID');
  }
  
  // Verify the completion exists and belongs to this user
  const completion = db.select().from(choreCompletions).where(eq(choreCompletions.id, completionId)).get();
  if (!completion) {
    throw new Error('Completion not found');
  }
  if (completion.userId !== userId) {
    throw new Error('Cannot undo another user\'s completion');
  }
  
  db.delete(choreCompletions).where(eq(choreCompletions.id, completionId)).run();
  revalidatePath('/');
  revalidatePath('/chores');
  revalidatePath('/history');
}

// --- Suggestion Actions ---
export async function fetchSuggestedChores() {
  const userId = await getCurrentUserId();
  const { getSuggestedChores } = await import('./chores');
  return getSuggestedChores(userId);
}

export async function fetchSessionPlan(timeBudget: number) {
  const userId = await getCurrentUserId();
  const { getSessionPlan } = await import('./chores');
  return getSessionPlan(timeBudget, userId);
}

// --- Todo Actions ---
export async function createTodo(formData: FormData) {
  const userId = await requireUserId();
  const title = (formData.get('title') as string || '').trim();
  const notes = formData.get('notes') as string || null;
  const category = formData.get('category') as string || null;
  const dueDate = formData.get('dueDate') as string || null;
  const priority = formData.get('priority') as string || null;
  const assigneeIdStr = formData.get('assigneeId') as string;
  const projectIdStr = formData.get('projectId') as string;
  
  // Validate required fields
  if (!title) {
    throw new Error('Title is required');
  }
  if (title.length > 500) {
    throw new Error('Title is too long (max 500 characters)');
  }
  
  // Parse and validate optional IDs
  const assigneeId = assigneeIdStr ? parseInt(assigneeIdStr, 10) : null;
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : null;
  
  if (assigneeId !== null && (isNaN(assigneeId) || assigneeId <= 0)) {
    throw new Error('Invalid assignee');
  }
  if (projectId !== null && (isNaN(projectId) || projectId <= 0)) {
    throw new Error('Invalid project');
  }
  
  // Validate priority if provided
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    throw new Error('Invalid priority');
  }
  
  // Validate dueDate format if provided
  if (dueDate && isNaN(new Date(dueDate).getTime())) {
    throw new Error('Invalid due date');
  }

  const result = db.insert(todos).values({
    title,
    notes: notes?.trim() || null,
    category: category?.trim() || null,
    dueDate: dueDate || null,
    priority: priority || null,
    assigneeId,
    projectId,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  }).run();
  revalidatePath('/todos');
  return Number(result.lastInsertRowid);
}

export async function completeTodo(todoId: number) {
  const userId = await requireUserId();
  db.update(todos)
    .set({ completed: true, completedAt: new Date().toISOString(), completedBy: userId })
    .where(eq(todos.id, todoId))
    .run();
  revalidatePath('/todos');
}

export async function uncompleteTodo(todoId: number) {
  db.update(todos)
    .set({ completed: false, completedAt: null, completedBy: null })
    .where(eq(todos.id, todoId))
    .run();
  revalidatePath('/todos');
}

export async function updateTodo(todoId: number, data: {
  title?: string; notes?: string | null; priority?: string | null;
  dueDate?: string | null; assigneeId?: number | null; category?: string | null;
}) {
  await requireUserId();
  
  // Validate todoId
  if (!Number.isInteger(todoId) || todoId <= 0) {
    throw new Error('Invalid todo ID');
  }
  
  // Verify todo exists
  const todo = db.select().from(todos).where(eq(todos.id, todoId)).get();
  if (!todo) {
    throw new Error('Todo not found');
  }
  
  // Validate title if provided
  if (data.title !== undefined) {
    const trimmedTitle = data.title.trim();
    if (!trimmedTitle) {
      throw new Error('Title cannot be empty');
    }
    if (trimmedTitle.length > 500) {
      throw new Error('Title is too long');
    }
    data.title = trimmedTitle;
  }
  
  // Validate priority if provided
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    throw new Error('Invalid priority');
  }
  
  db.update(todos).set(data).where(eq(todos.id, todoId)).run();
  revalidatePath('/todos');
  revalidatePath('/calendar');
}

export async function deleteTodo(todoId: number) {
  await requireUserId();
  
  // Validate todoId
  if (!Number.isInteger(todoId) || todoId <= 0) {
    throw new Error('Invalid todo ID');
  }
  
  // Verify todo exists
  const todo = db.select().from(todos).where(eq(todos.id, todoId)).get();
  if (!todo) {
    throw new Error('Todo not found');
  }
  
  db.delete(todoTags).where(eq(todoTags.todoId, todoId)).run();
  db.delete(todos).where(eq(todos.id, todoId)).run();
  revalidatePath('/todos');
  revalidatePath('/calendar');
}

// --- Project Actions ---
export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const title = formData.get('title') as string;
  const description = formData.get('description') as string || null;
  const priority = (formData.get('priority') as string) || 'medium';
  const targetDate = formData.get('targetDate') as string || null;

  const result = db.insert(projects).values({
    title,
    description,
    status: 'backlog',
    priority: priority as any,
    targetDate: targetDate || null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  }).run();

  const projectId = Number(result.lastInsertRowid);

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'created',
    details: `Created project "${title}"`,
    createdAt: new Date().toISOString(),
  }).run();

  revalidatePath('/projects');
  return projectId;
}

export async function updateProjectStatus(projectId: number, status: string) {
  const userId = await requireUserId();
  db.update(projects)
    .set({ status: status as any })
    .where(eq(projects.id, projectId))
    .run();

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'status_changed',
    details: `Changed status to ${status}`,
    createdAt: new Date().toISOString(),
  }).run();

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectPriority(projectId: number, priority: string) {
  const userId = await requireUserId();
  db.update(projects)
    .set({ priority: priority as any })
    .where(eq(projects.id, projectId))
    .run();

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'priority_changed',
    details: `Changed priority to ${priority}`,
    createdAt: new Date().toISOString(),
  }).run();

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectNote(projectId: number, contentHtml: string) {
  const userId = await requireUserId();
  
  // Validate projectId
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }
  
  // Verify project exists
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Validate content (allow empty notes but limit size)
  if (typeof contentHtml !== 'string') {
    throw new Error('Invalid note content');
  }
  if (contentHtml.length > 100000) {
    throw new Error('Note content is too large');
  }
  
  db.insert(projectNotes).values({
    projectId,
    contentMd: '',
    contentHtml,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  }).run();

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'note_added',
    details: 'Added a note',
    createdAt: new Date().toISOString(),
  }).run();

  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectTask(projectId: number, title: string) {
  const userId = await requireUserId();
  
  // Validate projectId
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }
  
  // Validate title
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    throw new Error('Task title is required');
  }
  if (trimmedTitle.length > 500) {
    throw new Error('Task title is too long');
  }
  
  // Verify project exists
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw new Error('Project not found');
  }
  
  db.insert(projectTasks).values({
    projectId,
    title: trimmedTitle,
    status: 'todo',
    sortOrder: 0,
  }).run();

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'task_added',
    details: `Added task "${trimmedTitle}"`,
    createdAt: new Date().toISOString(),
  }).run();

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectTask(taskId: number) {
  const task = db.select().from(projectTasks).where(eq(projectTasks.id, taskId)).get();
  if (!task) return;
  db.delete(projectTasks).where(eq(projectTasks.id, taskId)).run();
  revalidatePath(`/projects/${task.projectId}`);
}

export async function toggleProjectTask(taskId: number) {
  const task = db.select().from(projectTasks).where(eq(projectTasks.id, taskId)).get();
  if (!task) return;
  const newStatus = task.status === 'todo' ? 'done' : 'todo';
  db.update(projectTasks)
    .set({ status: newStatus as any })
    .where(eq(projectTasks.id, taskId))
    .run();
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath('/todos');
}

export async function toggleProjectTaskShowInTodos(taskId: number) {
  const task = db.select().from(projectTasks).where(eq(projectTasks.id, taskId)).get();
  if (!task) return;
  db.update(projectTasks)
    .set({ showInTodos: !task.showInTodos })
    .where(eq(projectTasks.id, taskId))
    .run();
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath('/todos');
}

export async function purgeOldCompletedTodos() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { sql } = await import('drizzle-orm');
  db.delete(todos).where(
    and(
      eq(todos.completed, true),
      sql`${todos.completedAt} < ${cutoff}`
    )
  ).run();
}

export async function switchUser(userId: number) {
  // Validate userId
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid user ID');
  }
  
  // Verify user exists
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new Error('User not found');
  }
  
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set('tidyhouse_user', userId.toString(), {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });
  revalidatePath('/');
}

export async function deleteProjectNote(noteId: number) {
  const note = db.select().from(projectNotes).where(eq(projectNotes.id, noteId)).get();
  if (!note) return;
  db.delete(projectNotes).where(eq(projectNotes.id, noteId)).run();
  revalidatePath(`/projects/${note.projectId}`);
}

export async function updateProjectNote(noteId: number, contentHtml: string) {
  const note = db.select().from(projectNotes).where(eq(projectNotes.id, noteId)).get();
  if (!note) return;
  db.update(projectNotes).set({ contentHtml, updatedAt: new Date().toISOString() }).where(eq(projectNotes.id, noteId)).run();
  revalidatePath(`/projects/${note.projectId}`);
}

export async function addProjectTag(projectId: number, tag: string) {
  db.insert(projectTags).values({ projectId, tag }).run();
  revalidatePath(`/projects/${projectId}`);
}

export async function updateUserName(userId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 30) return;
  db.update(users).set({ name: trimmed }).where(eq(users.id, userId)).run();
  revalidatePath('/');
}

export async function getAllUsers() {
  return db.select().from(users).all();
}

// --- Tag Actions ---
export async function createTag(name: string, color: string) {
  const result = db.insert(tags).values({ name, color }).run();
  revalidatePath('/todos');
  return Number(result.lastInsertRowid);
}

export async function deleteTag(tagId: number) {
  db.delete(todoTags).where(eq(todoTags.tagId, tagId)).run();
  db.delete(tags).where(eq(tags.id, tagId)).run();
  revalidatePath('/todos');
}

export async function getAllTags() {
  return db.select().from(tags).all();
}

export async function setTodoTags(todoId: number, tagIds: number[]) {
  db.delete(todoTags).where(eq(todoTags.todoId, todoId)).run();
  for (const tagId of tagIds) {
    db.insert(todoTags).values({ todoId, tagId }).run();
  }
  revalidatePath('/todos');
}

export async function getTodoTags(todoId: number) {
  return db.select({ id: tags.id, name: tags.name, color: tags.color })
    .from(todoTags)
    .innerJoin(tags, eq(todoTags.tagId, tags.id))
    .where(eq(todoTags.todoId, todoId))
    .all();
}

export async function getChoreHistory(choreId: number, limit = 5) {
  return db.select({
    id: choreCompletions.id,
    userId: choreCompletions.userId,
    completedAt: choreCompletions.completedAt,
  })
    .from(choreCompletions)
    .where(eq(choreCompletions.choreId, choreId))
    .orderBy(sql`${choreCompletions.completedAt} DESC`)
    .limit(limit)
    .all();
}

export async function updateChoreInline(choreId: number, data: {
  name?: string; frequencyDays?: number; effort?: 'quick' | 'medium' | 'intensive'; pinnedDays?: string | null; assignedTo?: number | null;
}) {
  const { chores } = await import('@/db/schema');
  db.update(chores).set(data).where(eq(chores.id, choreId)).run();
  revalidatePath('/');
  revalidatePath('/chores');
}

export async function deleteProject(projectId: number) {
  await requireUserId();
  
  // Validate projectId
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }
  
  // Verify project exists
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Delete related data first
  db.delete(projectTasks).where(eq(projectTasks.projectId, projectId)).run();
  db.delete(projectNotes).where(eq(projectNotes.projectId, projectId)).run();
  db.delete(projectActivity).where(eq(projectActivity.projectId, projectId)).run();
  db.delete(projectTags).where(eq(projectTags.projectId, projectId)).run();
  db.delete(projectAssignees).where(eq(projectAssignees.projectId, projectId)).run();
  // Delete todos linked to project
  db.delete(todos).where(eq(todos.projectId, projectId)).run();
  db.delete(projects).where(eq(projects.id, projectId)).run();
  revalidatePath('/projects');
}
