'use client';

import { updateProjectStatus } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useState, DragEvent } from 'react';
import Link from 'next/link';

type Project = {
  id: number; title: string; description: string | null;
  status: string; priority: string; targetDate: string | null;
  createdAt: string;
};
type Tag = { id: number; projectId: number; tag: string };

const statusConfig = {
  backlog: { label: 'Backlog', emoji: '📥', headerColor: 'bg-warm-200/80 dark:bg-warm-600/80 text-warm-700 dark:text-warm-300' },
  active: { label: 'Active', emoji: '🔵', headerColor: 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  waiting: { label: 'Waiting', emoji: '⏳', headerColor: 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  done: { label: 'Done', emoji: '✅', headerColor: 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
};

const priorityIcon: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
const columns: (keyof typeof statusConfig)[] = ['backlog', 'active', 'waiting', 'done'];

export function KanbanBoard({ projects, tags }: { projects: Project[]; tags: Tag[] }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, projectId: number) => {
    setDraggedId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId.toString());
  };

  const handleDragOver = (e: DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: DragEvent, status: string) => {
    e.preventDefault();
    const projectId = parseInt(e.dataTransfer.getData('text/plain'));
    setDraggedId(null);
    setDragOverCol(null);
    if (!projectId) return;
    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== status) {
      await updateProjectStatus(projectId, status);
      router.refresh();
    }
  };

  return (
    <>
      {/* Mobile: grouped list */}
      <div className="md:hidden space-y-6">
        {columns.map(status => {
          const filtered = projects.filter(p => p.status === status);
          if (filtered.length === 0 && status === 'done') return null;
          const cfg = statusConfig[status];
          return (
            <div key={status}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-3 py-1.5 rounded-xl ${cfg.headerColor} inline-flex items-center gap-1.5`}>
                {cfg.emoji} {cfg.label} ({filtered.length})
              </h2>
              <div className="space-y-2">
                {filtered.map(p => (
                  <ProjectCard key={p.id} project={p} tags={tags.filter(t => t.projectId === p.id)} />
                ))}
                {filtered.length === 0 && <p className="text-sm text-warm-400 py-4 text-center">No projects</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: kanban with drag-and-drop */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {columns.map(status => {
          const filtered = projects.filter(p => p.status === status);
          const cfg = statusConfig[status];
          const isOver = dragOverCol === status;
          return (
            <div key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              className={`space-y-2 rounded-2xl p-2 transition-all duration-200 ${
                isOver ? 'bg-sage-50/50 dark:bg-sage-900/10 ring-2 ring-sage-400/50 ring-dashed' : ''
              }`}
            >
              <h2 className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-xl ${cfg.headerColor} inline-flex items-center gap-1.5`}>
                {cfg.emoji} {cfg.label} ({filtered.length})
              </h2>
              <div className="space-y-2 min-h-[120px]">
                {filtered.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    tags={tags.filter(t => t.projectId === p.id)}
                    compact
                    draggable
                    isDragging={draggedId === p.id}
                    onDragStart={(e) => handleDragStart(e, p.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProjectCard({ project, tags, compact = false, draggable = false, isDragging = false, onDragStart, onDragEnd }: {
  project: Project; tags: Tag[]; compact?: boolean;
  draggable?: boolean; isDragging?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}) {
  const pi = priorityIcon[project.priority] || '🟡';
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart as any}
      onDragEnd={onDragEnd}
      className={`block bg-white dark:bg-warm-800 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700 transition-all duration-200 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md hover:-translate-y-0.5'}`}
    >
      <Link href={`/projects/${project.id}`} className="block">
        <div className="flex items-start gap-2">
          <span className="text-sm">{pi}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-warm-800 dark:text-warm-100 ${compact ? 'text-sm' : ''}`}>{project.title}</p>
            {!compact && project.description && (
              <p className="text-xs text-warm-500 mt-0.5 line-clamp-2">{project.description}</p>
            )}
            {tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {tags.map(t => (
                  <span key={t.id} className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400 px-2 py-0.5 rounded-full">{t.tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
