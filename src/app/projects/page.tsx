import { db } from '@/db';
import { projects, projectTags, users } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { CreateProjectButton } from '@/components/CreateProjectButton';
import { KanbanBoard } from '@/components/KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const allProjects = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
  const allTags = db.select().from(projectTags).all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Projects</h1>
        <CreateProjectButton />
      </div>

      {allProjects.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-300">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to organize bigger tasks!</p>
        </div>
      ) : (
        <KanbanBoard projects={allProjects} tags={allTags} />
      )}
    </div>
  );
}
