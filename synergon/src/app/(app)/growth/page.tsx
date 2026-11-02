import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { growthVM } from '@/server/vm/growth';
import { GrowthView } from '@/components/growth/GrowthView';

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ gap?: string }> }) {
  const v = await requirePageViewer('growth');
  return <><PageHeader {...viewHeader('growth', v.role, v.first)} /><GrowthView vm={await growthVM(v, await searchParams)} /></>;
}
