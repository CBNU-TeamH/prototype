'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { YorkieProvider, DocumentProvider, type Text } from '@yorkie-js/react';
import { loadUser, type User } from '@/lib/user';
import PresenceBar from './PresenceBar';

type DocRoot = { content?: Text };

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
    <YorkieProvider rpcAddr={process.env.NEXT_PUBLIC_YORKIE_RPC_ADDR!}>
      <DocumentProvider<DocRoot, User>
        docKey={docKey}
        initialRoot={{}}
        initialPresence={user}
      >
        <div className="app-shell">
          <aside className="app-sidebar" aria-label="문서 목록">
            <div className="sidebar-title">문서</div>
            <div className="sidebar-item is-active">demo</div>
            <div className="sidebar-hint">Phase 3에서 확장</div>
          </aside>
          <div className="app-main">
            <PresenceBar />
            <section className="editor-body">
              <p className="editor-placeholder">에디터는 Phase 3에서 구현됩니다.</p>
            </section>
          </div>
        </div>
      </DocumentProvider>
    </YorkieProvider>
  );
}
