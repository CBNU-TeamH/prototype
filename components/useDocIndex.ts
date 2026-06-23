'use client';

/**
 * useDocIndex — reads and mutates the shared document index.
 *
 * Must be used inside a DocumentProvider whose docKey is INDEX_DOC_KEY.
 * The hook returns the current list of documents, a createDoc helper, and a
 * participantsByDoc map derived from index-document presences.
 *
 * Seed: on first render (or when another client has wiped the list), a
 * single "demo" document is idempotently inserted so the original demo
 * workflow continues to work.
 */

import { useEffect } from 'react';
import { useDocument, usePresences } from '@yorkie-js/react';
import {
  makeDocKey,
  appendDoc,
  groupParticipantsByDoc,
  type DocMeta,
  type DocIndexRoot,
  type DocIndexPresence,
} from '@/lib/doc-index';

export function useDocIndex() {
  const { doc, update, loading } = useDocument<DocIndexRoot, DocIndexPresence>();
  const presences = usePresences<DocIndexPresence>();

  // Idempotent seed: insert the "demo" document when the list is empty.
  // Mirrors the MarkdownEditor's content init pattern (MarkdownEditor.tsx:33).
  useEffect(() => {
    if (loading || !doc) return;
    const current = doc.getRoot().docs;
    if (!current || current.length === 0) {
      update((root) => {
        // Double-check inside the update transaction to avoid a TOCTOU race.
        if (!root.docs || root.docs.length === 0) {
          root.docs = [{ docKey: 'demo', title: 'demo', createdAt: Date.now() }];
        }
      });
    }
  }, [loading, doc, update]);

  const docs: DocMeta[] = (doc?.getRoot().docs as DocMeta[] | undefined) ?? [];

  /**
   * Creates a new document in the shared index and returns its docKey.
   * Uses appendDoc to prevent duplicate keys in concurrent creates.
   */
  function createDoc(title: string): string {
    const docKey = makeDocKey();
    const meta: DocMeta = { docKey, title: title.trim() || 'Untitled', createdAt: Date.now() };
    update((root) => {
      const existing = (root.docs as DocMeta[] | undefined) ?? [];
      const next = appendDoc(existing, meta);
      root.docs = next as typeof root.docs;
    });
    return docKey;
  }

  const participantsByDoc = groupParticipantsByDoc(presences);

  return { docs, createDoc, loading, participantsByDoc };
}
