import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer, type Prep } from '../session';
import { canReadAccount } from './accounts';
import { analyse, type Provenance } from '@/lib/demo/radar';
import { LENS } from '@/lib/demo';
import { fmtMB as M, fmtE as E, fmtN as N, nowLabel } from '@/lib/format';
import type { RadarCompany, Lens } from '@/lib/demo/types';

const P_EMPTY: Prep = { stake: [], hooks: [], qs: [], bu: null, comp: false, type: 'first', date: '' };

/** Companies visible in Radar360: the shared dossiers plus the viewer's own "+ New company" analyses. */
export async function listCompanies(v: Viewer) {
  assertBusiness(v);
  const rows = await db.company.findMany({ where: { OR: [{ custom: false }, { createdBy: v.id }] }, orderBy: { createdAt: 'asc' } });
  const order = ['meridian', 'valoria', 'horizon', 'crescent', 'northstar', 'atlas'];
  rows.sort((a, b) => (order.indexOf(a.id) < 0 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 99 : order.indexOf(b.id)) || a.createdAt.getTime() - b.createdAt.getTime());
  return rows.map(r => ({ ...(r.dossier as unknown as RadarCompany), id: r.id, financials: r.financials as Record<string, { value: number | null; provenance: Provenance; source: string }> }));
}

export type Pv = Provenance;
const kp = (label: string, value: string | number, note: string, prov: Pv, acc = false) => ({ label, value: String(value), note, prov, accent: acc });

/** Port of Component.dossierVals() with explicit provenance on every figure. */
export async function dossierVM(v: Viewer, sp: { co?: string; dtab?: string }) {
  const all = await listCompanies(v);
  const co = all.find(c => c.id === sp.co) || all[0];
  const lens: Lens = v.state.lens === 'execed' ? 'execed' : 'consulting';
  const L = LENS[lens];
  const A = analyse(co, (v.state.ldOv || {})[co.id]);
  const crm = co.crm ? await db.account.findUnique({ where: { id: co.crm } }) : null;
  const crmOk = !!(crm && canReadAccount(v, crm));
  const P: Prep = { ...P_EMPTY, ...((v.state.prep || {})[co.id] || {}) };
  const signals = await db.signal.findMany({ where: { id: { in: co.signals } }, include: { links: true } });
  const fin = co.financials;
  const R = (p: boolean): Pv => (p ? 'REPORTED' : 'ESTIMATED');
  const revLabel = A.revEst ? M(A.revLo) + '–' + M(A.revHi) : M(A.rev), netLabel = A.netEst ? M(A.netLo) + '–' + M(A.netHi) : M(A.net);
  const yr = co.ar ? 'Annual report ' + co.ar.year : null;
  const B = A.B;
  const people = co.people.slice().sort((a, b) => (b.lens.includes(lens) ? 1 : 0) - (a.lens.includes(lens) ? 1 : 0));
  const key = people.filter(p => p.lens.includes(lens)), first = key[0] || people[0];
  const noContact = key.filter(p => /No contact|Inbound/.test(p.rel)).length;
  const rows = [{ name: co.name, rev: A.rev, emp: co.employees, op: A.op, growth: A.growth, ai: co.ai || '—', note: 'Client' + (A.revEst ? ' · estimated' : ''), client: true }].concat((co.peers || []).map(x => ({ ...x, client: false })));
  const mx = Math.max(...rows.map(r => r.rev));
  const peerRows = rows.slice().sort((x, y) => y.rev - x.rev), rank = peerRows.findIndex(r => r === rows[0]) + 1;
  const peerAvg = (co.peers || []).length ? co.peers.reduce((t, x) => t + x.op, 0) / co.peers.length : null;
  const hi = co.bus.filter(b => b.fit[lens] === 'High').length, rv0 = (co.rivals[lens] || [])[0], h0 = (co.hooks[lens] || [])[0];
  const nm = A.net / A.rev * 100, dOp = A.op - B.op;
  const best = co.bus.find(b => b.fit[lens] === 'High') || co.bus[0];
  const addrLabel = lens === 'execed' ? 'Addressable external executive education' : 'Addressable transformation-advisory wallet', addr = lens === 'execed' ? E(A.external) : E(A.wallet);
  const qs = co.qs.all.concat(co.qs[lens] || []);
  const checks: [string, boolean][] = [['Lead business unit chosen', !!P.bu], ['2+ stakeholders selected', P.stake.length >= 2], ['2+ value hooks selected', P.hooks.length >= 2], ['3+ questions prepared', P.qs.length >= 3], ['Competitive context reviewed', !!P.comp]];
  const dc = checks.filter(c => c[1]).length;
  const dt = ['overview', 'fin', 'opp', 'people', 'comp', 'plan'].includes(sp.dtab || '') ? sp.dtab! : 'overview';
  const kpis = {
    overview: [kp('Revenue', revLabel, A.revEst ? 'Estimated' : 'Reported ' + (co.ar ? co.ar.year : ''), R(!A.revEst)), kp('Employees', N(co.employees), co.countries, fin.employees.provenance), kp('Net profit', netLabel, A.netEst ? 'Estimated' : 'Reported', R(!A.netEst)), kp('Addressable for us', addr, lens === 'execed' ? 'External exec. education / yr' : 'Advisory wallet / yr', 'ESTIMATED', true), kp('Relationship', !co.crm ? 'New' : crmOk ? crm!.rel.split(' ·')[0] : 'Restricted', !co.crm ? 'No CRM record' : 'CRM', 'REPORTED')],
    fin: [kp('Revenue', revLabel, A.revEst ? 'Estimated ±20%' : 'Annual report', R(!A.revEst)), kp('Net margin', nm.toFixed(1) + '%', 'Sector ' + B.net + '%', R(!A.revEst && !A.netEst)), kp('Operating margin', A.op + '%', (dOp >= 0 ? '+' : '') + dOp.toFixed(1) + ' pts vs sector', R(!A.opEst), dOp < 0), kp('Growth', (A.growth != null ? A.growth : B.growth) + '%', A.growth != null ? 'Sector ' + B.growth + '%' : 'Sector estimate', R(A.growth != null))],
    opp: [kp('High-fit units', hi + ' of ' + co.bus.length, 'for ' + L.short.toLowerCase(), 'AI_HYPOTHESIS'), kp('L&D spend / yr', E(A.ldTotal), '€' + A.ldPer + ' per employee', 'ESTIMATED'), kp('Executive education', E(A.execBudget), N(A.leaders) + ' leaders', 'ESTIMATED'), kp('Addressable for us', addr, lens === 'execed' ? 'External share ≈55%' : '≈' + (B.consPct * 100).toFixed(2) + '% of revenue', 'ESTIMATED', true)],
    people: [kp('Stakeholders mapped', people.length, 'Public + CRM', 'REPORTED'), kp('Key for this lens', key.length, L.short, 'AI_HYPOTHESIS'), kp('Existing relationships', people.filter(p => p.src === 'CRM' && crmOk && p.rel === 'Strong').length, 'Strong in CRM', 'REPORTED'), kp('Key, not yet contacted', noContact, 'Need an introduction', 'REPORTED', noContact > 0)],
    comp: [kp('Revenue rank', (co.peers || []).length ? '#' + rank + ' of ' + rows.length : '—', 'vs. tracked peers', R(!A.revEst)), kp('Margin vs peers', peerAvg != null ? ((A.op - peerAvg) >= 0 ? '+' : '') + (A.op - peerAvg).toFixed(1) + ' pts' : '—', 'Operating margin', R(!A.opEst)), kp('Peers ahead on AI', (co.peers || []).filter(x => x.ai === 'Advanced').length, '“Advanced” maturity', 'AI_HYPOTHESIS', true), kp('Our competitors', (co.rivals[lens] || []).length, 'for ' + L.short.toLowerCase(), 'AI_HYPOTHESIS')],
    plan: [kp('Preparation', dc + '/5', dc === 5 ? 'Ready' : 'Steps completed', 'REPORTED', dc < 5), kp('Stakeholders', P.stake.length, 'selected', 'REPORTED'), kp('Pitch points', P.hooks.length, 'selected', 'REPORTED'), kp('Questions', P.qs.length, 'selected', 'REPORTED')],
  }[dt]!;
  const insight = {
    overview: 'Lead with ' + best.name + ', open with ' + first.name + ' (' + first.role + ') and pitch “' + (h0 ? h0[0] : '—') + '”.',
    fin: (dOp >= 0 ? 'Margin ' + dOp.toFixed(1) + ' pts above sector — capacity to invest; frame around growth.' : 'Margin ' + Math.abs(dOp).toFixed(1) + ' pts below sector — cost pressure likely; frame around efficiency.') + (A.revEst ? ' Figures are estimates: validate them early.' : ''),
    opp: hi + ' business unit' + (hi === 1 ? '' : 's') + ' with high fit. Lead with ' + best.name + ' — ' + best.why[lens].charAt(0).toLowerCase() + best.why[lens].slice(1) + '.',
    people: 'Start with ' + first.name + ' (' + first.role + '). ' + (noContact ? noContact + ' key stakeholder' + (noContact === 1 ? '' : 's') + ' still need an introduction.' : 'All key stakeholders are reachable.'),
    comp: rv0 ? 'Main threat: ' + rv0.name + '. ' + rv0.how + '.' : 'No direct competitors identified.',
    plan: dc === 5 ? 'You are ready — generate the meeting brief.' : (5 - dc) + ' step' + (5 - dc === 1 ? '' : 's') + ' left. Use “Apply AI picks” to prepare in one click.',
  }[dt]!;
  const bu = co.bus.find(b => b.name === P.bu), hk = (co.hooks[lens] || []).filter((_, i) => P.hooks.includes(lens + i)), pp = co.people.filter(p => P.stake.includes(p.name + '|' + p.role));
  const brief = {
    title: co.name + ' — ' + (P.type === 'first' ? 'first-meeting' : 'follow-up') + ' brief',
    sub: (P.date ? 'Meeting ' + P.date + ' · ' : '') + 'Lens: ' + L.label + ' · Sources: ' + (co.ar ? 'Annual report ' + co.ar.year : 'sector estimates') + ', public web, LinkedIn' + (crmOk ? ', CRM' : '') + ' · generated ' + nowLabel(),
    sections: [
      { h: 'Company at a glance', items: [co.sector + ' · ' + co.hq + ' · ' + N(co.employees) + ' employees · ' + (co.listed ? 'listed' : 'private'), 'Revenue ' + revLabel + ' · net profit ' + netLabel + (A.revEst ? ' (estimated)' : ' (reported)'), co.desc] },
      { h: 'Lead with', items: [bu ? bu.name + ' — ' + bu.why[lens] : 'Not selected yet — choose a business unit in the Opportunity tab'] },
      { h: 'Who to meet', items: pp.length ? pp.map(p => p.name + ', ' + p.role + ' — ' + p.approach) : ['No stakeholders selected yet (Stakeholders tab)'] },
      { h: 'Why they could buy', items: hk.length ? hk.map(h => h[0] + ' — ' + h[1]) : ['No value hooks selected yet (Meeting plan)'] },
      { h: 'Investment context (estimates)', items: ['Learning & development ≈ ' + E(A.ldTotal) + ' a year; executive education ≈ ' + E(A.execBudget) + ' across ≈ ' + N(A.leaders) + ' leaders', addrLabel + ' ≈ ' + addr] },
      { h: 'Competitive watch-outs', items: (co.rivals[lens] || []).map(r => r.name + ' — ' + r.how) },
      { h: 'Questions to ask', items: P.qs.length ? P.qs : ['No questions selected yet (Meeting plan)'] },
      { h: 'Proposed next step', items: [lens === 'execed' ? 'Propose a needs-analysis session with People & Culture to scope a custom leadership programme' : 'Propose a 2-hour diagnostic workshop with the executive sponsor'] },
    ],
  };
  const ov = (v.state.ldOv || {})[co.id] || {};
  return {
    lens, lensLabel: L.label, dtab: dt,
    cos: all.map(c => ({ id: c.id, label: c.name + ' — ' + (c.custom ? 'new analysis' : !c.crm ? 'prospect' : 'CRM account') })),
    co: {
      id: co.id, name: co.name, desc: co.desc, sector: co.sector, hq: co.hq, web: co.web, li: co.li, listed: !!co.listed, arYear: co.ar?.year ?? null, confidence: A.confidence, crmId: crmOk ? co.crm : null,
      listedTag: co.listed ? 'Listed · ' + co.exchange + ' (demo)' : co.custom ? 'Private · sector model' : 'Private · ' + (co.owner || 'unlisted'),
      crmTag: !co.crm ? (co.custom ? 'New company' : 'Prospect — first meeting') : crmOk ? 'CRM account · ' + crm!.rel : 'CRM account · relationship data restricted',
    },
    kpis, insight,
    actions: [
      { k: 'Lead with', v: best.name, d: best.why[lens], tab: 'opp', top: true, prov: 'AI_HYPOTHESIS' as Pv },
      { k: 'Meet first', v: first.name, d: first.role + ' — ' + first.approach, tab: 'people', top: false, prov: 'AI_HYPOTHESIS' as Pv },
      { k: 'Pitch', v: h0 ? h0[0] : '—', d: h0 ? h0[1] : '', tab: 'plan', top: false, prov: 'AI_HYPOTHESIS' as Pv },
      { k: 'Watch out', v: rv0 ? rv0.name : '—', d: rv0 ? rv0.how : '', tab: 'comp', top: false, prov: 'AI_HYPOTHESIS' as Pv },
    ],
    facts: [
      { label: 'Sector', value: co.sector + (co.sub ? ' · ' + co.sub : ''), src: 'Public web', prov: 'REPORTED' as Pv },
      { label: 'Headquarters', value: co.hq, src: 'Public web', prov: 'REPORTED' as Pv },
      { label: 'Footprint', value: co.countries, src: 'Public web', prov: 'REPORTED' as Pv },
      { label: 'Employees', value: N(co.employees), src: yr || (co.custom ? 'Your input' : 'LinkedIn · approx.'), prov: fin.employees.provenance },
      { label: 'Revenue', value: revLabel, src: yr || 'Estimated', prov: R(!A.revEst) },
      { label: 'Net profit', value: netLabel, src: yr || 'Estimated', prov: R(!A.netEst) },
      { label: 'Operating margin', value: A.op + '%', src: A.opEst ? 'Sector median' : yr || 'Reported', prov: R(!A.opEst) },
      { label: 'LinkedIn', value: co.liFollowers ? co.liFollowers + ' followers' : '—', src: 'LinkedIn', prov: 'REPORTED' as Pv },
    ],
    signals: signals.map(x => ({ id: x.id, title: x.title, date: x.date, impl: x.implication, verified: x.verified, linked: !!(crm && x.links.some(l => l.accountId === crm.id)) })),
    canConnect: crmOk,
    ar: co.ar ? { priorities: co.ar.priorities.map(([t, angle, pg]) => ({ t, angle, pg })), kpis: co.ar.kpis.map(([label, value, note]) => ({ label, value, note })), talent: co.ar.talent, risks: co.ar.risks } : null,
    estKpis: [
      { label: 'Revenue', value: revLabel, method: N(co.employees) + ' employees × €' + Math.round(B.revPerEmp * 1000) + 'k revenue per employee (sector) ±20%' },
      { label: 'Net profit', value: netLabel, method: 'Sector net margin ' + B.net + '% on estimated revenue ±30%' },
      { label: 'Operating margin', value: A.op + '%', method: 'Sector median — ask about cost pressures' },
      { label: 'Growth outlook', value: (A.growth != null ? A.growth : B.growth) + '%', method: 'Sector expected growth 2026–27' },
    ],
    bench: [['Operating margin', A.op, B.op, '%'], ['Revenue / employee (€k)', Math.round(A.rev / co.employees * 1000), Math.round(B.revPerEmp * 1000), ''], ['Revenue growth', A.growth != null ? A.growth : B.growth, B.growth, '%']].map(([label, cv, bv, unit]) => {
      const m = Math.max(cv as number, bv as number) || 1; return { label: label as string, coLabel: cv + (unit as string), bLabel: bv + (unit as string), coW: (cv as number) / m * 100, bW: (bv as number) / m * 100 };
    }),
    benchNote: co.listed ? 'Client figures reported; sector = demo benchmark median.' : 'Client figures estimated from the sector model — comparison is indicative only.',
    clientProv: R(!A.revEst),
    bus: co.bus.map(b => ({ name: b.name, share: b.share != null ? b.share + '%' : '—', shareW: b.share || 0, emp: b.emp ? N(b.emp) : '—', fit: b.fit[lens], why: b.why[lens], on: P.bu === b.name, prov: (b.share != null ? 'REPORTED' : 'ESTIMATED') as Pv })),
    inv: {
      ldPer: A.ldPer, execPct: Math.round(A.execShare * 100), ldSrc: A.ldSrc, adjusted: ov.ld != null || ov.exec != null, ldProv: (co.ldReported && ov.ld == null ? 'REPORTED' : 'ESTIMATED') as Pv,
      method: [N(co.employees) + ' employees × €' + A.ldPer + ' L&D per employee (' + A.ldSrc.toLowerCase() + ') = ' + E(A.ldTotal), 'Executive & leadership share ' + Math.round(A.execShare * 100) + '% = ' + E(A.execBudget) + ' · leadership population ≈ ' + (B.leader * 100).toFixed(1) + '% of headcount', '≈55% of executive education is typically sourced externally (business schools, providers) = ' + E(A.external), 'Advisory wallet ≈ ' + (B.consPct * 100).toFixed(2) + '% of revenue spent on external transformation advice = ' + E(A.wallet)],
    },
    peers: rows.map(r => ({ name: r.name, rev: M(r.rev), revW: r.rev / mx * 100, emp: N(r.emp), op: r.op + '%', growth: r.growth == null ? '—' : r.growth + '%', ai: r.ai, note: r.note, client: r.client, prov: (r.client ? R(!A.revEst) : 'REPORTED') as Pv })),
    noPeers: !(co.peers || []).length,
    rivals: co.rivals[lens] || [],
    people: people.map(p => {
      const k = p.name + '|' + p.role;
      return { k, name: p.name, role: p.role, src: p.src, rel: p.src === 'CRM' && !crmOk ? 'Relationship restricted' : p.rel, key: p.lens.includes(lens), why: p.why, approach: p.approach, ini: p.name === 'To be identified' ? '?' : p.name.split(' ').map(w => w[0]).join('').slice(0, 2), li: p.li, on: P.stake.includes(k), prov: (p.src === 'Role template' ? 'AI_HYPOTHESIS' : 'REPORTED') as Pv };
    }),
    hooks: (co.hooks[lens] || []).map((h, i) => ({ k: lens + i, t: h[0], ev: h[1], on: P.hooks.includes(lens + i), prov: (/validate|estimate/i.test(h[1]) ? 'AI_HYPOTHESIS' : 'REPORTED') as Pv })),
    qs: qs.map(q => ({ q, on: P.qs.includes(q) })),
    prep: { type: P.type, date: P.date, checks: checks.map(([label, done]) => ({ label, done })), dc },
    sourcesLine: co.sources.map(x => x.split(' — ')[0]).join(' · '),
    brief,
  };
}
export type DossierVM = Awaited<ReturnType<typeof dossierVM>>;

/** AI-picks for the meeting plan (port of dAuto). */
export async function aiPicks(v: Viewer, coId: string): Promise<Prep> {
  const all = await listCompanies(v);
  const co = all.find(c => c.id === coId);
  if (!co) throw new Error('not_found');
  const lens: Lens = v.state.lens === 'execed' ? 'execed' : 'consulting';
  const people = co.people.slice().sort((a, b) => (b.lens.includes(lens) ? 1 : 0) - (a.lens.includes(lens) ? 1 : 0));
  const best = co.bus.find(b => b.fit[lens] === 'High') || co.bus[0];
  const qs = co.qs.all.concat(co.qs[lens] || []);
  const cur: Prep = { ...P_EMPTY, ...((v.state.prep || {})[co.id] || {}) };
  return { ...cur, bu: best.name, stake: people.filter(p => p.lens.includes(lens)).slice(0, 3).map(p => p.name + '|' + p.role), hooks: (co.hooks[lens] || []).slice(0, 2).map((_, i) => lens + i), qs: qs.slice(0, 3).concat(qs.length > 4 ? [qs[qs.length - 1]] : []), comp: true };
}

/** Context handed to SYNERGON AI for the dossier (port of _dctx). */
export async function dossierAiContext(v: Viewer, coId?: string) {
  const all = await listCompanies(v);
  const co = all.find(c => c.id === coId) || all[0];
  const lens: Lens = v.state.lens === 'execed' ? 'execed' : 'consulting';
  const L = LENS[lens]; const A = analyse(co, (v.state.ldOv || {})[co.id]);
  const people = co.people.slice().sort((a, b) => (b.lens.includes(lens) ? 1 : 0) - (a.lens.includes(lens) ? 1 : 0));
  const best = co.bus.find(b => b.fit[lens] === 'High') || co.bus[0];
  return {
    name: co.name, lens: L.short, revLabel: A.revEst ? M(A.revLo) + '–' + M(A.revHi) : M(A.rev), est: A.revEst, emp: N(co.employees), ldTotal: E(A.ldTotal), execBudget: E(A.execBudget), leaders: N(A.leaders),
    addrLabel: lens === 'execed' ? 'Addressable external executive education' : 'Addressable transformation-advisory wallet', addr: lens === 'execed' ? E(A.external) : E(A.wallet), bu: best.name,
    people: people.filter(p => p.lens.includes(lens)).slice(0, 3).map(p => p.name + ' (' + p.role + ') — ' + p.approach),
    hooks: (co.hooks[lens] || []).map(h => h[0]), qs: co.qs.all.concat(co.qs[lens] || []), rivals: (co.rivals[lens] || []).map(r => r.name + ': ' + r.how),
  };
}

/** Market signals radar: every signal (public/market data) plus the viewer's authorised accounts to connect. */
export async function signalsVM(v: Viewer, signalId?: string) {
  assertBusiness(v);
  const [signals, accounts] = await Promise.all([db.signal.findMany({ include: { links: true } }), db.account.findMany()]);
  const order = ['s1', 's9', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  signals.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const allowed = accounts.filter(a => canReadAccount(v, a)).sort((a, b) => ['meridian', 'horizon', 'crescent', 'northstar', 'atlas'].indexOf(a.id) - ['meridian', 'horizon', 'crescent', 'northstar', 'atlas'].indexOf(b.id));
  const sel = signals.find(s => s.id === signalId) || signals[0];
  const saved = v.state.saved || [];
  return {
    signals: signals.map(s => ({ id: s.id, title: s.title, industry: s.industry, geo: s.geo, kind: s.kind, verified: s.verified, horizon: s.horizon, x: s.x, y: s.y })),
    sel: {
      id: sel.id, title: sel.title, industry: sel.industry, geo: sel.geo, kind: sel.kind, verified: sel.verified, horizon: sel.horizon, date: sel.date, summary: sel.summary, implication: sel.implication, action: sel.action, sources: sel.sources,
      saved: saved.includes(sel.id),
      connect: allowed.map(a => ({ id: a.id, name: a.name, on: sel.links.some(l => l.accountId === a.id) })),
      studioTarget: sel.links.find(l => allowed.some(a => a.id === l.accountId))?.accountId || sel.companies.find(c => allowed.some(a => a.id === c)) || null,
    },
    brief: { title: 'Executive briefing — ' + sel.title, sub: (sel.verified ? 'Verified information' : 'AI-generated hypothesis') + ' · ' + sel.industry + ' · ' + sel.geo + ' · ' + sel.date, sections: [{ h: 'What is happening', items: [sel.summary] }, { h: 'Why it matters', items: [sel.implication] }, { h: 'Recommended action', items: [sel.action] }, { h: 'Sources', items: sel.sources }] },
    hyps: [
      { acct: 'Meridian Financial Group · from S1 + S9', title: 'AI customer-operations redesign', basis: 'Verified FS investment trend + competitor acquisition + COO cost-to-serve priority (CRM).', cta: 'Open in Solution Design Studio', studio: 'meridian', href: null as string | null },
      { acct: 'Horizon Telecom · from S3', title: 'AI-assisted care consolidation', basis: 'Verified platform consolidation + tender pre-announcement.', cta: 'Open account intelligence', studio: null as string | null, href: '/ci?acct=horizon' },
      { acct: 'Crescent Retail Group · from S7', title: 'Peak-season AI service pilot', basis: 'Competitor entry in UAE retail AI + CDO backlog concern.', cta: 'Open account intelligence', studio: null as string | null, href: '/ci?acct=crescent' },
    ],
  };
}
export type SignalsVM = Awaited<ReturnType<typeof signalsVM>>;
