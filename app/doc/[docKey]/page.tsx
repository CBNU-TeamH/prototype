type Props = {
  params: Promise<{ docKey: string }>;
};

export default async function DocPage({ params }: Props) {
  const { docKey } = await params;

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <p>Phase 2에서 구현 — docKey: {docKey}</p>
    </main>
  );
}
