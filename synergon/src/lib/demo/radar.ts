// Port of analyse() / generic() from reference/synergon-radar.js.
import { BENCH } from './radar.gen';
import type { Bench, RadarCompany, BusinessUnit, RadarPerson, Rival, Lens } from './types';

export type Provenance = 'REPORTED' | 'ESTIMATED' | 'AI_HYPOTHESIS';
export interface Overrides { ld?: number; exec?: number }

export interface Analysis {
  B: Bench; rev: number; revEst: boolean; revLo: number; revHi: number; net: number; netEst: boolean; netLo: number; netHi: number;
  op: number; opEst: boolean; growth: number | null; ldPer: number; ldSrc: string; execShare: number; ldTotal: number; execBudget: number;
  leaders: number; external: number; wallet: number; confidence: string;
}

export function analyse(co: RadarCompany, ov: Overrides = {}): Analysis {
  const b = BENCH[co.sector], emp = co.employees;
  const revEst = co.revenue == null, rev = revEst ? emp * b.revPerEmp : co.revenue!;
  const netEst = co.net == null, net = netEst ? rev * b.net / 100 : co.net!;
  const opEst = co.op == null, op = opEst ? b.op : co.op!;
  const ldPer = ov.ld != null ? ov.ld : (co.ldReported || b.ld);
  const ldSrc = ov.ld != null ? 'Your adjustment' : co.ldReported ? 'Reported in annual report' : 'Sector benchmark';
  const execShare = ov.exec != null ? ov.exec : b.execShare;
  const ldTotal = emp * ldPer, execBudget = ldTotal * execShare;
  return {
    B: b, rev, revEst, revLo: rev * 0.8, revHi: rev * 1.2, net, netEst, netLo: net * 0.7, netHi: net * 1.3, op, opEst, growth: co.growth, ldPer, ldSrc, execShare, ldTotal, execBudget,
    leaders: Math.round(emp * b.leader), external: execBudget * 0.55, wallet: rev * 1e6 * b.consPct,
    confidence: co.listed ? 'High — reported figures' : co.custom ? 'Low — sector model only' : 'Medium — estimated ±20%',
  };
}

const B: Lens = 'consulting', X: Lens = 'execed', BX: Lens[] = ['consulting', 'execed'];
const bu = (name: string, share: number | null, emp: number, fc: string, wc: string, fe: string, we: string): BusinessUnit => ({ name, share, emp, fit: { consulting: fc, execed: fe }, why: { consulting: wc, execed: we } });
const p = (name: string, role: string, unit: string, src: string, rel: string, li: string | null, lens: Lens[], why: string, approach: string): RadarPerson => ({ name, role, unit, src, rel, li, lens, why, approach });
const rv = (name: string, type: string, strength: string, weak: string, how: string): Rival => ({ name, type, strength, weak, how });

export function generic(name: string, sector: string, emp: number, country: string, id = 'custom-' + Date.now()): RadarCompany {
  const b = BENCH[sector], slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ''); const sh = [0.45, 0.25, 0.18, 0.12];
  return {
    id, custom: true, crm: null, name, sector, sub: '', hq: country, countries: country, founded: null, listed: false, owner: 'private (assumed)', web: slug + '.example', li: slug, liFollowers: null, ai: '—', employees: emp, revenue: null, net: null, op: null, growth: null,
    desc: 'New company analysed with the Radar360 sector model. No annual report or CRM record found — every figure is an estimate to validate in the first meeting.',
    bus: b.bus.map((n, i) => bu(n, null, Math.round(emp * sh[i]), i === 0 || i === 2 ? 'High' : 'Medium', 'Typical transformation focus in ' + sector.toLowerCase(), i === 0 ? 'High' : 'Medium', 'Typical leadership-development population')),
    peers: [], rivals: { consulting: [rv('Global consultancies', 'Consulting', 'Brand and scale', 'Generic approaches, high cost', 'Lead with sector-specific evidence')], execed: [rv('Local business schools', 'Business school', 'Open programmes, alumni ties', 'Limited customisation', 'Custom, in-work programmes')] },
    people: ([['Chief Executive Officer', BX], ['Chief Operating Officer', [B]], ['Chief People Officer / CHRO', [X]], ['Head of Learning & Development', [X]], ['Chief Financial Officer', [B]], ['Chief Digital / Information Officer', [B]]] as [string, Lens[]][]).map(([r, l]) => p('To be identified', r, '—', 'Role template', 'No contact', null, l, 'Typical decision role for this offering', 'Find the current holder on LinkedIn')),
    hooks: { consulting: [['Efficiency and growth in ' + b.bus[0].toLowerCase(), 'Sector pattern — validate'], ['Digital and AI adoption', 'Sector pattern — validate']], execed: [['Leadership development for ≈' + Math.round(emp * b.leader) + ' leaders', 'Estimated leadership population'], ['AI fluency for managers', 'Sector pattern — validate']] },
    qs: { all: ['What are your top three priorities for the next 24 months?', 'How are external partners selected?', 'Which capabilities do you want to build in-house?'], consulting: ['Where are the largest cost or growth gaps?'], execed: ['How is leadership development organised today?'] },
    signals: [], sources: ['Sector benchmarks — SYNERGON demo dataset 2025 (' + sector.toLowerCase() + ')', 'User input: name, sector, headcount, country'],
  };
}

/** Field-level provenance of a company's financials, persisted with the Company record. */
export function financialProvenance(co: RadarCompany) {
  const yr = co.ar ? 'Annual report ' + co.ar.year : null;
  const f = (value: number | null, source: string, reported: boolean) => ({ value, provenance: (reported ? 'REPORTED' : 'ESTIMATED') as Provenance, source });
  return {
    employees: f(co.employees, yr || (co.custom ? 'User input' : 'LinkedIn · approx.'), !!yr),
    revenue: f(co.revenue, yr || 'Sector benchmark ±20%', co.revenue != null),
    net: f(co.net, yr || 'Sector benchmark ±30%', co.net != null),
    op: f(co.op, co.op != null ? (yr || 'Reported') : 'Sector median', co.op != null),
    growth: f(co.growth, co.growth != null ? (yr || 'Reported') : 'Sector expected growth', co.growth != null),
    ldPerEmployee: f(co.ldReported ?? null, co.ldReported ? (yr || 'Reported') : 'Sector benchmark', !!co.ldReported),
  };
}
