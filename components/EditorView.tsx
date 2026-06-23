'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { YorkieProvider, DocumentProvider } from '@yorkie-js/react';
import { loadUser, type User } from '@/lib/user';
import { INDEX_DOC_KEY } from '@/lib/doc-index';
import type { DocIndexRoot, DocIndexPresence } from '@/lib/doc-index';
import type { DocRoot } from '@/lib/yorkie-codemirror';
import type { CursorPresence } from '@/lib/yorkie-cursors';
import PresenceBar from './PresenceBar';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';
import EnsureUniqueColor from './EnsureUniqueColor';
import SidebarDocList from './SidebarDocList';

type Props = { docKey: string };

export default function EditorView({ docKey }: Props) {
  const router = useRouter();
  // Safe to read sessionStorage during render: this component is loaded with
  // `ssr: false`, so it only ever runs on the client.
  const [user] = useState<User | null>(() => loadUser());

  // No nickname → bounce back to the entry screen (guard ①).
  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    /*
     * Content client: attaches to the current document (docKey).
     * Only PresenceBar, MarkdownEditor, EnsureUniqueColor live under this
     * provider — they resolve their Yorkie context to the content document.
     */
    <YorkieProvider rpcAddr={process.env.NEXT_PUBLIC_YORKIE_RPC_ADDR!}>
      <DocumentProvider<DocRoot, CursorPresence>
        docKey={docKey}
        initialRoot={{}}
        initialPresence={user}
      >
        <EnsureUniqueColor />
        <div className="app-shell">
          {/*
           * Sidebar: a SEPARATE YorkieProvider (separate Yorkie client) that
           * attaches to the index document with activeDocKey set. This
           * prevents the double-attach bug where the same client would attach
           * to the same docKey twice (once via content provider, once via
           * DocParticipants inside SidebarDocList).
           *
           * - Content client  → content docKey  (1 attach)
           * - Index client    → INDEX_DOC_KEY   (1 attach)
           *
           * SidebarDocList's useDocIndex() resolves to the index provider.
           * PresenceBar/MarkdownEditor/EnsureUniqueColor (in app-main) still
           * resolve to the content provider.
           */}
          <aside className="app-sidebar" aria-label="문서 목록">
            <YorkieProvider rpcAddr={process.env.NEXT_PUBLIC_YORKIE_RPC_ADDR!}>
              <DocumentProvider<DocIndexRoot, DocIndexPresence>
                docKey={INDEX_DOC_KEY}
                initialPresence={{ name: user.name, color: user.color, activeDocKey: docKey }}
              >
                <SidebarDocList currentDocKey={docKey} user={user} />
              </DocumentProvider>
            </YorkieProvider>
          </aside>
          <div className="app-main">
            <PresenceBar />
            <section className="editor-body">
              <MarkdownEditor />
              <MarkdownPreview />
            </section>
          </div>
        </div>
      </DocumentProvider>
    </YorkieProvider>
  );
}
