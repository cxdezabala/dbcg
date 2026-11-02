import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { studioListVM, studioWsVM } from '@/server/vm/studio';
import { StudioList, StudioWorkspace } from '@/components/studio/StudioView';
import { ForbiddenError } from '@/server/errors';

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ sol?: string; new?: string }> }) {
  const v = await requirePageViewer('studio');
  const sp = await searchParams;
  const header = <PageHeader {...viewHeader('studio', v.role, v.first)} />;
  if (sp.sol) {
    try { return <>{header}<StudioWorkspace vm={await studioWsVM(v, sp.sol)} /></>; }
    catch (e) { if (!(e instanceof ForbiddenError) && !(e instanceof Error && e.message === 'not_found')) throw e; }
  }
  return <>{header}<StudioList vm={await studioListVM(v)} notFound={!!sp.sol} /></>;
}
