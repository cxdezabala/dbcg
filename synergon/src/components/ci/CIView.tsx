'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, CapsHead, Tag, Box, Bar, Hint } from '@/components/ui/controls';
import { BriefModal, type BriefData } from '@/components/common/BriefModal';
import { useUI, useAiContext } from '@/components/shell/UIProvider';
import { toggleSuggestedAction, draftHypothesis } from '@/server/actions/ci';
import { sendToStudio } from '@/server/actions/studio';
import { markSeen } from '@/server/actions/shell';
import type { AccountListItem, AccountDetail } from '@/server/data/accounts';
import type { CiPipeVM } from '@/server/vm/ci-pipe';
import type { Role } from '@/lib/demo/types';
import s from './ci.module.css';

type Props = { role: Role } & (
  | { tab: 'pipeline'; pipe: CiPipeVM }
  | { tab: 'accounts'; accounts: AccountListItem[]; account: AccountDetail | null; brief: BriefData | null; doneActions: Record<string, boolean>; requested: string | null; markCi: boolean; hint: string | null }
);

export function CIView(p: Props) {
  const t = useT();
  return (
    <>
      <div className={u.tabs} role="tablist">
        <Link href="/ci" role="tab" aria-selected={p.tab === 'accounts'} className={cx(u.tab, p.tab === 'accounts' && u.on)}>{t('Account intelligence')}</Link>
        <Link href="/ci?tab=pipeline" role="tab" aria-selected={p.tab === 'pipeline'} className={cx(u.tab, p.tab === 'pipeline' && u.on)}>{t('Pipeline & deals')}</Link>
      </div>
      {p.tab === 'pipeline' ? <Pipeline vm={p.pipe} /> : <Accounts {...p} />}
    </>
  );
}

function Pipeline({ vm }: { vm: CiPipeVM }) {
  const t = useT();
  const { toast } = useUI();
  const router = useRouter();
  const href = (patch: { stage?: number | null; team?: string }) => {
    const q = new URLSearchParams({ tab: 'pipeline' });
    const st = 'stage' in patch ? patch.stage : vm.stage; const tm = patch.team ?? vm.team;
    if (st != null) q.set('stage', String(st)); if (tm && tm !== 'all') q.set('team', tm);
    return '/ci?' + q.toString();
  };
  return (
    <div className={u.stack} style={{ gap: 28 }}>
      <div className={cx(u.row, u.between)} style={{ gap: 12 }}>
        <div className={cx(u.s14, u.muted)}>{t('Scope:')} <b style={{ color: 'var(--color-text)' }}>{t(vm.scope)}</b> · {t('source Salesforce CRM (read-only)')}</div>
        {vm.hasTeams && <div className={u.seg}>{vm.teamBtns.map(b => <Link key={b.id} href={href({ team: b.id })} className={cx(u.segBtn, vm.team === b.id && u.on)}>{t(b.label)}</Link>)}</div>}
      </div>
      <div className={s.stageCards}>
        {vm.stageCards.map(c => (
          <Link key={String(c.id)} href={href({ stage: c.id })} className={cx(s.stageCard, vm.stage === c.id && s.on)}>
            <span className={cx(u.small, u.muted)}>{t(c.label)}</span><span className={u.display} style={{ fontSize: 24 }}>{c.value}</span><span className={u.small}>{t(c.count)}</span>
          </Link>
        ))}
      </div>
      <div>
        <CapsHead title={<>{t('Open opportunities')} · {t(vm.filterLabel)}</>} note={t(vm.countLabel)} />
        <div className={u.tableWrap}>
          <table className="table">
            <thead><tr><th>{t('Opportunity')}</th>{vm.showOwner && <th>{t('Owner')}</th>}<th>{t('Stage')}</th><th style={{ width: '22%' }}>{t('Value')}</th><th>{t('Weighted')}</th><th>{t('Close date')}</th><th>{t('Next step')}</th></tr></thead>
            <tbody>
              {vm.rows.map((o, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => o.acctId ? router.push('/ci?acct=' + o.acctId) : toast('Account record lives in Salesforce — open in CRM (demo)')}>
                  <td><b>{o.name}</b><br /><span className={cx(u.small, u.muted)}>{o.acct}</span></td>
                  {vm.showOwner && <td className={u.s13}>{o.owner}<br /><span className={cx(u.xs, u.muted)}>{o.team}</span></td>}
                  <td><span className={u.stack} style={{ gap: 4 }}><span className={u.row} style={{ gap: 2 }}>{o.dots.map((d, j) => <span key={j} className={u.dot} style={{ background: d }} />)}</span><span className={u.xs}>{o.stage.split(' · ').map(t).join(' · ')}</span></span></td>
                  <td><span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={o.w} h={10} /><b style={{ width: 52 }}>{o.value}</b></span></td>
                  <td>{o.weighted}</td><td style={{ whiteSpace: 'nowrap' }}>{t(o.close)}</td><td className={cx(u.small, u.accentText)}>{o.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={u.grid2narrow}>
        <div>
          <CapsHead title={t('Recently closed')} note={t(vm.closedLabel)} />
          {vm.closed.map((c, i) => (
            <div key={i} className={s.closed}>
              <span className={cx(s.res, c.won ? s.won : s.lost)}>{t(c.won ? 'WON' : 'LOST')}</span>
              <span className={u.minw0}><b className={u.s13}>{c.name}</b><br /><span className={cx(u.small, u.muted)}>{c.acct} · {t(c.date)}{c.owner && ' · ' + c.owner}{c.reason && ' · ' + t(c.reason)}</span></span>
              <b className={u.s13} style={{ textAlign: 'right' }}>{c.value}</b>
            </div>
          ))}
        </div>
        <div>
          <CapsHead title={t('Why we lose')} note={t('Lost value by reason')} />
          {vm.reasons.map(x => <div key={x.label} className={s.reason}><span className={u.s13}>{t(x.label)}</span><Bar w={x.w} h={14} color="var(--color-accent)" track="dark" /><b className={u.s13} style={{ textAlign: 'right' }}>{x.pct}</b></div>)}
          <div className={cx(u.small, u.muted)} style={{ marginTop: 8 }}>{vm.reasonNote}</div>
        </div>
      </div>
    </div>
  );
}

function Accounts(p: Extract<Props, { tab: 'accounts' }>) {
  const t = useT();
  const router = useRouter();
  const { toast, ask, setAiOpen } = useUI();
  const [brief, setBrief] = useState(false);
  const [pending, start] = useTransition();
  const a = p.account;
  useAiContext({ acct: a?.id, label: a?.name });
  useEffect(() => { if (p.markCi) start(() => markSeen('ciViewed')); }, [p.markCi]);
  useEffect(() => {
    const req = p.accounts.find(x => x.id === p.requested);
    if (req?.restricted) toast('Restricted — ' + req.name + ' is outside your authorised scope (owned by ' + req.owner + ')');
    if (p.hint === 'studio') toast('Use “Send to Solution Design Studio” on Meridian');
  }, [p.requested, p.hint]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className={u.empty}>{t('No authorised results.')}</div>;
  const showOwner = p.role !== 'exec';
  const lv = (on: boolean) => (on ? 'var(--color-text)' : 'var(--color-neutral-300)');
  return (
    <div className={s.layout}>
      <div className={s.list}>
        <SectionHead title={t('Strategic accounts')} right={<Tag>{t('Salesforce CRM · external')}</Tag>} mb={4} />
        {p.accounts.map(x => {
          const on = x.id === a.id;
          const body = <>
            <div className={cx(u.rowBase, u.between)} style={{ gap: 8 }}><span style={{ fontWeight: 700, fontSize: 15 }}>{x.name}</span><span className={u.display} style={{ fontSize: 15 }}>{x.restricted ? '—' : x.value}</span></div>
            <div className={cx(u.small, u.muted)}>{t(x.industry)} · {x.geo} · {x.tier}</div>
            {!x.restricted && <><div className={u.small}>{x.rel} · {x.last}</div><div className={cx(u.small, u.accentText)}>AI · {x.obs}</div></>}
            {x.restricted && <div className={cx(u.small, u.muted)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Lock size={12} aria-hidden />{t('Restricted')} — {t('owned by')} {x.owner}</div>}
            {!x.restricted && showOwner && <div className={cx(u.xs, u.muted)}>{t('Owner')}: {x.owner}</div>}
          </>;
          return x.restricted
            ? <button key={x.id} type="button" className={cx(s.acct, u.unbutton)} data-restricted onClick={() => toast('Restricted — ' + x.name + ' is outside your authorised scope (owned by ' + x.owner + ')')}>{body}</button>
            : <Link key={x.id} href={'/ci?acct=' + x.id} className={cx(s.acct, on && s.on)} aria-current={on}>{body}</Link>;
        })}
      </div>
      <div className={s.detail}>
        <div className={cx(u.rowTop, u.between)} style={{ gap: 16 }}>
          <div>
            <div className={u.row} style={{ gap: 6, marginBottom: 8 }}><Tag>{t(a.industry)}</Tag><Tag>{a.tier}</Tag><Tag>{a.rel}</Tag></div>
            <h2 style={{ margin: '0 0 4px' }}>{a.name}</h2>
            <div className={cx(u.small, u.muted)}>{t('Source: Salesforce CRM (external system, read-only) · synced today 08:12 · Owner')} {a.owner}</div>
          </div>
          <div className={u.row} style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setBrief(true)}>{t('Generate briefing')}</button>
            <Link className="btn btn-secondary" href={'/radar?tab=dossier&co=' + a.id}>{t('Radar360 snapshot')}</Link>
            <button className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { const r = await draftHypothesis(a.id); toast(r.msg); router.refresh(); })}>{t('Create opportunity hypothesis')}</button>
            <button className="btn btn-secondary" disabled={pending} data-testid="send-to-studio" onClick={() => start(async () => { const r = await sendToStudio(a.id, false); if (r.msg) toast(r.msg); if (r.url) router.push(r.url); })}>{t('Send to Solution Design Studio →')}</button>
            <button className="btn btn-ghost" onClick={() => { setAiOpen(true); ask('Prepare me for my next meeting with this client'); }}>{t('Ask SYNERGON AI')}</button>
          </div>
        </div>
        <div className={u.grid320}>
          <div>
            <SectionHead title={t('Account overview')} mb={10} />
            <div className={s.facts}>
              <span className={u.muted}>{t('Headquarters')}</span><span>{a.hq} · {a.geo}</span>
              <span className={u.muted}>{t('Scale')}</span><span>{a.size}</span>
              <span className={u.muted}>{t('Open value')}</span><span>{a.value}</span>
              <span className={u.muted}>{t('Last touch')}</span><span>{a.last}</span>
            </div>
          </div>
          <div>
            <SectionHead title={t('Opportunity intelligence')} right={<Tag>{t('CRM')}</Tag>} />
            {a.opps.map(o => (
              <div key={o.name} className={u.rule} style={{ padding: '10px 0' }}>
                <div className={cx(u.row, u.between)} style={{ gap: 8 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{o.name}</span><span className={u.b8}>{o.value}</span></div>
                <div className={cx(u.small, u.muted)}>{t(o.stage)} · {t('close')} {t(o.close)} · {t('signal:')} {o.signal}</div>
              </div>
            ))}
            {a.hypotheses.map((h, i) => (
              <div key={i} className={s.hyp}>
                <span className={s.hypKicker}>{t('Opportunity hypothesis · AI draft · needs your validation')}</span>
                <span className={u.s13}>{h}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHead title={t('Relationship map')} right={<Hint>{t('CRM contacts · relationship strength from interaction history')}</Hint>} mb={12} />
          <div className={s.people}>
            {a.people.map(pp => (
              <div key={pp.name} className={s.person} style={{ borderTopColor: pp.stance === 'Sponsor' || pp.stance === 'Champion' ? 'var(--color-text)' : pp.lvl === 0 ? 'var(--color-accent)' : 'var(--color-neutral-400)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{pp.name}</span>
                <span className={cx(u.small, u.muted)}>{pp.title}</span>
                <span className={s.strength}><span style={{ background: lv(pp.lvl >= 1) }} /><span style={{ background: lv(pp.lvl >= 2) }} /><span style={{ background: lv(pp.lvl >= 3) }} /></span>
                <span className={u.xs}>{t(pp.stance)} · {t(pp.strength)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={u.grid320}>
          <div>
            <SectionHead title={t('Recent interactions')} right={<Tag>CRM · M365</Tag>} />
            {a.touches.map((x, i) => <div key={i} className={s.touch}><span className={u.small} style={{ fontWeight: 700 }}>{t(x.date)}<br /><span style={{ fontWeight: 400 }} className={u.muted}>{t(x.type)}</span></span><span className={u.s13}>{x.text}</span></div>)}
            {a.signals.length > 0 && <>
              <div className={cx(u.small, u.muted)} style={{ marginTop: 12 }}>{t('Connected Radar360 signals')}</div>
              {a.signals.map(sg => <Link key={sg.id} href={'/radar?tab=signals&signal=' + sg.id} className={s.sigLink}>↗ {sg.title}</Link>)}
            </>}
          </div>
          <div>
            <SectionHead title={t('AI insights')} right={<Tag kind="outline">{t('AI-generated · simulated')}</Tag>} />
            {a.insights.map((x, i) => <div key={i} className={cx(u.rule, u.s13)} style={{ padding: '10px 0' }}>{x}</div>)}
            <SectionHead title={t('Suggested actions')} className={s.mt20} />
            {a.actions.map((x, i) => {
              const d = !!p.doneActions[a.id + i];
              return (
                <button key={i} type="button" className={s.action} aria-pressed={d} onClick={() => start(async () => { await toggleSuggestedAction(a.id, i); router.refresh(); })}>
                  <Box on={d} /><span className={u.s13} style={{ textDecoration: d ? 'line-through' : 'none' }}>{x}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <BriefModal brief={brief ? p.brief : null} onClose={() => setBrief(false)} />
    </div>
  );
}
