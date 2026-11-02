'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, Tag, Box, Hint, Seg } from '@/components/ui/controls';
import { Modal } from '@/components/ui/Modal';
import { useUI, useAiContext } from '@/components/shell/UIProvider';
import { createSolution, updateSolution, submitProposal, requestExpert, sofiaContribute, type SolPatch } from '@/server/actions/studio';
import type { StudioListVM, StudioWsVM } from '@/server/vm/studio';
import s from './studio.module.css';

const tagKind = (cls: string) => (cls === 'tag-accent' ? 'accent' : cls === 'tag-outline' ? 'outline' : 'neutral') as 'accent' | 'outline' | 'neutral';

export function StudioList({ vm, notFound }: { vm: StudioListVM; notFound: boolean }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useUI();
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(vm.accounts[0]?.id);
  const [title, setTitle] = useState('');
  const [pending, start] = useTransition();
  useEffect(() => { if (notFound) toast('Restricted — outside your authorised scope'); }, [notFound, toast]);
  return (
    <div className={u.stack} style={{ gap: 32 }}>
      <div className={s.counts}>
        {vm.counts.map(c => <div key={c.label} className={s.count}><div className={cx(u.small, u.muted)}>{t(c.label)}</div><div className={u.display} style={{ fontSize: 34 }}>{c.value}</div></div>)}
        <div className={s.count} style={{ display: 'flex', alignItems: 'center', borderRight: 0 }}><button className="btn btn-primary" onClick={() => { setTitle(''); setOpen(true); }}>{t('+ New solution design')}</button></div>
      </div>
      <div>
        <SectionHead title={t('Solution designs')} right={<Hint>{t('Autosaved · persisted in SYNERGON')}</Hint>} mb={0} />
        <table className="table">
          <thead><tr><th>{t('Solution')}</th><th>{t('Account')}</th><th>{t('Stage')}</th><th>{t('Status')}</th><th>{t('Updated')}</th></tr></thead>
          <tbody>
            {vm.rows.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/studio?sol=' + r.id)}>
                <td style={{ fontWeight: 700 }}><Link href={'/studio?sol=' + r.id} style={{ color: 'inherit', textDecoration: 'none' }}>{r.title}</Link></td><td>{r.acctName}</td><td>{r.stageLabel.split(' · ').map(t).join(' · ')}</td><td><Tag kind={tagKind(r.statusCls)}>{t(r.status)}</Tag></td><td className={u.muted}>{t(r.updated)}</td>
              </tr>
            ))}
            {vm.completed.map(r => (
              <tr key={r.title} style={{ cursor: 'pointer', color: 'var(--color-neutral-700)' }} onClick={() => toast('Archived solutions open read-only — planned capability')}>
                <td style={{ fontWeight: 700 }}>{r.title}</td><td>{r.acct}</td><td>7 · {t('Proposal')}</td><td><Tag>{t('Completed')} · {t(r.when)}</Tag></td><td>{r.team}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <SectionHead title={t('Reusable solution frameworks')} right={<Tag>{t('Verified organisational knowledge')}</Tag>} mb={14} />
        <div className={u.grid220}>
          {vm.frameworks.map(fw => <div key={fw.name} className="card" style={{ padding: 16 }}><div className="card-kicker">{t('Framework')}</div><div className="card-title">{t(fw.name)}</div><div className="card-meta">{fw.meta}</div><button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { setTitle(fw.name); setOpen(true); }}>{t('Start from framework →')}</button></div>)}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} label={t('New solution design')}>
        <div className="dialog-title">{t('New solution design')}</div>
        <div className="field"><label>{t('Account (authorised)')}</label><div className={u.pills}>{vm.accounts.map(a => <button key={a.id} type="button" className={cx(u.pill, acct === a.id && u.on)} onClick={() => setAcct(a.id)}>{a.name}</button>)}</div></div>
        <div className="field"><label htmlFor="ns-title">{t('Working title')}</label><input id="ns-title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('e.g. Procurement transformation')} /></div>
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setOpen(false)}>{t('Cancel')}</button><button className="btn btn-primary" disabled={pending || !acct} onClick={() => start(async () => { const r = await createSolution(acct!, title); setOpen(false); if (r.url) router.push(r.url); })}>{t('Create and open')}</button></div>
      </Modal>
    </div>
  );
}

export function StudioWorkspace({ vm }: { vm: StudioWsVM }) {
  const t = useT();
  const router = useRouter();
  const { toast, ask } = useUI();
  const [pending, start] = useTransition();
  const [framing, setFraming] = useState(false);
  const [compare, setCompare] = useState(false);
  const sol = vm.sol;
  useAiContext({ sol: sol.id, acct: sol.acctId, label: sol.title });
  const upd = (patch: SolPatch, msg?: string) => start(async () => { await updateSolution(sol.id, patch); if (msg) toast(msg); router.refresh(); });
  const frame = () => { setFraming(true); setTimeout(() => start(async () => { await updateSolution(sol.id, { framed: true }); setFraming(false); router.refresh(); }), 1000); };
  const sofiaTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheduleSofia = (ms: number) => { clearTimeout(sofiaTimer.current); sofiaTimer.current = setTimeout(() => start(async () => { const r = await sofiaContribute(sol.id); if (r.msg) toast(r.msg); router.refresh(); }), ms); };
  useEffect(() => { if (vm.sofiaRequested && sol.story) scheduleSofia(4000); return () => clearTimeout(sofiaTimer.current); }, [vm.sofiaRequested, sol.story]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = vm.labels;
  const next = () => { if (sol.stage === 2 && !sol.framed) { frame(); return; } if (sol.stage < 7) upd({ stage: sol.stage + 1 }); else router.push('/studio'); };
  const prev = () => (sol.stage > 1 ? upd({ stage: sol.stage - 1 }) : router.push('/studio'));
  const nextLabel = sol.stage === 7 ? t('Back to workspace') : sol.stage === 2 && !sol.framed ? t('Frame with AI') : t('Next:') + ' ' + t(L[sol.stage]);
  return (
    <div className={u.stack} style={{ gap: 24 }}>
      <div className={cx(u.row, u.between)} style={{ gap: 16, alignItems: 'flex-end' }}>
        <div>
          <Link className="btn btn-ghost" href="/studio">{t('← All solution designs')}</Link>
          <h2 style={{ margin: '6px 0 4px' }}>{sol.title}</h2>
          <div className={cx(u.row, u.s13, u.muted)} style={{ gap: 8 }}><span>{sol.acctName}</span><Tag kind={tagKind(sol.statusCls)}>{t(sol.status)}</Tag><span>{t('Autosaved')} · {t(sol.updated)}</span></div>
        </div>
        {sol.initName && <div className={cx(u.ink, u.s13)} style={{ padding: '10px 14px', maxWidth: 420 }}>{t('Linked to strategic initiative')} <b>{sol.initName}</b> — {t('leadership-approved')}</div>}
      </div>
      <div className={s.rail}>
        {L.map((l, i) => {
          const n = i + 1, on = n === sol.stage, done = n < sol.stage;
          return <button key={l} type="button" className={cx(s.stage, on && s.on, done && s.done)} onClick={() => upd({ stage: n })} aria-current={on ? 'step' : undefined}><span className={s.stageNum}>0{n}</span><span className={s.stageLabel}>{t(l)}</span></button>;
        })}
      </div>
      <div className={u.rowTop} style={{ gap: 32 }}>
        <div className={u.stack} style={{ flex: '3 1 560px', minWidth: 0, gap: 18 }}>
          {sol.stage === 1 && <>
            <h3 style={{ margin: 0 }}>{t('Business challenge')}</h3>
            <p className={cx(u.s14, u.muted)} style={{ margin: 0 }}>{t('State the client’s challenge in their terms. Import intelligence from connected modules to ground it.')}</p>
            <textarea className="input" style={{ minHeight: 120, fontSize: 15 }} defaultValue={sol.challenge} key={sol.challenge} onBlur={e => { if (e.target.value !== sol.challenge) upd({ challenge: e.target.value }); }} placeholder={t('Describe the client’s business challenge…')} aria-label={t('Business challenge')} />
            <div className={u.row} style={{ gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => upd({ imported: true }, 'Account intelligence imported from CRM')}>{t('Import account intelligence (CRM)')}</button>
              <button className="btn btn-secondary" onClick={() => (vm.hasSignal ? upd({ signalImported: true }, 'Radar360 signal imported') : toast('No Radar360 signal connected to ' + sol.acctName))}>{t('Import Radar360 signal')}</button>
            </div>
            <div className={u.stack} style={{ gap: 8 }}>{vm.context.map((cx_, i) => <div key={i} className={s.ctx}><Tag kind={tagKind(cx_.cls)} className={s.ctxTag}>{cx_.src}</Tag><span className={u.s13}>{cx_.text}</span></div>)}</div>
          </>}
          {sol.stage === 2 && <>
            <h3 style={{ margin: 0 }}>{t('Problem framing')}</h3>
            {!sol.framed && <div className={u.surface} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <p style={{ margin: 0, fontSize: 14 }}>{t('SYNERGON AI will structure business context, root problem, stakeholders, constraints and desired outcomes from your challenge statement and imported intelligence.')}</p>
              <button className="btn btn-primary" data-testid="frame" disabled={framing} onClick={frame}>{t(framing ? 'Structuring…' : 'Frame with SYNERGON AI')}</button>
            </div>}
            {sol.framed && <>
              <div className={u.row} style={{ gap: 8 }}><Tag kind="outline">{t('AI-generated · simulated — review before use')}</Tag><button className="btn btn-ghost" onClick={frame}>{t('Regenerate')}</button></div>
              <div>{vm.framing.map(fr => <div key={fr.label} className={s.frame}><span className={s.frameLabel}>{t(fr.label)}</span><span className={u.s14}>{fr.text}</span></div>)}</div>
            </>}
          </>}
          {sol.stage === 3 && <>
            <div className={cx(u.rowBase, u.between)} style={{ gap: 12 }}><h3 style={{ margin: 0 }}>{t('Solution exploration')}</h3><button className="btn btn-secondary" onClick={() => setCompare(!compare)}>{t(compare ? 'Hide comparison' : 'Compare alternatives')}</button></div>
            <div className={u.grid220} style={{ gap: 14 }}>
              {vm.alts.map(al => {
                const on = sol.alt === al.id;
                return (
                  <div key={al.id} className={s.alt} style={{ outlineColor: on ? 'var(--color-accent)' : 'transparent' }}>
                    <div className={cx(u.rowBase, u.between)}><span className={u.display} style={{ fontSize: 26 }}>{al.id}</span><span className={u.small}>{t('AI fit')} <b>{al.fit}%</b></span></div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{t(al.name)}</div>
                    <div className={u.s13}>{al.summary}</div>
                    {(['assumptions', 'benefits', 'limitations', 'tradeoffs'] as const).map(k => <div key={k} className={u.small}><b>{t({ assumptions: 'Assumptions', benefits: 'Benefits', limitations: 'Limitations', tradeoffs: 'Trade-offs' }[k])}</b><br />{al[k]}</div>)}
                    <button className={cx('btn', on ? 'btn-primary' : 'btn-secondary')} style={{ marginTop: 'auto' }} onClick={() => { const ws: Record<string, boolean> = {}; al.ws.forEach(w => { ws[w] = true; }); upd({ alt: al.id, ws }, 'Approach ' + al.id + ' selected — architecture pre-filled'); }}>{t(on ? 'Selected ✓' : al.recommended ? 'Select (AI recommended)' : 'Select this approach')}</button>
                  </div>
                );
              })}
            </div>
            {compare && <table className="table"><thead><tr><th>{t('Criterion')}</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>{vm.compareRows.map(cr => <tr key={cr.label}><td style={{ fontWeight: 600 }}>{t(cr.label)}</td><td>{cr.a}</td><td>{cr.b}</td><td>{cr.c}</td></tr>)}</tbody></table>}
          </>}
          {sol.stage === 4 && <>
            <h3 style={{ margin: 0 }}>{t('Solution architecture')}</h3>
            <p className={cx(u.s14, u.muted)} style={{ margin: 0 }}>{t('Select workstreams. Investment and the business case update automatically.')}</p>
            <div>{vm.wsList.map(w => (
              <button key={w.id} type="button" className={cx(s.ws, w.on && s.on)} onClick={() => upd({ ws: { ...sol.ws, [w.id]: !w.on } })}>
                <Box on={w.on} />
                <span className={u.stack} style={{ gap: 3 }}><span style={{ fontWeight: 700, fontSize: 15 }}>{w.name}</span><span className={u.small}>{t('Deliverables:')} {w.del}</span><span className={cx(u.small, u.muted)}>{t('Capability:')} {w.caps} · {t('Dependency:')} {w.dep}</span></span>
                <span className={u.b8}>{w.costLabel}</span>
              </button>
            ))}</div>
            {vm.warn && <div className={u.warn}>{t(vm.warn)}</div>}
            <div className={u.row} style={{ gap: 32 }}>
              <div><div className={cx(u.small, u.muted)}>{t('Workstreams')}</div><div className={u.display} style={{ fontSize: 30 }}>{vm.wsCount}</div></div>
              <div><div className={cx(u.small, u.muted)}>{t('Estimated investment (incl. 15% implementation & PMO)')}</div><div className={u.display} style={{ fontSize: 30 }}>{vm.bc.inv}</div></div>
            </div>
          </>}
          {sol.stage === 5 && <>
            <h3 style={{ margin: 0 }}>{t('Expert collaboration')}</h3>
            <p className={cx(u.s14, u.muted)} style={{ margin: 0 }}>{t('SYNERGON matches internal experts from the Collaboration & Contribution ecosystem to this solution’s context.')}</p>
            <div>{vm.experts.map(er => (
              <div key={er.id} className={s.expert}>
                <span className={u.display} style={{ fontSize: 20, color: 'var(--color-accent-700)' }}>{er.match}%</span>
                <span className={u.stack} style={{ gap: 2 }}><Link href={'/collab?expert=' + er.id} style={{ fontWeight: 700, fontSize: 15, color: 'inherit', textDecoration: 'none' }}>{er.name}</Link><span className={u.small}>{er.title}</span><span className={cx(u.small, u.muted)}>{er.reason}</span></span>
                <span className={u.row} style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {!er.status && <button className="btn btn-primary" data-testid={'request-' + er.id} disabled={pending} onClick={() => start(async () => { const r = await requestExpert(sol.id, er.id, 'request'); if (r.msg) toast(r.msg); router.refresh(); if (er.id === 'sofia') scheduleSofia(3500); })}>{t('Request contribution')}</button>}
                  {er.status && <Tag kind={er.status === 'contributed' ? 'accent' : 'outline'}>{t(er.status === 'contributed' ? 'Contributed ✓' : er.status === 'connected' ? 'Connected' : 'Requested · awaiting response')}</Tag>}
                  {er.status === 'requested' && er.id === 'sofia' && <button className="btn btn-ghost" onClick={() => scheduleSofia(0)}>{t('Simulate response')}</button>}
                </span>
              </div>
            ))}</div>
            {vm.sofia && (
              <div className={s.contrib} data-testid="sofia-contribution">
                <div className={u.row} style={{ gap: 8 }}><Tag>{t('Expert contribution')} · Sofia Chen</Tag><Tag>{t('User-generated · in review for org-wide reuse')}</Tag></div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t('Sequence agent-assist before automation')}</div>
                <p style={{ margin: 0, fontSize: 14 }}>Across 3 comparable FS programmes, agent-assist adoption reached 70% by month 6 and lifted savings ~1 pt above plan. Automating before journeys are redesigned eroded NPS. Recommend option C with a 16-week agent-assist pilot.</p>
                <div className={cx(u.small, u.accentText)}>{t('Applied: agent-assist savings rate updated 6% → 7% in the business case.')}</div>
              </div>
            )}
          </>}
          {sol.stage === 6 && <>
            <h3 style={{ margin: 0 }}>{t('Business case')}</h3>
            {vm.bc.empty && <div className={u.warn}>{t('Select workstreams in stage 4 to build the value model.')}</div>}
            <div className={u.kpis}>
              {[['Investment', vm.bc.inv], ['Annual benefit (run-rate)', vm.bc.benefit], ['3-year ROI', vm.bc.roi], ['Payback', t(vm.bc.pay)]].map(([l, val], i) => <div key={l} className={u.kpiCell}><div className={cx(u.small, u.muted)}>{t(l)}</div><div className={u.display} style={{ fontSize: 30, color: i === 2 ? 'var(--color-accent-700)' : undefined }}>{val}</div></div>)}
            </div>
            <div className={u.grid260} style={{ gap: 24 }}>
              <div className="field"><label>{t('Addressable annual service cost base')}: <b>€{sol.costBase}M</b></label><input type="range" min={10} max={90} step={1} defaultValue={sol.costBase} key={sol.costBase} onChange={e => upd({ costBase: +e.target.value })} aria-label={t('Addressable annual service cost base')} /></div>
              <div className="field"><label>{t('Scenario')}</label><Seg plain options={[['conservative', 'Conservative'], ['base', 'Base'], ['ambitious', 'Ambitious']]} value={sol.scenario} onChange={k => upd({ scenario: k })} /></div>
            </div>
            <table className="table"><thead><tr><th>{t('Scenario')}</th><th>{t('Savings rate')}</th><th>{t('Annual benefit')}</th><th>{t('3-yr ROI')}</th><th>{t('Payback')}</th></tr></thead><tbody>
              {vm.scenRows.map(sr => <tr key={sr.k} style={{ fontWeight: sr.on ? 800 : 400 }}><td>{t(sr.label)}</td><td>{sr.pct}</td><td>{sr.benefit}</td><td>{sr.roi}</td><td>{t(sr.pay)}</td></tr>)}
            </tbody></table>
            <div className={u.grid260} style={{ gap: 24 }}>
              <div><h6>{t('Assumptions')}</h6>{vm.assumptions.map(x => <div key={x} className={cx(u.rule, u.s13)} style={{ padding: '7px 0' }}>{x}</div>)}</div>
              <div><h6>{t('Risks')}</h6>{vm.risks.map(x => <div key={x.text} className={cx(u.rule, u.s13, u.row, u.between)} style={{ padding: '7px 0', gap: 10, flexWrap: 'nowrap' }}><span>{x.text}</span><Tag kind={x.cls}>{t(x.sev)}</Tag></div>)}</div>
            </div>
          </>}
          {sol.stage === 7 && <>
            <div className={cx(u.row, u.between)} style={{ gap: 12 }}><h3 style={{ margin: 0 }}>{t('Executive proposal')}</h3>
              <div className={u.row} style={{ gap: 8 }}><button className="btn btn-secondary" onClick={() => { toast('Planned capability: branded document export (P2). Use browser print for a demo copy.'); window.print(); }}>{t('Export document')}</button>
                <button className="btn btn-primary" disabled={sol.submitted || pending} onClick={() => start(async () => { const r = await submitProposal(sol.id); if (r.msg) toast(r.msg); router.refresh(); })}>{t(sol.submitted ? 'Submitted for review ✓' : 'Submit for review')}</button></div></div>
            <div className={s.doc}>
              <div style={{ borderBottom: '2px solid var(--color-text)', paddingBottom: 16 }}><div className={u.kicker} style={{ letterSpacing: '.12em', fontSize: 11 }}>Asterion Business Solutions · {t('Proposal to')} {sol.acctName} · {t('Draft')}</div><div className={u.display} style={{ fontSize: 30, marginTop: 6 }}>{sol.title}</div></div>
              <div><h6>1 · {t('Executive summary')}</h6><p className={u.s14} style={{ margin: 0 }}>{vm.prop.summary}</p></div>
              <div><h6>2 · {t('Business challenge')}</h6><p className={u.s14} style={{ margin: 0 }}>{sol.challenge}</p></div>
              <div><h6>3 · {t('Proposed solution')} — {t(vm.prop.altName)}</h6>{vm.prop.ws.map(x => <div key={x} className={u.s14} style={{ padding: '4px 0' }}>— {x}</div>)}</div>
              <div><h6>4 · {t('Expected outcomes')}</h6><p className={u.s14} style={{ margin: 0 }}>{vm.prop.outcomes}</p></div>
              <div><h6>5 · {t('Implementation roadmap')}</h6><div className={s.roadmap}><div><b className={u.s13}>{t('Weeks 0–16')}</b><div className={u.small}>Diagnose, redesign priority journeys, agent-assist pilot</div></div><div><b className={u.s13}>{t('Months 4–9')}</b><div className={u.small}>Scale agent-assist, governance, academy wave 1</div></div><div><b className={u.s13}>{t('Months 10–18')}</b><div className={u.small}>Selective automation, benefits realisation</div></div></div></div>
              <div><h6>6 · {t('Business case')}</h6><p className={u.s14} style={{ margin: 0 }}>Investment {vm.bc.inv} · annual run-rate benefit {vm.bc.benefit} · 3-year ROI {vm.bc.roi} · payback {vm.bc.pay} ({vm.prop.scenario} scenario).</p></div>
              {vm.sofia && <div><h6>{t('Expert validation')}</h6><p className={u.s14} style={{ margin: 0 }}>Adoption benchmark contributed by Sofia Chen, Principal — AI Service Transformation (3 comparable FS programmes).</p></div>}
              <div><h6>7 · {t('Next steps')}</h6><p className={u.s14} style={{ margin: 0 }}>Validate cost baseline with {sol.acctName.split(' ')[0]} finance · sponsor workshop with the COO · agree pilot scope and outcome-linked fee option.</p></div>
              <div className={cx(u.xs, u.muted)} style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 10 }}>{t('Generated with SYNERGON AI from user inputs, CRM data and validated knowledge. AI-drafted sections require human review before sending. Demonstration data.')}</div>
            </div>
          </>}
          <div className={cx(u.row, u.between)} style={{ gap: 12, borderTop: '2px solid var(--color-divider)', paddingTop: 16 }}>
            <button className="btn btn-secondary" onClick={prev}>{t('← Previous')}</button>
            <button className="btn btn-primary" data-testid="sol-next" disabled={pending || framing} onClick={next}>{nextLabel} →</button>
          </div>
        </div>
        <div className={u.stack} style={{ flex: '1 1 260px', minWidth: 0, gap: 20 }}>
          <div className={u.surface} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card-kicker">{t('SYNERGON AI co-pilot')}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t(vm.copilotTip)}</div>
            <button className="btn btn-secondary" onClick={() => ask('Help me structure a solution for this business problem')}>{t('Help me structure this solution')}</button>
            <button className="btn btn-secondary" onClick={() => ask('Stress-test my business case assumptions')}>{t('Stress-test assumptions')}</button>
          </div>
          <div>
            <h6>{t('Co-creation team')}</h6>
            <div className={cx(u.rule, u.s13)} style={{ padding: '6px 0' }}>{sol.owner} · {t('owner')}</div>
            {vm.team.map(tm => <div key={tm.name} className={cx(u.rule, u.s13, u.row, u.between)} style={{ padding: '6px 0', gap: 8 }}><span>{tm.name}</span><span className={u.muted}>{t(tm.status)}</span></div>)}
          </div>
          <div>
            <h6>{t('Provenance')}</h6>
            <div className={u.row} style={{ gap: 6 }}><Tag>{t('CRM data')}</Tag><Tag>{t('External signal')}</Tag><Tag>{t('User input')}</Tag><Tag kind="outline">{t('AI interpretation')}</Tag><Tag>{t('Verified knowledge')}</Tag></div>
          </div>
        </div>
      </div>
    </div>
  );
}
