// Port of Component.studioVals().
import 'server-only';
import { db } from '../db';
import type { Viewer } from '../session';
import { listSolutions, getSolution, expertStatus } from '../data/solutions';
import { canReadAccount } from '../data/accounts';
import { businessCase, payLabel, type Scenario } from '@/lib/business-case';
import { fmtK as fmt } from '@/lib/format';
import { PACKS, EXPERTS, FRAMEWORKS } from '@/lib/demo';

const LBL = ['Business challenge', 'Problem framing', 'Solution exploration', 'Solution architecture', 'Expert collaboration', 'Business case', 'Executive proposal'];

export function solStatus(x: { submitted: boolean; stage: number; requests: { status: string; expertId: string | null }[] }): [string, string] {
  if (x.submitted) return ['In review', 'tag-accent'];
  if (x.requests.some(r => r.expertId && r.status === 'requested')) return ['Awaiting expert input', 'tag-outline'];
  if (x.stage <= 2) return ['Draft concept', 'tag-neutral'];
  return ['Active', 'tag-neutral'];
}

export async function studioListVM(v: Viewer) {
  const all = await listSolutions(v);
  const sols = all.filter(s => !s.completed), done = all.filter(s => s.completed);
  const accounts = (await db.account.findMany()).filter(a => canReadAccount(v, a)).sort((a, b) => ['meridian', 'horizon', 'crescent', 'northstar', 'atlas'].indexOf(a.id) - ['meridian', 'horizon', 'crescent', 'northstar', 'atlas'].indexOf(b.id));
  return {
    counts: [['Active designs', sols.filter(x => !x.submitted && x.stage > 2).length], ['Draft concepts', sols.filter(x => x.stage <= 2).length], ['Awaiting expert input', sols.filter(x => x.requests.some(r => r.expertId && r.status === 'requested')).length], ['Completed', done.length]].map(([label, value]) => ({ label: label as string, value: value as number })),
    rows: sols.map(x => { const st = solStatus(x); return { id: x.id, title: x.title, acctName: x.account.name, stageLabel: x.stage + ' · ' + LBL[x.stage - 1], status: st[0], statusCls: st[1], updated: x.updatedLabel || 'Just now' }; }),
    completed: done.map(c => ({ title: c.title, acct: c.account.name, when: c.completedWhen || '', team: c.completedTeam || '' })),
    frameworks: FRAMEWORKS.map(([name, meta]) => ({ name, meta })),
    accounts: accounts.map(a => ({ id: a.id, name: a.name })),
  };
}
export type StudioListVM = Awaited<ReturnType<typeof studioListVM>>;

export async function studioWsVM(v: Viewer, id: string) {
  const sol = await getSolution(v, id);
  const P = PACKS[sol.pack];
  const a = sol.account;
  const exp = expertStatus(sol);
  const solLike = { pack: sol.pack, ws: sol.ws as Record<string, boolean>, costBase: sol.costBase, scenario: sol.scenario, expert: exp };
  const b = businessCase(solLike);
  const st = solStatus(sol);
  const ini = await db.initiative.findFirst({ orderBy: { createdAt: 'desc' } });
  const signals = await db.signal.findMany({ include: { links: true } });
  const order = ['s1', 's9', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  signals.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  const linkedSig = signals.find(x => x.links.some(l => l.accountId === a.id) || x.companies.includes(a.id));
  const touches = await db.interaction.findMany({ where: { accountId: a.id }, orderBy: { order: 'asc' }, take: 1 });
  const crmOpps = a.crmOpps as unknown as { name: string; value: string; signal: string }[];
  const ctx: { src: string; cls: string; text: string }[] = [];
  if (sol.imported) ctx.push({ src: 'CRM · ' + touches[0].date, cls: 'tag-neutral', text: touches[0].text }, { src: 'CRM · opportunity', cls: 'tag-neutral', text: crmOpps[0].name + ' — ' + crmOpps[0].value + ' · ' + crmOpps[0].signal });
  if (sol.signalImported && linkedSig) ctx.push({ src: linkedSig.verified ? 'Radar360 · verified' : 'Radar360 · hypothesis', cls: linkedSig.verified ? 'tag-neutral' : 'tag-outline', text: linkedSig.title + ' — ' + linkedSig.implication });
  if (a.hypotheses.length) ctx.push({ src: 'AI hypothesis', cls: 'tag-outline', text: a.hypotheses[0] });
  const framing = P.framing.map(([label, text]) => ({ label, text: text.replace('{account}', a.name) }));
  const ws = sol.ws as Record<string, boolean>;
  const warn = ws.w3 && !ws.w2 ? 'Conversational automation depends on agent-assist — add the agent-assist workstream.' : ws.w3 && !ws.w4 ? 'Automation in regulated services requires the data & model governance workstream.' : ws.g3 && !ws.g2 ? 'Scale-up depends on a pilot.' : '';
  const sofia = exp.sofia === 'contributed';
  const maxFit = Math.max(...P.alts.map(y => y.fit));
  const altObj = P.alts.find(x => x.id === sol.alt);
  const owner = sol.ownerId ? (await db.user.findUnique({ where: { id: sol.ownerId } }))?.name : a.ownerName;
  return {
    sol: { id: sol.id, title: sol.title, stage: sol.stage, challenge: sol.challenge, framed: sol.framed, alt: sol.alt, ws, costBase: sol.costBase, scenario: sol.scenario as Scenario, submitted: sol.submitted, story: sol.story, readOnly: sol.completed, acctName: a.name, acctId: a.id, status: st[0], statusCls: st[1], updated: sol.updatedLabel || 'Just now', owner: owner || a.ownerName, initName: ini && sol.story ? ini.name : null },
    labels: LBL, context: ctx, hasSignal: !!linkedSig, framing,
    alts: P.alts.map(x => ({ ...x, recommended: x.fit === maxFit })),
    compareRows: ([['Time to value', 'ttv'], ['Savings potential', 'sav'], ['Delivery risk', 'risk'], ['Capability built', 'cap'], ['Investment', 'inv'], ['AI fit to outcomes', 'fit']] as const).map(([label, k]) => ({ label, a: P.alts[0][k] + (k === 'fit' ? '%' : ''), b: P.alts[1][k] + (k === 'fit' ? '%' : ''), c: P.alts[2][k] + (k === 'fit' ? '%' : '') })),
    wsList: P.ws.map(w => ({ ...w, costLabel: fmt(w.cost), on: !!ws[w.id] })), wsCount: b.ws.length, warn,
    bc: { inv: fmt(b.invest), benefit: fmt(b.benefit), roi: Math.round(b.roi) + '%', pay: payLabel(b.pay), empty: !b.ws.length, step: fmt(b.step) },
    scenRows: (['conservative', 'base', 'ambitious'] as const).map(k => { const x = businessCase(solLike, k); return { k, label: k[0].toUpperCase() + k.slice(1), pct: x.pct.toFixed(1) + '%', benefit: fmt(x.benefit), roi: Math.round(x.roi) + '%', pay: payLabel(x.pay), on: k === sol.scenario }; }),
    assumptions: ['Benefit ramp: 40% year 1, 80% year 2, 100% year 3', 'Savings rate is the sum of selected workstream effects × scenario multiplier', 'Cost base supplied by client (to be validated with finance)'].concat(sofia ? ['Agent-assist adoption 70% by month 6 — Sofia Chen benchmark (expert-validated)'] : ['Agent-assist adoption assumption not yet expert-validated']),
    risks: [{ text: 'Regulatory model-risk approval delays automation', sev: 'High', cls: 'accent' }, { text: 'Workforce consultation extends timeline', sev: 'Medium', cls: 'neutral' }, { text: 'Legacy CRM integration effort', sev: 'Medium', cls: 'neutral' }, { text: 'Sponsor change at client', sev: 'Low', cls: 'neutral' }] as { text: string; sev: string; cls: 'accent' | 'neutral' }[],
    sofia, sofiaRequested: exp.sofia === 'requested',
    experts: P.experts.map(([eid, match, reason]) => { const e = EXPERTS.find(x => x.id === eid)!; return { id: eid, name: e.name, title: e.title, match, reason, status: exp[eid] || null }; }),
    prop: {
      altName: altObj ? altObj.name : '(select an approach in stage 3)', ws: b.ws.length ? b.ws.map(w => w.name + ' — ' + w.del) : ['Select workstreams in stage 4'], scenario: sol.scenario,
      summary: a.name + ' can ' + (sol.pack === 'aiops' ? 'reduce cost-to-serve by an estimated ' + b.pct.toFixed(0) + '% while improving customer experience' : 'achieve a measurable improvement') + ' through a ' + (altObj ? altObj.name.toLowerCase() : 'structured') + ' approach, delivering ' + fmt(b.benefit) + ' annual run-rate benefit on an investment of ' + fmt(b.invest) + '.',
      outcomes: framing[4].text,
    },
    copilotTip: ['Ground the challenge in the sponsor’s metric — cost-to-serve.', 'Check the root problem with the Head of Customer Service.', 'Option C best matches stated outcomes (91% fit).', 'Agent-assist is the critical-path dependency.', 'Sofia Chen is a 94% match for this context.', 'Validate the cost base before sharing numbers.', 'Lead the summary with the client’s outcome, not the method.'][sol.stage - 1],
    team: Object.entries(exp).map(([eid, s]) => ({ name: EXPERTS.find(x => x.id === eid)!.name, status: s })),
  };
}
export type StudioWsVM = Awaited<ReturnType<typeof studioWsVM>>;
