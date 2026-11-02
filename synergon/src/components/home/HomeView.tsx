'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { Hint, SectionHead, CapsHead, Tag, HowTo, Bar } from '@/components/ui/controls';
import { BriefModal } from '@/components/common/BriefModal';
import { LessonModal } from '@/components/common/LessonModal';
import { scenarioGo, markSeen } from '@/server/actions/shell';
import type { HomeVM, Action } from '@/server/vm/home';
import type { ScenarioStep } from '@/server/scenario';
import type { Lesson, Role } from '@/lib/demo/types';
import s from './home.module.css';

export function HomeView({ vm, role, scenario, lesson, showRail }: { vm: HomeVM; role: Role; scenario: { steps: ScenarioStep[]; doneCount: number; current: number }; lesson: Lesson; showRail: boolean }) {
  const t = useT();
  const [modal, setModal] = useState<null | 'brief' | 'lesson'>(null);
  const [, start] = useTransition();
  useEffect(() => { if (vm.markAligned) start(() => markSeen('alignedSeen')); }, [vm.markAligned]);
  const hd = vm.hd;
  const act = (key: string, a: Action, children: React.ReactNode, className: string) =>
    'href' in a ? <Link key={key} href={a.href} className={className}>{children}</Link>
      : <button key={key} type="button" className={cx(className, u.unbutton)} style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => setModal(a.modal)}>{children}</button>;
  return (
    <div className={s.page}>
      <section className={s.dash} aria-label={t('Commercial performance')}>
        <div className={s.dashHead}>
          <div><div className="card-kicker">{t('Commercial performance · YTD 2026 · CRM-synced today 08:12')}</div><div className={s.dashTitle}>{t(hd.title)}</div></div>
          <div className={u.row} style={{ gap: 8 }}>
            {hd.scope && (
              <div className={u.seg}>
                {([['me', 'My pipeline'], ['team', 'My team']] as const).map(([id, l]) => <Link key={id} href={'/home?scope=' + id} className={cx(u.segBtn, hd.scope === id && u.on)} aria-current={hd.scope === id}>{t(l)}</Link>)}
              </div>
            )}
            {hd.hasBack && <Link className="btn btn-ghost" href="/home">{t('← All teams')}</Link>}
            <Link className="btn btn-secondary" href={hd.detailsHref}>{t('Details in Commercial Intelligence →')}</Link>
          </div>
        </div>
        <div className={u.kpis}>
          {hd.kpis.map(k => (
            <div key={k.label} className={u.kpi}>
              <span className={u.kpiLabel}>{t(k.label)}</span>
              <span className={u.kpiValue} style={{ color: k.accent ? 'var(--color-accent-700)' : undefined }}>{k.value}</span>
              <span className={u.kpiNote}>{t(k.note)}</span>
              <span className={s.kpiBar} style={{ opacity: k.barOp }}><span className={u.fill} style={{ width: k.barW + '%', background: k.barColor }} /></span>
            </div>
          ))}
        </div>
        <div className={u.grid2narrow}>
          <div>
            <CapsHead title={t('Open pipeline by stage')} note={t('Weighted') + ' ' + hd.weighted} />
            {hd.stages.map(st => (
              <div key={st.label} className={s.stageRow}>
                <span className={s.stageLabel}>{t(st.label)}<br /><span className={s.stageSub}>{t(st.count)} · {st.prob} {t('prob.')}</span></span>
                <Bar w={st.w} color={st.color} h={24} track="dark" />
                <span className={s.stageVal}><b>{st.value}</b> · {st.pct}</span>
              </div>
            ))}
          </div>
          <div className={u.stack} style={{ gap: 16 }}>
            <div>
              <CapsHead title={t('Won vs lost · closed YTD')} note={t(hd.closedTotal) + ' ' + t('closed')} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <span><span className={s.big}>{hd.wonPct}</span> <span className={u.s13}>{t('won')} · {hd.won} · {hd.wonN} {t('deals')}</span></span>
                <span style={{ textAlign: 'right' }}><span className={s.big} style={{ color: 'var(--color-accent-700)' }}>{hd.lostPct}</span> <span className={u.s13}>{t('lost')} · {hd.lost} · {hd.lostN} {t('deals')}</span></span>
              </div>
              <div className={s.wonLost}><span style={{ width: hd.wonW + '%', background: 'var(--color-text)' }} /><span style={{ width: hd.lostW + '%', background: 'var(--color-accent)' }} /></div>
              <div className={cx(u.small, u.muted)} style={{ marginTop: 6 }}>{t('Win rate by value')} {hd.wonPct} · {t('by number of deals')} {hd.rateN}</div>
            </div>
            <div>
              <CapsHead title={t('Won per month')} note={t('Peak') + ' ' + hd.peak.split(' ').map((x, i) => (i === 0 ? t(x) : x)).join(' ')} />
              <div className={s.months} role="img" aria-label={t('Won per month')}>
                {hd.months.map(mo => <div key={mo.m} className={s.month}><span style={{ height: mo.h + '%', background: mo.color }} title={mo.v} /><span className={u.muted} style={{ fontSize: 10 }}>{t(mo.m)}</span></div>)}
              </div>
            </div>
          </div>
        </div>
        <div>
          <CapsHead title={t(hd.shareTitle)} note={t('Share of open pipeline')} />
          {hd.shares.map(sh => (
            <div key={sh.label} className={s.shareRow}>
              <span className={u.s13}>{t(sh.label)}<br /><span className={cx(u.xs, u.muted)}>{sh.caption.split(' · ').map(t).join(' · ')}</span></span>
              <span className={s.shareBar}>{sh.segs.map((sg, i) => <span key={i} title={sg.label} className={s.shareSeg} style={{ width: sg.w + '%', background: sg.color }} />)}</span>
              <span className={s.shareVal}>{sh.value}</span>
            </div>
          ))}
          {hd.legend.length > 0 && <div className={s.legend}>{hd.legend.map(l => <Link key={l.label} href={l.href} className={s.legendItem}><span className={u.dot} style={{ background: l.color }} />{l.label} <b>{l.pct}</b></Link>)}</div>}
        </div>
        {hd.oppRows && (
          <div>
            <CapsHead title={t('Top open opportunities')} note={t('Click to open account intelligence')} />
            {hd.oppRows.map(o => (
              <Link key={o.name + o.acct} href={o.href} className={s.oppRow}>
                <span className={u.minw0}><b className={u.s14}>{o.name}</b><br /><span className={cx(u.small, u.muted)}>{o.acct} · {t('close')} {t(o.close)}</span></span>
                <span className={u.stack} style={{ gap: 4 }}><span className={s.dots}>{o.dots.map((d, i) => <span key={i} className={u.dot} style={{ background: d }} />)}</span><span className={u.xs}>{t(o.stage)} · {o.prob}</span></span>
                <span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={o.w} /><b className={u.s13} style={{ width: 52 }}>{o.value}</b></span>
                <span className={cx(u.small, u.accentText)}>{o.next}</span>
              </Link>
            ))}
          </div>
        )}
        {hd.perfRows && (
          <div>
            <CapsHead title={t(hd.rowsTitle)} note={t(hd.rowsHint)} />
            <div className={s.perfHead}><span>{t('Name')}</span><span>{t('Open pipeline')}</span><span>{t('Won')}</span><span>{t('Lost')}</span><span>{t('Win rate')}</span><span style={{ textAlign: 'right' }}>{t('Share')}</span></div>
            {hd.perfRows.map(p => {
              const inner = <>
                <span className={u.minw0}><b className={u.s14}>{p.name}</b><br /><span className={cx(u.xs, u.muted)}>{t(p.sub)}</span></span>
                <span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><Bar w={p.pipeW} color={p.color} /><b className={u.s13} style={{ width: 52 }}>{p.pipe}</b></span>
                <span className={u.s13}>{p.won}</span>
                <span className={cx(u.s13, u.accentText)}>{p.lost}</span>
                <span className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><span style={{ flex: 1, display: 'flex', height: 8 }}><span style={{ width: p.rateW + '%', background: 'var(--color-text)' }} /><span style={{ flex: 1, background: 'var(--color-accent-300)' }} /></span><span className={u.small} style={{ width: 34 }}>{p.rate}</span></span>
                <span className={u.display} style={{ fontSize: 16, textAlign: 'right' }}>{p.share}</span>
              </>;
              return p.href ? <Link key={p.name} href={p.href} className={s.perfRow}>{inner}</Link> : <div key={p.name} className={cx(s.perfRow, p.isMe && s.me)}>{inner}</div>;
            })}
          </div>
        )}
        <HowTo text={hd.insight} />
      </section>

      {vm.initiative && (
        <div className={s.banner} data-testid="initiative-banner">
          <div style={{ minWidth: 0, flex: '1 1 420px' }}>
            <div className={s.bannerKicker}>{t('Leadership-approved initiative')} · Daniel Foster</div>
            <div className={s.bannerTitle}>{vm.initiative.name}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>{vm.initiative.homeLine}</div>
          </div>
          <div className={u.row} style={{ gap: 8 }}><Link className="btn btn-primary" href={vm.initiative.solHref}>{t('Open linked solution')}</Link><Link className={cx('btn', s.btnOnInk)} href="/growth">{t('Assigned learning')}</Link></div>
        </div>
      )}

      {showRail && (
        <div>
          <div className={u.sectionHead} style={{ marginBottom: 12 }}><h6>{t('Demonstration scenario — Emerging AI Transformation Opportunity')}</h6><span className={cx(u.small, u.muted)}>{scenario.doneCount} {t('of 8 steps')} · {t('click a step to jump')}</span></div>
          <div className={s.rail}>
            {scenario.steps.map((st, i) => (
              <button key={st.n} type="button" className={cx(s.railStep, st.done && s.done, i === scenario.current && s.cur)} onClick={() => start(() => scenarioGo(st.n))} data-step={st.n}>
                <span style={{ fontSize: 11, fontWeight: 800, color: i === scenario.current ? 'var(--color-accent-700)' : 'var(--color-text)' }}>{st.n} · {t(st.done ? 'Done' : i === scenario.current ? 'Next' : 'To do')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{t(st.title)}</span>
                <span className={cx(u.xs, u.muted)}>{t(st.module)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={u.grid2}>
        <div>
          <SectionHead title={t('My priorities')} right={<Hint>{t('Ranked by SYNERGON AI · aligned to strategy')}</Hint>} />
          {vm.priorities.map(p => act(p.num, p.go, <>
            <span className={s.prioNum} style={{ color: p.first ? 'var(--color-accent)' : undefined }}>{p.num}</span>
            <span className={u.stack} style={{ gap: 3, minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 600, textDecoration: p.done ? 'line-through' : 'none' }}>{t(p.title)}</span><span className={cx(u.small, u.muted)}>{t(p.meta)}</span></span>
            <Tag kind={p.tagCls === 'tag-accent' ? 'accent' : 'neutral'}>{t(p.tag)}</Tag>
          </>, s.prio))}
        </div>
        <div>
          <SectionHead title={t('This week')} right={<Hint>{t('Calendar · Radar360 · Collaboration')}</Hint>} mb={0} />
          <div className={s.pulseGrid}>
            {vm.pulse.map(k => <Link key={k.label} href={k.href} className={s.pulse}><div className={cx(u.small, u.muted)}>{t(k.label)}</div><div className={s.pulseValue}>{k.value}</div><div className={cx(u.small, u.accentText)}>{t(k.note)}</div></Link>)}
          </div>
        </div>
      </div>

      <div>
        <SectionHead title={t('AI recommendations')} right={<Tag kind="outline">{t('AI-generated · simulated')}</Tag>} mb={14} />
        <div className={s.recs}>
          {vm.recs.map(r => (
            <div key={r.title} className="card" style={{ padding: 18, gap: 10 }}>
              <div className="card-kicker">{t(r.src)}</div>
              <div className="card-title">{t(r.title)}</div>
              <p className="card-body">{t(r.body)}</p>
              {'href' in r.go ? <Link className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} href={r.go.href}>{t(r.cta)} →</Link>
                : <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('brief')}>{t(r.cta)} →</button>}
            </div>
          ))}
        </div>
      </div>

      {role === 'lead' && (
        <div>
          <SectionHead title={t('My team · Enterprise Accounts Iberia & UK')} right={<Link className="btn btn-ghost" href="/command">{t('Open Team Intelligence →')}</Link>} mb={14} />
          <div className={s.teamStrip}>
            <div className={s.teamCell}><div className={cx(u.small, u.muted)}>{t('Strategic alignment')}</div><div className={s.cellValue}>74<span style={{ fontSize: 15 }}>/100</span></div><div className={u.small}>{t('+6 vs. last quarter')}</div></div>
            <div className={s.teamCell}><div className={cx(u.small, u.muted)}>{t('Capability focus')}</div><div className={s.cellValue}>{t('Negotiation')}</div><div className={u.small}>{t('Team avg 2.8 vs 3.5 target')}</div></div>
            <div className={s.teamCell}><div className={cx(u.small, u.muted)}>{t('Cross-team collaboration')}</div><div className={s.cellValue}>41%</div><div className={u.small}>{t('of expert requests outside team')}</div></div>
            <div className={s.teamCell}><div className={cx(u.small, u.muted)}>{t('Awaiting your validation')}</div><div className={s.cellValue}>{vm.pending}</div><div className={u.small}>{t('knowledge contributions')}</div></div>
          </div>
        </div>
      )}

      <div className={u.grid2}>
        <div>
          <SectionHead title={t('My growth')} right={<Link className="btn btn-ghost" href="/growth">{t('Growth workspace →')}</Link>} mb={14} />
          <div className={s.growthGrid}>
            <div>
              <div className={cx(u.small, u.muted)}>{t('Current capability focus')}</div>
              <div className={u.display} style={{ fontSize: 24, margin: '4px 0' }}>{t('Negotiation')}</div>
              <div className={u.trackLight} style={{ height: 6 }}><div className={u.fill} style={{ width: '54%' }} /><div className={u.marker} style={{ left: '70%' }} /></div>
              <div className={cx(u.small, u.muted)} style={{ marginTop: 6 }}>{t('2.7 now · 3.5 target · evidence-based')}</div>
            </div>
            <button type="button" className={s.lessonCard} onClick={() => setModal('lesson')}>
              <div className="card-kicker">{t(vm.lessonKicker)}</div>
              <div style={{ fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{t('Value-based selling for AI transformation')}</div>
              <div className={cx(u.small, u.muted)}>{t('5 min')} · {t('relevant to your Meridian solution')}</div>
            </button>
          </div>
          <div className={cx(u.small, u.muted)} style={{ marginTop: 14 }}>{t(vm.growthLine)}</div>
        </div>
        <div>
          <SectionHead title={t('Collaboration feed')} right={<Link className="btn btn-ghost" href="/collab">{t('All knowledge →')}</Link>} />
          {vm.feed.map((f, i) => (
            <Link key={i} href={f.href} className={s.feed}>
              <span className={s.feedAvatar}>{f.ini}</span>
              <span className={u.stack} style={{ gap: 3 }}><span style={{ fontSize: 14, lineHeight: 1.4 }}><b>{f.who}</b> {f.text}</span><span className={u.row} style={{ gap: 8 }}><Tag kind={f.tagCls === 'tag-accent' ? 'accent' : 'neutral'}>{t(f.tag)}</Tag><span className={cx(u.xs, u.muted)}>{t(f.time)}</span></span></span>
            </Link>
          ))}
        </div>
      </div>
      <BriefModal brief={modal === 'brief' ? vm.brief : null} onClose={() => setModal(null)} />
      <LessonModal lesson={lesson} open={modal === 'lesson'} onClose={() => setModal(null)} />
    </div>
  );
}
