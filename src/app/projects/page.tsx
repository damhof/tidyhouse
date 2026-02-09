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

      <KanbanBoard projects={allProjects} tags={allTags} />
    </div>
  );
}
