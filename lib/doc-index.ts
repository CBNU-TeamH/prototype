/** Yorkie index document key — stores the shared document list (CRDT, no backend). */
export const INDEX_DOC_KEY = 'doc-index';

/** Metadata for a single collaborative document. */
export type DocMeta = {
  docKey: string;
  title: string;
  createdAt: number;
};

/** Root type of the index document. */
export type DocIndexRoot = {
  docs?: DocMeta[];
};

/**
 * Presence type for the index document.
 * Each client publishes its name, color, and optionally the document it is
 * currently viewing (`activeDocKey`). Dashboard visitors do not set
 * `activeDocKey`, so they appear in no document's participant list.
 */
export type DocIndexPresence = {
  name: string;
  color: string;
  activeDocKey?: string;
};

/**
 * Pure helper: groups presence entries by the document each client is viewing.
 * Only entries that have an `activeDocKey` are included. Returns a Map from
 * docKey → participant list ({clientID, name, color}[]).
 *
 * Pure function — unit tested in doc-index.test.ts.
 */
export function groupParticipantsByDoc(
  presences: { clientID: string; presence: DocIndexPresence }[],
): Map<string, { clientID: string; name: string; color: string }[]> {
  const map = new Map<string, { clientID: string; name: string; color: string }[]>();
  for (const { clientID, presence } of presences) {
    if (!presence.activeDocKey) continue;
    const key = presence.activeDocKey;
    const list = map.get(key) ?? [];
    list.push({ clientID, name: presence.name, color: presence.color });
    map.set(key, list);
  }
  return map;
}

/**
 * Generates a URL-safe, Yorkie-compatible document key.
 * Satisfies /^[a-z0-9-]{1,64}$/ — always lowercase alphanumeric + hyphens.
 * Example: "doc-lrzq4w-3k1f2"
 */
export function makeDocKey(): string {
  const ts = Date.now().toString(36); // base36 timestamp
  const rand = Math.random().toString(36).slice(2, 8); // 6-char random base36
  return `doc-${ts}-${rand}`;
}

/**
 * Pure helper: returns a new array with `meta` appended, unless a document
 * with the same docKey already exists (idempotent / duplicate-safe).
 */
export function appendDoc(list: DocMeta[], meta: DocMeta): DocMeta[] {
  if (list.some((d) => d.docKey === meta.docKey)) {
    return list;
  }
  return [...list, meta];
}
