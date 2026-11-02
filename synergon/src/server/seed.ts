// Demo seed — ported 1:1 from /reference (same names, figures and IDs). Used by `pnpm db:seed`
// and by "Reset demo data". All data is fictional (Asterion Business Solutions).
import type { PrismaClient, Prisma } from '@prisma/client';
type Tx = Prisma.TransactionClient;
import bcrypt from 'bcryptjs';
import { ROLE_INFO, ACCOUNTS, SIGNALS, EXPERTS, KNOWLEDGE, CAPS, TEAMS as CAP_TEAMS, PRIORITIES, SEED_SOLUTIONS, COMPLETED, COS } from '@/lib/demo';
import { generatePipeline } from '@/lib/demo/pipeline';
import { financialProvenance } from '@/lib/demo/radar';
import { businessCase } from '@/lib/business-case';

export const ORG_ID = 'asterion';
export const DEMO_USERS = {
  exec: { id: 'u-javier', email: 'javier@asterion.example' },
  lead: { id: 'u-laura', email: 'laura@asterion.example' },
  director: { id: 'u-daniel', email: 'daniel@asterion.example' },
  admin: { id: 'u-omar', email: 'omar@asterion.example' },
} as const;

const slug = (s: string) => 'u-' + s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const KSTATUS: Record<string, 'validated' | 'in_review' | 'needs_evidence' | 'draft'> = { Validated: 'validated', 'In review': 'in_review', 'Needs evidence': 'needs_evidence' };

export async function resetDatabase(db: Tx) {
  // order matters for FKs
  await db.aiMessage.deleteMany(); await db.aiConversation.deleteMany();
  await db.businessCase.deleteMany(); await db.expertRequest.deleteMany(); await db.solution.deleteMany();
  await db.signalLink.deleteMany(); await db.signal.deleteMany(); await db.company.deleteMany();
  await db.opportunity.deleteMany(); await db.contact.deleteMany(); await db.interaction.deleteMany(); await db.account.deleteMany();
  await db.capabilityEvidence.deleteMany(); await db.capability.deleteMany(); await db.learningAssignment.deleteMany(); await db.performance.deleteMany();
  await db.knowledgeItem.deleteMany(); await db.expert.deleteMany(); await db.initiative.deleteMany(); await db.strategicPriority.deleteMany();
  await db.notification.deleteMany(); await db.auditLog.deleteMany(); await db.integrationConnection.deleteMany();
  await db.user.deleteMany(); await db.team.deleteMany(); await db.organization.deleteMany();
}

/** Atomic: other requests never observe a half-seeded database. */
export async function seedDemo(client: PrismaClient) {
  await client.$transaction(tx => seedInto(tx), { timeout: 120_000, maxWait: 20_000 });
}

async function seedInto(db: Tx) {
  await resetDatabase(db);
  const pwd = await bcrypt.hash(process.env.DEMO_PASSWORD || 'synergon-demo', 10);
  const pipeline = generatePipeline();

  await db.organization.create({ data: { id: ORG_ID, name: 'Asterion Business Solutions', minGroup: 5 } });

  for (const t of pipeline) {
    const cap = CAP_TEAMS.find(c => c.name === t.name)!;
    await db.team.create({ data: { id: t.id, orgId: ORG_ID, name: t.name, bu: t.bu, region: cap.region, leadName: t.lead, capN: cap.n, capValues: cap.v, mine: !!cap.mine } });
  }

  // --- users: the 4 demo log-ins + every executive in the CRM pipeline + one SME
  const loginUsers = [
    { role: 'exec' as const, teamId: 'eiu', last: 'Today 09:14' },
    { role: 'lead' as const, teamId: 'eiu', last: 'Today 08:51' },
    { role: 'director' as const, teamId: null, last: 'Today 08:30' },
    { role: 'admin' as const, teamId: null, last: 'Now' },
  ];
  for (const u of loginUsers) {
    const ri = ROLE_INFO[u.role], du = DEMO_USERS[u.role];
    await db.user.create({ data: { id: du.id, orgId: ORG_ID, teamId: u.teamId, name: ri.name, email: du.email, passwordHash: pwd, role: u.role, title: ri.title, initials: ri.initials, scope: ri.scope, canLogin: true, lastActive: u.last } });
  }
  await db.user.create({ data: { id: 'u-sofia', orgId: ORG_ID, name: 'Sofia Chen', role: 'expert', title: 'Subject-Matter Expert', initials: 'SC', scope: 'Assigned solutions', lastActive: 'Yesterday', state: { team: 'AI Service Transformation' } } });

  const idByName = new Map<string, string>([['Javier Morales', DEMO_USERS.exec.id], ['Laura Bennett', DEMO_USERS.lead.id]]);
  let order = 0;
  for (const t of pipeline) for (const e of t.execs) {
    order++;
    if (idByName.has(e.name)) await db.user.update({ where: { id: idByName.get(e.name)! }, data: { order } });
    if (!idByName.has(e.name)) {
      const id = slug(e.name);
      idByName.set(e.name, id);
      await db.user.create({ data: { id, orgId: ORG_ID, teamId: t.id, name: e.name, order, role: e.name === t.lead && t.id !== 'eiu' ? 'lead' : 'exec', title: e.name === t.lead && t.id !== 'eiu' ? 'Commercial Team Leader' : 'Commercial Executive', initials: e.name.split(' ').map(w => w[0]).join('').slice(0, 2), scope: t.name } });
    }
    const userId = idByName.get(e.name)!;
    await db.performance.create({ data: { userId, year: 2026, pipe: e.pipe, won: e.won, lost: e.lost, wonN: e.wonN, lostN: e.lostN, quota: e.quota, stages: e.stages, months: e.months } });
  }

  // --- strategic accounts (CRM, read-only mirror)
  for (const a of ACCOUNTS) {
    await db.account.create({
      data: {
        id: a.id, orgId: ORG_ID, name: a.name, industry: a.industry, geo: a.geo, hq: a.hq, size: a.size, rel: a.rel, value: a.value, last: a.last, tier: a.tier,
        ownerName: a.owner, ownerRoles: a.owners, obs: a.obs, costBase: a.costBase, insights: a.insights, actions: a.actions, hyp: a.hyp, challenge: a.challenge,
        crmOpps: a.opps as unknown as Prisma.InputJsonValue,
        contacts: { create: a.people.map((p, i) => ({ name: p.name, title: p.title, stance: p.stance, strength: p.strength, lvl: p.lvl, order: i })) },
        interactions: { create: a.touches.map((x, i) => ({ date: x.date, type: x.type, text: x.text, order: i })) },
      },
    });
  }

  // --- pipeline opportunities (open + closed) per executive
  const opps: Prisma.OpportunityCreateManyInput[] = [];
  for (const t of pipeline) for (const e of t.execs) {
    const ownerId = idByName.get(e.name)!;
    e.opps.forEach((o, i) => opps.push({ ownerId, teamId: t.id, accountId: o.acctId ?? null, accountName: o.acct, name: o.name, stage: o.stage, value: o.value, close: o.close, next: o.next, status: 'open', order: i }));
    e.closed.forEach((c, i) => opps.push({ ownerId, teamId: t.id, accountName: c.acct, accountId: null, name: c.name, stage: 4, value: c.value, status: c.won ? 'won' : 'lost', lossReason: c.reason ?? null, closedDate: c.date, order: 100 + i }));
  }
  await db.opportunity.createMany({ data: opps });

  // --- Radar360 companies with field-level provenance
  for (const c of COS) {
    await db.company.create({ data: { id: c.id, crmId: c.crm, name: c.name, sector: c.sector, dossier: c as unknown as Prisma.InputJsonValue, financials: financialProvenance(c) as unknown as Prisma.InputJsonValue } });
  }
  await db.signal.createMany({ data: SIGNALS.map(s => ({ ...s, provenance: s.verified ? 'REPORTED' : 'AI_HYPOTHESIS' })) });

  await db.expert.createMany({ data: EXPERTS.map(e => ({ ...e })) });
  await db.knowledgeItem.createMany({ data: KNOWLEDGE.map((k, i) => ({ id: k.id, title: k.title, authorName: k.author, domain: k.domain, status: KSTATUS[k.state], saves: k.saves, date: k.date, body: k.body, comments: k.comments.map(text => ({ text })), order: 100 + i })) });

  // --- capabilities (self + manager + work evidence), separate learning & evidence records
  for (const uid of [DEMO_USERS.exec.id, DEMO_USERS.lead.id, DEMO_USERS.director.id]) {
    await db.capability.createMany({ data: CAPS.map((c, i) => ({ userId: uid, capId: c.id, name: c.name, cur: c.cur, tgt: c.tgt, focus: !!c.focus, order: i })) });
    await db.capabilityEvidence.create({ data: { userId: uid, capId: 'acumen', description: 'Business case passed review', validatedBy: 'Laura Bennett', date: 'Oct 2026' } });
    await db.learningAssignment.createMany({ data: [
      { userId: uid, title: 'Discovery questions that open budgets', kind: 'lesson', source: 'catalogue', minutes: 5, status: 'completed', completedAt: new Date('2026-10-06') },
      { userId: uid, title: 'Stakeholder mapping in complex deals', kind: 'lesson', source: 'catalogue', minutes: 5, status: 'completed', completedAt: new Date('2026-10-14') },
      { userId: uid, title: 'Reading a bank’s annual report in 10 minutes', kind: 'lesson', source: 'catalogue', minutes: 8, status: 'completed', completedAt: new Date('2026-10-22') },
      { userId: uid, title: 'Value-based selling for AI transformation', kind: 'lesson', source: 'contextual', minutes: 5, status: 'assigned' },
    ] });
  }

  // --- solutions (Studio) with persisted business cases
  const javier = DEMO_USERS.exec.id;
  for (const s of SEED_SOLUTIONS) {
    await db.solution.create({ data: { id: s.id, accountId: s.acct, ownerId: javier, title: s.title, pack: s.pack, stage: s.stage, challenge: s.challenge, imported: s.imported, framed: s.framed, alt: s.alt, ws: s.ws, scenario: s.scenario, costBase: s.costBase, submitted: s.submitted, updatedLabel: s.updated } });
    const b = businessCase(s);
    await db.businessCase.create({ data: { solutionId: s.id, scenario: s.scenario, invest: b.invest, benefit: b.benefit, savingsPct: b.pct, roi: b.roi, payback: b.pay } });
    for (const [expertId, status] of Object.entries(s.expert)) await db.expertRequest.create({ data: { solutionId: s.id, expertId, requesterId: javier, status } });
  }
  for (const [i, c] of COMPLETED.entries()) {
    const acc = ACCOUNTS.find(a => a.name === c.acct)!;
    await db.solution.create({ data: { id: 'sol-done-' + i, accountId: acc.id, title: c.title, pack: 'generic', stage: 7, challenge: acc.challenge, costBase: acc.costBase, completed: true, completedWhen: c.when, completedTeam: c.team, updatedLabel: c.when } });
  }
  await db.expertRequest.createMany({ data: [
    { label: 'Atlas Energy reskilling — learning design support (Riyadh)', assignee: 'Unassigned', status: 'unmet' },
    { label: 'Horizon Telecom procurement history', assignee: 'Aisha Rahman', expertId: 'aisha', status: 'answered' },
  ] });

  await db.strategicPriority.createMany({ data: PRIORITIES.map((p, i) => ({ ...p, order: i })) });

  const t0 = Date.now(), h = 3600e3;
  await db.notification.createMany({ data: [
    { text: 'Meridian: Inés Navarro shared new complaint-volume data (+14% YoY)', audience: ['exec', 'lead'], view: 'ci', createdAt: new Date(t0 - 2 * h) },
    { text: 'Radar360: 2 new verified signals in Financial Services', audience: ['exec', 'lead', 'director'], view: 'radar', createdAt: new Date(t0 - 5 * h) },
    { text: '2 knowledge contributions are awaiting your validation', audience: ['lead'], view: 'collab', createdAt: new Date(t0 - 24 * h) },
    { text: 'Collective intelligence: a new emerging pattern was detected', audience: ['director'], view: 'command', createdAt: new Date(t0 - 25 * h) },
    { text: 'Workday Learning connector is a planned capability (P2)', audience: ['admin'], view: 'settings', createdAt: new Date(t0 - 48 * h) },
  ] });
  await db.auditLog.createMany({ data: [
    { timeLabel: 'Yesterday 11:02', actor: 'Laura Bennett', action: 'Contribution validated', object: 'Value-model template: cost-to-serve', category: 'Knowledge', createdAt: new Date(t0 - 30 * h) },
    { timeLabel: 'Yesterday 17:20', actor: 'System', action: 'AI insight generated', object: 'Collective theme T1 (aggregated)', category: 'AI', createdAt: new Date(t0 - 20 * h) },
    { timeLabel: 'Today 07:55', actor: 'Omar Haddad', action: 'Policy reviewed', object: 'Minimum aggregation group = 5', category: 'Governance', createdAt: new Date(t0 - 2 * h) },
    { timeLabel: 'Today 08:12', actor: 'System', action: 'CRM sync completed', object: 'Salesforce · 1,284 records', category: 'Integration', createdAt: new Date(t0 - 1 * h) },
  ] });

  const today = (hh: number, mm: number) => { const d = new Date(); d.setHours(hh, mm, 0, 0); return d; };
  await db.integrationConnection.createMany({ data: [
    { id: 'salesforce', name: 'Salesforce CRM', status: 'Connected', description: 'Accounts, opportunities, contacts, activities. Read-only — SYNERGON never writes back.', meta: 'Last sync today 08:12 · 1,284 records', canSync: true, lastSyncAt: today(8, 12), records: 1284, order: 0 },
    { id: 'm365', name: 'Microsoft 365', status: 'Connected', description: 'Calendar and email metadata only. Message bodies are not ingested.', meta: 'Last sync today 08:40', canSync: true, lastSyncAt: today(8, 40), order: 1 },
    { id: 'teams', name: 'Microsoft Teams', status: 'Connected', description: 'Collaboration requests and expert notifications.', meta: 'Webhook healthy', canSync: true, lastSyncAt: today(8, 40), order: 2 },
    { id: 'market', name: 'Market intelligence feed', status: 'Demo data', description: 'External signals for Radar360 — fictional demonstration sources.', meta: 'Production feed: planned (P2)', canSync: false, order: 3 },
    { id: 'workday', name: 'Workday Learning', status: 'Planned', description: 'Enterprise learning catalogue and completions.', meta: 'Planned capability (P2)', canSync: false, order: 4 },
  ] });
}
