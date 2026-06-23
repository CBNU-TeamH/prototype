'use client';

type Participant = {
  clientID: string;
  name: string;
  color: string;
};

type Props = {
  participants: Participant[];
};

/**
 * DocPresenceAvatars — pure presentational component.
 *
 * Renders avatar initials for the given participants. Receives the list as a
 * prop (computed by the parent from groupParticipantsByDoc), so it makes no
 * Yorkie hook calls and can be safely rendered at any nesting depth.
 *
 * Name guard: items with no name are skipped rather than crashing on
 * `[...undefined][0]`.
 */
export default function DocPresenceAvatars({ participants }: Props) {
  if (participants.length === 0) return null;

  return (
    <span className="doc-avatars">
      {participants.map((p) => {
        const ch = p.name ? [...p.name][0] : '';
        return (
          <span
            key={p.clientID}
            className="doc-avatar"
            style={{ backgroundColor: p.color }}
            title={p.name}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
