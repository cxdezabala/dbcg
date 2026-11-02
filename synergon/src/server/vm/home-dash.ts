// Port of Component.homeDash() — commercial performance block on Home (computed on the server from
// role-scoped data; only the resulting figures reach the browser).
import { STAGES, MONTHS } from '@/lib/demo/pipeline';
import { fmtM as M, pc } from '@/lib/format';
import { agg, type Agg, type PipelineScope } from '../data/pipeline';

const COLS = ['var(--color-neutral-900)', 'var(--color-accent)', 'var(--color-neutral-500)', 'var(--color-accent-300)', 'var(--color-neutral-300)', 'var(--color-accent-700)'];
export interface Seg { w: number; color: string; label: string }
export interface HomeDash {
  title: string; kpis: { label: string; value: string; note: string; barW: number; barOp: number; barColor: string; accent: boolean }[]; weighted: string;
  stages: { label: string; prob: string; count: string; value: string; pct: string; w: number; color: string }[];
  wonPct: string; lostPct: string; won: string; lost: string; wonN: number; lostN: number; wonW: number; lostW: number; rateN: string; closedTotal: string;
  peak: string; months: { m: string; h: number; v: string; color: string }[];
  shareTitle: string; shares: { label: string; caption: string; value: string; segs: Seg[] }[];
  legend: { label: string; pct: string; color: string; href: string }[];
  scope: 'me' | 'team' | null; hasBack: boolean; detailsHref: string;
  oppRows: { name: string; acct: string; close: string; next: string; value: string; w: number; stage: string; prob: string; dots: string[]; href: string }[] | null;
  rowsTitle: string; rowsHint: string;
  perfRows: { name: string; sub: string; pipe: string; pipeW: number; won: string; lost: string; rate: string; rateW: number; share: string; color: string; isMe: boolean; href: string | null }[] | null;
  insight: string;
}

export function homeDash(S: PipelineScope, opts: { scope?: string; team?: string }): HomeDash {
  const role = S.role;
  const T = S.allTeams;
  const sc = role === 'lead' ? (opts.scope === 'me' ? 'me' : 'team') : null;
  const selT = role === 'director' ? S.teams.find(t => t.id === opts.team) || null : null;
  const my = role === 'lead' ? S.teams[0] : null;
  const lau = S.self;
  const list = role === 'exec' ? [S.self!] : role === 'lead' ? (sc === 'me' ? [lau!] : my!.execs) : (selT ? selT.execs : []);
  const A: Agg = role === 'director' && !selT ? S.org : agg(list);
  const title = role === 'exec' ? 'My pipeline & results' : role === 'lead' ? (sc === 'me' ? 'My individual pipeline' : 'Team · ' + my!.name) : (selT ? 'Team · ' + selT.name : 'Asterion · all teams');
  const wr = A.won / (A.won + A.lost), att = A.won / A.quota, weighted = A.stages.reduce((t, v, i) => t + v * STAGES[i].p, 0), nOpps = A.counts.reduce((a, b) => a + b, 0);
  const K = (label: string, value: string, note: string, barW: number | null, barColor?: string, accent?: boolean) => ({ label, value, note, barW: barW == null ? 0 : Math.min(100, barW), barOp: barW == null ? 0 : 1, barColor: barColor || 'var(--color-text)', accent: !!accent });
  const out = {
    title,
    kpis: [K('Open pipeline', M(A.pipe), nOpps + ' opportunities', null), K('Weighted pipeline', M(weighted), 'stage-probability', weighted / A.pipe * 100), K('Won YTD', M(A.won), A.wonN + ' deals', A.won / A.quota * 100), K('Lost YTD', M(A.lost), A.lostN + ' deals', A.lost / (A.won + A.lost) * 100, 'var(--color-accent)', true), K('Win rate', pc(wr), 'by value', wr * 100), K('Quota attainment', pc(att), 'target ' + M(A.quota), att * 100, att < 0.7 ? 'var(--color-accent)' : 'var(--color-text)', att < 0.7)],
    weighted: M(weighted),
  } as HomeDash;
  const mx = Math.max(...A.stages);
  out.stages = STAGES.map((st, i) => ({ label: st.label, prob: Math.round(st.p * 100) + '%', count: A.counts[i] + ' opp' + (A.counts[i] === 1 ? '' : 's'), value: M(A.stages[i]), pct: pc(A.stages[i] / A.pipe), w: A.stages[i] / mx * 100, color: i === 4 ? 'var(--color-accent)' : 'var(--color-text)' }));
  Object.assign(out, { wonPct: pc(wr), lostPct: pc(1 - wr), won: M(A.won), lost: M(A.lost), wonN: A.wonN, lostN: A.lostN, wonW: wr * 100, lostW: 100 - wr * 100, rateN: pc(A.wonN / (A.wonN + A.lostN)), closedTotal: (A.wonN + A.lostN) + ' deals' });
  const mm = Math.max(...A.months), pk = A.months.indexOf(mm);
  out.peak = MONTHS[pk] + ' ' + M(mm);
  out.months = A.months.map((v, i) => ({ m: MONTHS[i], h: v / mm * 100, v: M(v), color: i === pk ? 'var(--color-accent)' : 'var(--color-text)' }));
  const tA = S.team!, eA = S.eu, oA = S.org;
  const two = (label: string, caption: string, part: number, whole: number, c?: string) => ({ label, caption, value: pc(part / whole), segs: [{ w: part / whole * 100, color: c || 'var(--color-accent)', label }, { w: 100 - part / whole * 100, color: 'transparent', label: 'Rest' }] });
  out.legend = [];
  if (role === 'exec') {
    out.shareTitle = 'Where you stand';
    out.shares = [two('Share of my team', M(A.pipe) + ' of ' + M(tA.pipe) + ' · ' + T[0].name, A.pipe, tA.pipe), two('Share of Europe business unit', M(A.pipe) + ' of ' + M(eA.pipe), A.pipe, eA.pipe, 'var(--color-text)'), two('Share of team wins', M(A.won) + ' of ' + M(tA.won) + ' won', A.won, tA.won, 'var(--color-neutral-600)')];
  } else if (role === 'lead') {
    out.shareTitle = sc === 'me' ? 'Your individual contribution' : 'Your team in the business unit';
    out.shares = sc === 'me'
      ? [two('My share of the team', M(lau!.pipe) + ' of ' + M(tA.pipe), lau!.pipe, tA.pipe), two('My share of Europe BU', M(lau!.pipe) + ' of ' + M(eA.pipe), lau!.pipe, eA.pipe, 'var(--color-text)')]
      : [two('Team share of Europe BU', M(tA.pipe) + ' of ' + M(eA.pipe) + ' · 3 teams', tA.pipe, eA.pipe), two('Team share of Asterion', M(tA.pipe) + ' of ' + M(oA.pipe) + ' · 6 teams', tA.pipe, oA.pipe, 'var(--color-text)'), two('Team share of BU wins', M(tA.won) + ' of ' + M(eA.won) + ' won', tA.won, eA.won, 'var(--color-neutral-600)')];
  } else {
    const tot = selT ? A.pipe : oA.pipe;
    out.shareTitle = selT ? 'Each executive’s share of ' + selT.name : 'Each team’s share of the organisation';
    const items = selT ? selT.execs.slice().sort((a, b) => b.pipe - a.pipe).map(e => ({ label: e.name, v: e.pipe, id: '' })) : T.map(t => ({ label: t.name, v: t.agg.pipe, id: t.id }));
    const segs = items.map((x, i) => ({ label: x.label + ' ' + pc(x.v / tot), w: x.v / tot * 100, color: selT ? (i % 2 ? 'var(--color-neutral-500)' : 'var(--color-text)') : COLS[i % 6] }));
    out.shares = [{ label: selT ? 'Team pipeline split' : 'Organisation pipeline split', caption: M(tot) + ' open', value: '100%', segs }];
    if (!selT) out.legend = items.map((x, i) => ({ label: x.label, pct: pc(x.v / tot), color: COLS[i % 6], href: '/home?team=' + x.id }));
    out.shares.push(two(selT ? 'Team share of Asterion' : 'Europe BU share', selT ? M(A.pipe) + ' of ' + M(oA.pipe) : M(eA.pipe) + ' of ' + M(oA.pipe), selT ? A.pipe : eA.pipe, oA.pipe, 'var(--color-text)'));
  }
  out.scope = sc; out.hasBack = !!selT;
  out.detailsHref = '/ci?tab=pipeline' + (selT ? '&team=' + selT.id : '');
  const dots = (i: number) => STAGES.map((_, j) => (j <= i ? (i === 4 ? 'var(--color-accent)' : 'var(--color-text)') : 'var(--color-neutral-300)'));
  const oppList = role === 'exec' ? S.self!.opps : (sc === 'me' ? lau!.opps : null);
  out.oppRows = null; out.perfRows = null; out.rowsTitle = ''; out.rowsHint = '';
  if (oppList) {
    const om = Math.max(...oppList.map(o => o.value));
    out.oppRows = oppList.slice().sort((a, b) => b.value - a.value).slice(0, 6).map(o => ({ name: o.name, acct: o.acct, close: o.close, next: o.next, value: M(o.value), w: o.value / om * 100, stage: STAGES[o.stage].label, prob: Math.round(STAGES[o.stage].p * 100) + '%', dots: dots(o.stage), href: o.acctId ? '/ci?acct=' + o.acctId : '/ci?tab=pipeline' }));
  } else {
    type Row = { label: string; sub: string; pipe: number; won: number; lost: number; isMe: boolean; id: string | null };
    const rows: Row[] = role === 'lead'
      ? my!.execs.map(e => ({ label: e.name, sub: e.name === 'Laura Bennett' ? 'You · team leader' : pc(e.won / e.quota) + ' of quota', pipe: e.pipe, won: e.won, lost: e.lost, isMe: e.name === 'Laura Bennett', id: null }))
      : selT ? selT.execs.map(e => ({ label: e.name, sub: pc(e.won / e.quota) + ' of quota', pipe: e.pipe, won: e.won, lost: e.lost, isMe: false, id: null }))
        : T.map(t => ({ label: t.name, sub: t.n + ' executives · ' + t.bu + ' · lead ' + t.lead, pipe: t.agg.pipe, won: t.agg.won, lost: t.agg.lost, isMe: false, id: t.id }));
    const tot = rows.reduce((a, x) => a + x.pipe, 0), pm = Math.max(...rows.map(x => x.pipe));
    out.rowsTitle = role === 'lead' ? 'Executives in my team' : selT ? 'Executives · ' + selT.name : 'Teams';
    out.rowsHint = role === 'director' && !selT ? 'Click a team to see its executives' : 'Sorted by open pipeline';
    out.perfRows = rows.sort((a, b) => b.pipe - a.pipe).map(x => {
      const r = x.won / (x.won + x.lost);
      return { name: x.label, sub: x.sub, pipe: M(x.pipe), pipeW: x.pipe / pm * 100, won: M(x.won), lost: M(x.lost), rate: pc(r), rateW: r * 100, share: pc(x.pipe / tot), color: x.isMe ? 'var(--color-accent)' : (!selT && role === 'director' ? COLS[T.findIndex(t => t.id === x.id) % 6] : 'var(--color-text)'), isMe: x.isMe, href: x.id ? '/home?team=' + x.id : null };
    });
  }
  const top = (oppList || []).slice().sort((a, b) => b.value * STAGES[b.stage].p - a.value * STAGES[a.stage].p)[0];
  const early = (A.stages[0] + A.stages[1]) / A.pipe;
  const rate = (x: { won: number; lost: number }) => x.won / (x.won + x.lost);
  if (role === 'exec') out.insight = 'Win rate ' + pc(wr) + ' and ' + pc(att) + ' of quota with 2 months left. ' + pc(early) + ' of your pipeline is still early-stage — advance ' + (top ? top.name + ' (' + top.acct + ')' : 'your top deal') + ' and protect the Banco Ribera negotiation.';
  else if (role === 'lead' && sc === 'me') out.insight = 'Your own pipeline is ' + pc(lau!.pipe / tA.pipe) + ' of the team — your leverage is coaching: the team wins ' + pc(rate(tA)) + ' by value.';
  else if (role === 'lead') { const lowR = my!.execs.slice().sort((a, b) => rate(a) - rate(b))[0]; out.insight = 'Your team carries ' + pc(tA.pipe / eA.pipe) + ' of the Europe BU pipeline. Coach ' + lowR.name + ' (lowest win rate, ' + pc(rate(lowR)) + ') and move ' + pc(early) + ' early-stage pipeline forward.'; }
  else if (selT) out.insight = selT.name + ' holds ' + pc(A.pipe / oA.pipe) + ' of Asterion pipeline with a ' + pc(wr) + ' win rate. Top executive: ' + selT.execs.slice().sort((a, b) => b.pipe - a.pipe)[0].name + '.';
  else { const tw = T.map(t => ({ t, a: t.agg })), best = tw.slice().sort((a, b) => rate(b.a) - rate(a.a))[0], worst = tw.slice().sort((a, b) => rate(a.a) - rate(b.a))[0]; out.insight = 'Organisation win rate ' + pc(wr) + ', ' + pc(att) + ' of target. ' + best.t.name + ' converts best (' + pc(rate(best.a)) + '); ' + worst.t.name + ' needs attention (' + pc(rate(worst.a)) + ').'; }
  return out;
}
