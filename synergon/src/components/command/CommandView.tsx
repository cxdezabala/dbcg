'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, Tag, Hint, Box, Seg } from '@/components/ui/controls';
import { Modal } from '@/components/ui/Modal';
import { useUI } from '@/components/shell/UIProvider';
import { markSeen } from '@/server/actions/shell';
import { requestAnalysis, actOnRecommendation, launchInitiative } from '@/server/actions/command';
import type { CommandVM } from '@/server/vm/command';
import s from './command.module.css';

export function CommandView({ vm, openTheme, openInitiative, markTheme }: { vm: CommandVM; openTheme: string | null; openInitiative: boolean; markTheme: boolean }) {
  const t = useT();
  const router = useRouter();
  const { toast, ask } = useUI();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<string | null>(openTheme);
  const [prio, setPrio] = useState<string | null>(null);
  const [bu, setBu] = useState('All');
  const [cell, setCell] = useState<string | null>(null);
  const [ini, setIni] = useState<null | { name: string; teams: string[]; acts: { cap: boolean; exp: boolean; share: boolean } }>(null);
  const openIni = (prefill: boolean) => setIni({ name: prefill ? 'AI Customer Operations Proposition' : '', teams: prefill ? vm.t1bus.slice() : [], acts: { cap: true, exp: true, share: true } });
  useEffect(() => { if (markTheme) start(() => markSeen('themeViewed')); if (openInitiative && !vm.initiative) openIni(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const run = (fn: () => Promise<{ msg?: string }>) => start(async () => { const r = await fn(); if (r.msg) toast(r.msg); router.refresh(); });
  const toggleTheme = (id: string) => { const o = theme === id ? null : id; setTheme(o); if (o === 't1' && !vm.isLead) start(() => markSeen('themeViewed')); };
  const heatRows = vm.heat.rows.filter(r => !vm.heat.buFilter || bu === 'All' || r.region === bu);
  const col = (val: number, i: number) => { const gap = vm.heat.targets[i] - val; return gap <= 0 ? ['var(--color-neutral-200)', 'var(--color-text)'] : gap < 0.4 ? ['var(--color-accent-100)', 'var(--color-accent-900)'] : gap < 0.8 ? ['var(--color-accent-200)', 'var(--color-accent-900)'] : gap < 1.1 ? ['var(--color-accent-300)', 'var(--color-accent-900)'] : ['var(--color-accent-500)', 'var(--color-on-accent)']; };
  let detail = 'Select a cell to see capability detail. Filtering is subject to permissions and minimum group-size thresholds.';
  if (cell) { const [tn, i] = cell.split('|'); const r = vm.heat.rows.find(x => x.name === tn); if (r && r.values) { const val = r.values[+i], tg = vm.heat.targets[+i]; detail = tn + ' · ' + vm.heat.caps[+i] + ': ' + val.toFixed(1) + ' average (n=' + r.n + ') vs. target ' + tg + '. ' + (val < tg ? 'Gap ' + (tg - val).toFixed(1) + ' — recommended: assign a development initiative.' : 'At or above target.') + ' Trend: +0.2 over 2 quarters.'; } }
  const h = vm.hero;
  return (
    <div className={u.stack} style={{ gap: 40 }}>
      <div className={u.row} style={{ gap: 8, fontSize: 12 }}><Tag>{t(vm.scopeLine)}</Tag><Tag>{t('Aggregated · minimum group size')} {vm.minGroup}</Tag><Tag>{t('No private 1:1 content')}</Tag><Tag kind="outline">{t('AI-derived insights · simulated')}</Tag></div>
      <div>
        <SectionHead title={'A · ' + t('Organisational pulse')} right={<Hint>{t('Sources: CRM · Radar360 · Studio · Growth · Collaboration')}</Hint>} mb={0} />
        <div className={u.kpis} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {vm.pulse.map(k => <div key={k.label} className={s.pulse}><div className={cx(u.small, u.muted)}>{t(k.label)}</div><div className={u.display} style={{ fontSize: 34, margin: '4px 0' }}>{k.value}</div><div className={cx(u.small, u.accentText)}>{t(k.note)}</div></div>)}
        </div>
      </div>
      {h && (
        <div>
          <SectionHead title={'D · ' + t('Collective intelligence — emerging organisational patterns')} right={<Hint>{t('Patterns beyond CRM reporting')}</Hint>} mb={14} />
          <div className={s.hero} data-testid="theme-t1">
            <div className={cx(u.rowTop, u.between)} style={{ gap: 12 }}>
              <div className={s.heroKicker}>{t('Emerging pattern · confidence')} {t(h.confidence)} ({h.conf}) · {t(h.status)}</div>
              <button className={cx('btn', s.onAccent)} onClick={() => toggleTheme('t1')}>{t(theme === 't1' ? 'Hide evidence' : 'Explore evidence')}</button>
            </div>
            <div className={s.heroTitle}>{t(`${h.count} executives across 3 business units are exploring AI-enabled customer operations.`)}</div>
            <div style={{ fontSize: 15, maxWidth: 820 }}>{h.title}. {h.implication}</div>
            {theme === 't1' && (
              <div className={s.heroEvidence}>
                <div><div className={s.heroLabel}>{t('Supporting evidence')}</div>{h.evidence.map(ev => <div key={ev} className={s.heroRow}>{ev}</div>)}</div>
                <div><div className={s.heroLabel}>{t('Related business units')}</div>{h.bus.map(b => <div key={b} className={s.heroRow}>{b}</div>)}
                  <div className={s.heroLabel} style={{ margin: '14px 0 6px' }}>{t('Relevant contributions')}</div><div style={{ fontSize: 14 }}>Playbook: AI contact-centre business cases (validated) · {h.sofiaLine}</div></div>
              </div>
            )}
            <div className={u.row} style={{ gap: 8 }}>
              <button className={cx('btn', s.onAccentSolid)} data-testid="create-initiative" onClick={() => (h.initiative ? toast('Initiative “' + h.initiative.name + '” is live — visible to ' + h.initiative.teams + ' teams') : openIni(true))}>{t(h.initiative ? 'Initiative launched ✓ — view' : 'Create strategic initiative')}</button>
              <button className={cx('btn', s.onAccent)} disabled={pending} onClick={() => run(() => requestAnalysis('t1', ''))}>{t(h.analysis ? 'Analysis requested ✓' : 'Request further analysis')}</button>
              <Link className={cx('btn', s.onAccent)} href="/studio">{t('View related solution designs')}</Link>
            </div>
          </div>
          <div className={u.grid260} style={{ marginTop: 16 }}>
            {vm.otherThemes.map(th => (
              <div key={th.id} className="card" style={{ padding: 16, gap: 8 }}>
                <div className="card-kicker">{t('Confidence:')} {t(th.confidence)} · {th.conf}</div>
                <div className="card-title">{th.title}</div>
                <p className="card-body">{th.implication}</p>
                {theme === th.id && <>{th.evidence.map(ev => <div key={ev} className={cx(u.small, u.ruleTop)} style={{ padding: '4px 0' }}>{ev}</div>)}<div className={cx(u.small, u.muted)}>{t('Business units:')} {th.bus.join(', ')}</div></>}
                <div className={u.row} style={{ gap: 4 }}><button className="btn btn-ghost" onClick={() => toggleTheme(th.id)}>{t(theme === th.id ? 'Hide evidence' : 'Evidence')}</button><button className="btn btn-ghost" onClick={() => run(() => requestAnalysis(th.id, 'Further analysis requested'))}>{t(th.analysis ? 'Analysis requested ✓' : 'Request analysis')}</button></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {vm.isLead && <div className={u.surface} style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}><Lock size={20} aria-hidden /><div style={{ flex: 1, minWidth: 240 }}><b>{t('Cross-team collective intelligence and growth-opportunity hypotheses')}</b> {t('are available to the Commercial Director. Team leaders see team-scoped intelligence only.')}</div></div>}

      <div className={u.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))' }}>
        <div>
          <SectionHead title={'B · ' + t('Strategic alignment')} right={vm.isDirector ? <button className="btn btn-ghost" onClick={() => openIni(false)}>{t('+ New strategic priority')}</button> : undefined} mb={4} />
          {vm.priorities.map((p, i) => (
            <button key={p.id} type="button" className={s.prio} onClick={() => setPrio(prio === p.id ? null : p.id)} aria-expanded={prio === p.id}>
              <div className={s.prioHead}><span className={u.display} style={{ fontSize: 18, color: p.isNew ? 'var(--color-accent)' : undefined }}>{String(i + 1).padStart(2, '0')}</span><span style={{ fontWeight: 700, fontSize: 14 }}>{t(p.name)} {p.isNew && <Tag kind="accent">{t('New · leadership')}</Tag>}</span><span className={u.b8} style={{ textAlign: 'right' }}>{p.progress}%</span></div>
              <div className={u.trackLight} style={{ margin: '8px 0 0 38px', height: 6 }}><div className={u.fill} style={{ width: p.progress + '%', background: p.progress < 50 ? 'var(--color-accent)' : undefined }} /></div>
              {prio === p.id && <div className={s.prioBody}><span className={u.muted}>{t('Related activities')}</span><span>{p.acts}</span><span className={u.muted}>{t('Teams involved')}</span><span>{p.teams}</span><span className={u.muted}>{t('Potential risk')}</span><span>{p.risk}</span><span className={u.muted}>{t('Recommended action')}</span><span style={{ fontWeight: 700 }}>{p.action}</span></div>}
            </button>
          ))}
        </div>
        <div className={u.stack} style={{ gap: 16 }}>
          <SectionHead title={'G · ' + t('Leadership AI advisor')} right={<Tag kind="outline">{t('Simulated')}</Tag>} mb={0} />
          <div className={cx(u.ink, s.advisor)}>
            {vm.advisorQs.map(q => <button key={q} type="button" className={s.advisorQ} onClick={() => ask(q)}><span>{t(q)}</span><span>→</span></button>)}
          </div>
        </div>
      </div>

      <div>
        <div className={u.sectionHead} style={{ alignItems: 'center', marginBottom: 12 }}><h6>C · {t('Organisational capability intelligence')}</h6>
          <Seg plain options={vm.heat.buFilter ? [['All', 'All'], ['Europe', 'Europe'], ['Middle East', 'Middle East']] : [['All', 'My team']]} value={bu} onChange={x => { setBu(x); setCell(null); }} />
        </div>
        <div className={u.tableWrap}>
          <div style={{ minWidth: 820 }}>
            <div className={s.heatRow}><span />{vm.heat.caps.map(c => <span key={c} className={s.heatCap}>{t(c)}</span>)}</div>
            {heatRows.map(r => (
              <div key={r.name} className={s.heatRow} data-testid="heat-row">
                <span className={s.heatName}>{t(r.name)} <span className={u.muted} style={{ fontWeight: 400 }}>n={r.n}</span></span>
                {vm.heat.caps.map((c, i) => {
                  if (!r.values) return <button key={c} type="button" className={s.cell} style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' }} data-suppressed onClick={() => toast('Suppressed: group of ' + r.n + ' is below the minimum size of ' + vm.minGroup)}>—</button>;
                  const [bg, fg] = col(r.values[i], i); const key = r.name + '|' + i;
                  return <button key={c} type="button" className={s.cell} style={{ background: bg, color: fg, outline: cell === key ? '2px solid var(--color-text)' : 'none' }} onClick={() => setCell(key)}>{r.values[i].toFixed(1)}</button>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={u.row} style={{ gap: 18, marginTop: 10, fontSize: 12 }}>
          <span className={u.row} style={{ gap: 4 }}>{t('Gap vs. target')} {['500', '300', '200', '100'].map(x => <span key={x} style={{ width: 18, height: 12, background: `var(--color-accent-${x})` }} />)}<span style={{ width: 18, height: 12, background: 'var(--color-neutral-200)' }} /> {t('At target')}</span>
          <span className={u.muted}>{t(`“—” = suppressed: group below minimum size of ${vm.minGroup} (privacy threshold)`)}</span>
        </div>
        <div className={u.surface} style={{ marginTop: 12, padding: '12px 14px', fontSize: 14 }}>{t(detail)}</div>
      </div>

      <div className={u.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))' }}>
        <div>
          <SectionHead title={'E · ' + t('Collaboration intelligence')} right={<Hint>{t('Aggregate patterns — no individual productivity scoring')}</Hint>} mb={12} />
          <div className={u.kpis} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 16 }}>
            {vm.collabMetrics.map(m => <div key={m.label} className={u.kpiCell} style={{ padding: '2px 12px' }}><div className={cx(u.small, u.muted)}>{t(m.label)}</div><div className={u.display} style={{ fontSize: 28 }}>{m.value}</div><div className={u.xs}>{t(m.note)}</div></div>)}
          </div>
          <div className={u.capsHead} style={{ border: 0, padding: 0, marginBottom: 6 }}><span>{t('Unmet expertise demand · open requests vs. qualified experts')}</span></div>
          {vm.unmet.map(x => <div key={x.name} className={s.unmet}><span className={u.s13}>{t(x.name)}</span><span className={u.trackLight} style={{ height: 10 }}><span className={u.fill} style={{ width: x.w + '%', background: x.hot ? 'var(--color-accent)' : undefined }} /></span><span className={u.small} style={{ textAlign: 'right' }}>{x.open} / {x.experts}</span></div>)}
          <div className={u.noteBox} style={{ fontSize: 13, marginTop: 10 }}>{t('Bottleneck: AI Service Transformation relies on 3 qualified experts for 9 open requests.')}</div>
        </div>
        {vm.isDirector && (
          <div>
            <SectionHead title={'F · ' + t('Growth opportunity intelligence')} right={<Tag kind="outline">{t('Hypotheses · require validation')}</Tag>} />
            {vm.oppHyps.map(o => (
              <div key={o.key} className={cx(u.rule, u.stack)} style={{ padding: '12px 0', gap: 6 }}>
                <div className={cx(u.row, u.between)} style={{ gap: 12, flexWrap: 'nowrap' }}><span style={{ fontWeight: 700, fontSize: 14 }}>{o.title}</span><span className={u.b8} style={{ whiteSpace: 'nowrap' }}>{o.value}</span></div>
                <div className={u.row} style={{ gap: 4 }}>{o.sources.map(x => <Tag key={x}>{x}</Tag>)}</div>
                <div><button className="btn btn-ghost" onClick={() => run(() => requestAnalysis(o.key, ''))}>{t(o.requested ? 'Validation requested ✓' : 'Request validation from account teams')}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHead title={t('Leadership recommendations')} right={<Hint>{t('Each recommendation is traceable to aggregated evidence')}</Hint>} mb={14} />
        <div className={u.grid260} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {vm.leaderRecs.map((r, k) => (
            <div key={r.i} className={s.rec} style={{ borderTopColor: k === 0 ? 'var(--color-accent)' : 'var(--color-text)' }}>
              <div className={cx(u.row, u.between)} style={{ gap: 8 }}><Tag>{t('Confidence:')} {t(r.conf)}</Tag><Tag kind={r.done ? 'accent' : 'neutral'}>{t(r.done ? (r.theme === 't1' ? 'Initiative launched' : 'In progress') : 'Open')}</Tag></div>
              <div><div className={s.recLabel}>{t('Observation')}</div><div style={{ fontSize: 14, fontWeight: 700 }}>{r.obs}</div></div>
              <div><div className={s.recLabel}>{t('Evidence')}</div><div className={u.s13}>{r.evidence}</div></div>
              <div><div className={s.recLabel}>{t('Business implication')}</div><div className={u.s13}>{r.impl}</div></div>
              <div><div className={s.recLabel} style={{ color: 'var(--color-accent-700)' }}>{t('Recommended action')} · {t(r.role)}</div><div className={u.s13} style={{ fontWeight: 700 }}>{r.action}</div></div>
              <button className="btn btn-secondary" style={{ marginTop: 'auto' }} disabled={pending} onClick={() => {
                if (r.theme === 't1') { if (vm.initiative) toast('Initiative live: ' + vm.initiative.progress + '% · ' + vm.initiative.teams + ' teams'); else openIni(true); return; }
                if (!r.done) run(() => actOnRecommendation(r.i));
              }}>{t(r.theme === 't1' ? (vm.initiative ? 'View initiative status' : 'Create strategic initiative') : r.i === 1 ? (r.done ? 'Initiative assigned ✓' : 'Assign capability development initiative') : (r.done ? 'Expert collaboration requested ✓' : 'Request expert collaboration'))}</button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!ini} onClose={() => setIni(null)} label={t('Create strategic initiative')}>
        {ini && <>
          <div className="card-kicker">{t('Leadership action')}</div>
          <div className="dialog-title">{t('Create strategic initiative')}</div>
          <div className="field"><label htmlFor="ini-name">{t('Initiative name')}</label><input id="ini-name" className="input" value={ini.name} onChange={e => setIni({ ...ini, name: e.target.value })} placeholder={t('Name the initiative')} /></div>
          <div className="field"><label>{t('Teams involved')}</label><div className={u.pills}>{vm.teams.map(tm => { const on = ini.teams.includes(tm); return <button key={tm} type="button" className={cx(u.pill, on && u.on)} onClick={() => setIni({ ...ini, teams: on ? ini.teams.filter(x => x !== tm) : [...ini.teams, tm] })}>{(on ? '✓ ' : '') + tm}</button>; })}</div></div>
          <div className="field"><label>{t('Coordinated actions')}</label>
            {([['cap', 'Assign capability path: value-based selling for AI transformation'], ['exp', 'Request expert collaboration: AI Service Transformation community'], ['share', 'Share approved organisational insight with relevant executives']] as const).map(([k, l]) => (
              <button key={k} type="button" className={s.iniAct} onClick={() => setIni({ ...ini, acts: { ...ini.acts, [k]: !ini.acts[k] } })}><Box on={ini.acts[k]} /><span className={u.s14}>{t(l)}</span></button>
            ))}
          </div>
          <div className={cx(u.small, u.muted)}>{t('Owner: Daniel Foster, Commercial Director. The initiative becomes visible to executives in the selected teams and is logged in the audit trail.')}</div>
          <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setIni(null)}>{t('Cancel')}</button>
            <button className="btn btn-primary" data-testid="launch-initiative" disabled={pending} onClick={() => start(async () => { const r = await launchInitiative(ini); toast(r.msg); if (r.ok) { setIni(null); router.replace('/command?theme=t1'); router.refresh(); } })}>{t('Launch initiative')}</button></div>
        </>}
      </Modal>
    </div>
  );
}
