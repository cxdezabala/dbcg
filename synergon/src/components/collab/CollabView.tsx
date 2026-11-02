'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { SectionHead, Tag, Hint } from '@/components/ui/controls';
import { Modal } from '@/components/ui/Modal';
import { useUI } from '@/components/shell/UIProvider';
import { toggleSaveKnowledge, commentKnowledge, reviewKnowledge, contributeInsight } from '@/server/actions/collab';
import { requestExpert } from '@/server/actions/studio';
import type { CollabVM } from '@/server/vm/collab';
import s from './collab.module.css';

const DOMAINS = ['AI & Service', 'Value & Pricing', 'Data & Governance', 'Energy', 'Retail', 'Change & Learning'];

export function CollabView({ vm }: { vm: CollabVM }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useUI();
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [dom, setDom] = useState('All');
  const [comment, setComment] = useState<{ id: string; text: string } | null>(null);
  const [req, setReq] = useState<null | { mode: 'request' | 'connect'; sol: string | null; msg: string }>(null);
  const [contrib, setContrib] = useState<null | { title: string; domain: string; body: string }>(null);
  const run = (fn: () => Promise<{ msg?: string } | void>) => start(async () => { const r = await fn(); if (r && r.msg) toast(r.msg); router.refresh(); });
  const qq = q.trim().toLowerCase();
  const list = vm.experts.filter(e => (dom === 'All' || e.domain === dom) && (!qq || (e.name + ' ' + e.title + ' ' + e.loc + ' ' + e.domains.join(' ') + ' ' + e.industries.join(' ')).toLowerCase().includes(qq)));
  const ex = vm.ex;
  return (
    <div className={u.stack} style={{ gap: 36 }}>
      <div className={u.rowTop} style={{ gap: 32 }}>
        <div style={{ flex: '1 1 340px', maxWidth: 460, minWidth: 0 }}>
          <SectionHead title={t('Expert finder')} right={<Hint>{list.length} {t('experts')}</Hint>} mb={10} />
          <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Industry, expertise, location, solution…')} aria-label={t('Expert finder')} />
          <div className={u.pills} style={{ margin: '10px 0' }}>{['All', ...DOMAINS].map(l => <button key={l} type="button" className={cx(u.pill, dom === l && u.on)} style={{ padding: '4px 9px' }} onClick={() => setDom(l)}>{t(l)}</button>)}</div>
          {list.map(x => (
            <button key={x.id} type="button" className={cx(s.expert, x.id === ex.id && s.on)} onClick={() => router.push('/collab?expert=' + x.id, { scroll: false })}>
              <span className={u.avatar} style={{ width: 38, height: 38, background: 'var(--color-neutral-300)' }}>{x.ini}</span>
              <span className={u.stack} style={{ gap: 2, minWidth: 0 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{x.name}</span><span className={u.small}>{x.title}</span><span className={cx(u.xs, u.muted)}>{x.loc} · {x.delivered} {t('solutions delivered')} · {x.domains[0]}</span></span>
            </button>
          ))}
        </div>
        <div className={u.stack} style={{ flex: '2 1 480px', minWidth: 0, gap: 18 }}>
          <div className={u.rowTop} style={{ gap: 18 }}>
            <div className={cx(u.avatar, u.ink, u.display)} style={{ width: 84, height: 84, fontSize: 28 }}>{ex.ini}</div>
            <div style={{ flex: 1, minWidth: 220 }}><h2 style={{ margin: 0 }}>{ex.name}</h2><div className={u.s15}>{ex.title}</div><div className={cx(u.s13, u.muted)} style={{ marginTop: 4 }}>{ex.loc} · {ex.avail}</div></div>
          </div>
          <p style={{ margin: 0, fontSize: 15, maxWidth: 680 }}>{ex.bio}</p>
          <div className={u.kpis} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div className={u.kpiCell}><div className={cx(u.small, u.muted)}>{t('Solutions delivered')}</div><div className={u.display} style={{ fontSize: 28 }}>{ex.delivered}</div></div>
            <div className={u.kpiCell}><div className={cx(u.small, u.muted)}>{t('Contributions')}</div><div className={u.display} style={{ fontSize: 28 }}>{ex.contribs}</div></div>
            <div className={u.kpiCell}><div className={cx(u.small, u.muted)}>{t('Industries')}</div><div className={u.s14} style={{ fontWeight: 700, marginTop: 6 }}>{ex.industries.map(t).join(', ')}</div></div>
          </div>
          <div><h6>{t('Areas of expertise')}</h6><div className={u.row} style={{ gap: 6 }}>{ex.domains.map(d => <Tag key={d}>{d}</Tag>)}</div></div>
          <div><h6>{t('Areas of interest')}</h6><div className={u.s14}>{ex.interests}</div></div>
          <div><h6>{t('Previous contributions')}</h6>{ex.prev.map(pc => <div key={pc} className={cx(u.rule, u.s13)} style={{ padding: '6px 0' }}>{pc}</div>)}</div>
          <div className={u.row} style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setReq({ mode: 'request', sol: vm.target, msg: '' })}>{t('Request collaboration')}</button>
            <button className="btn btn-secondary" onClick={() => setReq({ mode: 'connect', sol: vm.target, msg: '' })}>{t('Connect to Solution Design project')}</button>
          </div>
        </div>
      </div>

      <div>
        <SectionHead title={<>{t('Knowledge contributions')} · {t('reusable knowledge')}</>} right={<button className="btn btn-primary" onClick={() => setContrib({ title: '', domain: DOMAINS[0], body: '' })}>{t('+ Contribute an insight')}</button>} />
        {vm.knowledge.map(k => (
          <div key={k.id} className={cx(u.rule, u.stack)} style={{ padding: '14px 0', gap: 6 }} data-testid={'k-' + k.id}>
            <div className={cx(u.rowBase, u.between)} style={{ gap: 10 }}><span style={{ fontWeight: 700, fontSize: 15 }}>{k.title}</span><Tag kind={k.state === 'Validated' ? 'neutral' : k.state === 'In review' ? 'outline' : 'accent'}>{t(k.state)}</Tag></div>
            <div className={cx(u.small, u.muted)}>{k.author} · {t(k.domain)} · {t(k.date)} · {k.saves} {t('saves')}</div>
            <div className={u.s14}>{k.body}</div>
            {k.comments.map((cm, i) => <div key={i} className={u.surface} style={{ fontSize: 12, padding: '6px 10px' }}>{cm}</div>)}
            <div className={u.row} style={{ gap: 4 }}>
              <button className="btn btn-ghost" onClick={() => run(() => toggleSaveKnowledge(k.id))}>{t(k.saved ? 'Saved ✓' : 'Save')}</button>
              <button className="btn btn-ghost" onClick={() => setComment(comment?.id === k.id ? null : { id: k.id, text: '' })}>{t('Comment')} ({k.comments.length})</button>
              {k.canValidate && <><button className="btn btn-secondary" disabled={pending} onClick={() => run(() => reviewKnowledge(k.id, 'validate'))}>{t('Validate for org-wide reuse')}</button><button className="btn btn-ghost" disabled={pending} onClick={() => run(() => reviewKnowledge(k.id, 'evidence'))}>{t('Request evidence')}</button></>}
            </div>
            {comment?.id === k.id && <div className={u.row} style={{ gap: 8, flexWrap: 'nowrap' }}><input className="input" value={comment.text} onChange={e => setComment({ id: k.id, text: e.target.value })} placeholder={t('Add a comment…')} aria-label={t('Add a comment…')} /><button className="btn btn-primary" onClick={() => { const txt = comment.text; setComment(null); run(() => commentKnowledge(k.id, txt)); }}>{t('Post')}</button></div>}
          </div>
        ))}
      </div>

      <div className={u.grid2}>
        <div>
          <SectionHead title={t('Collaboration requests')} mb={0} />
          <table className="table"><thead><tr><th>{t('Request')}</th><th>{t('Expert')}</th><th>{t('Status')}</th></tr></thead><tbody>
            {vm.requests.map((r, i) => <tr key={i}><td>{r.what}</td><td>{t(r.who)}</td><td><Tag kind={r.accent ? 'accent' : r.status === 'Awaiting response' || r.status === 'Connected' ? 'outline' : 'neutral'}>{t(r.status)}</Tag></td></tr>)}
          </tbody></table>
        </div>
        <div>
          <SectionHead title={t('Expertise communities')} />
          {vm.communities.map(cm => <div key={cm.name} className={s.community}><span><span style={{ fontWeight: 700, fontSize: 14 }}>{t(cm.name)}</span><br /><span className={cx(u.small, u.muted)}>{cm.members} {t('members')} · {t(cm.note)}</span></span>{cm.badge && <Tag kind="accent">{t('Initiative workspace')}</Tag>}</div>)}
        </div>
      </div>

      <Modal open={!!req} onClose={() => setReq(null)} label={t('Request collaboration')}>
        {req && <>
          <div className="dialog-title">{req.mode === 'connect' ? t('Connect') + ' ' + ex.name : t('Request collaboration from') + ' ' + ex.name}</div>
          <div className="field"><label>{t('Solution Design project')}</label><div className={u.stack} style={{ gap: 4 }}>{vm.sols.map(x => <button key={x.id} type="button" className={cx(u.pillBlock, req.sol === x.id && u.on)} onClick={() => setReq({ ...req, sol: x.id })}>{x.label}</button>)}</div></div>
          <div className="field"><label htmlFor="req-msg">{t('Message (private 1:1 — shared only with the expert, never with leadership)')}</label><textarea id="req-msg" className="input" value={req.msg} onChange={e => setReq({ ...req, msg: e.target.value })} placeholder={t('What do you need from this expert?')} /></div>
          <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setReq(null)}>{t('Cancel')}</button>
            <button className="btn btn-primary" disabled={pending} onClick={() => { if (!req.sol) { toast('Create a solution design first'); return; } const r0 = req; setReq(null); run(() => requestExpert(r0.sol!, ex.id, r0.mode, r0.msg)); }}>{t(req.mode === 'connect' ? 'Connect to project' : 'Send request')}</button></div>
        </>}
      </Modal>
      <Modal open={!!contrib} onClose={() => setContrib(null)} label={t('Contribute an insight')}>
        {contrib && <>
          <div className="dialog-title">{t('Contribute an insight')}</div>
          <div className="field"><label htmlFor="c-title">{t('Title')}</label><input id="c-title" className="input" value={contrib.title} onChange={e => setContrib({ ...contrib, title: e.target.value })} placeholder={t('e.g. What procurement asked in our last FS tender')} /></div>
          <div className="field"><label>{t('Domain')}</label><div className={u.pills}>{DOMAINS.map(d => <button key={d} type="button" className={cx(u.pill, contrib.domain === d && u.on)} onClick={() => setContrib({ ...contrib, domain: d })}>{t(d)}</button>)}</div></div>
          <div className="field"><label htmlFor="c-body">{t('Insight')}</label><textarea id="c-body" className="input" value={contrib.body} onChange={e => setContrib({ ...contrib, body: e.target.value })} placeholder={t('Share what you learned, with evidence where possible.')} /></div>
          <div className={cx(u.small, u.muted)}>{t('Contributions enter review and become reusable organisation-wide after validation by a team leader or director.')}</div>
          <div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setContrib(null)}>{t('Cancel')}</button>
            <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await contributeInsight(contrib); toast(r.msg); if (r.ok) { setContrib(null); router.refresh(); } })}>{t('Submit for review')}</button></div>
        </>}
      </Modal>
    </div>
  );
}
