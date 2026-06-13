/**
 * Yorkie `Text` (CRDT) ↔ CodeMirror 6 binding.
 *
 * This module is the highest-value piece to port into the production system,
 * so the binding rules live here as pure, testable functions with the
 * side-effecting glue kept thin (see `MarkdownEditor.tsx`).
 *
 * ── Loop-prevention contract (the core risk of this phase) ──────────────
 *  1. Local keystroke → CodeMirror updateListener → the transaction has NO
 *     `remoteAnnotation` → we forward it to Yorkie via `content.edit(...)`.
 *  2. Remote change → we dispatch it into CodeMirror tagged with
 *     `remoteAnnotation.of(true)`.
 *  3. The updateListener ignores any transaction carrying `remoteAnnotation`,
 *     so a remote edit is never echoed back to Yorkie. No infinite loop.
 *
 * Index basis: CodeMirror `iterChanges` reports `fromA/toA` in the document
 * *before* the transaction. For the prototype's single-cursor typing this maps
 * 1:1 onto sequential `Text.edit` calls. Multi-cursor transactions (not used
 * here) would need reverse-order application to keep earlier offsets valid.
 */
import { Annotation, type ChangeSet, type Transaction } from '@codemirror/state';
import type { EditOpInfo } from '@yorkie-js/sdk';
import type { Text } from '@yorkie-js/react';

/** Shared document root: a single collaborative markdown `Text`. */
export type DocRoot = { content?: Text };

/** A Yorkie `Text.edit` call expressed as data. */
export type YorkieEdit = { from: number; to: number; text: string };

/** A CodeMirror change spec. */
export type CmChange = { from: number; to: number; insert: string };

/** Minimal surface of a Yorkie `Text` we need — keeps the unit tests simple. */
export type YorkieTextLike = {
  edit: (from: number, to: number, content: string) => unknown;
};

/**
 * Annotation marking a CodeMirror transaction as originating from a remote
 * Yorkie change. The updateListener uses it to avoid re-sending.
 */
export const remoteAnnotation = Annotation.define<boolean>();

/** CodeMirror transaction changes → ordered Yorkie edits. */
export function cmChangesToYorkieEdits(changes: ChangeSet): YorkieEdit[] {
  const edits: YorkieEdit[] = [];
  changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    edits.push({ from: fromA, to: toA, text: inserted.toString() });
  });
  return edits;
}

function isEditOp(op: { type: string }): op is EditOpInfo {
  return op.type === 'edit';
}

/**
 * Remote Yorkie operations → CodeMirror changes (edit ops only).
 * Accepts the broad op union delivered by `doc.subscribe('$.content', ...)`
 * and narrows to edits.
 */
export function yorkieOpsToCmChanges(ops: ReadonlyArray<{ type: string }>): CmChange[] {
  const changes: CmChange[] = [];
  for (const op of ops) {
    if (!isEditOp(op)) continue;
    changes.push({ from: op.from, to: op.to, insert: op.value.content });
  }
  return changes;
}

/**
 * Forward a local CodeMirror transaction to the Yorkie text, honouring the
 * loop-prevention contract. Returns whether anything was propagated.
 */
export function syncLocalChanges(tr: Transaction, content: YorkieTextLike): boolean {
  if (tr.annotation(remoteAnnotation)) return false;
  if (!tr.docChanged) return false;
  const edits = cmChangesToYorkieEdits(tr.changes);
  for (const e of edits) content.edit(e.from, e.to, e.text);
  return edits.length > 0;
}
