import { describe, it, expect } from 'vitest';
import { Text } from '@codemirror/state';
import {
  normalizeCursors,
  remoteOccupiedLines,
  isHeadBlocked,
  isEditBlocked,
  skipBlockedLine,
  firstUnoccupiedLineStart,
  type RemotePeerCursor,
  type NormalizedCursor,
  type LineRange,
} from '@/lib/yorkie-cursors';

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

// Helper to build a NormalizedCursor with a specific head position.
const nc = (head: number, over: Partial<NormalizedCursor> = {}): NormalizedCursor => ({
  clientID: 'c1',
  name: '동현',
  color: '#f97316',
  head,
  from: head,
  to: head,
  ...over,
});

describe('T3-10: remoteOccupiedLines', () => {
  // "line1\nline2\nline3" → line 1: [0,5], line 2: [6,11], line 3: [12,16]
  const doc = Text.of(['line1', 'line2', 'line3']);

  it('maps a single caret to its containing line (color propagated)', () => {
    // head=2 is on line 1 (offset 0–5); color comes from the cursor's color field
    const result = remoteOccupiedLines([nc(2)], doc);
    expect(result).toEqual([{ from: 0, to: 5, color: '#f97316' }]);
  });

  it('deduplicates multiple peers on the same line, keeping first occupant color', () => {
    // head=1 (color #f97316) and head=3 (color #3b82f6) are both on line 1
    const c1 = nc(1); // color '#f97316'
    const c2 = nc(3, { color: '#3b82f6' });
    const result = remoteOccupiedLines([c1, c2], doc);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 0, to: 5, color: '#f97316' });
  });

  it('returns one entry per distinct occupied line (each with its color)', () => {
    // head=2 (line 1) and head=8 (line 2)
    const result = remoteOccupiedLines([nc(2), nc(8, { color: '#22c55e' })], doc);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ from: 0, to: 5, color: '#f97316' });
    expect(result[1]).toEqual({ from: 6, to: 11, color: '#22c55e' });
  });

  it('returns an empty array for no cursors', () => {
    expect(remoteOccupiedLines([], doc)).toEqual([]);
  });
});

describe('T3-11: isHeadBlocked', () => {
  const blocked = [{ from: 6, to: 11, color: '#f97316' }]; // line 2 of the doc above

  it('blocks a head inside the blocked range', () => {
    expect(isHeadBlocked(8, blocked)).toBe(true);
  });

  it('blocks a head at the start boundary', () => {
    expect(isHeadBlocked(6, blocked)).toBe(true);
  });

  it('blocks a head at the end boundary', () => {
    expect(isHeadBlocked(11, blocked)).toBe(true);
  });

  it('passes a head before the blocked range', () => {
    expect(isHeadBlocked(5, blocked)).toBe(false);
  });

  it('passes a head after the blocked range', () => {
    expect(isHeadBlocked(12, blocked)).toBe(false);
  });

  it('passes when there are no blocked ranges', () => {
    expect(isHeadBlocked(8, [])).toBe(false);
  });
});

describe('T3-12: isEditBlocked', () => {
  const blocked = [{ from: 6, to: 11, color: '#f97316' }]; // line 2

  it('blocks an edit fully inside the blocked range', () => {
    expect(isEditBlocked(7, 9, blocked)).toBe(true);
  });

  it('blocks an edit that straddles the start of the blocked range', () => {
    expect(isEditBlocked(3, 8, blocked)).toBe(true);
  });

  it('blocks an edit that straddles the end of the blocked range', () => {
    expect(isEditBlocked(9, 14, blocked)).toBe(true);
  });

  it('blocks an edit that completely spans the blocked range', () => {
    expect(isEditBlocked(0, 20, blocked)).toBe(true);
  });

  it('passes an edit entirely before the blocked range', () => {
    expect(isEditBlocked(0, 5, blocked)).toBe(false);
  });

  it('passes an edit entirely after the blocked range', () => {
    expect(isEditBlocked(12, 16, blocked)).toBe(false);
  });

  it('passes when there are no blocked ranges', () => {
    expect(isEditBlocked(7, 9, [])).toBe(false);
  });
});

describe('T3-13: skipBlockedLine', () => {
  // "line1\nline2\nline3\nline4\nline5"
  // Actual CodeMirror offsets (to includes the newline boundary):
  // line 1: from=0,  to=5
  // line 2: from=6,  to=11
  // line 3: from=12, to=17
  // line 4: from=18, to=23
  // line 5: from=24, to=29
  const doc = Text.of(['line1', 'line2', 'line3', 'line4', 'line5']);

  const r = (from: number, to: number): { from: number; to: number; color: string } => ({
    from,
    to,
    color: '#f97316',
  });

  it('returns the start of the next unblocked line when going down past one blocked line', () => {
    // head=8 (line 2) is blocked; going down should land on line 3 (from=12)
    const blocked = [r(6, 11)]; // line 2 blocked
    expect(skipBlockedLine(doc, 8, true, blocked)).toBe(12);
  });

  it('returns the start of the previous unblocked line when going up past one blocked line', () => {
    // head=8 (line 2) is blocked; going up should land on line 1 (from=0)
    const blocked = [r(6, 11)]; // line 2 blocked
    expect(skipBlockedLine(doc, 8, false, blocked)).toBe(0);
  });

  it('skips consecutive blocked lines going down', () => {
    // head=8 (line 2) is blocked; lines 2 and 3 blocked → should land on line 4 (from=18)
    const blocked = [r(6, 11), r(12, 17)]; // lines 2 & 3 blocked
    expect(skipBlockedLine(doc, 8, true, blocked)).toBe(18);
  });

  it('skips consecutive blocked lines going up', () => {
    // head=14 (line 3) is blocked; lines 2 and 3 blocked → going up lands on line 1 (from=0)
    const blocked = [r(6, 11), r(12, 17)]; // lines 2 & 3 blocked
    expect(skipBlockedLine(doc, 14, false, blocked)).toBe(0);
  });

  it('returns null when there is nowhere left to go going down (last line blocked)', () => {
    // head=26 (line 5) is blocked; no line after it
    const blocked = [r(24, 29)]; // line 5 blocked
    expect(skipBlockedLine(doc, 26, true, blocked)).toBeNull();
  });

  it('returns null when there is nowhere left to go going up (first line blocked)', () => {
    // head=2 (line 1) is blocked; no line before it
    const blocked = [r(0, 5)]; // line 1 blocked
    expect(skipBlockedLine(doc, 2, false, blocked)).toBeNull();
  });

  it('returns null when all remaining lines in the direction are blocked', () => {
    // head=8 (line 2) is blocked; going down, lines 3+4+5 also blocked
    const blocked = [r(6, 11), r(12, 17), r(18, 23), r(24, 29)];
    expect(skipBlockedLine(doc, 8, true, blocked)).toBeNull();
  });
});

describe('T3-14: firstUnoccupiedLineStart', () => {
  // "line1\nline2\nline3"
  // line 1: from=0,  to=5
  // line 2: from=6,  to=11
  // line 3: from=12, to=16
  const doc = Text.of(['line1', 'line2', 'line3']);

  const lr = (from: number, to: number): LineRange => ({ from, to, color: '#f97316' });

  it('returns line 2 start (6) when line 1 is occupied', () => {
    const occupied = [lr(0, 5)]; // line 1 occupied
    expect(firstUnoccupiedLineStart(doc, occupied)).toBe(6);
  });

  it('returns line 3 start (12) when lines 1 and 2 are occupied', () => {
    const occupied = [lr(0, 5), lr(6, 11)]; // lines 1 & 2 occupied
    expect(firstUnoccupiedLineStart(doc, occupied)).toBe(12);
  });

  it('returns 0 when line 1 is free (no occupied lines)', () => {
    // Line 1 is not occupied, so its from (0) is returned immediately.
    expect(firstUnoccupiedLineStart(doc, [])).toBe(0);
  });

  it('returns 0 when line 1 is free even though line 3 is occupied', () => {
    const occupied = [lr(12, 16)]; // only line 3 occupied
    expect(firstUnoccupiedLineStart(doc, occupied)).toBe(0);
  });

  it('returns 0 (fallback) when all lines are occupied', () => {
    const occupied = [lr(0, 5), lr(6, 11), lr(12, 16)]; // all 3 lines occupied
    expect(firstUnoccupiedLineStart(doc, occupied)).toBe(0);
  });
});
