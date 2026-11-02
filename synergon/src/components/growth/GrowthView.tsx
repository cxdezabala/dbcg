'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, Tag, Hint, CapsHead } from '@/components/ui/controls';
import { Modal } from '@/components/ui/Modal';
import { LessonModal } from '@/components/common/LessonModal';
import { useUI } from '@/components/shell/UIProvider';
import { saveRoleplayScore, markVideoWatched, selectGap } from '@/server/actions/growth';
import type { GrowthVM, VideoVM } from '@/server/vm/growth';
import s from './growth.module.css';

type M = null | 'lesson' | 'framework' | 'roleplay' | { video: VideoVM };

function VideoCard({ v, onPlay, big }: { v: VideoVM; onPlay: () => void; big?: boolean }) {
  const t = useT();
  return (
    <div className={s.video}>
      <button type="button" className={s.thumb} onClick={onPlay} aria-label={v.title}>
        <span className={cx('grayscale', s.thumbImg)} style={{ backgroundImage: `url("https://i.ytimg.com/vi/${v.id}/hqdefault.jpg")` }} />
        <span className={s.play} style={big ? { width: 48, height: 48 } : undefined}><Play size={big ? 20 : 18} fill="currentColor" /></span>
        {v.watched && <span className={s.watched}>{t('Watched ✓')}</span>}
      </button>
      <div className={s.videoBody}>
        <span className={u.row} style={{ gap: 4 }}><Tag>{t(v.format)}</Tag><Tag kind="outline">✓ {v.source}</Tag></span>
        <span className="card-kicker">{t(v.kicker)}</span>
        <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{v.title}</span>
        <span className={cx(u.small, u.muted)}>{v.expert}</span>
        <span className={u.s13} style={{ marginTop: 4 }}>{v.why}</span>
      </div>
    </div>
  );
}

export function GrowthView({ vm }: { vm: GrowthVM }) {
  const t = useT();
  const router = useRouter();
  const { toast, ask } = useUI();
  const [modal, setModal] = useState<M>(null);
  const [safety, setSafety] = useState(false);
  const [rp, setRp] = useState<number[]>([]);
  const [inline, setInline] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const open = (g: string) => {
    if (g === 'lesson' || g === 'framework') setModal(g);
    else if (g === 'roleplay' || g === 'rp') { setRp([]); setModal('roleplay'); }
    else if (g === 'path') toast('Enterprise learning integration (Workday) is a planned capability');
    else if (g.startsWith('/')) router.push(g);
  };
  const practice = () => {
    const k = vm.gap.practice;
    if (k === 'rp' || k === 'lesson') open(k);
    else if (k === 'studio') router.push(vm.gap.storyHref);
    else if (k === 'radar') router.push('/radar?tab=dossier&dtab=people');
    else router.push('/radar?tab=signals');
  };
  const watch = (v: VideoVM) => start(async () => { await markVideoWatched(v.id, v.title); router.refresh(); });
  const RP = vm.roleplay;
  const score = rp.reduce((a, p, j) => a + RP[j].opts[p][1], 0);
  const vid = modal && typeof modal === 'object' ? modal.video : null;
  return (
    <div className={u.stack} style={{ gap: 36 }}>
      <div className={s.flow}>
        <div className={cx(u.rowBase, u.between)} style={{ gap: 12 }}>
          <div><div className="card-kicker">{t('Learning in the flow of work · detected from your calendar & CRM')}</div><div className={u.display} style={{ fontSize: 22, marginTop: 4 }}>{t('You are preparing a complex negotiation: Meridian procurement review, 12 Nov')}</div></div>
          <Tag kind="outline">{t('AI-generated recommendation · simulated')}</Tag>
        </div>
        <div className={s.ctxGrid}>
          {vm.ctxRecs.map(cr => (
            <button key={cr.title} type="button" className={s.ctxRec} onClick={() => open(cr.go)}>
              <span className={u.kicker}>{t(cr.kind)}</span><span style={{ fontSize: 15, fontWeight: 700 }}>{t(cr.title)}</span><span className={cx(u.small, u.muted)}>{t(cr.meta)}</span><span className={u.small} style={{ fontWeight: 700, marginTop: 4 }}>{t(cr.cta)} →</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHead title={t('Close your gaps — free expert videos')} right={<Hint>{t('Curated from YouTube for the gaps detected in your capability profile')}</Hint>} mb={16} />
        <div className={u.rowTop} style={{ gap: 28 }}>
          <div style={{ flex: '1 1 240px', maxWidth: 300, minWidth: 0 }}>
            {vm.gaps.map(g => (
              <button key={g.id} type="button" className={cx(s.gap, g.on && s.on)} onClick={() => start(async () => { await selectGap(g.id); router.refresh(); })}>
                <span><b className={u.s14}>{t(g.name)}</b><br /><span className={cx(u.small, u.muted)}>{g.cur} {t('now')} · {g.tgt} {t('target')} · {t(g.seen)}</span></span>
                <span className={u.b8} style={{ fontSize: 13, color: g.big ? 'var(--color-accent-700)' : undefined, alignSelf: 'center' }}>−{g.gap}</span>
              </button>
            ))}
          </div>
          <div className={u.stack} style={{ flex: '3 1 520px', minWidth: 0, gap: 18 }}>
            <div>
              <div className="card-kicker">{t('Detected gap')} · {t(vm.gap.name)} · {vm.gap.cur} → {vm.gap.tgt}</div>
              <div className={u.display} style={{ fontSize: 24, lineHeight: 1.2, margin: '4px 0' }}>{t(vm.gap.headline)}</div>
              <div className={cx(u.s13, u.muted)}>{t('Why now:')} {vm.gap.evidence}</div>
            </div>
            <div className={u.grid260}>{vm.gap.videos.map(v => <VideoCard key={v.id} v={v} big onPlay={() => { setInline(true); setCopied(false); setModal({ video: v }); }} />)}</div>
            <div><CapsHead mb8 title={t('After watching, practise these behaviours')} />
              {vm.gap.behaviours.map((b, i) => <div key={b} className={s.beh}><b className={u.accentText}>0{i + 1}</b><span>{b}</span></div>)}</div>
            <div className={u.row} style={{ gap: 8 }}><button className="btn btn-primary" onClick={practice}>{t(vm.gap.practiceLabel)}</button><button className="btn btn-ghost" onClick={() => ask('What should I improve to become more effective?')}>{t('Ask the AI coach about this gap')}</button></div>
            <div className={cx(u.xs, u.muted)}>{t('Free public videos from verified professional sources only (consultancies, business schools, recognised authors and conferences). Played in privacy-enhanced mode without unrelated suggestions. Watching counts as learning activity; your capability level changes only with validated work evidence.')}</div>
          </div>
        </div>
      </div>

      <div>
        <SectionHead title={t('McKinsey Live — free webinars')} right={<a className="btn btn-ghost" href="https://www.youtube.com/playlist?list=PLhvMIsPbo0GCgGOu_YroCOVSiCp4_9a1H" target="_blank" rel="noopener noreferrer">{t('All McKinsey Live webinars on YouTube ↗')}</a>} />
        <div className={cx(u.s13, u.muted)} style={{ marginBottom: 14 }}>{t('Short webinars from McKinsey partners, picked for your accounts and the AI customer-operations proposition.')}</div>
        <div className={u.grid260} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{vm.mck.map(v => <VideoCard key={v.id} v={v} onPlay={() => { setInline(true); setCopied(false); setModal({ video: v }); }} />)}</div>
      </div>

      <div className={u.surface} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className={cx(u.row, u.between)} style={{ gap: 10 }}><span className={u.row} style={{ gap: 10, fontSize: 14 }}><ShieldCheck size={18} aria-hidden /><b>{t('Professional content policy')}</b> — {t('every video is checked before it is recommended.')}</span><button className="btn btn-ghost" onClick={() => setSafety(!safety)}>{t(safety ? 'Hide policy' : 'View policy')}</button></div>
        {safety && <div className={s.policy}>
          {['Allow-list of sources only: consultancies, business schools, recognised authors and industry conferences', 'Every video is reviewed and approved by the Learning team before it can be recommended', 'No automatic search results, and no user-uploaded or anonymous channels', 'Privacy-enhanced player (youtube-nocookie) without unrelated suggestions', 'Formats: webinars, interviews, podcasts, conference talks and lectures', 'Any user can flag a video; it is removed until re-reviewed (production)'].map(x => <span key={x}>— {t(x)}</span>)}
        </div>}
      </div>

      <div>
        <SectionHead title={t('Client & account voices')} right={<div className={u.row} style={{ gap: 6 }}>{vm.voiceCtx.map(c => <Tag key={c}>{c}</Tag>)}</div>} mb={16} />
        <div className={cx(u.s13, u.muted)} style={{ margin: '-6px 0 14px' }}>{t('Recent interviews of stakeholders at the accounts you’re analysing in Radar360 and designing for in Solution Design Studio, plus industry voices on the same topics.')}</div>
        <div className={u.grid260}>
          {vm.voices.map((w, i) => w.isVideo
            ? <VideoCard key={i} v={w} big onPlay={() => { setInline(true); setModal({ video: w }); }} />
            : (
              <div key={i} className={s.voice}>
                <span className="card-kicker">{w.kicker}</span><span style={{ fontSize: 15, fontWeight: 800 }}>{w.who}</span>
                <span className={cx(u.small, u.muted)}>{w.role} · {w.src} · {t(w.date)}</span>
                <span className={u.s14} style={{ marginTop: 4 }}>“{w.sum}”</span>
                <span className={cx(u.s13, u.accentText)}>{t('Use it:')} {w.use}</span>
                <div className={cx(u.row, u.between)} style={{ gap: 8, marginTop: 'auto', paddingTop: 6 }}><Tag kind="outline">{t('Demo interview')}</Tag><Link className="btn btn-ghost" href={'/radar?tab=dossier&dtab=people&co=' + w.coId}>{t('Open in Radar360 →')}</Link></div>
              </div>
            ))}
        </div>
      </div>

      <div className={u.grid2}>
        <div>
          <SectionHead title={t('My capabilities')} right={<Hint>{t('Scale 1–5 · self + manager + work evidence')}</Hint>} />
          {vm.capBars.map(c => (
            <div key={c.name} className={s.cap}>
              <span className={u.s13} style={{ fontWeight: c.focus ? 800 : 400 }}>{t(c.name)}</span>
              <span className={u.trackLight} style={{ height: 8 }}><span className={u.fill} style={{ width: c.curW + '%', background: c.focus ? 'var(--color-text)' : 'var(--color-neutral-600)' }} /><span className={u.marker} style={{ left: c.tgtL + '%', height: 16 }} /></span>
              <span className={u.small} style={{ textAlign: 'right' }}>{c.cur} / {c.tgt}</span>
            </div>
          ))}
          <div className={cx(u.xs, u.muted)} style={{ marginTop: 8 }}>{t('Red marker = target for your role. Focus areas in bold. Personal data — visible to you and your team leader only.')}</div>
        </div>
        <div className={u.stack} style={{ gap: 28 }}>
          <div>
            <SectionHead title={t('My growth path · Q4')} />
            {vm.growthPath.map(gp => <div key={gp.n} className={s.path}><span className={u.display} style={{ fontSize: 20 }}>{gp.n}</span><span><span style={{ fontWeight: 700, fontSize: 14 }}>{t(gp.title)}</span><br /><span className={cx(u.small, u.muted)}>{gp.next}</span></span></div>)}
          </div>
          <div>
            <SectionHead title={t('My progress')} mb={12} />
            <div className={u.kpis} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className={u.kpiCell} data-testid="learning-completed"><div className={cx(u.small, u.muted)}>{t('Learning completed')}</div><div className={u.display} style={{ fontSize: 32 }}>{vm.prog.lessons}</div><div className={u.small}>{t('lessons')} · {vm.prog.minutes} {t('min this month')}</div></div>
              <div className={u.kpiCell} data-testid="demonstrated"><div className={cx(u.small, u.muted)}>{t('Demonstrated capability')}</div><div className={u.display} style={{ fontSize: 32 }}>{vm.prog.evidence}</div><div className={u.small}>{t('validated work evidence')}</div></div>
            </div>
            <div className={u.noteBox} style={{ marginTop: 10 }}>{t(vm.prog.note)}</div>
          </div>
        </div>
      </div>

      <div className={u.grid2}>
        <div>
          <SectionHead title={t('Recommended learning')} right={<Hint>{t('Short · relevant to current work')}</Hint>} />
          {vm.recLearning.map(rl => (
            <button key={rl.title} type="button" className={s.rec} onClick={() => open(rl.go)}>
              <span><span style={{ fontWeight: 700, fontSize: 14 }}>{t(rl.title)}</span><br /><span className={cx(u.small, u.muted)}>{rl.meta}</span></span>
              <Tag kind={rl.accent ? 'accent' : 'neutral'}>{t(rl.tag)}</Tag>
            </button>
          ))}
        </div>
        <div className={cx(u.ink, s.coach)}>
          <div className={s.coachKicker}>{t('AI Growth Coach · simulated')}</div>
          <div className={u.display} style={{ fontSize: 20, lineHeight: 1.25 }}>{t(vm.coachLine)}</div>
          <div className={u.row} style={{ gap: 8 }}><button className="btn btn-primary" onClick={() => ask('What should I improve to become more effective?')}>{t('What should I improve?')}</button><button className={cx('btn', s.onInk)} onClick={() => open('roleplay')}>{t('Practise the negotiation')}</button></div>
        </div>
      </div>

      <LessonModal lesson={vm.lesson} open={modal === 'lesson'} onClose={() => setModal(null)} />
      <Modal open={modal === 'framework'} onClose={() => setModal(null)} label={t('Give–get trading matrix')}>
        <div className="card-kicker">{t('Practical framework · validated knowledge')}</div>
        <div className="dialog-title">{t('Give–get trading matrix')}</div>
        <p style={{ margin: 0, fontSize: 14 }}>{t('Never concede without trading. Prepare each give with the get it buys.')}</p>
        <table className="table"><thead><tr><th>{t('If the client asks for…')}</th><th>{t('You can give…')}</th><th>{t('In exchange for…')}</th></tr></thead><tbody>
          {[['Lower price', 'Reduced scope or phased start', 'Commitment to full programme on milestones'], ['Risk sharing', '15% of fees linked to outcomes', 'Data access and sponsor time'], ['Faster delivery', 'Additional pilot team', 'Decision within 10 days'], ['Extended payment terms', '60-day terms', 'Multi-year agreement']].map(r => <tr key={r[0]}>{r.map(c => <td key={c}>{t(c)}</td>)}</tr>)}
        </tbody></table>
        <div className="dialog-actions"><button className="btn btn-primary" onClick={() => setModal(null)}>{t('Close')}</button></div>
      </Modal>
      <Modal open={modal === 'roleplay'} onClose={() => setModal(null)} label={t('Procurement pushback — Meridian')}>
        <div className="card-kicker">{t('AI role-play · simulated client conversation')}</div>
        <div className="dialog-title">{t('Procurement pushback — Meridian')}</div>
        {rp.map((pk, i) => <div key={i} className={cx(u.stack, u.rule)} style={{ gap: 4, paddingBottom: 8 }}><div className={cx(u.s13, u.muted)}>{RP[i].say}</div><div className={u.s13} style={{ fontWeight: 600 }}>{t('You:')} {RP[i].opts[pk][0]}</div><div className={cx(u.small, u.accentText)}>{t('Coach:')} {RP[i].opts[pk][2]}</div></div>)}
        {rp.length < RP.length && <>
          <div style={{ fontSize: 15, fontWeight: 600, background: 'var(--color-bg)', padding: 12 }}>{RP[rp.length].say}</div>
          {RP[rp.length].opts.map((o, i) => <button key={i} type="button" className={s.rpOpt} onClick={() => { const picks = [...rp, i]; setRp(picks); if (picks.length >= RP.length) start(async () => { await saveRoleplayScore(picks.reduce((a, p, j) => a + RP[j].opts[p][1], 0)); router.refresh(); }); }}>{o[0]}</button>)}
        </>}
        {rp.length >= RP.length && <div className={u.ink} style={{ padding: 14 }}><div style={{ fontWeight: 800, fontSize: 17 }}>{t('Developmental feedback')} · {score} / 4</div><div className={u.s13} style={{ marginTop: 6 }}>{t(score >= 4 ? 'Strong: you re-anchored on value and traded rather than conceded. Use the same structure on 12 Nov.' : score >= 2 ? 'Developing: you held position but missed a trade. Pair every give with a get — see the give–get matrix.' : 'Focus area: concessions came before value. Re-anchor on the client’s baseline first, then trade.')}</div></div>}
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setRp([])}>{t('Restart')}</button><button className="btn btn-primary" onClick={() => setModal(null)}>{t('Done')}</button></div>
      </Modal>
      <Modal open={!!vid} onClose={() => setModal(null)} label={vid?.title}>
        {vid && <>
          <div className="card-kicker">{t(vid.kicker)}</div>
          <div className="dialog-title" style={{ fontSize: 20 }}>{vid.title}</div>
          <div className={cx(u.small, u.muted)}>{vid.expert}</div>
          {inline
            ? <><div className={s.player}><iframe src={'https://www.youtube-nocookie.com/embed/' + vid.id + '?autoplay=1&rel=0&playsinline=1&iv_load_policy=3&modestbranding=1'} title={vid.title} referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" /></div>
              <div className={cx(u.small, u.muted)}>{t('If the inline player shows an error, your browser or this preview is blocking embedded YouTube — use “Watch on YouTube”.')}</div></>
            : <a className={s.thumb} href={'https://www.youtube.com/watch?v=' + vid.id} target="_blank" rel="noopener noreferrer" onClick={() => watch(vid)}><span className={cx('grayscale', s.thumbImg)} style={{ backgroundImage: `url("https://i.ytimg.com/vi/${vid.id}/hqdefault.jpg")` }} /><span className={s.ext}><Play size={18} fill="currentColor" />{t('Watch on YouTube ↗')}</span></a>}
          <div className={u.row} style={{ gap: 6, flexWrap: 'nowrap' }}><input className="input" readOnly value={'https://www.youtube.com/watch?v=' + vid.id} onFocus={e => e.target.select()} style={{ fontSize: 12 }} aria-label="URL" /><button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText('https://www.youtube.com/watch?v=' + vid.id).catch(() => {}); setCopied(true); watch(vid); }}>{t(copied ? 'Copied ✓' : 'Copy link')}</button></div>
          <div className="dialog-actions"><button className="btn btn-ghost" onClick={() => setInline(!inline)}>{t(inline ? 'Show preview' : 'Try inline player')}</button><button className="btn btn-secondary" onClick={() => setModal(null)}>{t('Close')}</button><a className="btn btn-primary" href={'https://www.youtube.com/watch?v=' + vid.id} target="_blank" rel="noopener noreferrer" onClick={() => watch(vid)}>{t('Watch on YouTube ↗')}</a></div>
          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { if (!vid.watched) { watch(vid); toast('Recorded as learning activity — apply it to build evidence'); } }}>{t(vid.watched ? 'Watched ✓' : 'Mark as watched')}</button>
        </>}
      </Modal>
    </div>
  );
}
