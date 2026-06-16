'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadUser, type User } from '@/lib/user';

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

        <div className="dash-docs-header">
          <div className="dash-docs-title-group">
            <span className="dash-docs-title">Docs</span>
            <span className="dash-docs-count">1 item</span>
          </div>
          <button className="dash-newdoc" disabled title="문서 생성은 프로토타입 범위 밖">
            + New Doc
          </button>
        </div>

        {/* Decorative search/sort row (no behaviour in the prototype). */}
        <div className="dash-search-row" aria-hidden="true">
          <div className="dash-search">🔍 Search docs…</div>
          <div className="dash-sort">Sort: Date modified ▾</div>
        </div>

        <div className="dash-doc-grid">
          <button className="dash-doc-card" onClick={() => router.push('/doc/demo')}>
            <span className="dash-doc-icon">📄</span>
            <span className="dash-doc-name">demo</span>
            <span className="dash-doc-sub">실시간 협업 문서</span>
            <span className="dash-doc-meta">
              <span
                className="dash-avatar dash-avatar-sm"
                style={{ backgroundColor: user.color }}
              >
                {initial}
              </span>
              <span className="dash-doc-open">열기 →</span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
