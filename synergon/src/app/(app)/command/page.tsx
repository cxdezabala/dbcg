import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { commandVM } from '@/server/vm/command';
import { CommandView } from '@/components/command/CommandView';

export default async function CommandPage({ searchParams }: { searchParams: Promise<{ theme?: string; initiative?: string }> }) {
  const v = await requirePageViewer('command');
  const sp = await searchParams;
  return (
    <>
      <PageHeader {...viewHeader('command', v.role, v.first)} />
      <CommandView vm={await commandVM(v)} openTheme={sp.theme || null} openInitiative={sp.initiative === 'new' && v.role === 'director'} markTheme={sp.theme === 't1' && v.role === 'director' && !v.state.themeViewed} />
    </>
  );
}
