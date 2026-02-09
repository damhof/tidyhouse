export const TODO_CATEGORIES = [
  { value: 'shopping', label: 'Shopping', emoji: '🛒', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', dot: '#F59E0B' },
  { value: 'household', label: 'Household', emoji: '🏠', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', dot: '#10B981' },
  { value: 'admin', label: 'Admin', emoji: '📄', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', dot: '#3B82F6' },
  { value: 'finance', label: 'Finance', emoji: '💰', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300', dot: '#8B5CF6' },
  { value: 'health', label: 'Health', emoji: '💊', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300', dot: '#F43F5E' },
  { value: 'social', label: 'Social', emoji: '👥', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', dot: '#06B6D4' },
  { value: 'errands', label: 'Errands', emoji: '🏃', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', dot: '#F97316' },
  { value: 'other', label: 'Other', emoji: '📌', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400', dot: '#737373' },
] as const;

export type TodoCategory = typeof TODO_CATEGORIES[number]['value'];

export function getCategoryConfig(value: string | null) {
  return TODO_CATEGORIES.find(c => c.value === value) || null;
}
