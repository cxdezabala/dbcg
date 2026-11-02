// Port of Component.growthVals() / videoVals().
import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer } from '../session';
import { storySolution, lessonDone, solutionWhere } from '../data/solutions';
import { V, MCK, META, VOICE } from '@/lib/demo/growth.gen';
import { COS, LESSON, ROLEPLAY } from '@/lib/demo';

export interface VideoVM { id: string; title: string; expert: string; why: string; format: string; source: string; kicker: string; watched: boolean }

export async function growthVM(v: Viewer, sp: { gap?: string }) {
  assertBusiness(v);
  const [caps, learned, story, evidence, learning, iniAssign] = await Promise.all([
    db.capability.findMany({ where: { userId: v.id }, orderBy: { order: 'asc' } }),
    lessonDone(v.id), storySolution(v),
    db.capabilityEvidence.count({ where: { userId: v.id } }),
    db.learningAssignment.findMany({ where: { userId: v.id, status: 'completed' } }),
    db.learningAssignment.findFirst({ where: { userId: v.id, source: 'initiative' } }),
  ]);
  const W = v.state.watched || [];
  const month = learning.filter(l => l.completedAt && l.completedAt > new Date(Date.now() - 31 * 864e5) && l.kind === 'lesson');
  const vo = (x: string[], kicker: string): VideoVM => ({ id: x[0], title: x[1], expert: x[2], why: x[3], format: x[4] || 'Video', source: x[5] || 'Curated source', kicker, watched: W.includes(x[0]) });
  const gaps = caps.filter(c => c.cur < c.tgt && V[c.capId]).sort((a, b) => (b.tgt - b.cur) - (a.tgt - a.cur));
  const sel = gaps.find(g => g.capId === (sp.gap || v.state.gapSel)) || gaps[0];
  const m = META[sel.capId];
  const rl: { title: string; meta: string; tag: string; accent: boolean; go: 'lesson' | 'framework' | 'roleplay' | 'path' }[] = [
    { title: 'Value-based selling for AI transformation', meta: '5-minute lesson + knowledge check · Meridian context', tag: learned ? 'Completed' : 'Contextual', accent: !learned, go: 'lesson' },
    { title: 'Give–get trading matrix', meta: 'Negotiation framework · 3 min read', tag: 'Framework', accent: false, go: 'framework' },
    { title: 'AI role-play: procurement pushback', meta: 'Simulated client conversation · 6 min' + (v.state.rpScore != null ? ' · last score ' + v.state.rpScore + '/4' : ''), tag: 'Practice', accent: false, go: 'roleplay' },
    { title: 'AI fluency essentials for commercial leaders', meta: '4 × 5-min modules', tag: 'Path', accent: false, go: 'path' },
  ];
  if (iniAssign) rl.unshift({ title: 'AI Customer Operations Proposition — readiness path', meta: 'Assigned by Daniel Foster · strategic initiative' + (iniAssign.status === 'completed' ? ' · completed' : ''), tag: 'Leadership-assigned', accent: true, go: 'lesson' });

  // Client & account voices: Radar360 dossier in focus + the active / story solution's account.
  const where = await solutionWhere(v);
  const anySol = story || (await db.solution.findFirst({ where: { AND: [where, { completed: false }] }, orderBy: { createdAt: 'desc' } }));
  const ctx: string[] = [], ids: string[] = [];
  ctx.push('Radar360 · ' + COS[0].name); ids.push(COS[0].id);
  if (anySol) { ctx.push('Studio · ' + anySol.title); if (!ids.includes(anySol.accountId)) ids.push(anySol.accountId); }
  const voices: ({ isVideo: false; kicker: string; who: string; role: string; src: string; date: string; sum: string; use: string; coId: string } | ({ isVideo: true } & VideoVM))[] = [];
  let fs = false;
  ids.forEach(id => {
    const co = COS.find(c => c.id === id); if (co && co.sector === 'Financial Services') fs = true;
    (VOICE[id] || []).forEach(x => voices.push({ isVideo: false, kicker: co ? co.name : id, who: x[0], role: x[1], src: x[2], date: x[3], sum: x[4], use: x[5], coId: id }));
  });
  if (fs) V.industry.forEach(x => voices.push({ isVideo: true, ...vo(x, 'Industry voice · financial services') }));

  return {
    lesson: LESSON, roleplay: ROLEPLAY,
    capBars: caps.map(c => ({ name: c.name, cur: c.cur.toFixed(1), tgt: c.tgt.toFixed(1), curW: c.cur / 5 * 100, tgtL: c.tgt / 5 * 100, focus: c.focus })),
    ctxRecs: [
      { kind: '5-minute lesson', title: 'Value-based selling for AI transformation', meta: learned ? 'Completed ✓' : 'Relevant to your Meridian solution', cta: learned ? 'Review' : 'Start lesson', go: 'lesson' as const },
      { kind: 'Practical framework', title: 'Give–get trading matrix', meta: 'For risk-sharing requests', cta: 'Open', go: 'framework' as const },
      { kind: 'AI role-play', title: 'Procurement pushback simulation', meta: 'Robert Lang, Procurement Director', cta: 'Simulate', go: 'roleplay' as const },
      { kind: 'Internal expert', title: 'Hannah Ortiz', meta: 'Pricing & value modelling · Madrid', cta: 'View profile', go: '/collab?expert=hannah' },
    ],
    growthPath: [{ n: '01', title: 'Negotiation — 2.7 → 3.5', next: 'Next: role-play before 12 Nov; debrief with Laura after the review' }, { n: '02', title: 'AI fluency — 2.6 → 3.5', next: 'Next: apply in the Meridian solution architecture' }, { n: '03', title: 'Solution design — 2.9 → 3.8', next: 'Evidence: submit the Meridian business case for review' }],
    recLearning: rl,
    // Learning completion and demonstrated capability are separate records.
    prog: { lessons: month.length, minutes: month.reduce((t, l) => t + l.minutes, 0), evidence, note: learned ? 'Lesson completed and recorded. Your Business Acumen score will only change once applied evidence is validated — e.g. your Meridian business case passing review.' : 'Completion records learning activity. Capability levels change only with validated work evidence.' },
    coachLine: learned ? 'Good progress. Now apply value anchoring in the Meridian business case — that is what turns learning into evidence.' : 'Your next procurement conversation is in 11 days. Practising one re-anchoring response now will matter more than another course.',
    gaps: gaps.map(g => { const gap = g.tgt - g.cur, n = V[g.capId].filter(x => W.includes(x[0])).length; return { id: g.capId, name: g.name, cur: g.cur.toFixed(1), tgt: g.tgt.toFixed(1), gap: gap.toFixed(1), big: gap >= 0.7, seen: n + '/' + V[g.capId].length + ' watched', on: g.capId === sel.capId }; }),
    gap: { name: sel.name, cur: sel.cur.toFixed(1), tgt: sel.tgt.toFixed(1), headline: m[0], evidence: m[1], behaviours: m[2], practiceLabel: m[3], practice: m[4], videos: V[sel.capId].map((x, i) => vo(x, i === 0 ? 'Watch first' : 'Go deeper')), storyHref: story ? '/studio?sol=' + story.id : '/studio' },
    voiceCtx: ctx, voices, mck: MCK.map(x => vo(x, 'McKinsey Live · free')),
  };
}
export type GrowthVM = Awaited<ReturnType<typeof growthVM>>;
