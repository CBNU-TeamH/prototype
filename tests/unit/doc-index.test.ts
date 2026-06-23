import { describe, it, expect } from 'vitest';
import { makeDocKey, appendDoc, groupParticipantsByDoc, type DocMeta, type DocIndexPresence } from '@/lib/doc-index';

const DOC_KEY_RE = /^[a-z0-9-]{1,64}$/;

describe('makeDocKey', () => {
  it('produces a key matching /^[a-z0-9-]{1,64}$/', () => {
    const key = makeDocKey();
    expect(key).toMatch(DOC_KEY_RE);
  });

  it('produces keys of length at most 64', () => {
    for (let i = 0; i < 20; i++) {
      expect(makeDocKey().length).toBeLessThanOrEqual(64);
    }
  });

  it('produces unique keys across repeated calls', () => {
    // Generate 50 keys and check for no duplicates.
    const keys = Array.from({ length: 50 }, () => makeDocKey());
    const unique = new Set(keys);
    expect(unique.size).toBe(50);
  });
});

describe('appendDoc', () => {
  const base: DocMeta[] = [{ docKey: 'doc-aaa', title: 'Alpha', createdAt: 1000 }];

  it('appends a new doc to the list', () => {
    const meta: DocMeta = { docKey: 'doc-bbb', title: 'Beta', createdAt: 2000 };
    const result = appendDoc(base, meta);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(meta);
  });

  it('does not mutate the original array', () => {
    const meta: DocMeta = { docKey: 'doc-ccc', title: 'Gamma', createdAt: 3000 };
    appendDoc(base, meta);
    expect(base).toHaveLength(1);
  });

  it('rejects a duplicate docKey — returns the original list unchanged', () => {
    const duplicate: DocMeta = { docKey: 'doc-aaa', title: 'Dupe', createdAt: 9999 };
    const result = appendDoc(base, duplicate);
    // Same reference means no new array was created.
    expect(result).toBe(base);
    expect(result).toHaveLength(1);
  });

  it('handles an empty list', () => {
    const meta: DocMeta = { docKey: 'doc-x', title: 'X', createdAt: 1 };
    const result = appendDoc([], meta);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(meta);
  });
});

describe('groupParticipantsByDoc', () => {
  it('groups presences by activeDocKey', () => {
    const presences: { clientID: string; presence: DocIndexPresence }[] = [
      { clientID: 'a', presence: { name: '재훈', color: '#0ea5e9', activeDocKey: 'demo' } },
      { clientID: 'b', presence: { name: '동현', color: '#f97316', activeDocKey: 'demo' } },
      { clientID: 'c', presence: { name: '지수', color: '#22c55e', activeDocKey: 'doc-abc' } },
    ];
    const map = groupParticipantsByDoc(presences);

    expect(map.get('demo')).toHaveLength(2);
    expect(map.get('demo')).toEqual([
      { clientID: 'a', name: '재훈', color: '#0ea5e9' },
      { clientID: 'b', name: '동현', color: '#f97316' },
    ]);
    expect(map.get('doc-abc')).toHaveLength(1);
    expect(map.get('doc-abc')?.[0]).toEqual({ clientID: 'c', name: '지수', color: '#22c55e' });
  });

  it('excludes presences without activeDocKey from all groups', () => {
    const presences: { clientID: string; presence: DocIndexPresence }[] = [
      { clientID: 'a', presence: { name: '재훈', color: '#0ea5e9', activeDocKey: 'demo' } },
      { clientID: 'b', presence: { name: '대시보드', color: '#f97316' } }, // no activeDocKey
    ];
    const map = groupParticipantsByDoc(presences);

    expect(map.get('demo')).toHaveLength(1);
    // 'b' must not appear in any group
    const allClients = [...map.values()].flat().map((p) => p.clientID);
    expect(allClients).not.toContain('b');
  });

  it('returns an empty map for empty input', () => {
    const map = groupParticipantsByDoc([]);
    expect(map.size).toBe(0);
  });

  it('returns an empty map when all presences lack activeDocKey', () => {
    const presences: { clientID: string; presence: DocIndexPresence }[] = [
      { clientID: 'x', presence: { name: '방문자', color: '#a855f7' } },
    ];
    const map = groupParticipantsByDoc(presences);
    expect(map.size).toBe(0);
  });
});
