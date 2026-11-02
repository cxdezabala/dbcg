import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { HomeView } from '@/components/home/HomeView';
import { viewHeader } from '@/lib/views';
import { homeVM } from '@/server/vm/home';
import { getScenario } from '@/server/scenario';
import { demoMode } from '@/auth';
import { LESSON } from '@/lib/demo';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ scope?: string; team?: string }> }) {
  const v = await requirePageViewer('home');
  const sp = await searchParams;
  const [vm, scenario] = await Promise.all([homeVM(v, sp), getScenario()]);
  return (
    <>
      <PageHeader {...viewHeader('home', v.role, v.first)} />
      <HomeView vm={vm} role={v.role} scenario={scenario} lesson={LESSON} showRail={demoMode()} />
    </>
  );
}
