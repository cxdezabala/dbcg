'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, CapsHead, Tag, Box, Bar, Hint, HowTo, Seg } from '@/components/ui/controls';
import { ProvTag } from '@/components/ui/Provenance';
import { Modal } from '@/components/ui/Modal';
import { BriefModal } from '@/components/common/BriefModal';
import { useUI, useAiContext } from '@/components/shell/UIProvider';
import { setLens, updatePrep, applyAiPicks, setInvestmentOverride, linkSignal, toggleSavedSignal, createCompany } from '@/server/actions/radar';
import { sendToStudio } from '@/server/actions/studio';
import type { DossierVM, SignalsVM } from '@/server/data/radar';
import s from './radar.module.css';

type Props = { tab: 'dossier'; d: DossierVM; sectors: string[] } | { tab: 'signals'; s: SignalsVM };

export function RadarView(p: Props) {
  const t = useT();
  return (
    <>
      <div className={u.tabs} role="tablist">
        <Link href="/radar?tab=dossier" role="tab" aria-selected={p.tab === 'dossier'} className={cx(u.tab, p.tab === 'dossier' && u.on)}>{t('Client snapshot & meeting prep')}</Link>
        <Link href="/radar?tab=signals" role="tab" aria-selected={p.tab === 'signals'} className={cx(u.tab, p.tab === 'signals' && u.on)}>{t('Market signals radar')}</Link>
      </div>
      {p.tab === 'dossier' ? <Dossier d={p.d} sectors={p.sectors} /> : <Signals s={p.s} />}
    </>
  );
}

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return { pending, run, router, start };
}

function Dossier({ d, sectors }: { d: DossierVM; sectors: string[] }) {
  const t = useT();
  const { toast, ask, setAiOpen } = useUI();
  const { run, router, pending, start } = useAct();
  const [modal, setModal] = useState<null | 'brief' | 'newCo'>(null);
  const [assump, setAssump] = useState(false);
  const [nc, setNc] = useState({ name: '', sector: 'Insurance', emp: '2500', country: 'Spain' });
  useAiContext({ co: d.co.id, lens: d.lens, label: d.co.name });
  useEffect(() => { if (location.hash === '#d-signals') setTimeout(() => document.getElementById('d-signals')?.scrollIntoView({ behavior: 'smooth' }), 300); }, []);
  const tabHref = (dt: string) => '/radar?tab=dossier&co=' + d.co.id + '&dtab=' + dt;
  const co = d.co;
  const prep = (op: Parameters<typeof updatePrep>[1]) => run(() => updatePrep(co.id, op));
  return (
    <div className={u.stack} style={{ gap: 20 }}>
      <div className={u.row} style={{ gap: 10 }}>
        <select className="input" style={{ width: 'auto', minWidth: 280, fontWeight: 700 }} value={co.id} aria-label={t('Company')} onChange={e => router.push('/radar?tab=dossier&co=' + e.target.value + '&dtab=' + d.dtab)}>
          {d.cos.map(o => <option key={o.id} value={o.id}>{o.label.split(' — ').map((x, i) => (i ? t(x) : x)).join(' — ')}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={() => setModal('newCo')}>{t('+ New company')}</button>
        <div className={u.flex1} />
        <span className={u.label}>{t('Lens')}</span>
        <Seg options={[['consulting', 'Consulting'], ['execed', 'Executive education']]} value={d.lens} onChange={l => run(() => setLens(l))} label={t('Lens')} />
        <button className="btn btn-primary" onClick={() => setModal('brief')}>{t('Meeting brief')}</button>
      </div>
      <div className={cx(u.row, u.between)} style={{ gap: 16, alignItems: 'flex-end', borderTop: '2px solid var(--color-text)', paddingTop: 16 }}>
        <div style={{ minWidth: 0, flex: '1 1 480px' }}>
          <h2 style={{ margin: 0 }}>{co.name}</h2>
          <div className={cx(u.s14, u.muted)} style={{ marginTop: 4 }}>{t(co.sector)} · {co.hq} · {co.listedTag.split(' · ').map((x, i) => (i ? x : t(x))).join(' · ')} · <span className={u.accentText} style={{ fontWeight: 600 }}>{co.crmTag.split(' · ').map(t).join(' · ')}</span></div>
        </div>
        <div className={u.row} style={{ gap: 4 }}>
          <button className="btn btn-ghost" onClick={() => toast('Demo: opens ' + co.web + ' in a new tab in production')}>{co.web} ↗</button>
          <button className="btn btn-ghost" onClick={() => toast('Demo: opens linkedin.com/company/' + co.li + ' in production')}>LinkedIn ↗</button>
        </div>
      </div>
      <div className={s.dtabs} role="tablist">
        {([['overview', 'Overview'], ['fin', 'Financials'], ['opp', 'Opportunity'], ['people', 'Stakeholders'], ['comp', 'Competition'], ['plan', 'Meeting plan']] as const).map(([id, l], i) => (
          <Link key={id} href={tabHref(id)} role="tab" aria-selected={d.dtab === id} className={cx(s.dtab, d.dtab === id && s.on)} scroll={false}><span className={cx(u.xs, u.muted)}>0{i + 1}</span><span className={s.dtabLabel}>{t(l)}</span></Link>
        ))}
      </div>
      <div className={u.kpis} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {d.kpis.map(k => (
          <div key={k.label} className={u.kpi} style={{ padding: '12px 18px 14px', gap: 4 }}>
            <span className={u.kpiLabel}>{t(k.label)}</span>
            <span className={u.kpiValue} style={{ color: k.accent ? 'var(--color-accent-700)' : undefined }}>{t(k.value)}</span>
            <span className={u.kpiNote}>{t(k.note)}</span>
            <span><ProvTag p={k.prov} /></span>
          </div>
        ))}
      </div>
      <div className={s.howWrap}><HowTo text={d.insight} /><ProvTag p="AI_HYPOTHESIS" /></div>

      {d.dtab === 'overview' && <>
        <div className={u.grid220} style={{ gap: 12 }}>
          {d.actions.map(x => (
            <Link key={x.k} href={tabHref(x.tab)} className={s.actCard} style={{ borderTopColor: x.top ? 'var(--color-accent)' : 'var(--color-text)' }} scroll={false}>
              <span className="card-kicker">{t(x.k)}</span><span style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.25 }}>{x.v}</span><span className={cx(u.s13, u.muted)}>{x.d}</span><span><ProvTag p={x.prov} /></span>
            </Link>
          ))}
        </div>
        <div className={u.grid2} style={{ marginTop: 12 }}>
          <div>
            <CapsHead mb8 title={t('About the company')} />
            <p style={{ margin: '0 0 10px', fontSize: 14 }}>{co.desc}</p>
            {d.facts.map(f => <div key={f.label} className={s.fact}><span className={u.muted}>{t(f.label)}</span><span style={{ fontWeight: 600 }}>{t(f.value)}</span><span className={cx(u.xs, u.muted)}>{t(f.src)}</span><ProvTag p={f.prov} /></div>)}
          </div>
          <div id="d-signals">
            <CapsHead mb8 title={t('Recent signals')} />
            {!d.signals.length && <div className={u.empty}>{t('No company-specific signals in the last 90 days.')}</div>}
            {d.signals.map(x => (
              <div key={x.id} className={cx(u.rule, u.stack)} style={{ padding: '10px 0', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{x.title}</span>
                <span className={cx(u.s13, u.muted)}>{t(x.verified ? 'Verified' : 'AI hypothesis')} · {x.date} — {x.impl}</span>
                <span className={u.row} style={{ gap: 4 }}>
                  <ProvTag p={x.verified ? 'REPORTED' : 'AI_HYPOTHESIS'} />
                  {d.canConnect && <button className={cx('btn', x.linked ? 'btn-primary' : 'btn-secondary')} data-testid={'connect-' + x.id} disabled={pending} onClick={() => { if (!x.linked) start(async () => { const r = await linkSignal(x.id, d.co.crmId!, true); toast(r.msg); router.refresh(); }); }}>{t(x.linked ? 'Connected to account ✓' : 'Connect to account')}</button>}
                  <Link className="btn btn-ghost" href={'/radar?tab=signals&signal=' + x.id}>{t('Open in radar')}</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      </>}

      {d.dtab === 'fin' && <>
        {d.ar && (
          <div className={u.grid2}>
            <div><CapsHead mb8 title={<>{t('Annual Report')} {co.arYear} {t('priorities → our angle')}</>} />
              {d.ar.priorities.map(x => <div key={x.t} className={cx(u.rule, u.stack)} style={{ padding: '10px 0', gap: 3 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{x.t} <ProvTag p="REPORTED" /></span><span className={cx(u.s13, u.accentText)}>→ {x.angle} <span className={u.muted}>· AR {x.pg}</span> <ProvTag p="AI_HYPOTHESIS" /></span></div>)}
            </div>
            <div><CapsHead mb8 title={t('More from the report')} />
              {d.ar.kpis.map(k => <div key={k.label} className={s.arKpi}><span>{t(k.label)}</span><span><b>{k.value}</b> <span className={cx(u.xs, u.muted)}>{k.note}</span> <ProvTag p="REPORTED" /></span></div>)}
              {d.ar.talent.map(x => <div key={x} className={cx(u.rule, u.s13)} style={{ padding: '8px 0' }}>{t('Talent')} · {x} <ProvTag p="REPORTED" /></div>)}
              {d.ar.risks.map(x => <div key={x} className={cx(u.rule, u.s13, u.muted)} style={{ padding: '8px 0' }}>{t('Risk')} · {x} <ProvTag p="REPORTED" /></div>)}
            </div>
          </div>
        )}
        {!co.listed && (
          <div><CapsHead mb8 title={<>{t('How the estimates are built')} · {t('private company, no annual report')}</>} />
            {d.estKpis.map(k => <div key={k.label} className={s.est}><span>{t(k.label)}</span><b>{k.value}</b><span className={u.muted}>{k.method}</span><ProvTag p="ESTIMATED" /></div>)}
          </div>
        )}
        <div style={{ maxWidth: 720 }}>
          <div className={u.capsHead8}><span>{t('Versus sector')}</span><span className={u.note} style={{ display: 'flex', gap: 14 }}><span className={u.row} style={{ gap: 6 }}><span className={u.dot} style={{ background: 'var(--color-accent)' }} />{t('Client')} <ProvTag p={d.clientProv} /></span><span className={u.row} style={{ gap: 6 }}><span className={u.dot} style={{ background: 'var(--color-neutral-400)' }} />{t('Sector median')} <ProvTag p="ESTIMATED" /></span></span></div>
          {d.bench.map(b => (
            <div key={b.label} className={s.bench}><span className={u.s13}>{t(b.label)}</span>
              <span className={u.stack} style={{ gap: 3 }}>
                <span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={b.coW} h={10} color="var(--color-accent)" /><span style={{ width: 56, fontSize: 12, fontWeight: 700 }}>{b.coLabel}</span></span>
                <span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={b.bW} h={10} color="var(--color-neutral-400)" /><span style={{ width: 56, fontSize: 12 }}>{b.bLabel}</span></span>
              </span>
            </div>
          ))}
          <div className={cx(u.xs, u.muted)} style={{ marginTop: 6 }}>{t(d.benchNote)}</div>
        </div>
      </>}

      {d.dtab === 'opp' && <>
        <div>
          <CapsHead mb8 title={<>{t('Business units')} — {t('fit for')} {t(d.lensLabel)}</>} />
          {d.bus.map(b => (
            <div key={b.name} className={s.bu}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{b.name}<br /><span style={{ fontWeight: 400 }} className={cx(u.small, u.muted)}>{b.emp} {t('employees')} · {b.share} {t('revenue')}</span> <ProvTag p={b.prov} /></span>
              <span className={u.trackLight} style={{ height: 8 }}><span className={u.fill} style={{ width: b.shareW + '%' }} /></span>
              <span><Tag kind={b.fit === 'High' ? 'accent' : b.fit === 'Medium' ? 'neutral' : 'outline'}>{t(b.fit)}</Tag></span>
              <span className={u.s13}>{b.why} <ProvTag p="AI_HYPOTHESIS" /></span>
              <button className={cx('btn', b.on ? 'btn-primary' : 'btn-ghost')} onClick={() => prep({ set: { bu: b.on ? null : b.name } })}>{t(b.on ? 'Leading with ✓' : 'Lead with this')}</button>
            </div>
          ))}
        </div>
        <div>
          <div className={u.capsHead8}><span>{t('Investment estimate')} <ProvTag p="ESTIMATED" /></span><button type="button" className={u.unbutton} style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--color-accent-700)' }} onClick={() => setAssump(!assump)}>{t(assump ? 'Hide assumptions' : 'Adjust assumptions')}</button></div>
          {assump && <>
            <div className={u.grid260} style={{ gap: 24, padding: '8px 0 12px' }}>
              <div className="field"><label>{t('L&D per employee')}: <b>€{d.inv.ldPer}</b> · {t(d.inv.ldSrc)} <ProvTag p={d.inv.ldProv} /></label><input type="range" min={200} max={2000} step={10} defaultValue={d.inv.ldPer} key={'ld' + d.inv.ldPer} onChange={e => run(() => setInvestmentOverride(co.id, { ld: +e.target.value }))} /></div>
              <div className="field"><label>{t('Executive share of L&D')}: <b>{d.inv.execPct}%</b></label><input type="range" min={10} max={45} step={1} defaultValue={d.inv.execPct} key={'ex' + d.inv.execPct} onChange={e => run(() => setInvestmentOverride(co.id, { exec: +e.target.value / 100 }))} /></div>
            </div>
            {d.inv.adjusted && <button className="btn btn-ghost" onClick={() => run(() => setInvestmentOverride(co.id, null))}>{t('Reset to model values')}</button>}
          </>}
          {d.inv.method.map(m => <div key={m} className={cx(u.rule, u.s13, u.muted)} style={{ padding: '8px 0' }}>{m}</div>)}
        </div>
      </>}

      {d.dtab === 'people' && (
        <div>
          {d.people.map(pp => (
            <div key={pp.k} className={s.person} style={{ borderLeftColor: pp.key ? 'var(--color-accent)' : 'var(--color-neutral-300)' }}>
              <span className={cx(u.avatar, u.ink)} style={{ width: 40, height: 40 }}>{pp.ini}</span>
              <span className={u.stack} style={{ gap: 2, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{t(pp.name)}</span><span className={u.small}>{pp.role}</span><span className={cx(u.xs, u.muted)}>{t(pp.src)} · {t(pp.rel)} <ProvTag p={pp.prov} /></span></span>
              <span className={u.stack} style={{ gap: 2, minWidth: 0 }}><span className={u.s13}>{pp.why}</span><span className={cx(u.small, u.accentText)}>→ {pp.approach}</span></span>
              <span className={u.row} style={{ gap: 4, justifyContent: 'flex-end' }}>
                <button className={cx('btn', pp.on ? 'btn-primary' : 'btn-secondary')} onClick={() => prep({ toggle: { k: 'stake', val: pp.k } })}>{t(pp.on ? 'In meeting plan ✓' : '+ Add to meeting')}</button>
                <button className="btn btn-ghost" onClick={() => toast(pp.li ? 'Demo: opens linkedin.com/in/' + pp.li + ' in production' : 'Demo: searches LinkedIn for “' + pp.role + ', ' + co.name + '”')}>LinkedIn ↗</button>
              </span>
            </div>
          ))}
          <div className={cx(u.xs, u.muted)} style={{ marginTop: 8 }}>{t('Red marker = key for the selected lens. Public professional information only; CRM relationship data follows your permissions.')}</div>
        </div>
      )}

      {d.dtab === 'comp' && <>
        <div>
          <CapsHead mb8 title={t('Client vs. market peers')} />
          {d.noPeers && <div className={u.empty}>{t('No peer set for a newly analysed company — in production, peers come from market data.')}</div>}
          <div className={u.tableWrap}><table className="table"><thead><tr><th>{t('Company')}</th><th style={{ width: '28%' }}>{t('Revenue')}</th><th>{t('Employees')}</th><th>{t('Op. margin')}</th><th>{t('Growth')}</th><th>{t('AI maturity')}</th><th>{t('Provenance')}</th></tr></thead><tbody>
            {d.peers.map(r => (
              <tr key={r.name} style={{ fontWeight: r.client ? 800 : 400 }}>
                <td>{r.name}<br /><span style={{ fontWeight: 400 }} className={cx(u.xs, u.muted)}>{t(r.note)}</span></td>
                <td><span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={r.revW} h={8} color={r.client ? 'var(--color-accent)' : 'var(--color-text)'} /><span style={{ width: 64 }}>{r.rev}</span></span></td>
                <td>{r.emp}</td><td>{r.op}</td><td>{r.growth}</td><td>{t(r.ai)}</td><td><ProvTag p={r.prov} /></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
        <div>
          <CapsHead mb8 title={<>{t('Our competitors for this account')} · {t(d.lensLabel)} <ProvTag p="AI_HYPOTHESIS" /></>} />
          {d.rivals.map(r => (
            <div key={r.name} className={s.rival}>
              <span><b style={{ fontSize: 15 }}>{r.name}</b><br /><span className={u.muted}>{r.type}</span></span>
              <span>+ {r.strength}<br /><span className={u.muted}>− {r.weak}</span></span>
              <span className={u.accentText} style={{ fontWeight: 600 }}>{t('How we win →')} {r.how}</span>
            </div>
          ))}
        </div>
      </>}

      {d.dtab === 'plan' && (
        <div className={u.rowTop} style={{ gap: 32 }}>
          <div className={u.stack} style={{ flex: '2 1 460px', minWidth: 0, gap: 28 }}>
            <div><CapsHead mb8 title={<>{t('What we’ll pitch')} — {t('tick to include')}</>} />
              {d.hooks.map(h => (
                <button key={h.k} type="button" className={cx(s.check, h.on && s.on)} onClick={() => prep({ toggle: { k: 'hooks', val: h.k } })}>
                  <Box on={h.on} /><span><b className={u.s14}>{h.t}</b><br /><span className={cx(u.small, u.muted)}>{h.ev}</span> <ProvTag p={h.prov} /></span>
                </button>
              ))}
            </div>
            <div><CapsHead mb8 title={t('Questions to ask')} />
              {d.qs.map(q => <button key={q.q} type="button" className={s.check} onClick={() => prep({ toggle: { k: 'qs', val: q.q } })}><Box on={q.on} /><span className={u.s14}>{q.q}</span></button>)}
            </div>
          </div>
          <div className={s.planSide}>
            <Seg options={[['first', 'First meeting'], ['follow', 'Follow-up']]} value={d.prep.type} onChange={v => prep({ set: { type: v } })} />
            <div className="field"><label htmlFor="mdate">{t('Meeting date')}</label><input id="mdate" className="input" type="date" defaultValue={d.prep.date} onBlur={e => prep({ set: { date: e.target.value } })} /></div>
            <div>{d.prep.checks.map(c => <div key={c.label} className={u.row} style={{ gap: 8, padding: '4px 0', fontSize: 13, color: c.done ? 'var(--color-text)' : 'var(--color-neutral-700)', flexWrap: 'nowrap' }}><span className={cx(u.box, c.done && u.on)} style={{ width: 14, height: 14 }} />{t(c.label)}</div>)}</div>
            <button className="btn btn-primary" onClick={() => setModal('brief')}>{t('Generate meeting brief')}</button>
            <button className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { await applyAiPicks(co.id); toast('AI picks applied — review and adjust before the meeting'); router.refresh(); })}>{t('Apply AI picks')}</button>
            <button className="btn btn-ghost" onClick={() => { setAiOpen(true); ask('Prepare me for a first meeting with this company'); }}>{t('Ask SYNERGON AI')}</button>
            {co.crmId && <button className="btn btn-ghost" disabled={pending} onClick={() => start(async () => { const r = await sendToStudio(co.crmId!, true); if (r.msg) toast(r.msg); if (r.url) router.push(r.url); })}>{t('Send to Solution Design Studio →')}</button>}
          </div>
        </div>
      )}
      <div className={cx(u.xs, u.muted)} style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 8 }}>{t('Sources:')} {d.sourcesLine} · {t('Confidence:')} {t(co.confidence)} · {t('demonstration data')}</div>

      <BriefModal brief={modal === 'brief' ? d.brief : null} onClose={() => setModal(null)} savedMsg="Meeting brief saved to the account workspace" />
      <Modal open={modal === 'newCo'} onClose={() => setModal(null)} label={t('Analyse a new company')}>
        <div className="card-kicker">{t('Radar360 · new company analysis')}</div>
        <div className="dialog-title">{t('Analyse a new company')}</div>
        <div className="field"><label htmlFor="nc-name">{t('Company name')}</label><input id="nc-name" className="input" value={nc.name} onChange={e => setNc({ ...nc, name: e.target.value })} placeholder="e.g. Lumen Logistics" /></div>
        <div className="field"><label>{t('Sector')}</label><div className={u.pills}>{sectors.map(x => <button key={x} type="button" className={cx(u.pill, nc.sector === x && u.on)} onClick={() => setNc({ ...nc, sector: x })}>{t(x)}</button>)}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label htmlFor="nc-emp">{t('Employees (approx.)')}</label><input id="nc-emp" className="input" type="number" value={nc.emp} onChange={e => setNc({ ...nc, emp: e.target.value })} /></div>
          <div className="field"><label htmlFor="nc-country">{t('Country / HQ')}</label><input id="nc-country" className="input" value={nc.country} onChange={e => setNc({ ...nc, country: e.target.value })} /></div>
        </div>
        <div className={cx(u.small, u.muted)}>{t('In production SYNERGON retrieves the annual report, website and LinkedIn data automatically. In this demo the snapshot is built from sector benchmarks and every figure is labelled as estimated.')}</div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('Cancel')}</button>
          <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await createCompany({ ...nc, emp: Number(nc.emp) }); toast(r.msg); if (r.ok && r.id) { setModal(null); router.push('/radar?tab=dossier&dtab=overview&co=' + r.id); } })}>{t('Build snapshot')}</button>
        </div>
      </Modal>
    </div>
  );
}

const IND = ['All', 'Financial Services', 'Telecommunications', 'Energy', 'Retail & Industrial'];
const GEO = ['All', 'Europe', 'Middle East'];

function Signals({ s: vm }: { s: SignalsVM }) {
  const t = useT();
  const { toast } = useUI();
  const { router, pending, start } = useAct();
  const [ind, setInd] = useState('All');
  const [geo, setGeo] = useState('All');
  const [brief, setBrief] = useState(false);
  const sig = vm.sel;
  useAiContext({ signal: sig.id, label: sig.title });
  const match = (x: { industry: string; geo: string }) => (ind === 'All' || x.industry === ind) && (geo === 'All' || x.geo === geo);
  const list = vm.signals.filter(match);
  const sel = (id: string) => router.push('/radar?tab=signals&signal=' + id, { scroll: false });
  return (
    <div className={u.stack} style={{ gap: 28 }}>
      <div className={u.row} style={{ gap: 20 }}>
        <div className={u.row} style={{ gap: 8 }}><span className={u.label}>{t('Industry')}</span><Seg plain options={IND.map(x => [x, x] as [string, string])} value={ind} onChange={setInd} /></div>
        <div className={u.row} style={{ gap: 8 }}><span className={u.label}>{t('Geography')}</span><Seg plain options={GEO.map(x => [x, x] as [string, string])} value={geo} onChange={setGeo} /></div>
      </div>
      <div className={u.rowTop} style={{ gap: 32 }}>
        <div style={{ flex: '1 1 380px', maxWidth: 560, minWidth: 0 }}>
          <div className={s.radar} role="img" aria-label={t('Market signals radar')}>
            <div className={s.ring1} /><div className={s.ring2} /><div className={s.axV} /><div className={s.axH} />
            <span className={s.q} style={{ left: 8, top: 6 }}>{t('Financial Services').toUpperCase()}</span>
            <span className={s.q} style={{ right: 8, top: 6 }}>{t('Telecommunications').toUpperCase()}</span>
            <span className={s.q} style={{ right: 8, bottom: 6 }}>{t('Energy').toUpperCase()}</span>
            <span className={s.q} style={{ left: 8, bottom: 6 }}>{t('Retail & Industrial').toUpperCase()}</span>
            <span className={s.h} style={{ top: 'calc(32% + 4px)' }}>NOW</span><span className={s.h} style={{ top: 'calc(16% + 4px)' }}>NEXT</span><span className={s.h} style={{ top: 4 }}>WATCH</span>
            {vm.signals.map(x => {
              const on = x.id === sig.id, m = match(x);
              return <button key={x.id} type="button" title={x.title} aria-label={x.title} className={s.blip} onClick={() => sel(x.id)}
                style={{ left: x.x + '%', top: x.y + '%', width: on ? 20 : 14, height: on ? 20 : 14, background: on ? 'var(--color-accent)' : x.verified ? 'var(--color-text)' : 'var(--color-bg)', borderColor: on ? 'var(--color-accent)' : x.verified ? 'var(--color-text)' : 'var(--color-accent)', opacity: m ? 1 : 0.18, boxShadow: on ? '0 0 0 5px var(--color-accent-200)' : 'none' }} />;
            })}
          </div>
          <div className={cx(u.row, u.small, u.muted)} style={{ gap: 16, marginTop: 10 }}>
            <span className={u.row} style={{ gap: 6 }}><span style={{ width: 12, height: 12, background: 'var(--color-text)' }} />{t('Verified signal')}</span>
            <span className={u.row} style={{ gap: 6 }}><span style={{ width: 12, height: 12, border: '2px solid var(--color-accent)' }} />{t('AI-generated hypothesis')}</span>
            <span className={u.row} style={{ gap: 6 }}><span style={{ width: 12, height: 12, background: 'var(--color-accent)' }} />{t('Selected')}</span>
            <span>{t('Rings: time horizon')}</span>
          </div>
        </div>
        <div className={u.stack} style={{ flex: '1 1 380px', minWidth: 0, gap: 16 }}>
          <div className={u.row} style={{ gap: 6 }}><ProvTag p={sig.verified ? 'REPORTED' : 'AI_HYPOTHESIS'} /><Tag kind={sig.verified ? 'neutral' : 'outline'}>{t(sig.verified ? 'Verified information' : 'AI-generated hypothesis')}</Tag><Tag>{t(sig.kind)} {t('intelligence')}</Tag><Tag>{t(sig.industry)} · {t(sig.geo)}</Tag><Tag>{t('Horizon:')} {t(sig.horizon)}</Tag></div>
          <h3 style={{ margin: 0 }}>{sig.title}</h3>
          <div className={cx(u.small, u.muted)}>{sig.date}</div>
          <div><div className={u.label}>{t('Signal')}</div><p style={{ margin: '4px 0 0', fontSize: 14 }}>{sig.summary}</p></div>
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 12 }}><div className={u.label} style={{ color: 'var(--color-accent-700)' }}>{t('Potential implication · AI interpretation')} <ProvTag p="AI_HYPOTHESIS" /></div><p style={{ margin: '4px 0 0', fontSize: 14 }}>{sig.implication}</p></div>
          <div><div className={u.label}>{t('Suggested action')}</div><p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>{sig.action}</p></div>
          <div><div className={u.label} style={{ marginBottom: 4 }}>{t('Sources')}</div>{sig.sources.map(x => <div key={x} className={cx(u.rule, u.small)} style={{ padding: '4px 0' }}>{x}</div>)}</div>
          <div><div className={u.label} style={{ marginBottom: 6 }}>{t('Connect to account')}</div>
            <div className={u.pills}>{sig.connect.map(a => <button key={a.id} type="button" className={cx(u.pill, a.on && u.on)} disabled={pending} data-testid={'link-' + a.id} onClick={() => start(async () => { const r = await linkSignal(sig.id, a.id, !a.on); if (r.msg) toast(r.msg); router.refresh(); })}>{(a.on ? '✓ ' : '+ ') + a.name}</button>)}</div>
          </div>
          <div className={u.row} style={{ gap: 8, paddingTop: 6 }}>
            <button className="btn btn-primary" onClick={() => setBrief(true)}>{t('Generate executive briefing')}</button>
            <button className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { const r = await toggleSavedSignal(sig.id); if (r.on) toast('Insight saved to your workspace'); router.refresh(); })}>{t(sig.saved ? 'Saved ✓' : 'Save insight')}</button>
            <button className="btn btn-secondary" disabled={pending} onClick={() => start(async () => {
              const tgt = sig.studioTarget; if (!tgt) { toast('Connect this insight to an account first'); return; }
              if (!sig.connect.find(a => a.id === tgt)?.on) await linkSignal(sig.id, tgt, true);
              const r = await sendToStudio(tgt, true); if (r.msg) toast(r.msg); if (r.url) router.push(r.url);
            })}>{t('Transfer to Solution Design Studio →')}</button>
          </div>
        </div>
      </div>
      <div className={u.grid2}>
        <div>
          <SectionHead title={t('Signals · industry, company & competitive')} right={<Hint>{list.length} {t('shown')}</Hint>} mb={4} />
          {list.map(x => (
            <button key={x.id} type="button" className={cx(s.sigRow, x.id === sig.id && s.on)} onClick={() => sel(x.id)}>
              <span className={u.stack} style={{ gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{x.title}</span><span className={cx(u.small, u.muted)}>{t(x.kind)} · {t(x.industry)} · {t(x.geo)}</span></span>
              <Tag kind={x.verified ? 'neutral' : 'outline'}>{t(x.verified ? 'Verified' : 'AI hypothesis')}</Tag>
            </button>
          ))}
        </div>
        <div>
          <SectionHead title={t('Opportunity hypotheses')} right={<Tag kind="outline">{t('Inferred from verified signals')}</Tag>} mb={12} />
          <div className={u.stack} style={{ gap: 12 }}>
            {vm.hyps.map(h => (
              <div key={h.title} className="card" style={{ padding: 16 }}>
                <div className="card-kicker">{h.acct}</div><div className="card-title">{t(h.title)}</div><p className="card-body">{h.basis}</p>
                <div><ProvTag p="AI_HYPOTHESIS" /></div>
                {h.href ? <Link className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} href={h.href}>{t(h.cta)} →</Link>
                  : <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} disabled={pending} onClick={() => start(async () => { const r = await sendToStudio(h.studio!, true); if (r.msg) toast(r.msg); if (r.url) router.push(r.url); })}>{t(h.cta)} →</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <BriefModal brief={brief ? vm.brief : null} onClose={() => setBrief(false)} />
    </div>
  );
}
