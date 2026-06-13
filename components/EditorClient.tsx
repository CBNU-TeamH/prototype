'use client';

import dynamic from 'next/dynamic';

// ssr: false keeps Yorkie (which touches `window`) off the server render path.
// App Router only allows ssr: false inside a client component, hence this wrapper.
const EditorView = dynamic(() => import('./EditorView'), { ssr: false });

export default function EditorClient({ docKey }: { docKey: string }) {
  return <EditorView docKey={docKey} />;
}
