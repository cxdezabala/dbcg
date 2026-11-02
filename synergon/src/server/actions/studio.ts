'use server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '../db';
import { requireViewer, assertBusiness, type Viewer } from '../session';
import { getAccount } from '../data/accounts';
import { getSolution, solutionWhere, expertStatus } from '../data/solutions';
import { audit, notify } from '../audit';
import { businessCase, type Scenario } from '@/lib/business-case';
import { EXPERTS } from '@/lib/demo';
import { ForbiddenError } from '../errors';

type Res = { url?: string; msg?: string; ok?: boolean };

async function saveBusinessCase(id: string) {
  const s = await db.solution.findUniqueOrThrow({ where: { id }, include: { requests: true } });
  const b = businessCase({ pack: s.pack, ws: s.ws as Record<string, boolean>, costBase: s.costBase, scenario: s.scenario, expert: expertStatus(s) });
  const data = { scenario: s.scenario, invest: b.invest, benefit: b.benefit, savingsPct: b.pct, roi: b.roi, payback: b.pay };
  await db.businessCase.upsert({ where: { solutionId: id }, create: { solutionId: id, ...data }, update: data });
}

async function editable(v: Viewer, id: string) {
  const s = await getSolution(v, id);
  if (s.completed) throw new ForbiddenError('Archived solutions are read-only');
  return s;
}

/** "Send to Solution Design Studio": opens the existing design for the account or creates one with CRM intelligence. */
export async function sendToStudio(acctId: string, fromSignal: boolean): Promise<Res> {
  const v = await requireViewer('studio'); assertBusiness(v);
  const a = await getAccount(v, acctId);
  const where = await solutionWhere(v);
  const ex = await db.solution.findFirst({ where: { AND: [where, { completed: false }, acctId === 'meridian' ? { story: true } : { accountId: acctId }] } });
  if (ex) {
    if (fromSignal) await db.solution.update({ where: { id: ex.id }, data: { signalImported: true, updatedLabel: 'Just now' } });
    revalidatePath('/studio');
    return { url: '/studio?sol=' + ex.id, msg: 'Opened existing solution “' + ex.title + '”' + (fromSignal ? ' — signal imported' : '') };
  }
  const id = 'sol-' + acctId + '-' + (Date.now() % 100000);
  const title = acctId === 'meridian' ? 'AI-enabled Customer Operations' : a.opps[0].name;
  await db.solution.create({ data: { id, story: acctId === 'meridian', title, accountId: acctId, ownerId: v.id, pack: ['meridian', 'horizon', 'crescent'].includes(acctId) ? 'aiops' : 'generic', stage: 1, challenge: a.challenge, imported: true, signalImported: fromSignal, costBase: a.costBase, updatedLabel: 'Just now' } });
  await saveBusinessCase(id);
  await audit(v.name, 'Solution design created', title + ' · ' + a.name, 'Studio');
  revalidatePath('/', 'layout');
  return { url: '/studio?sol=' + id, msg: 'Solution design created with account intelligence from ' + a.name };
}

export async function createSolution(acctId: string, title0: string): Promise<Res> {
  const v = await requireViewer('studio'); assertBusiness(v);
  const a = await getAccount(v, acctId);
  const title = title0.trim() || 'Untitled solution';
  const id = 'sol-new-' + (Date.now() % 100000);
  await db.solution.create({ data: { id, title, accountId: a.id, ownerId: v.id, pack: 'generic', stage: 1, challenge: '', costBase: a.costBase, updatedLabel: 'Just now' } });
  await saveBusinessCase(id);
  await audit(v.name, 'Solution design created', title, 'Studio');
  revalidatePath('/studio');
  return { url: '/studio?sol=' + id };
}

export interface SolPatch { stage?: number; challenge?: string; imported?: boolean; signalImported?: boolean; framed?: boolean; alt?: string; ws?: Record<string, boolean>; costBase?: number; scenario?: Scenario }

export async function updateSolution(id: string, patch: SolPatch): Promise<Res> {
  const v = await requireViewer('studio'); assertBusiness(v);
  const s = await editable(v, id);
  const data: Prisma.SolutionUpdateInput = { updatedLabel: 'Just now' };
  if (patch.stage != null) data.stage = Math.max(1, Math.min(7, patch.stage));
  if (patch.challenge != null) data.challenge = patch.challenge.slice(0, 4000);
  if (patch.imported) { data.imported = true; if (!s.challenge) data.challenge = s.account.challenge; }
  if (patch.signalImported) data.signalImported = true;
  if (patch.framed) data.framed = true;
  if (patch.alt) data.alt = patch.alt;
  if (patch.ws) data.ws = patch.ws;
  if (patch.costBase != null) data.costBase = Math.max(10, Math.min(90, Math.round(patch.costBase)));
  if (patch.scenario && ['conservative', 'base', 'ambitious'].includes(patch.scenario)) data.scenario = patch.scenario;
  await db.solution.update({ where: { id }, data });
  if (patch.ws || patch.costBase != null || patch.scenario || patch.alt) await saveBusinessCase(id);
  if (patch.framed) await audit(v.name, 'Problem framed (AI)', s.title, 'AI');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function submitProposal(id: string): Promise<Res> {
  const v = await requireViewer('studio'); assertBusiness(v);
  const s = await editable(v, id);
  if (s.submitted) return { ok: false };
  await db.solution.update({ where: { id }, data: { submitted: true, updatedLabel: 'Just now' } });
  await audit(v.name, 'Proposal submitted for human review', s.title, 'Studio');
  await notify('Proposal “' + s.title + '” submitted for review', ['lead'], 'studio');
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Submitted for review — your team leader has been notified' };
}

/** Request (or connect) an expert. The optional message is private 1:1 content. */
export async function requestExpert(solId: string, expertId: string, mode: 'request' | 'connect', message?: string): Promise<Res> {
  const v = await requireViewer('collab'); assertBusiness(v);
  const s = await editable(v, solId);
  const e = EXPERTS.find(x => x.id === expertId);
  if (!e) throw new Error('not_found');
  const status = mode === 'connect' ? 'connected' : 'requested';
  const cur = s.requests.find(r => r.expertId === expertId);
  if (cur) await db.expertRequest.update({ where: { id: cur.id }, data: { status: cur.status === 'contributed' ? 'contributed' : status, mode, message: message || cur.message } });
  else await db.expertRequest.create({ data: { solutionId: solId, expertId, requesterId: v.id, mode, status, message: message || null } });
  await audit(v.name, mode === 'connect' ? 'Expert connected to project' : 'Collaboration requested', e.name + ' → ' + s.title, 'Collaboration');
  revalidatePath('/', 'layout');
  return { ok: true, msg: mode === 'connect' ? e.name + ' connected to “' + s.title + '”' : 'Contribution requested from ' + e.name + (expertId === 'sofia' ? ' — simulated response in a few seconds' : '') };
}

/** Simulated expert response (demo): Sofia Chen contributes her adoption benchmark. */
export async function sofiaContribute(solId: string): Promise<Res> {
  const v = await requireViewer('studio'); assertBusiness(v);
  const s = await getSolution(v, solId);
  const r = s.requests.find(x => x.expertId === 'sofia');
  if (!r || r.status === 'contributed') return { ok: false };
  await db.expertRequest.update({ where: { id: r.id }, data: { status: 'contributed' } });
  await db.solution.update({ where: { id: solId }, data: { updatedLabel: 'Just now' } });
  await saveBusinessCase(solId);
  if (!(await db.knowledgeItem.findUnique({ where: { id: 'k-sofia' } })))
    await db.knowledgeItem.create({ data: { id: 'k-sofia', title: 'Meridian context: sequence agent-assist before automation', authorName: 'Sofia Chen', domain: 'AI & Service', status: 'in_review', saves: 0, date: 'Today', body: 'Across 3 comparable FS programmes, agent-assist adoption reached 70% by month 6 and lifted savings ~1 pt above plan. Automating before journeys are redesigned eroded NPS.', order: 0 } });
  await notify('Sofia Chen contributed expertise to “' + s.title + '”', ['exec', 'lead'], 'studio');
  await audit('Sofia Chen', 'Expert contribution added', s.title, 'Collaboration');
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Sofia Chen contributed to “' + s.title + '”' };
}
