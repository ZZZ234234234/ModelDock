import { notFound } from 'next/navigation';
import { Workspace } from '../../src/components/workspace';
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    ![
      'chat',
      'compare',
      'playground',
      'providers',
      'models',
      'usage',
      'history',
      'settings',
      'about',
    ].includes(section)
  )
    notFound();
  return <Workspace section={section} />;
}
