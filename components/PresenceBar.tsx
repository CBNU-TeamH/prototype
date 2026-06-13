'use client';

import { useConnection, useDocument, usePresences } from '@yorkie-js/react';
import { StreamConnectionStatus } from '@yorkie-js/sdk';
import type { User } from '@/lib/user';

export default function PresenceBar() {
  const presences = usePresences<User>();
  const connection = useConnection();
  const { loading } = useDocument();

  return (
    <header className="presence-bar">
      <ul className="presence-list">
        {presences.map(({ clientID, presence }) => (
          <li
            key={clientID}
            className="presence-chip"
            style={{ backgroundColor: presence.color }}
          >
            {presence.name}
          </li>
        ))}
      </ul>
      <ConnectionBadge loading={loading} connection={connection} />
    </header>
  );
}

function ConnectionBadge({
  loading,
  connection,
}: {
  loading: boolean;
  connection: StreamConnectionStatus;
}) {
  if (loading) {
    return <span className="conn-badge conn-loading">연결 중…</span>;
  }

  const connected = connection === StreamConnectionStatus.Connected;
  return (
    <span className={`conn-badge ${connected ? 'conn-on' : 'conn-off'}`}>
      {connected ? '연결됨' : '연결 끊김'}
    </span>
  );
}
