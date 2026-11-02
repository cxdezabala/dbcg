// Port of reference/synergon-pipeline.js — fictional commercial pipeline (YTD 2026, values in €M).
// The generator is deterministic (Park–Miller LCG, seed 11) and must be called in the same order
// as the prototype so that every name and figure matches.
export const STAGES = [
  { id: 'qual', label: 'Qualification', p: 0.1 },
  { id: 'disc', label: 'Discovery', p: 0.25 },
  { id: 'design', label: 'Solution design', p: 0.4 },
  { id: 'prop', label: 'Proposal', p: 0.6 },
  { id: 'nego', label: 'Negotiation', p: 0.8 },
] as const;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

export interface PipeOpp { acct: string; acctId?: string; name: string; stage: number; value: number; close: string; next: string }
export interface PipeClosed { acct: string; name: string; won: boolean; value: number; date: string; reason?: string }
export interface PipeExec {
  name: string; team: string; teamId: string; bu: string; pipe: number; won: number; lost: number; wonN: number; lostN: number; quota: number;
  stages: number[]; months: number[]; opps: PipeOpp[]; closed: PipeClosed[];
}
export interface PipeTeam { id: string; name: string; bu: string; lead: string; execs: PipeExec[] }

const ACCTS = ['Banco Ribera', 'Lusitania Bank', 'Solenne Insurance', 'Castilla Energía', 'Albion Rail', 'Pennine Water', 'Iberia Foods', 'Atlántico Logistics', 'Gulf Ports Authority', 'Emirates Mobility', 'Riyadh Health Cluster', 'Najd Utilities', 'Thames Housing', 'Northgate Pharma', 'Cobalt Mining', 'Oasis Hospitality', 'Delta Airways', 'Marlow Chemicals', 'Vega Telecom', 'Sierra Retail'];
const OPPN = ['Operating model redesign', 'AI customer service pilot', 'Leadership academy', 'Data platform strategy', 'Cost transformation', 'Procurement excellence', 'Digital channels programme', 'Workforce reskilling', 'Pricing review', 'Supply chain diagnostic'];
const CLOSE = ['Nov 2026', 'Dec 2026', 'Q1 2027', 'Q2 2027'];
const NEXT = ['Sponsor meeting', 'Proposal review', 'Scope workshop', 'Procurement terms', 'Expert input requested', 'Business case validation'];
export const LOSS_REASONS = ['Price — lower-cost competitor', 'Budget frozen by client', 'Lost to incumbent', 'No decision — priorities changed', 'Scope moved in-house'];
const CDATES = ['Oct 2026', 'Sep 2026', 'Aug 2026', 'Jul 2026', 'Jun 2026', 'May 2026', 'Apr 2026', 'Mar 2026'];

const JAV_OPPS: PipeOpp[] = [
  { acct: 'Meridian Financial Group', acctId: 'meridian', name: 'Customer Operations Modernisation', stage: 1, value: 1.6, close: 'Q1 2027', next: 'COO meeting 12 Nov' },
  { acct: 'Meridian Financial Group', acctId: 'meridian', name: 'Data Governance Advisory', stage: 3, value: 0.8, close: 'Dec 2026', next: 'Proposal review with CIO' },
  { acct: 'Horizon Telecom', acctId: 'horizon', name: 'Care Platform Consolidation', stage: 0, value: 1.9, close: 'Q2 2027', next: 'Tender pre-briefing' },
  { acct: 'Crescent Retail Group', acctId: 'crescent', name: 'AI Service for Digital Channels', stage: 1, value: 0.9, close: 'Q2 2027', next: 'Quantify backlog cost' },
  { acct: 'Banco Ribera', name: 'Branch Network Analytics', stage: 4, value: 0.4, close: 'Nov 2026', next: 'Procurement terms' },
  { acct: 'Solenne Insurance', name: 'Claims Operating Review', stage: 2, value: 0.3, close: 'Jan 2027', next: 'Expert input requested' },
];
const JAV_CLOSED: PipeClosed[] = [
  { acct: 'Banco Ribera', name: 'Digital onboarding diagnostic', won: true, value: 0.6, date: 'Sep 2026' },
  { acct: 'Lusitania Bank', name: 'Branch operating model', won: false, value: 0.7, date: 'Aug 2026', reason: 'Price — lower-cost competitor' },
  { acct: 'Meridian Financial Group', name: 'Complaints analytics pilot', won: true, value: 0.5, date: 'Jul 2026' },
  { acct: 'Solenne Insurance', name: 'Distribution strategy', won: false, value: 0.3, date: 'Jun 2026', reason: 'No decision — priorities changed' },
  { acct: 'Iberia Foods', name: 'Pricing review', won: true, value: 0.3, date: 'May 2026' },
  { acct: 'Castilla Energía', name: 'Procurement excellence', won: true, value: 0.3, date: 'Apr 2026' },
  { acct: 'Albion Rail', name: 'Customer service diagnostic', won: false, value: 0.3, date: 'Mar 2026', reason: 'Lost to incumbent' },
];

interface TeamDef { id: string; name: string; bu: string; lead: string; split: number[]; fixed?: [string, number, number, number, number][]; gen?: [number, number, number]; names?: string[] }
const TEAM_DEFS: TeamDef[] = [
  { id: 'eiu', name: 'Enterprise · Iberia & UK', bu: 'Europe', lead: 'Laura Bennett', split: [0.22, 0.28, 0.18, 0.2, 0.12], fixed: [['Javier Morales', 5.9, 2.1, 1.3, 3.0], ['Ben Carter', 4.6, 2.8, 0.9, 3.2], ['Lucía Martín', 2.9, 1.4, 1.1, 2.2], ['Tom Hughes', 3.4, 1.0, 1.6, 2.4], ['Ana Prieto', 2.2, 1.7, 0.6, 2.0], ['Oliver Shaw', 1.8, 0.9, 0.8, 1.6], ['Marta Gil', 2.6, 1.2, 0.7, 1.8], ['James Reed', 1.5, 0.6, 0.9, 1.5], ['Clara Vidal', 2.4, 1.1, 0.5, 1.6], ['Laura Bennett', 1.7, 0.9, 0.4, 1.2]] },
  { id: 'uki', name: 'UK Industrial', bu: 'Europe', lead: 'Mark Ellis', split: [0.18, 0.25, 0.2, 0.22, 0.15], gen: [18.4, 9.1, 6.2], names: ['Mark Ellis', 'Sam Patel', 'Holly Grant', 'Owen Price', 'Fiona Walsh', 'Rob Turner', 'Neha Shah', 'Chris Doyle', 'Emma Fox', 'Dan Hollis', 'Priya Kaur'] },
  { id: 'imm', name: 'Iberia Mid-Market', bu: 'Europe', lead: 'Pedro Alonso', split: [0.3, 0.27, 0.15, 0.17, 0.11], gen: [12.6, 7.4, 6.9], names: ['Pedro Alonso', 'Irene Sáez', 'Diego Romero', 'Sara Ortiz', 'Raúl Molina', 'Elena Castro', 'Pablo Núñez', 'Laia Ferrer', 'Hugo Vega', 'Nerea Gil', 'Álvaro Ruiz', 'Carla Méndez'] },
  { id: 'ge', name: 'Gulf Energy', bu: 'Middle East', lead: 'Karim Al-Fayed', split: [0.15, 0.22, 0.23, 0.24, 0.16], gen: [21.3, 8.8, 4.1], names: ['Karim Al-Fayed', 'Noura Saleh', 'Tariq Hassan', 'Lina Haddad', 'Yousef Amin', 'Reem Khalil', 'Fahad Nasser', 'Dina Azar', 'Majed Saeed'] },
  { id: 'urt', name: 'UAE Retail & Telecom', bu: 'Middle East', lead: 'Sara Mahmoud', split: [0.24, 0.27, 0.17, 0.19, 0.13], gen: [16.9, 7.9, 7.2], names: ['Sara Mahmoud', 'Omar Farouk', 'Aisha Rahman', 'Hamad Ali', 'Leila Nasser', 'Zaid Kareem', 'Maya Haddad', 'Rami Aziz', 'Huda Saleh', 'Faris Odeh', 'Nadia Barakat', 'Samir Qasim', 'Yara Jaber', 'Khaled Ibrahim'] },
  { id: 'ksa', name: 'KSA Public Sector', bu: 'Middle East', lead: 'Abdullah Rahman', split: [0.28, 0.3, 0.16, 0.16, 0.1], gen: [6.8, 2.2, 2.9], names: ['Abdullah Rahman', 'Hessa Al-Qahtani', 'Saad Al-Harbi', 'Mona Al-Dosari'] },
];

/** Re-runs the prototype generator and returns the six teams with every executive. */
export function generatePipeline(): PipeTeam[] {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const genOpps = (stages: number[]): PipeOpp[] => stages.map((v, i) => v >= 0.05 ? { acct: pick(ACCTS), name: pick(OPPN), stage: i, value: r2(v), close: pick(CLOSE), next: pick(NEXT) } : null).filter((x): x is PipeOpp => !!x);
  const genClosed = (won: number, lost: number, wonN: number, lostN: number) => {
    const out: PipeClosed[] = [];
    for (let i = 0; i < wonN; i++) out.push({ acct: pick(ACCTS), name: pick(OPPN), won: true, value: r2(won / wonN), date: pick(CDATES) });
    for (let i = 0; i < lostN; i++) out.push({ acct: pick(ACCTS), name: pick(OPPN), won: false, value: r2(lost / lostN), date: pick(CDATES), reason: pick(LOSS_REASONS) });
    return out;
  };
  const months = (won: number) => { const w = MONTHS.map(() => 0.4 + rnd()); const t = w.reduce((a, b) => a + b, 0); return w.map(x => r2(won * x / t)); };
  const mk = (team: TeamDef, name: string, pipe: number, won: number, lost: number, quota: number): PipeExec => {
    const isJ = name === 'Javier Morales';
    const stages = isJ ? STAGES.map((_, i) => JAV_OPPS.filter(o => o.stage === i).reduce((t, o) => t + o.value, 0)) : (() => { const n = team.split.map(x => x * (0.7 + rnd() * 0.6)); const t = n.reduce((a, b) => a + b, 0); return n.map(x => r2(pipe * x / t)); })();
    const wonN = isJ ? 4 : Math.max(1, Math.round(won / 0.3)), lostN = isJ ? 3 : Math.max(1, Math.round(lost / 0.27));
    // NB: argument evaluation order matches the prototype (months before opps before closed).
    const m = months(won);
    const opps = isJ ? JAV_OPPS : genOpps(stages);
    const closed = isJ ? JAV_CLOSED : genClosed(won, lost, Math.min(wonN, 3), Math.min(lostN, 2));
    return { name, team: team.name, teamId: team.id, bu: team.bu, pipe, won, lost, wonN: isJ ? 7 : wonN, lostN: isJ ? 5 : lostN, quota, stages, months: m, opps, closed };
  };
  return TEAM_DEFS.map(t => {
    let execs: PipeExec[];
    if (t.fixed) execs = t.fixed.map(([n, p, w, l, q]) => mk(t, n, p, w, l, q));
    else {
      const [P, W, L] = t.gen!, wt = t.names!.map(() => 0.5 + rnd()), s = wt.reduce((a, b) => a + b, 0);
      execs = t.names!.map((nm, i) => { const f = wt[i] / s, won = r2(W * f * (0.8 + rnd() * 0.4)); return mk(t, nm, r2(P * f), won, r2(L * f * (0.7 + rnd() * 0.6)), r2(won / (0.6 + rnd() * 0.5))); });
    }
    return { id: t.id, name: t.name, bu: t.bu, lead: t.lead, execs };
  });
}
