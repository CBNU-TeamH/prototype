'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveUser, loadUser, pickColor } from '@/lib/user';

export default function EntryPage() {
  const [name, setName] = useState('');
  const router = useRouter();

  const trimmed = name.trim();
  const canJoin = trimmed.length > 0;

  // Already entered (nickname in sessionStorage) → skip re-entry (guard ②).
  useEffect(() => {
    if (loadUser()) {
      router.replace('/doc/demo');
    }
  }, [router]);

  function handleJoin() {
    if (!canJoin) return;
    saveUser({ name: trimmed, color: pickColor() });
    router.push('/doc/demo');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleJoin();
    }
  }

  return (
    <main className="entry-root">
      <div className="entry-card">
        <h1 className="entry-title">문서 입장</h1>
        <input
          className="entry-input"
          type="text"
          placeholder="닉네임을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          className="entry-button"
          onClick={handleJoin}
          disabled={!canJoin}
        >
          참가
        </button>
      </div>
    </main>
  );
}
