'use client';

import { useState, useMemo } from 'react';
import { TodoList } from './TodoList';
import { createTag, deleteTag } from '@/lib/actions';
import { useRouter } from 'next/navigation';

type Tag = { id: number; name: string; color: string };
type Todo = {
  id: number; title: string; notes: string | null; category: string | null;
  dueDate: string | null; assigneeId: number | null; projectId: number | null;
  completed: boolean | null; completedAt: string | null; completedBy: number | null;
  createdAt: string; priority?: string | null;
  isProjectTask?: boolean; projectTitle?: string;
  tags?: Tag[];
};
type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };

type SortBy = 'priority' | 'dueDate' | 'assignee' | 'created';
type FilterBy = { assigneeId?: number; tagId?: number; status?: 'all' | 'active' | 'overdue' };

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const TAG_COLORS = ['#7C9A82', '#6B8FBF', '#C77B5A', '#9B7CB8', '#5BADB5', '#D4A843', '#E57373', '#4DB6AC'];

export function TodoSortFilter({ activeTodos, completedTodos, users, projects, allTags }: {
  activeTodos: Todo[]; completedTodos: Todo[]; users: User[]; projects: Project[]; allTags: Tag[];
}) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [filter, setFilter] = useState<FilterBy>({});
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const filtered = useMemo(() => {
    let items = [...activeTodos];
    if (filter.assigneeId) items = items.filter(t => t.assigneeId === filter.assigneeId);
    if (filter.tagId) items = items.filter(t => t.tags?.some(tag => tag.id === filter.tagId));
    if (filter.status === 'overdue') items = items.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

    // Sort
    items.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        }
        case 'assignee':
          return (a.assigneeId || 99) - (b.assigneeId || 99);
        case 'priority':
        default: {
          const pa = a.priority ? (PRIORITY_ORDER[a.priority] ?? 3) : 3;
          const pb = b.priority ? (PRIORITY_ORDER[b.priority] ?? 3) : 3;
          return pa - pb;
        }
      }
    });
    return items;
  }, [activeTodos, sortBy, filter]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    router.refresh();
  };

  const handleDeleteTag = async (tagId: number) => {
    await deleteTag(tagId);
    if (filter.tagId === tagId) setFilter(f => ({ ...f, tagId: undefined }));
    router.refresh();
  };

  const overdue = activeTodos.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="space-y-4">
      {/* Sort & Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none min-h-[38px] focus:ring-2 focus:ring-sage-400"
        >
          <option value="priority">Sort: Priority</option>
          <option value="dueDate">Sort: Due Date</option>
          <option value="assignee">Sort: Assignee</option>
          <option value="created">Sort: Created</option>
        </select>

        {/* Filter: assignee */}
        <select
          value={filter.assigneeId || ''}
          onChange={e => setFilter(f => ({ ...f, assigneeId: e.target.value ? parseInt(e.target.value) : undefined }))}
          className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none min-h-[38px] focus:ring-2 focus:ring-sage-400"
        >
          <option value="">All assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.avatarEmoji} {u.name}</option>)}
        </select>

        {/* Filter: tag */}
        {allTags.length > 0 && (
          <select
            value={filter.tagId || ''}
            onChange={e => setFilter(f => ({ ...f, tagId: e.target.value ? parseInt(e.target.value) : undefined }))}
            className="text-sm bg-warm-100 dark:bg-warm-700 rounded-xl px-3 py-2 outline-none min-h-[38px] focus:ring-2 focus:ring-sage-400"
          >
            <option value="">All tags</option>
            {allTags.map(t => <option key={t.id} value={t.id}>🏷 {t.name}</option>)}
          </select>
        )}

        {/* Overdue filter */}
        {overdue > 0 && (
          <button
            onClick={() => setFilter(f => ({ ...f, status: f.status === 'overdue' ? undefined : 'overdue' }))}
            className={`text-sm px-3 py-2 rounded-xl font-medium transition-colors min-h-[38px] ${
              filter.status === 'overdue'
                ? 'bg-red-500 text-white'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
            }`}
          >
            ⚠️ Overdue ({overdue})
          </button>
        )}

        {/* Tag manager toggle */}
        <button
          onClick={() => setShowTagManager(!showTagManager)}
          className="text-sm px-3 py-2 rounded-xl bg-warm-100 dark:bg-warm-700 hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors min-h-[38px]"
        >
          🏷 Tags
        </button>
      </div>

      {/* Tag manager */}
      {showTagManager && (
        <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 border border-warm-200 dark:border-warm-700 space-y-4 animate-fade-in">
          <h3 className="text-base font-semibold text-warm-700 dark:text-warm-200">Manage Tags</h3>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <span key={tag.id} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                {tag.name}
                <button onClick={() => handleDeleteTag(tag.id)} className="hover:opacity-70 ml-0.5 text-white/80 hover:text-white" title="Delete tag">×</button>
              </span>
            ))}
            {allTags.length === 0 && <p className="text-sm text-warm-400">No tags yet. Create one below!</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
              placeholder="New tag name"
              className="text-sm bg-warm-50 dark:bg-warm-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-sage-400 flex-1 min-w-[150px]"
            />
            <div className="flex gap-1.5">
              {TAG_COLORS.map(c => (
                <button key={c} onClick={() => setNewTagColor(c)}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${newTagColor === c ? 'ring-2 ring-offset-2 ring-sage-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  title="Select color" />
              ))}
            </div>
            <button onClick={handleCreateTag} className="text-sm px-4 py-2.5 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors min-h-[42px]">
              Add Tag
            </button>
          </div>
        </div>
      )}

      {/* Lists */}
      {filtered.length === 0 && completedTodos.length === 0 && (
        <div className="text-center py-16 text-warm-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-semibold text-warm-600 dark:text-warm-300">No to-do&apos;s yet</p>
          <p className="text-sm mt-1">Add your first task above to get started!</p>
        </div>
      )}
      {(filtered.length > 0 || completedTodos.length > 0) && (
        <>
          <TodoList todos={filtered} users={users} projects={projects} tags={allTags} label="Active" />
          {completedTodos.length > 0 && (
            <TodoList todos={completedTodos} users={users} projects={projects} tags={allTags} label="Done" defaultCollapsed />
          )}
        </>
      )}
    </div>
  );
}
