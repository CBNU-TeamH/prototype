'use client';

import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { useDocument, useYorkie, Text } from '@yorkie-js/react';
import { DocEventType } from '@yorkie-js/sdk';
import {
  type DocRoot,
  remoteAnnotation,
  cmChangesToYorkieEdits,
  yorkieOpsToCmChanges,
} from '@/lib/yorkie-codemirror';
import {
  type CursorPresence,
  type RemotePeerCursor,
  createRemoteCursorsExtension,
  normalizeCursors,
  setRemoteCursors,
} from '@/lib/yorkie-cursors';

export default function MarkdownEditor() {
  const { doc, update, loading } = useDocument<DocRoot, CursorPresence>();
  const { client } = useYorkie();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !doc || !client || !hostRef.current) return;

    // 1) Ensure the shared Text exists. Idempotent: Yorkie serialises updates,
    //    so the `if (!content)` guard is enough even with concurrent attachers.
    update((root) => {
      if (!root.content) root.content = new Text();
    });

    const selfID = client.getID();
    const initial = doc.getRoot().content?.toString() ?? '';

    // Publish our caret/selection into presence as a stable Yorkie pos range.
    // Pre-check against the last sent range so we don't emit redundant updates.
    let lastSentSelection: string | null = null;
    const broadcastSelection = (state: EditorState) => {
      const content = doc.getRoot().content;
      if (!content) return;
      const sel = state.selection.main;
      const range = content.indexRangeToPosRange([sel.anchor, sel.head]);
      const json = JSON.stringify(range);
      if (json === lastSentSelection) return;
      lastSentSelection = json;
      update((_root, presence) => presence.set({ selection: range }));
    };

    // 2) Local edits → Yorkie + broadcast our selection. Transactions tagged
    //    remote are skipped for edits so a remote change is never echoed back.
    const syncToYorkie = EditorView.updateListener.of((vu) => {
      if (vu.docChanged) {
        for (const tr of vu.transactions) {
          if (tr.annotation(remoteAnnotation)) continue;
          const edits = cmChangesToYorkieEdits(tr.changes);
          if (edits.length === 0) continue;
          update((root) => {
            if (!root.content) return;
            for (const e of edits) root.content.edit(e.from, e.to, e.text);
          });
        }
      }
      if (vu.docChanged || vu.selectionSet) {
        broadcastSelection(vu.state);
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: initial,
        extensions: [
          basicSetup,
          markdown(),
          syncToYorkie,
          createRemoteCursorsExtension(),
        ],
      }),
      parent: hostRef.current,
    });

    // Recompute remote carets/selections from presence into current indices.
    const refreshCursors = () => {
      const content = doc.getRoot().content;
      if (!content) return;
      const peers: RemotePeerCursor[] = [];
      for (const { clientID, presence } of doc.getPresences()) {
        if (clientID === selfID || !presence.selection) continue;
        let idx: [number, number];
        try {
          idx = content.posRangeToIndexRange(presence.selection);
        } catch {
          continue; // position no longer resolvable (e.g. text removed)
        }
        peers.push({
          clientID,
          name: presence.name,
          color: presence.color,
          anchor: idx[0],
          head: idx[1],
        });
      }
      view.dispatch({
        effects: setRemoteCursors.of(normalizeCursors(peers, view.state.doc.length)),
      });
    };

    // 3) Remote edits → CodeMirror (loop-guarded), then remap peer cursors.
    const unsubscribeContent = doc.subscribe('$.content', (event) => {
      if (event.type !== DocEventType.RemoteChange) return;
      const changes = yorkieOpsToCmChanges(event.value.operations);
      if (changes.length > 0) {
        view.dispatch({ changes, annotations: remoteAnnotation.of(true) });
      }
      refreshCursors();
    });

    // 4) Remote presence (join / move / leave) → re-render peer cursors.
    const unsubscribePresence = doc.subscribe('presence', refreshCursors);

    // Render any cursors already present, and announce our initial position.
    refreshCursors();
    broadcastSelection(view.state);

    return () => {
      unsubscribeContent();
      unsubscribePresence();
      view.destroy();
    };
  }, [doc, update, loading, client]);

  return <div className="markdown-editor" ref={hostRef} />;
}
