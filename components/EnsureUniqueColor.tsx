'use client';

import { useEffect } from 'react';
import { useDocument, useYorkie } from '@yorkie-js/react';
import { pickUnusedColor, saveUser } from '@/lib/user';
import type { DocRoot } from '@/lib/yorkie-codemirror';
import type { CursorPresence } from '@/lib/yorkie-cursors';

/**
 * Keeps each peer's presence color unique. Colors are picked randomly on the
 * entry screen (before joining, so peers are unknown), which can collide.
 *
 * Resolution is deterministic and runs off Yorkie presence: among clients
 * sharing a color, only the smallest `clientID` keeps it; everyone else yields
 * to an unused color. This converges without flapping, and a peer leaving frees
 * its color automatically (presence is cleared on disconnect). Renders nothing.
 */
export default function EnsureUniqueColor() {
  const { presences, update } = useDocument<DocRoot, CursorPresence>();
  const { client } = useYorkie();

  useEffect(() => {
    const myID = client?.getID();
    if (!myID) return;

    const me = presences.find((p) => p.clientID === myID);
    const myColor = me?.presence.color;
    if (!myColor) return;

    const others = presences.filter((p) => p.clientID !== myID);
    const yieldColor = others.some(
      (p) => p.presence.color === myColor && p.clientID < myID,
    );
    if (!yieldColor) return;

    const color = pickUnusedColor(others.map((p) => p.presence.color));
    update((_root, presence) => presence.set({ color }));
    saveUser({ name: me.presence.name, color });
  }, [presences, update, client]);

  return null;
}
