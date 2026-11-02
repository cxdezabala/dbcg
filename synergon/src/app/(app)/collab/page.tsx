import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { collabVM } from '@/server/vm/collab';
import { CollabView } from '@/components/collab/CollabView';

export default async function CollabPage({ searchParams }: { searchParams: Promise<{ expert?: string }> }) {
  const v = await requirePageViewer('collab');
  return <><PageHeader {...viewHeader('collab', v.role, v.first)} /><CollabView vm={await collabVM(v, await searchParams)} /></>;
}
