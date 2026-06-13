import { EditorState, type TransactionSpec } from '@codemirror/state';
import { describe, it, expect } from 'vitest';
import {
  cmChangesToYorkieEdits,
  yorkieOpsToCmChanges,
  syncLocalChanges,
  remoteAnnotation,
  type YorkieTextLike,
} from '@/lib/yorkie-codemirror';

/** Builds a transaction by applying `spec` on top of `doc`. */
function txFor(doc: string, spec: TransactionSpec) {
  return EditorState.create({ doc }).update(spec);
}

describe('T3-1: cmChangesToYorkieEdits', () => {
  it('maps a pure insertion to (from, to, text)', () => {
    const tr = txFor('', { changes: { from: 0, insert: 'hi' } });
    expect(cmChangesToYorkieEdits(tr.changes)).toEqual([
      { from: 0, to: 0, text: 'hi' },
    ]);
  });

  it('maps a deletion to an empty-text edit over the removed range', () => {
    const tr = txFor('hello', { changes: { from: 0, to: 2 } });
    expect(cmChangesToYorkieEdits(tr.changes)).toEqual([
      { from: 0, to: 2, text: '' },
    ]);
  });

  it('maps a replacement to (from, to, newText)', () => {
    const tr = txFor('hello', { changes: { from: 0, to: 1, insert: 'H' } });
    expect(cmChangesToYorkieEdits(tr.changes)).toEqual([
      { from: 0, to: 1, text: 'H' },
    ]);
  });

  it('maps multiple changes in document order', () => {
    const tr = txFor('abc', {
      changes: [
        { from: 0, to: 0, insert: 'X' },
        { from: 3, to: 3, insert: 'Y' },
      ],
    });
    expect(cmChangesToYorkieEdits(tr.changes)).toEqual([
      { from: 0, to: 0, text: 'X' },
      { from: 3, to: 3, text: 'Y' },
    ]);
  });
});

describe('T3-2: yorkieOpsToCmChanges', () => {
  it('converts edit ops to CodeMirror changes', () => {
    const ops = [
      { type: 'edit', path: '$.content', from: 0, to: 0, value: { content: 'hi', attributes: {} } },
      { type: 'edit', path: '$.content', from: 5, to: 7, value: { content: '', attributes: {} } },
    ];
    expect(yorkieOpsToCmChanges(ops)).toEqual([
      { from: 0, to: 0, insert: 'hi' },
      { from: 5, to: 7, insert: '' },
    ]);
  });

  it('ignores non-edit ops (e.g. style)', () => {
    const ops = [
      { type: 'style', path: '$.content', from: 0, to: 1, value: {} },
      { type: 'edit', path: '$.content', from: 0, to: 0, value: { content: 'A', attributes: {} } },
    ];
    expect(yorkieOpsToCmChanges(ops)).toEqual([
      { from: 0, to: 0, insert: 'A' },
    ]);
  });
});

describe('T3-3: syncLocalChanges loop prevention', () => {
  function spyContent(): YorkieTextLike & { calls: Array<[number, number, string]> } {
    const calls: Array<[number, number, string]> = [];
    return {
      calls,
      edit: (from, to, content) => {
        calls.push([from, to, content]);
        return undefined;
      },
    };
  }

  it('propagates a local transaction to the Yorkie text', () => {
    const tr = txFor('', { changes: { from: 0, insert: 'hi' } });
    const content = spyContent();
    const propagated = syncLocalChanges(tr, content);
    expect(propagated).toBe(true);
    expect(content.calls).toEqual([[0, 0, 'hi']]);
  });

  it('does NOT propagate a transaction carrying remoteAnnotation', () => {
    const tr = txFor('', {
      changes: { from: 0, insert: 'hi' },
      annotations: remoteAnnotation.of(true),
    });
    const content = spyContent();
    const propagated = syncLocalChanges(tr, content);
    expect(propagated).toBe(false);
    expect(content.calls).toEqual([]);
  });

  it('does NOT propagate a transaction with no document change', () => {
    const tr = txFor('hello', { selection: { anchor: 1 } });
    const content = spyContent();
    expect(syncLocalChanges(tr, content)).toBe(false);
    expect(content.calls).toEqual([]);
  });
});
