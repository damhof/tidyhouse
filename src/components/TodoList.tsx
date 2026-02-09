'use client';

import { completeTodo, uncompleteTodo, deleteTodo, toggleProjectTask, updateTodo, setTodoTags } from '@/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tag = { id: number; name: string; color: string };
type Todo = {
  id: number; title: string; notes: string | null; category: string | null;
  dueDate: string | null; assigneeId: number | null; projectId: number | null;
  completed: boolean | null; completedAt: string | null; completedBy: number | null;
  createdAt: string; priority?: string | null;
  isProjectTask?: boolean; projectTitle?: string; projectColor?: string;
  tags?: Tag[];
};
type User = { id: number; name: string; avatarEmoji: string };
type Project = { id: number; title: string };

export function TodoList({ todos, users, projects, tags: allTags, label, defaultCollapsed = false }: {
  todos: Todo[]; users: User[]; projects: Project[]; tags?: Tag[]; label: string; defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const router = useRouter();
  const [completing, setCompleting] = useState<number | null>(null);

  const handleToggle = async (todo: Todo) => {
    setCompleting(todo.id);
    if (todo.isProjectTask) {
      await toggleProjectTask(todo.id);
    } else if (todo.completed) {
      await uncompleteTodo(todo.id);
    } else {
      await completeTodo(todo.id);
    }
    setTimeout(() => { setCompleting(null); router.refresh(); }, 300);
  };

  const priorityDot: Record<string, string> = {
    low: 'bg-blue-400',
    medium: 'bg-amber-400',
    high: 'bg-red-500',
  };

  const priorityLabel: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-semibold text-warm-500 dark:text-warm-400 mb-3 hover:text-warm-700 dark:hover:text-warm-200 transition-colors">
        <span className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        {label} ({todos.length})
      </button>
      {!collapsed && (
        <div className="animate-fade-in">
          {todos.length === 0 && (
            <div className="text-center py-10 text-warm-400">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium">All done! Nothing here.</p>
              <p className="text-sm mt-1">Time for a break ☕</p>
            </div>
          )}

          {/* Mobile: Card layout */}
          <div className="lg:hidden space-y-2">
            {todos.map(todo => {
              const isCompleting = completing === todo.id;
              const isExpanded = expandedId === todo.id && !todo.isProjectTask;
              const itemKey = todo.isProjectTask ? `pt-${todo.id}` : `todo-${todo.id}`;
              return (
                <div key={itemKey}>
                  <div
                    onClick={() => !todo.isProjectTask && setExpandedId(isExpanded ? null : todo.id)}
                    className={`flex items-start gap-3 rounded-2xl p-4 shadow-sm border group transition-all duration-200 cursor-pointer ${
                      todo.isProjectTask
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50'
                        : 'bg-white dark:bg-warm-800 border-warm-200 dark:border-warm-700'
                    } ${isCompleting ? 'scale-95 opacity-50' : ''} ${isExpanded ? 'ring-2 ring-sage-300 dark:ring-sage-700' : 'hover:shadow-md hover:-translate-y-0.5'}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(todo); }}
                      className={`w-6 h-6 mt-0.5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        todo.completed ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 dark:border-warm-500 hover:border-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/20'
                      }`}>
                      {todo.completed && <span className="text-xs animate-checkmark">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {todo.priority && priorityDot[todo.priority] && (
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot[todo.priority]}`} title={`${todo.priority} priority`} />
                        )}
                        <p className={`font-medium ${todo.completed ? 'line-through text-warm-400' : 'text-warm-800 dark:text-warm-100'}`}>{todo.title}</p>
                        {todo.isProjectTask && todo.projectTitle && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            📋 {todo.projectTitle}
                          </span>
                        )}
                      </div>
                      {todo.notes && <p className="text-xs text-warm-500 mt-1 line-clamp-2">{todo.notes}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {todo.dueDate && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            new Date(todo.dueDate) < new Date() && !todo.completed
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-warm-100 dark:bg-warm-700 text-warm-500'
                          }`}>📅 {todo.dueDate}</span>
                        )}
                        {todo.assigneeId && userMap[todo.assigneeId] && (
                          <span className="text-xs">{userMap[todo.assigneeId].avatarEmoji} {userMap[todo.assigneeId].name}</span>
                        )}
                        {todo.tags && todo.tags.length > 0 && todo.tags.map(tag => (
                          <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                        ))}
                      </div>
                    </div>
                    {!todo.isProjectTask && (
                      <button onClick={async (e) => { e.stopPropagation(); await deleteTodo(todo.id); router.refresh(); }}
                        className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-500 transition-all text-sm min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        🗑
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <InlineEditor todo={todo} users={users} projects={projects} allTags={allTags} onClose={() => setExpandedId(null)} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          {todos.length > 0 && (
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-warm-400 dark:text-warm-500 border-b border-warm-200 dark:border-warm-700">
                    <th className="py-2 pr-2 w-8"></th>
                    <th className="py-2 px-2">Title</th>
                    <th className="py-2 px-2 w-20">Priority</th>
                    <th className="py-2 px-2 w-28">Due Date</th>
                    <th className="py-2 px-2 w-28">Assignee</th>
                    <th className="py-2 px-2 w-28">Project</th>
                    <th className="py-2 px-2 w-28">Tags</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {todos.map(todo => {
                    const isCompleting = completing === todo.id;
                    const isExpanded = expandedId === todo.id && !todo.isProjectTask;
                    const itemKey = todo.isProjectTask ? `pt-${todo.id}` : `todo-${todo.id}`;
                    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
                    return (
                      <tr key={itemKey}
                        onClick={() => !todo.isProjectTask && setExpandedId(isExpanded ? null : todo.id)}
                        className={`border-b border-warm-100 dark:border-warm-800 group cursor-pointer transition-all hover:bg-warm-50 dark:hover:bg-warm-800/50 ${isCompleting ? 'opacity-50' : ''} ${isExpanded ? 'bg-sage-50/50 dark:bg-sage-900/10' : ''}`}>
                        <td className="py-2.5 pr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(todo); }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              todo.completed ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 dark:border-warm-500 hover:border-sage-400'
                            }`}>
                            {todo.completed && <span className="text-[10px]">✓</span>}
                          </button>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`${todo.completed ? 'line-through text-warm-400' : 'text-warm-800 dark:text-warm-100 font-medium'}`}>{todo.title}</span>
                            {todo.isProjectTask && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">📋</span>}
                          </div>
                          {isExpanded && (
                            <div className="mt-2" onClick={e => e.stopPropagation()}>
                              <InlineEditor todo={todo} users={users} projects={projects} allTags={allTags} onClose={() => setExpandedId(null)} />
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          {todo.priority && (
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${priorityDot[todo.priority]}`} />
                              <span className="text-xs text-warm-500">{priorityLabel[todo.priority]}</span>
                            </span>
                          )}
                        </td>
                        <td className={`py-2.5 px-2 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-warm-500'}`}>
                          {todo.dueDate || '—'}
                          {isOverdue && <span className="ml-1">⚠️</span>}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-warm-500">
                          {todo.assigneeId && userMap[todo.assigneeId] ? `${userMap[todo.assigneeId].avatarEmoji} ${userMap[todo.assigneeId].name}` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-warm-500">
                          {todo.projectId && projectMap[todo.projectId] ? projectMap[todo.projectId].title : '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex gap-1 flex-wrap">
                            {todo.tags && todo.tags.map(tag => (
                              <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          {!todo.isProjectTask && (
                            <button onClick={async (e) => { e.stopPropagation(); await deleteTodo(todo.id); router.refresh(); }}
                              className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-500 transition-all p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                              🗑
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inline Editor ─── */
function InlineEditor({ todo, users, projects, allTags, onClose }: {
  todo: Todo; users: User[]; projects: Project[]; allTags?: Tag[]; onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes || '');
  const [priority, setPriority] = useState(todo.priority || '');
  const [dueDate, setDueDate] = useState(todo.dueDate || '');
  const [assigneeId, setAssigneeId] = useState(todo.assigneeId?.toString() || '');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(todo.tags?.map(t => t.id) || []);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateTodo(todo.id, {
      title, notes: notes || null, priority: priority || null,
      dueDate: dueDate || null, assigneeId: assigneeId ? parseInt(assigneeId) : null,
    });
    await setTodoTags(todo.id, selectedTagIds);
    setSaving(false);
    router.refresh();
    onClose();
  };

  const handleDelete = async () => {
    await deleteTodo(todo.id);
    router.refresh();
    onClose();
  };

  return (
    <div className="bg-warm-50 dark:bg-warm-800/80 rounded-xl p-4 mt-2 border border-warm-200 dark:border-warm-700 space-y-3 animate-fade-in">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-sm font-medium bg-white dark:bg-warm-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes..."
        rows={2}
        className="w-full text-sm bg-white dark:bg-warm-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400 resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <select value={priority} onChange={e => setPriority(e.target.value)} className="text-xs bg-white dark:bg-warm-700 rounded-lg px-2 py-1.5 outline-none">
          <option value="">No priority</option>
          <option value="low">🔵 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-xs bg-white dark:bg-warm-700 rounded-lg px-2 py-1.5 outline-none" />
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="text-xs bg-white dark:bg-warm-700 rounded-lg px-2 py-1.5 outline-none">
          <option value="">Anyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.avatarEmoji} {u.name}</option>)}
        </select>
      </div>
      {allTags && allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-warm-400 self-center mr-1">Tags:</span>
          {allTags.map(tag => (
            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                selectedTagIds.includes(tag.id) ? 'text-white ring-2 ring-offset-1 ring-warm-400' : 'text-white/70 opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: tag.color }}>
              {tag.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-between">
        <button onClick={handleDelete} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          🗑 Delete
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-sage-500 text-white font-medium hover:bg-sage-600 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
