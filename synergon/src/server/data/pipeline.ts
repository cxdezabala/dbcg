import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer } from '../session';
import { STAGES } from '@/lib/demo/pipeline';
import type { PipeExec, PipeOpp, PipeClosed } from '@/lib/demo/pipeline';

export interface Agg { pipe: number; won: number; lost: number; wonN: number; lostN: number; quota: number; stages: number[]; counts: number[]; months: number[] }
export interface ScopedTeam { id: string; name: string; bu: string; lead: string; execs: PipeExec[] }
export interface PipelineScope {
  role: Viewer['role'];
  self: PipeExec | null; // the viewer's own pipeline (exec, lead)
  teams: ScopedTeam[]; // teams whose executives the viewer may see individually
  allTeams: { id: string; name: string; bu: string; lead: string; n: number; agg: Agg }[]; // aggregated, every team
  team: Agg | null; eu: Agg; org: Agg; // aggregates for "Where you stand"
}

const sum = (a: number[][]) => a.length ? a[0].map((_, i) => a.reduce((t, x) => t + (x[i] || 0), 0)) : [];
export function agg(list: { pipe: number; won: number; lost: number; wonN: number; lostN: number; quota: number; stages: number[]; months: number[]; opps?: { stage: number }[]; counts?: number[] }[]): Agg {
  const s = (k: 'pipe' | 'won' | 'lost' | 'wonN' | 'lostN' | 'quota') => list.reduce((t, x) => t + x[k], 0);
  return {
    pipe: s('pipe'), won: s('won'), lost: s('lost'), wonN: s('wonN'), lostN: s('lostN'), quota: s('quota'),
    stages: STAGES.map((_, i) => list.reduce((t, x) => t + x.stages[i], 0)),
    counts: STAGES.map((_, i) => list.reduce((t, x) => t + (x.counts ? x.counts[i] : (x.opps || []).filter(o => o.stage === i).length), 0)),
    months: sum(list.map(x => x.months)),
  };
}

/**
 * Pipeline data scoped by role (Salesforce read-only mirror):
 *  - exec: own opportunities; team / BU / organisation only as aggregates
 *  - lead: every executive of their team; BU and organisation as aggregates
 *  - director: every team and executive
 *  - admin: forbidden
 */
export async function getPipelineScope(v: Viewer): Promise<PipelineScope> {
  assertBusiness(v);
  const [teams, users] = await Promise.all([
    db.team.findMany({ orderBy: { id: 'asc' } }),
    db.user.findMany({ where: { performance: { isNot: null } }, include: { performance: true, team: true } }),
  ]);
  const order = ['eiu', 'uki', 'imm', 'ge', 'urt', 'ksa'];
  teams.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const visibleOwnerIds = v.role === 'director' ? users.map(u => u.id) : v.role === 'lead' ? users.filter(u => u.teamId === v.teamId).map(u => u.id) : [v.id];
  const opps = await db.opportunity.findMany({ where: { ownerId: { in: visibleOwnerIds } }, orderBy: { order: 'asc' } });
  const oppCounts = await db.opportunity.groupBy({ by: ['ownerId', 'stage'], where: { status: 'open' }, _count: true });
  const countsOf = (uid: string) => STAGES.map((_, i) => oppCounts.find(c => c.ownerId === uid && c.stage === i)?._count || 0);

  const userOrder = (u: { order: number }) => u.order;
  const execOf = (u: (typeof users)[number]): PipeExec => {
    const p = u.performance!; const mine = opps.filter(o => o.ownerId === u.id);
    return {
      name: u.name, team: u.team!.name, teamId: u.teamId!, bu: u.team!.bu, pipe: p.pipe, won: p.won, lost: p.lost, wonN: p.wonN, lostN: p.lostN, quota: p.quota, stages: p.stages, months: p.months,
      opps: mine.filter(o => o.status === 'open').map(o => ({ acct: o.accountName, acctId: o.accountId ?? undefined, name: o.name, stage: o.stage, value: o.value, close: o.close || '', next: o.next || '' }) as PipeOpp),
      closed: mine.filter(o => o.status !== 'open').map(o => ({ acct: o.accountName, name: o.name, won: o.status === 'won', value: o.value, date: o.closedDate || '', ...(o.lossReason ? { reason: o.lossReason } : {}) }) as PipeClosed),
    };
  };
  const byTeam = (tid: string) => users.filter(u => u.teamId === tid).sort((a, b) => userOrder(a) - userOrder(b));
  const aggUsers = (list: typeof users) => agg(list.map(u => ({ ...u.performance!, counts: countsOf(u.id) })));
  const allTeams = teams.map(t => ({ id: t.id, name: t.name, bu: t.bu, lead: t.leadName, n: byTeam(t.id).length, agg: aggUsers(byTeam(t.id)) }));
  const eu = aggUsers(users.filter(u => u.team?.bu === 'Europe'));
  const org = aggUsers(users);
  const visibleTeams = v.role === 'director' ? teams : v.role === 'lead' ? teams.filter(t => t.id === v.teamId) : [];
  const me = users.find(u => u.id === v.id);
  return {
    role: v.role,
    self: me ? execOf(me) : null,
    teams: visibleTeams.map(t => ({ id: t.id, name: t.name, bu: t.bu, lead: t.leadName, execs: byTeam(t.id).map(execOf) })),
    allTeams,
    team: v.teamId ? aggUsers(byTeam(v.teamId)) : null,
    eu, org,
  };
}
