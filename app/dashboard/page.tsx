'use client';

import dynamic from 'next/dynamic';

// ssr: false — the dashboard reads the user from sessionStorage, so it must
// render client-side only (mirrors EditorClient). App Router only allows
// ssr: false inside a client component, hence this wrapper.
const DashboardView = dynamic(() => import('@/components/DashboardView'), {
  ssr: false,
});

export default function DashboardPage() {
  return <DashboardView />;
}
