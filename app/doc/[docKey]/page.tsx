import EditorClient from '@/components/EditorClient';

type Props = {
  params: Promise<{ docKey: string }>;
};

export default async function DocPage({ params }: Props) {
  const { docKey } = await params;

  return <EditorClient docKey={docKey} />;
}
