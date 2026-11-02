// Port of Component.ciPipeVals() — "Pipeline & deals" tab of Commercial Intelligence.
import { STAGES } from '@/lib/demo/pipeline';
import { fmtM as M, pc } from '@/lib/format';
import type { PipelineScope } from '../data/pipeline';

export function ciPipe(S: PipelineScope, opts: { stage?: number | null; team?: string }) {
  const role = S.role;
  const team = role === 'director' ? S.teams.find(t => t.id === opts.team) || null : null;
  const execs = role === 'exec' ? [S.self!] : role === 'lead' ? S.teams[0].execs : (team ? team.execs : S.teams.flatMap(t => t.execs));
  const opps = execs.flatMap(e => e.opps.map(o => ({ ...o, owner: e.name, team: e.team })));
  const st = opts.stage == null || Number.isNaN(opts.stage) ? null : opts.stage;
  const cards = [{ label: 'All stages', v: opps.reduce((t, o) => t + o.value, 0), n: opps.length, id: null as number | null }]
    .concat(STAGES.map((x, i) => ({ label: x.label as string, v: opps.filter(o => o.stage === i).reduce((t, o) => t + o.value, 0), n: opps.filter(o => o.stage === i).length, id: i })));
  const fl = opps.filter(o => st == null || o.stage === st).sort((a, b) => b.value - a.value);
  const shown = fl.slice(0, 25), om = Math.max(0.01, ...shown.map(o => o.value));
  const closed = execs.flatMap(e => e.closed.map(c => ({ ...c, owner: e.name })));
  const mo = (d: string) => ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].indexOf(d.split(' ')[0]);
  const lost = closed.filter(c => !c.won), lt = lost.reduce((t, c) => t + c.value, 0) || 1, byR: Record<string, number> = {};
  lost.forEach(c => { byR[c.reason!] = (byR[c.reason!] || 0) + c.value; });
  const rs = Object.entries(byR).sort((a, b) => b[1] - a[1]), rm = rs.length ? rs[0][1] : 1;
  return {
    scope: role === 'exec' ? 'My opportunities' : role === 'lead' ? 'Team · ' + S.teams[0].name : (team ? team.name : 'All teams'),
    showOwner: role !== 'exec', hasTeams: role === 'director', team: team ? team.id : 'all', stage: st,
    teamBtns: [{ id: 'all', label: 'All teams' }].concat(S.allTeams.map(t => ({ id: t.id, label: t.name.split(' · ')[0].replace('Enterprise', 'Enterprise I&UK') }))),
    stageCards: cards.map(c => ({ label: c.label, value: M(c.v), count: c.n + ' opportunities', id: c.id })),
    filterLabel: st == null ? 'all stages' : STAGES[st].label,
    countLabel: fl.length > 25 ? 'Top 25 of ' + fl.length + ' by value' : fl.length + ' opportunities',
    rows: shown.map(o => ({ name: o.name, acct: o.acct, acctId: o.acctId || null, owner: o.owner, team: o.team, stage: STAGES[o.stage].label + ' · ' + Math.round(STAGES[o.stage].p * 100) + '%', dots: STAGES.map((_, j) => (j <= o.stage ? (o.stage === 4 ? 'var(--color-accent)' : 'var(--color-text)') : 'var(--color-neutral-300)')), value: M(o.value), w: o.value / om * 100, weighted: M(o.value * STAGES[o.stage].p), close: o.close, next: o.next })),
    closed: closed.slice().sort((a, b) => mo(b.date) - mo(a.date)).slice(0, 10).map(c => ({ won: c.won, name: c.name, acct: c.acct, date: c.date, owner: role === 'exec' ? '' : c.owner, reason: c.won ? '' : c.reason || '', value: M(c.value) })),
    closedLabel: 'Last 10 of ' + closed.length,
    reasons: rs.map(([label, v]) => ({ label, pct: pc(v / lt), w: v / rm * 100 })),
    reasonNote: rs.length ? 'Main loss driver: ' + rs[0][0].toLowerCase() + ' — review pricing strategy with Hannah Ortiz (value modelling).' : 'No lost deals in scope.',
  };
}
export type CiPipeVM = ReturnType<typeof ciPipe>;
