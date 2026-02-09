'use server';

import { db } from '@/db';
import { choreCompletions, todos, projects, projectTasks, projectNotes, projectActivity, projectTags, projectAssignees } from '@/db/schema';
import { requireUserId, getCurrentUserId } from './auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

// --- Chore Actions ---
export async function completeChore(choreId: number): Promise<number> {
  const userId = await requireUserId();
  const result = db.insert(choreCompletions).values({
    choreId,
    userId,
    completedAt: new Date().toISOString(),
  }).run();
  revalidatePath('/');
  revalidatePath('/chores');
  revalidatePath('/history');
  return Number(result.lastInsertRowid);
}

export async function undoChoreCompletion(completionId: number) {
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
  const title = formData.get('title') as string;
  const notes = formData.get('notes') as string || null;
  const category = formData.get('category') as string || null;
  const dueDate = formData.get('dueDate') as string || null;
  const assigneeId = formData.get('assigneeId') ? parseInt(formData.get('assigneeId') as string) : null;
  const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;

  db.insert(todos).values({
    title,
    notes,
    category: category || null,
    dueDate: dueDate || null,
    assigneeId,
    projectId,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  }).run();
  revalidatePath('/todos');
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

export async function deleteTodo(todoId: number) {
  db.delete(todos).where(eq(todos.id, todoId)).run();
  revalidatePath('/todos');
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

export async function addProjectNote(projectId: number, contentHtml: string) {
  const userId = await requireUserId();
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
  db.insert(projectTasks).values({
    projectId,
    title,
    status: 'todo',
    sortOrder: 0,
  }).run();

  db.insert(projectActivity).values({
    projectId,
    userId,
    action: 'task_added',
    details: `Added task "${title}"`,
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
}

export async function switchUser(userId: number) {
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

export async function deleteProject(projectId: number) {
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
