'use client';

/**
 * DashboardDocList — live document grid on the dashboard.
 *
 * Rendered inside a DocumentProvider for INDEX_DOC_KEY, so useDocIndex()
 * reads the shared document list and index presences in real time. New
 * documents created here are instantly visible to all other clients.
 *
 * Participant avatars are derived from index-document presences via
 * groupParticipantsByDoc — no per-document attach is needed.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/user';
import { useDocIndex } from './useDocIndex';
import DocPresenceAvatars from './DocPresenceAvatars';

type Props = { user: User };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DashboardDocList(_props: Props) {
  const router = useRouter();
  const { docs, createDoc, loading, participantsByDoc } = useDocIndex();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  function handleNewDocClick() {
    setIsCreating(true);
    setNewTitle('');
  }

  function handleCreateConfirm() {
    if (!newTitle.trim()) {
      setIsCreating(false);
      return;
    }
    const docKey = createDoc(newTitle);
    setIsCreating(false);
    setNewTitle('');
    router.push(`/doc/${docKey}`);
  }

  function handleCreateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCreateConfirm();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTitle('');
    }
  }

  return (
    <>
      <div className="dash-docs-header">
        <div className="dash-docs-title-group">
          <span className="dash-docs-title">Docs</span>
          <span className="dash-docs-count">{loading ? '…' : `${docs.length} item`}</span>
        </div>
        {isCreating ? (
          <div className="dash-newdoc-row">
            <input
              className="dash-newdoc-input"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={handleCreateConfirm}
              placeholder="문서 제목 입력…"
            />
          </div>
        ) : (
          <button className="dash-newdoc" onClick={handleNewDocClick}>
            + New Doc
          </button>
        )}
      </div>

      {/* Decorative search/sort row (no behaviour in the prototype). */}
      <div className="dash-search-row" aria-hidden="true">
        <div className="dash-search">🔍 Search docs…</div>
        <div className="dash-sort">Sort: Date modified ▾</div>
      </div>

      <div className="dash-doc-grid">
        {docs.map((m) => (
          <button
            key={m.docKey}
            className="dash-doc-card"
            onClick={() => router.push(`/doc/${m.docKey}`)}
          >
            <span className="dash-doc-icon">📄</span>
            <span className="dash-doc-name">{m.title}</span>
            <span className="dash-doc-sub">실시간 협업 문서</span>
            <span className="dash-doc-meta">
              <DocPresenceAvatars participants={participantsByDoc.get(m.docKey) ?? []} />
              <span className="dash-doc-open">열기 →</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
