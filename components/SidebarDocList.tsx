'use client';

/**
 * SidebarDocList — live document list in the editor sidebar.
 *
 * Rendered inside a DocumentProvider for INDEX_DOC_KEY, so useDocIndex()
 * reads the shared document list and index presences in real time. The
 * currently open document is highlighted with the "is-active" class.
 *
 * Participant avatars are derived from index-document presences via
 * groupParticipantsByDoc — no per-document attach is needed.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/user';
import { useDocIndex } from './useDocIndex';
import DocPresenceAvatars from './DocPresenceAvatars';

type Props = {
  currentDocKey: string;
  user: User;
};

export default function SidebarDocList({ currentDocKey }: Props) {
  const router = useRouter();
  const { docs, createDoc, loading, participantsByDoc } = useDocIndex();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

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
      <div className="sidebar-title">문서</div>

      {loading
        ? null
        : docs.map((m) => (
            <div
              key={m.docKey}
              className={`sidebar-item${currentDocKey === m.docKey ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/doc/${m.docKey}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') router.push(`/doc/${m.docKey}`);
              }}
            >
              <span className="sidebar-item-title">{m.title}</span>
              <DocPresenceAvatars participants={participantsByDoc.get(m.docKey) ?? []} />
            </div>
          ))}

      {isCreating ? (
        <div className="sidebar-newdoc-row">
          <input
            className="sidebar-newdoc-input"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            onBlur={handleCreateConfirm}
            placeholder="제목 입력…"
          />
        </div>
      ) : (
        <button
          className="sidebar-newdoc-btn"
          onClick={() => {
            setIsCreating(true);
            setNewTitle('');
          }}
        >
          + 새 문서
        </button>
      )}
    </>
  );
}
