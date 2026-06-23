'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { YorkieProvider, DocumentProvider } from '@yorkie-js/react';
import { loadUser, type User } from '@/lib/user';
import { INDEX_DOC_KEY } from '@/lib/doc-index';
import type { DocIndexRoot, DocIndexPresence } from '@/lib/doc-index';
import DashboardDocList from './DashboardDocList';

/**
 * Dashboard (WorkSpace Overview). Sits between the entry screen and the editor:
 * `/` → nickname → `/dashboard` → click doc card → `/doc/demo`.
 *
 * The prototype has a single document and no backend, so the wireframe's
 * folders/storage/files/members are intentionally decorative or omitted — only
 * the real `demo` doc card navigates. Guard: no nickname → back to `/`.
 *
 * Loaded with `ssr: false` (see app/dashboard/page.tsx), so reading the user
 * via a lazy initializer is safe and avoids a hydration mismatch.
 */
export default function DashboardView() {
  const router = useRouter();
  const [user] = useState<User | null>(() => loadUser());

  // No nickname → bounce back to the entry screen (guard).
  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const initial = user.name.slice(0, 1);

  return (
    <main className="dashboard">
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <span className="dash-logo">LG</span>
          <span className="dash-nav-divider" />
          <span className="dash-workspace-label">Dashboard</span>
        </div>
        <div className="dash-nav-right">
          <span className="dash-avatar" style={{ backgroundColor: user.color }}>
            {initial}
          </span>
          <span className="dash-username">{user.name}</span>
        </div>
      </nav>

      <div className="dash-main">
        <div className="dash-ws-header">
          <span className="dash-ws-icon">🗂</span>
          <span className="dash-ws-name">Workspace</span>
        </div>

        {/* Tabs — only WorkSpace overview is real; the rest are decorative. */}
        <div className="dash-tabs">
          <span className="dash-tab is-active">WorkSpace overview</span>
          <span className="dash-tab is-disabled">Members</span>
          <span className="dash-tab is-disabled">Storage</span>
          <span className="dash-tab is-disabled">Settings</span>
        </div>

        {/*
          DashboardDocList is wrapped in Yorkie providers (lurker=true on the
          index doc). Nav / tabs / header above remain unaffected.
        */}
        <YorkieProvider rpcAddr={process.env.NEXT_PUBLIC_YORKIE_RPC_ADDR!}>
          <DocumentProvider<DocIndexRoot, DocIndexPresence>
            docKey={INDEX_DOC_KEY}
            initialPresence={{ name: user.name, color: user.color }}
          >
            <DashboardDocList user={user} />
          </DocumentProvider>
        </YorkieProvider>
      </div>
    </main>
  );
}
