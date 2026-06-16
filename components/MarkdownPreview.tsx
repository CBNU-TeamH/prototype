'use client';

import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { useDocument } from '@yorkie-js/react';
import type { User } from '@/lib/user';
import type { DocRoot } from '@/lib/yorkie-codemirror';

export default function MarkdownPreview() {
  const { root } = useDocument<DocRoot, User>();
  const text = root?.content?.toString() ?? '';

  return (
    <div className="markdown-preview">
      {/* remark-breaks: single newline → <br>, so the editor's Enter line
          breaks show up in the preview (paragraphs/code blocks stay standard). */}
      <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
    </div>
  );
}
