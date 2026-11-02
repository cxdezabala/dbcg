import 'server-only';
import { db } from '../db';
import type { Viewer } from '../session';
import { canView, homeFor } from '@/lib/rbac';
import { listAccounts, getAccount, canReadAccount } from '../data/accounts';
import { dossierAiContext } from '../data/radar';
import { getSolution, expertStatus, t1count } from '../data/solutions';
import { commandVM } from '../vm/command';
import { businessCase } from '@/lib/business-case';
import { fmtK } from '@/lib/format';
import { EXPERTS, VIEW_META } from '@/lib/demo';
import type { View } from '@/lib/demo/types';
import type { AiFallbackCtx, AiAccount } from '@/lib/ai-fallback';

export interface ClientCtx { acct?: string; signal?: string; sol?: string; co?: string; lens?: string }

/**
 * Builds the SYNERGON AI context on the server, exclusively from data the viewer is authorised
 * to see (same data-access functions as the UI and the API). Nothing else ever reaches the model.
 */
export async function buildAiContext(v: Viewer, view0: string, c: ClientCtx) {
  const view: View = canView(v.role, view0 as View) ? (view0 as View) : homeFor(v.role);
  const org = await db.organization.findUniqueOrThrow({ where: { id: v.orgId } });
  const ctx: AiFallbackCtx = { view, role: v.role, minGroup: org.minGroup };
  const grounding: Record<string, unknown> = { organisation: 'Asterion Business Solutions (fictional demo data)', minGroup: org.minGroup };
  let entity = '';

  if (v.role === 'admin') {
    const [ints, audit] = await Promise.all([db.integrationConnection.findMany({ orderBy: { order: 'asc' } }), db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6 })]);
    ctx.audit = audit.map(a => ({ t: a.timeLabel || a.createdAt.toISOString().slice(0, 16).replace('T', ' '), actor: a.actor, action: a.action, obj: a.object }));
    grounding.integrations = ints.map(i => ({ name: i.name, status: i.status, meta: i.meta }));
    grounding.recentAudit = ctx.audit;
    grounding.policies = ['Leadership never sees private 1:1 content', 'Administrators cannot read business content', 'Human validation before org-wide knowledge reuse', 'AI content always labelled'];
    return { view, ctx, grounding, entity: 'Settings & governance' };
  }

  const authorised = (await db.account.findMany({ include: { contacts: { orderBy: { order: 'asc' } }, interactions: { orderBy: { order: 'asc' } } } })).filter(a => canReadAccount(v, a));
  const toAi = (a: (typeof authorised)[number]): AiAccount => ({ id: a.id, name: a.name, obs: a.obs, hyp: a.hyp, insights: a.insights, actions: a.actions, people: a.contacts.map(p => ({ name: p.name, title: p.title, strength: p.strength, lvl: p.lvl })), touches: a.interactions.map(t => ({ text: t.text })) });
  ctx.accounts = authorised.map(toAi);
  const signals = await db.signal.findMany({ include: { links: true } });
  ctx.signals = signals.map(s => ({ id: s.id, title: s.title, industry: s.industry, kind: s.kind, verified: s.verified, implication: s.implication, companies: s.companies.filter(x => authorised.some(a => a.id === x)) }));
  ctx.linked = Object.fromEntries(signals.map(s => [s.id, s.links.map(l => l.accountId).filter(x => authorised.some(a => a.id === x))]));
  ctx.signal = ctx.signals.find(s => s.id === c.signal) || ctx.signals.find(s => s.id === 's1') || null;
  ctx.t1count = await t1count();

  if (view === 'ci' || view === 'home') {
    const acct = authorised.find(a => a.id === c.acct) || authorised.find(a => a.id === 'meridian') || authorised[0];
    if (acct) { const full = await getAccount(v, acct.id); ctx.account = toAi(authorised.find(a => a.id === acct.id)!); grounding.account = full; entity = full.name; }
    grounding.authorisedAccounts = (await listAccounts(v)).filter(a => !a.restricted).map(a => a.name);
  }
  if (view === 'radar') {
    if (c.co) { ctx.dossier = await dossierAiContext(v, c.co); grounding.dossier = ctx.dossier; entity = ctx.dossier.name; }
    else { grounding.signal = signals.find(s => s.id === ctx.signal?.id); grounding.signals = ctx.signals; entity = ctx.signal?.title || ''; }
  }
  if (view === 'studio' && c.sol) {
    try {
      const s = await getSolution(v, c.sol);
      const exp = expertStatus(s);
      const b = businessCase({ pack: s.pack, ws: s.ws as Record<string, boolean>, costBase: s.costBase, scenario: s.scenario, expert: exp });
      ctx.sofia = exp.sofia === 'contributed'; ctx.bcStep = fmtK(b.step);
      grounding.solution = { title: s.title, account: s.account.name, stage: s.stage, challenge: s.challenge, approach: s.alt, scenario: s.scenario, costBaseM: s.costBase, investment: fmtK(b.invest), annualBenefit: fmtK(b.benefit), roiPct: Math.round(b.roi), paybackMonths: b.pay, savingsPct: b.pct, expertStatus: exp };
      entity = s.title;
    } catch { /* not authorised → no solution context */ }
  }
  if (view === 'growth') grounding.capabilities = (await db.capability.findMany({ where: { userId: v.id }, orderBy: { order: 'asc' } })).map(x => ({ name: x.name, current: x.cur, target: x.tgt }));
  if (view === 'collab') {
    grounding.experts = EXPERTS.map(e => ({ name: e.name, title: e.title, domains: e.domains, delivered: e.delivered }));
    grounding.knowledge = (await db.knowledgeItem.findMany()).map(k => ({ title: k.title, author: k.authorName, status: k.status })); // no private messages
  }
  if (view === 'command') {
    const cm = await commandVM(v);
    grounding.command = { scope: cm.scopeLine, pulse: cm.pulse, themes: cm.hero ? [{ title: cm.hero.title, confidence: cm.hero.confidence, evidence: cm.hero.evidence }, ...cm.otherThemes.map(t => ({ title: t.title, confidence: t.confidence }))] : 'Cross-team themes are visible to the Commercial Director only', heatmap: cm.heat.rows, priorities: cm.priorities };
  }
  return { view, ctx, grounding, entity: entity || VIEW_META[view][1] };
}
