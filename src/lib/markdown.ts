// Simple markdown to HTML converter (no external deps)
export function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<li class="ml-4 list-none flex items-center gap-1"><span class="text-green-500">☑</span> <del>$1</del></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="ml-4 list-none flex items-center gap-1"><span class="text-neutral-400">☐</span> $1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-teal-600 dark:text-teal-400 underline" target="_blank" rel="noopener">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-neutral-200 dark:border-neutral-700 my-3" />')
    // Line breaks → paragraphs
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');

  return `<p class="mb-2">${html}</p>`;
}
