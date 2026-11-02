import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { listAccounts, getAccount, defaultAccountId, accountBrief } from '@/server/data/accounts';
import { getPipelineScope } from '@/server/data/pipeline';
import { ciPipe } from '@/server/vm/ci-pipe';
import { nowLabel } from '@/lib/format';
import { CIView } from '@/components/ci/CIView';

export default async function CIPage({ searchParams }: { searchParams: Promise<{ tab?: string; acct?: string; stage?: string; team?: string; hint?: string }> }) {
  const v = await requirePageViewer('ci');
  const sp = await searchParams;
  const tab = sp.tab === 'pipeline' ? 'pipeline' : 'accounts';
  const header = <PageHeader {...viewHeader('ci', v.role, v.first)} />;
  if (tab === 'pipeline') {
    const pipe = ciPipe(await getPipelineScope(v), { stage: sp.stage != null && sp.stage !== '' ? Number(sp.stage) : null, team: sp.team });
    return <>{header}<CIView tab="pipeline" pipe={pipe} role={v.role} /></>;
  }
  const [accounts, id] = await Promise.all([listAccounts(v), defaultAccountId(v, sp.acct || 'meridian')]);
  const account = id ? await getAccount(v, id) : null;
  return (
    <>{header}
      <CIView tab="accounts" role={v.role} accounts={accounts} account={account} brief={account ? accountBrief(account, nowLabel()) : null}
        doneActions={v.state.doneActions || {}} requested={sp.acct || null} markCi={v.role === 'exec' && account?.id === 'meridian' && !v.state.ciViewed} hint={sp.hint || null} />
    </>
  );
}
