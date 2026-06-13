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
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import type { TextPosStructRange } from '@yorkie-js/sdk';
import type { User } from '@/lib/user';

/** Presence payload: the entry-screen user plus an optional selection range. */
export type CursorPresence = User & { selection?: TextPosStructRange | null };

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
