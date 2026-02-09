import { db } from '@/db';
import { projects, projectTasks, projectNotes, projectActivity } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { ReviewWizard } from '@/components/ReviewWizard';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  // Get active and waiting projects
  const reviewableProjects = db
    .select()
    .from(projects)
    .where(inArray(projects.status, ['active', 'waiting']))
    .orderBy(desc(projects.createdAt))
    .all();

  // Gather tasks, latest note, and recent activity for each project
  const projectsWithData = reviewableProjects.map((project) => {
    const tasks = db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, project.id))
      .all();

    const latestNote = db
      .select()
      .from(projectNotes)
      .where(eq(projectNotes.projectId, project.id))
      .orderBy(desc(projectNotes.createdAt))
      .limit(1)
      .get();

    const recentActivity = db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, project.id))
      .orderBy(desc(projectActivity.createdAt))
      .limit(5)
      .all();

    const doneCount = tasks.filter((t) => t.status === 'done').length;

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      priority: project.priority,
      tasksDone: doneCount,
      tasksTotal: tasks.length,
      latestNoteHtml: latestNote?.contentHtml ?? null,
      latestNoteDate: latestNote?.createdAt ?? null,
      recentActivity: recentActivity.map((a) => ({
        action: a.action,
        details: a.details,
        createdAt: a.createdAt,
      })),
    };
  });

  return (
    <div className="max-w-2xl mx-auto">
      <ReviewWizard projects={projectsWithData} />
    </div>
  );
}
