import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import ImageResize from 'tiptap-extension-resize-image';
import { Markdown } from 'tiptap-markdown';
import { Link as LinkIcon, AtSign, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface TipTapEditorRef {
  insertMention: (username: string) => void;
  insertText: (text: string) => void;
  setContent: (content: string) => void;
}

const TipTapEditor = forwardRef<TipTapEditorRef, Props>(({ value, onChange, placeholder, className }, ref) => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    const fetchMentions = async () => {
      if (mentionQuery !== null) {
        try {
          const res = await fetch(`/api/users/search?q=${mentionQuery}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          setMentionCandidates(data.users || []);
          setShowMentions(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setShowMentions(false);
      }
    };
    
    const timer = setTimeout(fetchMentions, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const insertMention = (username: string) => {
    if (!editor) return;
    const { state } = editor;
    const { $head } = state.selection;
    const before = $head.parent.textBetween(0, $head.parentOffset, undefined, '\ufffc');
    const match = before.match(/(?:^|\s)(@[a-zA-Z0-9_]*)$/);
    if (match) {
      const queryStr = match[1];
      const from = $head.pos - queryStr.length;
      const to = $head.pos;
      editor.chain().focus().insertContentAt({ from, to }, `@${username} `).run();
    } else {
      editor.chain().focus().insertContent(`@${username} `).run();
    }
    setMentionQuery(null);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LinkExtension.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      ImageResize.configure({ inline: true }),
      Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
      Markdown.configure({ html: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        dir: 'auto',
        className: 'prose prose-invert prose-lg max-w-none w-full text-base sm:text-lg focus:outline-none outline-none prose-a:text-primary-400 prose-a:underline hover:prose-a:text-primary-300',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      forceUpdate();
    },
    onTransaction: ({ editor }) => {
      forceUpdate();
      
      const { state } = editor;
      const { selection } = state;
      const { $head } = selection;
      const before = $head.parent.textBetween(0, $head.parentOffset, undefined, '\ufffc');
      const match = before.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
      if (match) {
        setMentionQuery(match[1]);
      } else {
        setMentionQuery(null);
      }
    },
    onSelectionUpdate: () => {
      forceUpdate();
    }
  });

  const insertText = (text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  };

  const setContent = (content: string) => {
    if (!editor) return;
    editor.commands.setContent(content);
  };

  useEffect(() => {
    if (editor && value) {
       const currentHTML = editor.getHTML();
       // Also check markdown to prevent infinite loops if value is passed as markdown initially
       const currentMarkdown = typeof (editor.storage as any).markdown?.getMarkdown === 'function' ? (editor.storage as any).markdown.getMarkdown() : '';
       
       if (value !== currentHTML && value !== currentMarkdown) {
          editor.commands.setContent(value);
       }
    } else if (editor && !value && editor.getHTML() !== '<p></p>') {
       editor.commands.setContent('');
    }
  }, [value, editor]);

  useImperativeHandle(ref, () => ({
    insertMention,
    insertText,
    setContent
  }));

  if (!editor) {
    return null;
  }

  return (
    <div className={`relative flex-1 flex flex-col ${className || ''}`}>
      {/* Mentions Dropdown */}
      <AnimatePresence>
        {showMentions && mentionCandidates.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 left-4 mb-2 w-64 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-700">
              Mention User
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {mentionCandidates.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    insertMention(member.username || member.name);
                    setShowMentions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-primary-600 hover:text-white text-neutral-200 text-sm transition-colors flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                    <img 
                      src={member.avatarUrl || `https://picsum.photos/seed/${member.id}/100/100`} 
                      alt={member.name || member.username} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <span className="font-medium">{member.name || member.username}</span>
                  {member.username && <span className="text-xs opacity-70">@{member.username}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-1 bg-neutral-950/50 p-1.5 rounded-xl border border-neutral-800 mb-2">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Bold"
        >
          <strong className="font-serif block w-4 h-4 leading-4 text-center">B</strong>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Italic"
        >
          <em className="font-serif block w-4 h-4 leading-4 text-center">I</em>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Quote"
        >
          <span className="block w-4 h-4 leading-4 text-center">”</span>
        </button>
        <div className="w-px h-6 bg-neutral-800 my-auto mx-1" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run() }}
          className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-neutral-800 my-auto mx-1" />
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              const previousUrl = editor.getAttributes('link').href;
              setLinkUrl(previousUrl || '');
              setShowLinkPrompt(!showLinkPrompt);
            }}
            className={`p-2 rounded-lg transition-colors ${editor.isActive('link') || showLinkPrompt ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          
          {showLinkPrompt && (
            <div className="absolute top-full right-0 mt-2 p-3 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-50 flex flex-col gap-2 min-w-[250px]">
              <input
                autoFocus
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (linkUrl === '') {
                      editor.chain().focus().unsetLink().run();
                    } else {
                      let url = linkUrl;
                      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
                        url = 'https://' + url;
                      }
                      
                      if (editor.state.selection.empty && !editor.isActive('link')) {
                         const { from } = editor.state.selection;
                         editor.chain().focus().insertContent(url).setTextSelection({ from, to: from + url.length }).setLink({ href: url }).setTextSelection(from + url.length).run();
                      } else {
                         editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                      }
                    }
                    setShowLinkPrompt(false);
                  } else if (e.key === 'Escape') {
                    setShowLinkPrompt(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkPrompt(false)}
                  className="flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (linkUrl === '') {
                      editor.chain().focus().unsetLink().run();
                    } else {
                      let url = linkUrl;
                      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
                        url = 'https://' + url;
                      }
                      
                      if (editor.state.selection.empty && !editor.isActive('link')) {
                         const { from } = editor.state.selection;
                         editor.chain().focus().insertContent(url).setTextSelection({ from, to: from + url.length }).setLink({ href: url }).setTextSelection(from + url.length).run();
                      } else {
                         editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                      }
                    }
                    setShowLinkPrompt(false);
                  }}
                  className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500/50 transition-shadow min-h-[500px] flex flex-col">
        <EditorContent 
          editor={editor} 
          className="flex-1 w-full p-5 text-white overflow-y-auto custom-scrollbar relative [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[460px] [&_.ProseMirror]:h-full [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-neutral-300 [&_blockquote]:bg-neutral-800/30 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg" 
        />
      </div>
    </div>
  );
});

export default TipTapEditor;
