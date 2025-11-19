/**
 * RichTextEditor Component
 * Beautiful ProseMirror-based rich text editor with markdown support
 * Features: formatting toolbar, markdown shortcuts, real-time preview
 */

import {
  Bold,
  Code,
  Edit3,
  Eye,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { exampleSetup } from 'prosemirror-example-setup';
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  schema as markdownSchema,
} from 'prosemirror-markdown';
import { Command, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils';

// Import ProseMirror styles
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-view/style/prosemirror.css';
import './prosemirror-custom.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownText, setMarkdownText] = useState(content);
  const contentRef = useRef(content);

  // Helper to run ProseMirror commands from toolbar buttons
  const runCommand = (command: Command) => {
    const view = viewRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    command(state, dispatch);
    view.focus();
  };

  // Initialize editor once on mount
  useEffect(() => {
    if (!editorRef.current) return;

    // Parse markdown content into ProseMirror document
    const doc = defaultMarkdownParser.parse(content) || markdownSchema.node('doc', null, [
      markdownSchema.node('paragraph'),
    ]);

    const state = EditorState.create({
      doc,
      plugins: exampleSetup({ schema: markdownSchema }),
    });

    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        // Convert to markdown and call onChange
        if (transaction.docChanged) {
          const markdown = defaultMarkdownSerializer.serialize(newState.doc);
          contentRef.current = markdown;
          onChange(markdown);
          setMarkdownText(markdown);
        }
      },
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update editor content when external content changes (e.g., switching notes)
  useEffect(() => {
    if (!viewRef.current) return;
    
    // Only update if content actually changed from external source (not from typing)
    if (content !== contentRef.current) {
      contentRef.current = content;
      
      const doc = defaultMarkdownParser.parse(content) || markdownSchema.node('doc', null, [
        markdownSchema.node('paragraph'),
      ]);

      const state = EditorState.create({
        doc,
        plugins: exampleSetup({ schema: markdownSchema }),
      });

      viewRef.current.updateState(state);
      setMarkdownText(content);
    }
  }, [content]);

  // Keep markdown text in sync with content prop
  useEffect(() => {
    setMarkdownText(content);
  }, [content]);

  const toggleView = () => {
    setShowMarkdown(!showMarkdown);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">
            Format:
          </span>
          <button
            type="button"
            onClick={() => runCommand(toggleMark(markdownSchema.marks.strong))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => runCommand(toggleMark(markdownSchema.marks.em))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => runCommand(toggleMark(markdownSchema.marks.code))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Code (Ctrl+`)"
          >
            <Code className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() =>
              runCommand(setBlockType(markdownSchema.nodes.heading, { level: 1 }))
            }
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() =>
              runCommand(setBlockType(markdownSchema.nodes.heading, { level: 2 }))
            }
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => runCommand(wrapIn(markdownSchema.nodes.blockquote))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Quote"
          >
            <Quote className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => runCommand(wrapInList(markdownSchema.nodes.bullet_list))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => runCommand(wrapInList(markdownSchema.nodes.ordered_list))}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleView}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
            showMarkdown
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          )}
          title={showMarkdown ? 'Switch to Rich Text' : 'Switch to Markdown'}
        >
          {showMarkdown ? (
            <>
              <Edit3 className="w-3 h-3" />
              <span>Rich Text</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Content */}
      {showMarkdown ? (
        <textarea
          value={markdownText}
          onChange={(e) => {
            setMarkdownText(e.target.value);
            onChange(e.target.value);
          }}
          className="flex-1 w-full px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 focus:outline-none resize-none"
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          className={cn(
            'flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none',
            'px-4 py-3',
            'prosemirror-editor'
          )}
          style={{ minHeight: '200px' }}
        />
      )}
    </div>
  );
}
