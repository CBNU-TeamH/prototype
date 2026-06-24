/**
 * Remote peer cursors & selections for CodeMirror 6, driven by Yorkie presence.
 *
 * Each client publishes its caret/selection into presence as a Yorkie
 * `TextPosStructRange` (stable under concurrent edits). Peers convert those
 * positions back to indices and render them as CodeMirror decorations:
 *   - a coloured selection highlight over [from, to] when a range is selected
 *   - a zero-width caret widget at `head`, with an always-on nickname flag
 *
 * The local caret is drawn by CodeMirror's own basicSetup, so we only render
 * *remote* peers here.
 */
import { EditorSelection, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import type { Text } from '@codemirror/state';
import type { TextPosStructRange } from '@yorkie-js/sdk';
import type { User } from '@/lib/user';
import { remoteAnnotation } from '@/lib/yorkie-codemirror';

/**
 * Presence payload: the entry-screen user plus an optional selection range.
 * Published on the content document; participants in the PresenceBar and
 * EnsureUniqueColor are simply everyone attached to that document.
 */
export type CursorPresence = User & {
  selection?: TextPosStructRange | null;
};

/** A peer's cursor in CodeMirror index space (before normalisation). */
export type RemotePeerCursor = {
  clientID: string;
  name: string;
  color: string;
  anchor: number;
  head: number;
};

/** A peer's cursor after clamping/ordering, ready to decorate. */
export type NormalizedCursor = {
  clientID: string;
  name: string;
  color: string;
  head: number;
  from: number;
  to: number;
};

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));

/**
 * Order each peer's anchor/head into from <= to and clamp every position to
 * the current document bounds. Pure — unit tested in yorkie-cursors.test.ts.
 */
export function normalizeCursors(
  peers: ReadonlyArray<RemotePeerCursor>,
  docLength: number,
): NormalizedCursor[] {
  return peers.map(({ clientID, name, color, anchor, head }) => {
    const a = clamp(anchor, docLength);
    const h = clamp(head, docLength);
    return {
      clientID,
      name,
      color,
      head: h,
      from: Math.min(a, h),
      to: Math.max(a, h),
    };
  });
}

/** Effect carrying the latest set of remote cursors to render. */
export const setRemoteCursors = StateEffect.define<NormalizedCursor[]>();

/** Zero-width caret with an always-on nickname flag, coloured per peer. */
class CaretWidget extends WidgetType {
  constructor(
    private readonly name: string,
    private readonly color: string,
  ) {
    super();
  }

  eq(other: CaretWidget): boolean {
    return other.name === this.name && other.color === this.color;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-peer-caret';
    wrap.style.borderColor = this.color;

    const flag = document.createElement('span');
    flag.className = 'cm-peer-flag';
    flag.style.backgroundColor = this.color;
    flag.textContent = this.name;

    wrap.appendChild(flag);
    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function decorationsFor(cursors: ReadonlyArray<NormalizedCursor>): DecorationSet {
  const ranges = [];
  for (const c of cursors) {
    if (c.from !== c.to) {
      ranges.push(
        Decoration.mark({
          class: 'cm-peer-selection',
          attributes: { style: `background-color: ${c.color}33` },
        }).range(c.from, c.to),
      );
    }
    ranges.push(
      Decoration.widget({
        widget: new CaretWidget(c.name, c.color),
        side: -1,
      }).range(c.head),
    );
  }
  // `true` tells CodeMirror to sort the ranges by position for us.
  return Decoration.set(ranges, true);
}

/**
 * CodeMirror extension that renders remote cursors. Update them by dispatching
 * the `setRemoteCursors` effect with a normalised cursor list.
 */
export function createRemoteCursorsExtension(): Extension {
  const field = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(deco, tr) {
      let next = deco.map(tr.changes);
      for (const effect of tr.effects) {
        if (effect.is(setRemoteCursors)) {
          next = decorationsFor(effect.value);
        }
      }
      return next;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [field];
}

// ─── Line Block (occupation) ─────────────────────────────────────────────────

/** A document line range expressed as byte offsets (from inclusive, to inclusive). */
export type LineRange = { from: number; to: number; color: string };

/**
 * Derive the set of occupied lines from a list of remote cursors.
 * Each cursor's `head` is resolved to its containing line; duplicate lines
 * (multiple peers on the same line) are collapsed to one entry.
 * Pure — unit tested in yorkie-cursors.test.ts.
 */
export function remoteOccupiedLines(
  cursors: ReadonlyArray<NormalizedCursor>,
  doc: Text,
): LineRange[] {
  const seen = new Set<number>();
  const result: LineRange[] = [];
  for (const c of cursors) {
    const line = doc.lineAt(c.head);
    if (seen.has(line.from)) continue; // 중복 라인은 첫 점유자 색상 유지
    seen.add(line.from);
    result.push({ from: line.from, to: line.to, color: c.color });
  }
  return result;
}

/**
 * 위에서부터 점유되지 않은 첫 줄의 시작 offset을 반환한다.
 * 모든 줄이 점유된 경우 0(=1번 줄, 폴백)을 반환한다.
 * Pure — unit tested in yorkie-cursors.test.ts.
 */
export function firstUnoccupiedLineStart(
  doc: Text,
  occupied: ReadonlyArray<LineRange>,
): number {
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    if (!occupied.some((r) => line.from === r.from)) return line.from;
  }
  return 0;
}

/**
 * Return true when `head` falls within any of the blocked line ranges.
 * Pure — unit tested in yorkie-cursors.test.ts.
 */
export function isHeadBlocked(head: number, blocked: ReadonlyArray<LineRange>): boolean {
  return blocked.some((r) => head >= r.from && head <= r.to);
}

/**
 * Return true when the edit interval [fromA, toA] overlaps any blocked line range.
 * Pure — unit tested in yorkie-cursors.test.ts.
 */
export function isEditBlocked(
  fromA: number,
  toA: number,
  blocked: ReadonlyArray<LineRange>,
): boolean {
  return blocked.some((r) => fromA <= r.to && toA >= r.from);
}

/**
 * Skip past blocked lines in a given direction, returning the `from` offset of
 * the first unblocked line, or null if there is nowhere left to go.
 *
 * Used by blockFilter to jump over occupied lines on keyboard navigation
 * instead of freezing the cursor. Pure — unit tested in yorkie-cursors.test.ts.
 */
export function skipBlockedLine(
  doc: Text,
  head: number,
  goingDown: boolean,
  blocked: ReadonlyArray<LineRange>,
): number | null {
  let line = doc.lineAt(head);
  while (blocked.some((r) => line.from >= r.from && line.from <= r.to)) {
    const n = goingDown ? line.number + 1 : line.number - 1;
    if (n < 1 || n > doc.lines) return null; // 더 갈 곳 없음
    line = doc.line(n);
  }
  return line.from;
}

/**
 * CodeMirror extension bundle for line block (occupation) feature.
 *
 * Derived entirely from the existing `setRemoteCursors` effect — no new
 * presence fields or network traffic required.
 *
 * Provides three behaviours:
 *   1. `remoteBlockedField` — tracks which lines are occupied by remote peers
 *      and decorates them with `.cm-blocked-line` + inline border-color per occupant.
 *   2. `localLineField` — decorates the local caret's current line with the
 *      same `.cm-blocked-line` class (border only; no blocking for self).
 *   3. `blockFilter` — rejects transactions that would move the local cursor
 *      into, or edit text on, a remotely blocked line.
 *      - 수정1: 내가 현재 올라가 있는 줄은 차단 enforcement에서 제외 (deadlock 방지).
 *      - 수정2: 키보드 이동은 차단 라인을 건너뛰기; 클릭은 기존대로 멈춤.
 *
 * Array order matters: the two StateFields must be registered before the
 * transactionFilter so that `tr.startState.field(remoteBlockedField)` resolves.
 *
 * @param getLocalColor - live getter returning the local user's presence color.
 *   Used to tint the local caret line border (수정3).
 */
export function createLineBlockExtension(
  getLocalColor: () => string | undefined,
): Extension {
  // ── 1. Remote blocked lines ──────────────────────────────────────────────

  const remoteBlockedField = StateField.define<readonly LineRange[]>({
    create() {
      return [];
    },
    update(value, tr) {
      // Remap stored positions through any document changes first.
      let next: LineRange[] = value.map(({ from, to, color }) => ({
        from: tr.changes.mapPos(from),
        to: tr.changes.mapPos(to),
        color,
      }));

      // If this transaction carries new remote cursor data, recompute from scratch.
      for (const effect of tr.effects) {
        if (effect.is(setRemoteCursors)) {
          next = remoteOccupiedLines(effect.value, tr.state.doc);
        }
      }
      return next;
    },
    provide: (f) =>
      EditorView.decorations.from(f, (ranges) => {
        // 수정3: inline border-color로 점유자 색상 적용 (1px 굵기는 CSS에서 유지)
        const decos = ranges.map((range) =>
          Decoration.line({
            class: 'cm-blocked-line',
            attributes: { style: `border-color: ${range.color}` },
          }).range(range.from),
        );
        return Decoration.set(decos, true);
      }),
  });

  // ── 2. Local caret line ──────────────────────────────────────────────────

  const localLineField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(_value, tr) {
      // Recompute whenever the document or the selection changes.
      if (!tr.docChanged && !tr.selection) return _value;
      const head = tr.state.selection.main.head;
      const line = tr.state.doc.lineAt(head);
      // 수정3: 로컬 유저 색상으로 border-color 적용
      const color = getLocalColor();
      return Decoration.set([
        Decoration.line({
          class: 'cm-blocked-line',
          attributes: { style: `border-color: ${color ?? 'red'}` },
        }).range(line.from),
      ]);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  // ── 3. Transaction filter ────────────────────────────────────────────────

  const blockFilter = EditorState.transactionFilter.of((tr) => {
    // Always allow remote (Yorkie) transactions through — never block them.
    if (tr.annotation(remoteAnnotation)) return tr;

    // Allow effect-only transactions (e.g. setRemoteCursors dispatches)
    // that carry no document changes and no explicit selection change.
    if (!tr.docChanged && !tr.selection) return tr;

    const blocked = tr.startState.field(remoteBlockedField);
    if (blocked.length === 0) return tr;

    // 수정1: 내가 현재 올라가 있는 줄은 차단 enforcement에서 제외 → deadlock 방지.
    const oldHead = tr.startState.selection.main.head;
    const eff = blocked.filter((r) => !(oldHead >= r.from && oldHead <= r.to));
    if (eff.length === 0) return tr;

    // Check whether any edit range overlaps an effective blocked line.
    if (tr.docChanged) {
      let editIsBlocked = false;
      tr.changes.iterChanges((fromA, toA) => {
        if (!editIsBlocked && isEditBlocked(fromA, toA, eff)) {
          editIsBlocked = true;
        }
      });
      if (editIsBlocked) return [];
    }

    // Check whether the new selection head falls on a blocked line.
    if (tr.selection && !tr.docChanged) {
      const newHead = tr.selection.main.head;
      if (isHeadBlocked(newHead, eff)) {
        // 수정2: 클릭은 기존대로 멈춤; 키보드 이동은 차단 라인(연속 포함)을 건너뜀.
        if (tr.isUserEvent('select.pointer')) return [];
        const target = skipBlockedLine(tr.state.doc, newHead, newHead >= oldHead, eff);
        return target == null ? [] : { selection: EditorSelection.cursor(target) };
      }
    }

    return tr;
  });

  return [remoteBlockedField, localLineField, blockFilter];
}
