'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './TiptapEditor';
import { updateProjectStatus, addProjectNote, addProjectTask } from '@/lib/actions';
import Link from 'next/link';

interface ReviewProject {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tasksDone: number;
  tasksTotal: number;
  latestNoteHtml: string | null;
  latestNoteDate: string | null;
  recentActivity: { action: string; details: string | null; createdAt: string }[];
}

interface ProjectChanges {
  statusChanged?: string;
  noteAdded?: boolean;
  tasksAdded?: string[];
}

const statusOptions = [
  { value: 'backlog', label: '📥 Backlog' },
  { value: 'active', label: '🔵 Active' },
  { value: 'waiting', label: '⏳ Waiting' },
  { value: 'done', label: '✅ Done' },
];

const priorityLabel: Record<string, string> = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🟠 High',
  urgent: '🔴 Urgent',
};

export function ReviewWizard({ projects }: { projects: ReviewProject[] }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [changes, setChanges] = useState<Record<number, ProjectChanges>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const project = projects[currentIndex];
  const total = projects.length;

  const resetProjectState = useCallback(() => {
    setShowEditor(false);
    setNewTaskInput('');
    setPendingTasks([]);
    setSelectedStatus(null);
    setSaving(false);
  }, []);

  // Save changes for current project and advance
  const handleNext = async () => {
    if (!project) return;
    setSaving(true);

    const projectChanges: ProjectChanges = {};

    // Apply status change
    if (selectedStatus && selectedStatus !== project.status) {
      await updateProjectStatus(project.id, selectedStatus);
      projectChanges.statusChanged = selectedStatus;
    }

    // Add tasks
    if (pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        await addProjectTask(project.id, task);
      }
      projectChanges.tasksAdded = pendingTasks;
    }

    // If any changes were made, auto-create a review journal entry
    const hasChanges = projectChanges.statusChanged || projectChanges.noteAdded || (projectChanges.tasksAdded && projectChanges.tasksAdded.length > 0);
    if (hasChanges) {
      const parts: string[] = [`<p><strong>📋 Monday Review</strong></p>`];
      if (projectChanges.statusChanged) {
        parts.push(`<p>Status → ${projectChanges.statusChanged}</p>`);
      }
      if (projectChanges.tasksAdded && projectChanges.tasksAdded.length > 0) {
        parts.push(`<p>Added ${projectChanges.tasksAdded.length} task(s): ${projectChanges.tasksAdded.join(', ')}</p>`);
      }
      if (projectChanges.noteAdded) {
        parts.push(`<p>Note added during review</p>`);
      }
      await addProjectNote(project.id, parts.join(''));
    }

    if (hasChanges) {
      setChanges((prev) => ({ ...prev, [project.id]: projectChanges }));
    }

    resetProjectState();

    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const handleSkip = () => {
    resetProjectState();
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const handleNoteSave = async (html: string) => {
    if (!project) return;
    await addProjectNote(project.id, html);
    setShowEditor(false);
    setChanges((prev) => ({
      ...prev,
      [project.id]: { ...prev[project.id], noteAdded: true },
    }));
  };

  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    setPendingTasks((prev) => [...prev, trimmed]);
    setNewTaskInput('');
  };

  // Empty state
  if (total === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">No projects to review</h2>
        <p className="text-neutral-500 text-sm">All projects are in Backlog or Done status.</p>
        <Link href="/projects" className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  // Summary screen
  if (done) {
    const changedProjects = projects.filter((p) => changes[p.id]);
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <p className="text-5xl mb-3">✅</p>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Review Complete</h2>
          <p className="text-neutral-500 mt-1">Reviewed {total} project{total !== 1 ? 's' : ''}</p>
        </div>

        {changedProjects.length > 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">Changes made</h3>
            {changedProjects.map((p) => {
              const c = changes[p.id];
              return (
                <div key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 pb-2 last:pb-0">
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">{p.title}</p>
                  <div className="text-sm text-neutral-500 space-y-0.5 mt-1">
                    {c.statusChanged && <p>Status → {c.statusChanged}</p>}
                    {c.noteAdded && <p>📝 Note added</p>}
                    {c.tasksAdded && c.tasksAdded.length > 0 && (
                      <p>➕ {c.tasksAdded.length} task(s) added</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm border border-neutral-200 dark:border-neutral-800 text-center text-neutral-500 text-sm">
            No changes were made during this review.
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/projects" className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Wizard step
  return (
    <div className="space-y-5 py-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/projects" className="text-emerald-600 dark:text-emerald-400 hover:underline">← Exit review</Link>
        <span className="font-medium">Project {currentIndex + 1} of {total}</span>
      </div>
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Project card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-5">
        {/* Title & meta */}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
              {project.status}
            </span>
            <span className="text-xs">{priorityLabel[project.priority] || project.priority}</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{project.title}</h2>
          {project.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{project.description}</p>
          )}
        </div>

        {/* Task progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">Tasks</span>
            <span className="text-neutral-500">
              {project.tasksTotal > 0 ? `${project.tasksDone}/${project.tasksTotal} done` : 'No tasks'}
            </span>
          </div>
          {project.tasksTotal > 0 && (
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(project.tasksDone / project.tasksTotal) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Latest note preview */}
        {project.latestNoteHtml && (
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Last note · {project.latestNoteDate ? new Date(project.latestNoteDate).toLocaleDateString() : ''}
            </p>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-sm bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-4 py-3 line-clamp-4"
              dangerouslySetInnerHTML={{ __html: project.latestNoteHtml }}
            />
          </div>
        )}

        {/* Recent activity */}
        {project.recentActivity.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Recent activity</p>
            <div className="space-y-1">
              {project.recentActivity.slice(0, 3).map((a, i) => (
                <p key={i} className="text-xs text-neutral-500">
                  {a.details} · {new Date(a.createdAt).toLocaleDateString()}
                </p>
              ))}
            </div>
          </div>
        )}

        <hr className="border-neutral-200 dark:border-neutral-700" />

        {/* Status update */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200 block mb-1.5">Update status</label>
          <select
            value={selectedStatus ?? project.status}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Add note */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200 block mb-1.5">Add a note</label>
          {showEditor ? (
            <TiptapEditor
              onSave={handleNoteSave}
              onCancel={() => setShowEditor(false)}
              placeholder="Write a review note..."
            />
          ) : (
            <button
              onClick={() => setShowEditor(true)}
              className="w-full p-3 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-sm"
            >
              + Write a note
            </button>
          )}
          {changes[project.id]?.noteAdded && (
            <p className="text-xs text-emerald-600 mt-1">✓ Note saved</p>
          )}
        </div>

        {/* Add tasks */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200 block mb-1.5">Add tasks</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="New task..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddTask}
              className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Add
            </button>
          </div>
          {pendingTasks.length > 0 && (
            <div className="mt-2 space-y-1">
              {pendingTasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <span>➕</span>
                  <span>{t}</span>
                  <button
                    onClick={() => setPendingTasks((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs ml-auto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSkip}
          className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : currentIndex < total - 1 ? 'Next →' : 'Finish ✓'}
        </button>
      </div>
    </div>
  );
}
