import { db } from '@/db';
import { projects, projectTasks, projectNotes, projectActivity, projectTags, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { ProjectStatusChanger } from '@/components/ProjectStatusChanger';
import { ProjectTaskList } from '@/components/ProjectTaskList';
import { AddNoteForm } from '@/components/AddNoteForm';
import { AddTaskForm } from '@/components/AddTaskForm';
import { ProjectNoteList } from '@/components/ProjectNoteList';
import { DeleteProjectButton } from '@/components/DeleteProjectButton';

export const dynamic = 'force-dynamic';

const priorityLabel = { low: '🟢 Low', medium: '🟡 Medium', high: '🟠 High', urgent: '🔴 Urgent' };

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const pid = parseInt(projectId);
  const project = db.select().from(projects).where(eq(projects.id, pid)).get();
  if (!project) return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">Project not found</h2>
      <Link href="/projects" className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm">← Back to projects</Link>
    </div>
  );

  const tasks = db.select().from(projectTasks).where(eq(projectTasks.projectId, pid)).orderBy(projectTasks.sortOrder).all();
  const notes = db.select().from(projectNotes).where(eq(projectNotes.projectId, pid)).orderBy(desc(projectNotes.createdAt)).all();
  const activity = db.select().from(projectActivity).where(eq(projectActivity.projectId, pid)).orderBy(desc(projectActivity.createdAt)).limit(20).all();
  const tags = db.select().from(projectTags).where(eq(projectTags.projectId, pid)).all();
  const allUsers = db.select().from(users).all();
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm inline-flex items-center gap-1">
        ← Back to projects
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">{project.title}</h1>
            {project.description && <p className="text-neutral-500 dark:text-neutral-400 text-sm">{project.description}</p>}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm">{priorityLabel[project.priority as keyof typeof priorityLabel]}</span>
              {project.targetDate && <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">📅 {project.targetDate}</span>}
              {tags.map(t => (
                <span key={t.id} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{t.tag}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProjectStatusChanger projectId={project.id} currentStatus={project.status} />
            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          {totalTasks > 0 && (
            <span className="text-sm text-neutral-500 font-medium">{doneCount}/{totalTasks} done</span>
          )}
        </div>
        {totalTasks > 0 && (
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }} />
          </div>
        )}
        <ProjectTaskList tasks={tasks} />
        <AddTaskForm projectId={pid} />
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">Notes</h2>
        <AddNoteForm projectId={pid} />
        <div className="mt-4">
          <ProjectNoteList notes={notes} userMap={userMap} />
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">Activity</h2>
        <div className="space-y-2">
          {activity.map(a => (
            <div key={a.id} className="flex items-start gap-2.5 text-sm py-1">
              <span className="text-base">{a.userId && userMap[a.userId]?.avatarEmoji || '🔧'}</span>
              <div className="flex-1">
                <p className="text-neutral-600 dark:text-neutral-300">{a.details}</p>
                <p className="text-xs text-neutral-400">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-6">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
