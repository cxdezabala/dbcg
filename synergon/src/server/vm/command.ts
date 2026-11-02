// Port of Component.commandVals(). Leadership intelligence is always aggregated, honours the
// organisation's minimum group size and never includes private 1:1 collaboration content.
import 'server-only';
import { db } from '../db';
import type { Viewer } from '../session';
import { ForbiddenError } from '../errors';
import { storySolution, t1count } from '../data/solutions';
import { THEMES, LEADER_RECS, OPP_HYP, CAP_SHORT, SUGGEST } from '@/lib/demo';
import { expertStatus } from '../data/solutions';

export const CAP_TARGETS = [3.8, 3.6, 3.8, 3.5, 3.5, 3.8, 3.5, 3.6];

/** Capability heatmap rows the viewer may see. Suppressed groups carry no values at all. */
export async function heatmapRows(v: Viewer, minGroup: number) {
  if (v.role !== 'lead' && v.role !== 'director') throw new ForbiddenError();
  const teams = await db.team.findMany();
  const order = ['eiu', 'uki', 'imm', 'ge', 'urt', 'ksa'];
  teams.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  type Row = { name: string; region: string; n: number; values: number[] | null };
  const row = (name: string, region: string, n: number, vals: number[]): Row => ({ name, region, n, values: n >= minGroup ? vals : null });
  if (v.role === 'lead') {
    const mine = teams.find(t => t.id === v.teamId)!;
    const others = teams.filter(t => t.id !== v.teamId && t.capN >= minGroup);
    const n = others.reduce((a, t) => a + t.capN, 0);
    const avg = CAP_SHORT.map((_, i) => others.reduce((a, t) => a + t.capValues[i] * t.capN, 0) / (n || 1));
    return [row(mine.name, mine.region, mine.capN, mine.capValues), row('Organisation average (other teams)', 'All', n, avg)];
  }
  return teams.map(t => row(t.name, t.region, t.capN, t.capValues));
}

export async function commandVM(v: Viewer) {
  if (v.role !== 'lead' && v.role !== 'director') throw new ForbiddenError('SYNERGON Command is available to team leaders and the commercial director');
  const isLead = v.role === 'lead';
  const org = await db.organization.findUniqueOrThrow({ where: { id: v.orgId } });
  const [ini, story, cnt, priorities, rows] = await Promise.all([
    db.initiative.findMany({ orderBy: { createdAt: 'desc' } }), storySolution({ ...v, role: 'director' }), t1count(),
    db.strategicPriority.findMany({ orderBy: { order: 'asc' } }), heatmapRows(v, org.minGroup),
  ]);
  const an = v.state.analysis || {};
  const first = ini[0];
  const sofia = !!story && expertStatus(story).sofia === 'contributed';
  const t1 = THEMES[0];
  const pr = ini.map(i => ({ id: i.id, name: i.name, progress: i.progress, acts: 'Coordinated proposition · ' + i.teams.length + ' teams', teams: i.teams.join(', '), risk: 'Pricing consistency across BUs', action: 'Kick-off 14 Nov with proposition team', isNew: true }))
    .concat(priorities.map(p => ({ id: p.id, name: p.name, progress: p.progress, acts: p.acts + ' related activities across modules', teams: isLead ? 'Enterprise · Iberia & UK' : p.teams, risk: p.risk, action: p.action, isNew: false })));
  return {
    isLead, isDirector: !isLead, minGroup: org.minGroup,
    scopeLine: isLead ? 'Scope: Enterprise Accounts · Iberia & UK (10)' : 'Scope: Asterion · 6 teams · 60 executives',
    pulse: (isLead ? [['Team pipeline', '€14.8M', '+9% QoQ'], ['Solution-led share', '46%', 'Target 50%'], ['Strategic alignment', '74/100', '+6 this quarter'], ['Capability progress', '+0.2', 'avg, 2 quarters'], ['Knowledge reuse', '52%', 'designs reusing assets'], ['Expert response', '1.6 d', 'median']]
      : [['Pipeline influenced', '€48.2M', '+12% QoQ'], ['Solution-led share', '38%', 'Target 50%'], ['Strategic alignment', '71/100', '+4 this quarter'], ['Capability progress', '+0.3', 'avg, 2 quarters'], ['Knowledge reuse', '44%', 'designs reusing assets'], ['Emerging signals', '12', '3 high relevance']]).map(([label, value, note]) => ({ label, value, note })),
    // Cross-team collective intelligence is director-only.
    hero: isLead ? null : {
      ...t1, count: cnt,
      evidence: ['4 ' + t1.evidence[0], t1.evidence[1], t1.evidence[2], t1.evidence[3]].concat(story ? ['New this week: Meridian solution design (Enterprise · Iberia & UK) — linked to verified signal S1'] : []),
      status: first ? 'Initiative launched' : an.t1 ? 'Analysis requested' : 'Awaiting leadership review',
      sofiaLine: sofia ? 'Sofia Chen’s Meridian contribution (in review)' : '1 expert contribution pending',
      initiative: first ? { name: first.name, progress: first.progress, teams: first.teams.length } : null, analysis: !!an.t1,
    },
    otherThemes: isLead ? [] : THEMES.slice(1).map(t => ({ ...t, analysis: !!an[t.id] })),
    priorities: pr,
    advisorQs: SUGGEST.command,
    heat: { caps: CAP_SHORT, targets: CAP_TARGETS, rows, buFilter: !isLead },
    collabMetrics: (isLead ? [['Cross-team requests', '41%', 'of expert requests'], ['Knowledge reuse', '52%', 'of solution designs'], ['Expert participation', '9 / 12', 'SMEs engaged']] : [['Cross-BU collaboration', '36%', 'of expert requests'], ['Knowledge reuse', '44%', 'of solution designs'], ['Expert participation', '58 / 74', 'SMEs engaged']]).map(([label, value, note]) => ({ label, value, note })),
    unmet: ([['AI Service Transformation', 9, 3], ['Value modelling', 7, 2], ['Gulf procurement', 5, 1], ['Data & AI governance', 2, 4]] as [string, number, number][]).map(([name, o, e]) => ({ name, open: o, experts: e, w: Math.min(100, o / e / 3 * 100), hot: o / e > 2 })),
    oppHyps: isLead ? [] : OPP_HYP.map((o, i) => ({ ...o, key: 'o' + i, requested: !!an['o' + i] })),
    leaderRecs: LEADER_RECS.map((r, i) => ({ ...r, i })).filter(r => !isLead || r.i === 1).map(r => ({ ...r, done: r.theme === 't1' ? !!first : !!an['r' + r.i] })),
    initiative: first ? { name: first.name, progress: first.progress, teams: first.teams.length } : null,
    teams: (await db.team.findMany()).sort((a, b) => ['eiu', 'uki', 'imm', 'ge', 'urt', 'ksa'].indexOf(a.id) - ['eiu', 'uki', 'imm', 'ge', 'urt', 'ksa'].indexOf(b.id)).map(t => t.name),
    t1bus: t1.bus,
  };
}
export type CommandVM = Awaited<ReturnType<typeof commandVM>>;
