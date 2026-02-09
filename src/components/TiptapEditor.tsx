'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';

interface TiptapEditorProps {
  content?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

function ToolbarButton({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-sm rounded transition-colors ${
        active
          ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300'
          : 'text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-700'
      }`}
    >
      {children}
    </button>
  );
}

export function TiptapEditor({ content = '', onSave, onCancel, placeholder = 'Write a note...' }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[120px] outline-none px-4 py-3',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleSave = () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (html === '<p></p>' || !html.trim()) return;
    onSave(html);
  };

  if (!editor) return null;

  return (
    <div className="border border-warm-200 dark:border-warm-700 rounded-xl overflow-hidden bg-white dark:bg-warm-800 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-700/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >H1</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >H2</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >H3</ToolbarButton>

        <div className="w-px bg-warm-200 dark:bg-warm-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        ><strong>B</strong></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        ><em>I</em></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        ><code className="text-xs">{'{}'}</code></ToolbarButton>

        <div className="w-px bg-warm-200 dark:bg-warm-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >• List</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >1. List</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          title="Checklist"
        >☑ Tasks</ToolbarButton>

        <div className="w-px bg-warm-200 dark:bg-warm-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >" Quote</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >{'</>'}</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >―</ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Link"
        >🔗</ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Actions */}
      <div className="flex gap-2 justify-end px-3 py-2 border-t border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-1.5 text-sm bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-medium transition-colors"
        >
          Save note
        </button>
      </div>
    </div>
  );
}
