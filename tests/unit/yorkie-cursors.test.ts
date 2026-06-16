import { describe, it, expect } from 'vitest';
import { normalizeCursors, type RemotePeerCursor } from '@/lib/yorkie-cursors';

const peer = (over: Partial<RemotePeerCursor> = {}): RemotePeerCursor => ({
  clientID: 'c1',
  name: '동현',
  color: '#f97316',
  anchor: 0,
  head: 0,
  ...over,
});

describe('T3-9: normalizeCursors', () => {
  it('keeps a forward selection (anchor < head) as from/to and preserves head', () => {
    const result = normalizeCursors([peer({ anchor: 2, head: 5 })], 10);
    expect(result).toEqual([
      { clientID: 'c1', name: '동현', color: '#f97316', head: 5, from: 2, to: 5 },
    ]);
  });

  it('swaps a backward selection (anchor > head) into from <= to, head unchanged', () => {
    const result = normalizeCursors([peer({ anchor: 7, head: 3 })], 10);
    expect(result[0]).toMatchObject({ head: 3, from: 3, to: 7 });
  });

  it('clamps positions beyond the document length', () => {
    const result = normalizeCursors([peer({ anchor: 8, head: 20 })], 10);
    expect(result[0]).toMatchObject({ head: 10, from: 8, to: 10 });
  });

  it('represents a collapsed caret as from === to', () => {
    const result = normalizeCursors([peer({ anchor: 4, head: 4 })], 10);
    expect(result[0]).toMatchObject({ head: 4, from: 4, to: 4 });
  });

  it('returns an empty array for no peers', () => {
    expect(normalizeCursors([], 10)).toEqual([]);
  });

  it('clamps negative positions to 0', () => {
    const result = normalizeCursors([peer({ anchor: -3, head: -1 })], 10);
    expect(result[0]).toMatchObject({ head: 0, from: 0, to: 0 });
  });
});
