import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { dossierVM, signalsVM } from '@/server/data/radar';
import { BENCH } from '@/lib/demo';
import { RadarView } from '@/components/radar/RadarView';

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ tab?: string; co?: string; dtab?: string; signal?: string }> }) {
  const v = await requirePageViewer('radar');
  const sp = await searchParams;
  const tab = sp.tab === 'signals' ? 'signals' : 'dossier';
  return (
    <>
      <PageHeader {...viewHeader('radar', v.role, v.first)} />
      {tab === 'dossier'
        ? <RadarView tab="dossier" d={await dossierVM(v, sp)} sectors={Object.keys(BENCH)} />
        : <RadarView tab="signals" s={await signalsVM(v, sp.signal)} />}
    </>
  );
}
