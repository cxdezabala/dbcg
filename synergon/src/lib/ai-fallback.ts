// Port of reference/synergon-ai.js answer(): deterministic responses grounded in the demo data.
// Unlike the prototype, it only receives data the server has already filtered for the viewer's role.
import type { Role } from './demo/types';

export interface AiAnswer { text: string; lines: string[]; sources: string[] }
export interface AiAccount { id: string; name: string; obs: string; hyp: string; insights: string[]; actions: string[]; people: { name: string; title: string; strength: string; lvl: number }[]; touches: { text: string }[] }
export interface AiSignal { id: string; title: string; industry: string; kind: string; verified: boolean; implication: string; companies: string[] }
export interface AiDossier { name: string; lens: string; revLabel: string; est: boolean; emp: string; ldTotal: string; execBudget: string; leaders: string; addrLabel: string; addr: string; bu: string; people: string[]; hooks: string[]; qs: string[]; rivals: string[] }
export interface AiFallbackCtx {
  view: string; role: Role; minGroup: number;
  account?: AiAccount | null; accounts?: AiAccount[]; // authorised accounts only
  signal?: AiSignal | null; signals?: AiSignal[]; linked?: Record<string, string[]>;
  dossier?: AiDossier | null; audit?: { t: string; actor: string; action: string; obj: string }[];
  sofia?: boolean; bcStep?: string; t1count?: number;
}

export const ADMIN_REFUSAL: AiAnswer = { text: 'As Platform Administrator you manage configuration, not business content. I can help with users, permissions, integrations and audit.', lines: [], sources: ['Access policy'] };

export function answer(q: string, c: AiFallbackCtx): AiAnswer {
  const v = c.view, l = q.toLowerCase();
  const R = (text: string, lines?: string[], sources?: string[]): AiAnswer => ({ text, lines: lines || [], sources: sources || [] });
  if (c.role === 'admin' && v !== 'settings') return ADMIN_REFUSAL;
  if (v === 'settings') {
    if (l.includes('access')) return R('Leadership insights are available to the Commercial Director (organisation scope) and Team Leaders (team scope only).', ['Insights are generated from aggregated data with a minimum group size of ' + c.minGroup + '.', 'Private 1:1 collaboration content is never exposed to leadership.', 'Administrators configure policies but cannot read business content.'], ['Data access policy v3', 'Role matrix']);
    if (l.includes('audit')) return c.audit ? R('Recent audit activity:', c.audit.slice(0, 4).map(x => x.t + ' — ' + x.actor + ': ' + x.action + ' (' + x.obj + ')'), ['Audit log']) : R('The audit log is available to platform administrators only.', [], ['Access policy']);
    return R('Integration status:', ['Salesforce CRM — connected, last sync today 08:12', 'Microsoft 365 — connected (calendar & mail metadata only)', 'Market intelligence feed — demonstration data', 'Workday Learning — planned capability'], ['Integration registry']);
  }
  const a = c.account;
  const sig = c.signal;
  if (v === 'ci') {
    if (!a) return R('No authorised account is selected.', [], ['Access policy']);
    if (l.includes('risk')) return R('Risks on ' + a.name + ':', [a.people.filter(p => p.lvl === 0).map(p => p.name + ' (' + p.title + ') — no relationship yet').join('; ') || 'No uncovered stakeholders', 'Competitive pressure: technology-led bids expected (Radar360)', a.insights[1] || a.insights[0]], ['CRM · ' + a.name, 'Radar360']);
    if (l.includes('hypothes')) return R('Draft opportunity hypothesis (requires your validation):', [a.hyp], ['CRM opportunities', 'AI interpretation']);
    return R('Briefing for your next meeting with ' + a.name + ':', ['Objective: ' + a.actions[0], 'Sponsor: ' + a.people[0].name + ' — ' + a.people[0].title + ' (' + a.people[0].strength + ')', 'Last interaction: ' + a.touches[0].text, 'Lead with: ' + a.insights[0], 'Ask: what would a 12-week proof of value need to show?'], ['CRM · interactions', 'CRM · stakeholders', 'Radar360 · ' + (sig ? sig.id.toUpperCase() : 'S1')]);
  }
  if (v === 'radar' && c.dossier) {
    const d = c.dossier;
    if (/spend|invest|educat|budget/.test(l)) return R('Estimated investment capacity — ' + d.name + ':', ['Learning & development ≈ ' + d.ldTotal + ' a year', 'Executive education ≈ ' + d.execBudget + ' across ≈ ' + d.leaders + ' leaders', d.addrLabel + ' ≈ ' + d.addr, d.est ? 'Financials estimated from sector benchmarks — validate in the meeting' : 'Training spend from the annual report; executive share estimated'], ['Radar360 estimate model', d.est ? 'Sector benchmarks' : 'Annual report']);
    if (/compet|compar/.test(l)) return R('Competitive watch-outs (' + d.lens + ' lens):', d.rivals, ['Radar360 competitive analysis']);
    if (/who|meet first/.test(l) && !/prepare/.test(l)) return R('Who to meet first at ' + d.name + ':', d.people, ['Public professional profiles', 'CRM (permission-filtered)']);
    return R('First-meeting preparation — ' + d.name + ' (' + d.lens + ' lens):', ['Context: ' + d.emp + ' employees · revenue ' + d.revLabel + (d.est ? ' (estimated)' : ' (reported)'), 'Lead with: ' + d.bu, 'Meet: ' + d.people.join('; '), 'Angle: ' + d.hooks.slice(0, 2).join('; '), 'Open with: ' + d.qs[0]], ['Radar360 dossier', 'AI interpretation']);
  }
  if (v === 'radar' && sig) {
    const all = c.signals || [];
    if (l.includes('account') || l.includes('affect')) {
      const ids = [...new Set([...(sig.companies || []), ...((c.linked || {})[sig.id] || [])])];
      const accs = ids.map(i => (c.accounts || []).find(y => y.id === i)).filter((x): x is AiAccount => !!x);
      return R('“' + sig.title + '” relates to:', accs.length ? accs.map(x => x.name + ' — ' + x.obs) : ['No accounts connected yet. Use “Connect to account”.'], ['Radar360', 'CRM']);
    }
    if (l.includes('compet')) return R('Recent competitive movements (verified):', all.filter(s => s.kind === 'Competitive').map(s => s.title + ' — ' + s.implication), ['Demo competitive feed']);
    return R('Emerging challenges in ' + sig.industry + ':', all.filter(s => s.industry === sig.industry).map(s => (s.verified ? 'Verified: ' : 'Hypothesis: ') + s.title), ['Radar360 · demo sources']);
  }
  if (v === 'studio') {
    if (l.includes('stress') || l.includes('assumption')) return R('Sensitivity of your business case:', ['Benefit is most sensitive to the savings rate: each ±1 pt changes annual benefit by ~' + (c.bcStep || '€0.46M') + '.', 'Payback exceeds 24 months if adoption stays below 50% in year 1.', 'Validate the cost base with the client’s finance team before proposal.'], ['Business case model', 'Value-model template (validated)']);
    if (l.includes('stronger') || l.includes('proposal')) return R('To strengthen the proposal:', [c.sofia ? 'Cite Sofia Chen’s adoption benchmark (contributed) in the business case.' : 'Request input from Sofia Chen — 94% match on AI service transformation.', 'Add a staged-value roadmap: agent-assist value in 16 weeks.', 'Address Procurement early: outcome-linked fee option.'], ['Expert network', 'Studio']);
    return R('A structure for this business problem:', ['Frame: cost-to-serve as the sponsor metric', 'Explore: 3 approaches — agent-assist first, automation-led, phased redesign', 'Architect: journeys, agent-assist, governance, capability academy, value tracking', 'Evidence: client baseline + validated benchmarks'], ['Solution frameworks', 'AI interpretation']);
  }
  if (v === 'growth') {
    if (l.includes('negotiat')) return R('Preparing for the Meridian procurement review:', ['Re-anchor on value using Meridian’s own baseline', 'Prepare 2 give–get trades (e.g. outcome-linked fees for data access)', 'Practise with the AI role-play — 6 minutes', 'Ask Hannah Ortiz to review your value model'], ['Calendar · 12 Nov', 'Capability profile']);
    if (l.includes('lesson')) return R('Recommended this week: “Value-based selling for AI transformation” (5 min) — directly relevant to your Meridian solution.', [], ['Learning catalogue']);
    return R('Your highest-leverage development areas:', ['Negotiation — 2.7 vs 3.5 target; procurement stage in 11 days', 'AI fluency — 2.6 vs 3.5; supports the AI-adoption priority', 'Solution design — 2.9 vs 3.8; apply in your Meridian solution'], ['Capability profile (self + manager + work evidence)']);
  }
  if (v === 'collab') {
    if (l.includes('knowledge')) return R('Validated knowledge for AI contact centres:', ['Playbook: AI contact-centre business cases in retail banking — Sofia Chen', 'Value-model template: cost-to-serve — Hannah Ortiz', 'In review: Telecom churn lessons — Oliver Grant'], ['Knowledge base · validated']);
    if (l.includes('communit')) return R('Suggested communities: AI Service Transformation (48 members) and Value Selling & Pricing (62).', [], ['Communities']);
    return R('Experts with similar delivery experience:', ['Sofia Chen — 14 AI service transformations (FS, Telecom)', 'Oliver Grant — 3 telecom churn pilots', 'Hannah Ortiz — value models for 40+ proposals'], ['Expert profiles (validated)']);
  }
  if (v === 'command') {
    if (c.role === 'lead') return R('Within your authorised team scope (Enterprise · Iberia & UK):', ['Negotiation is the largest gap (2.8 vs 3.5) with 3 procurement stages in Q4', 'Two executives are pursuing related AI service opportunities — consider pairing them', 'Cross-team themes are visible to the Commercial Director only'], ['Team aggregates (n ≥ ' + c.minGroup + ')']);
    if (l.includes('capabilit')) return R('Capabilities to prioritise next quarter:', ['AI fluency — lowest in 5 of 6 teams (avg 2.5)', 'Solution design — needed for the solution-led selling priority (avg 2.8)', 'Negotiation — Q1 renewal wave'], ['Capability heatmap (aggregated)']);
    if (l.includes('misalign')) return R('Alignment gaps:', ['Solution-led selling: 38% vs 50% target — 2 teams rarely use Solution Design Studio', 'AI adoption: activity concentrated in 2 teams', 'Strategic accounts: KSA coverage thin'], ['Strategic priorities', 'Studio activity']);
    if (l.includes('reuse')) return R('Knowledge not being reused:', ['Only 44% of solution designs reuse validated assets', 'Cost-to-serve template unused by Middle East teams', '3 repeated requests for undocumented FS benchmarks'], ['Knowledge analytics']);
    if (l.includes('collaborat')) return R('To improve cross-functional collaboration:', ['Expand AI Service Transformation expert capacity (3 experts for 9 requests)', 'Route Gulf procurement questions to a designated community', 'Recognise validated contributions in development plans'], ['Collaboration intelligence']);
    return R('Patterns requiring leadership attention:', ['Converging client demand for AI-enabled customer operations — ' + (c.t1count ?? 6) + ' executives across 3 business units', 'Value-modelling expertise bottleneck', 'Undocumented Gulf procurement knowledge'], ['Collective intelligence · aggregated', 'Confidence: high / medium / medium']);
  }
  if (l.includes('help') || l.includes('who')) return R('For Meridian, Sofia Chen (AI service transformation, 94% match) and Hannah Ortiz (value modelling) are the strongest internal experts.', [], ['Expert network']);
  if (l.includes('changed')) return R('This week on your accounts:', ['Meridian — complaint data shared (+14% YoY); COO meeting on 12 Nov', 'Horizon Telecom — tender pre-announcement signal', 'Crescent — competitor launched retail AI practice'], ['CRM', 'Radar360']);
  return R('Today, focus on:', ['Prepare for the Meridian COO meeting (12 Nov)', 'Advance the Meridian solution design', 'Complete a 5-minute lesson before the procurement review'], ['CRM', 'Calendar', 'Capability profile']);
}

/** Serialises an answer in the streamed wire format parsed by the AI panel. */
export const formatAnswer = (a: AiAnswer) => [a.text, ...a.lines.map(x => '- ' + x), a.sources.length ? 'Sources: ' + a.sources.join('; ') : ''].filter(Boolean).join('\n');
