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
  type NormalizedCursor,
  type RemotePeerCursor,
  createRemoteCursorsExtension,
  createLineBlockExtension,
  normalizeCursors,
  setRemoteCursors,
  remoteOccupiedLines,
  firstUnoccupiedLineStart,
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

    // Live getter for the local user's presence color — used by localLineField
    // to tint the local caret line border with the occupant's own color.
    const getLocalColor = () =>
      doc.getPresences().find((p) => p.clientID === selfID)?.presence.color;

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
          createLineBlockExtension(getLocalColor),
        ],
      }),
      parent: hostRef.current,
    });

    // Collect the latest set of remote cursors from presence into current indices.
    // Pure snapshot — does not dispatch anything. Used by both refreshCursors and
    // the initial caret placement logic below.
    const collectRemoteCursors = (): NormalizedCursor[] => {
      const content = doc.getRoot().content;
      if (!content) return [];
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
      return normalizeCursors(peers, view.state.doc.length);
    };

    // Recompute remote carets/selections from presence and dispatch to the view.
    const refreshCursors = () => {
      view.dispatch({ effects: setRemoteCursors.of(collectRemoteCursors()) });
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

    // Render any cursors already present, then place our initial caret on the
    // first line not already occupied by a remote peer (scanning top to bottom).
    // Falls back to line 1 (offset 0) when every line is taken.
    refreshCursors();
    // 다른 유저가 점유하지 않은 첫 줄에서 시작 (위에서부터). 빈 줄 없으면 1번 줄 유지.
    const occupied = remoteOccupiedLines(collectRemoteCursors(), view.state.doc);
    const initialHead = firstUnoccupiedLineStart(view.state.doc, occupied);
    if (initialHead !== 0) {
      view.dispatch({ selection: { anchor: initialHead, head: initialHead } });
    }
    broadcastSelection(view.state);

    return () => {
      unsubscribeContent();
      unsubscribePresence();
      view.destroy();
    };
  }, [doc, update, loading, client]);

  return <div className="markdown-editor" ref={hostRef} />;
}
