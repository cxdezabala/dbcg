'use server';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { requireViewer, assertBusiness } from '../session';
import { audit, notify } from '../audit';
import { ForbiddenError } from '../errors';

const DOMAINS = ['AI & Service', 'Value & Pricing', 'Data & Governance', 'Energy', 'Retail', 'Change & Learning'];

async function viewer() { const v = await requireViewer('collab'); assertBusiness(v); return v; }

export async function toggleSaveKnowledge(id: string) {
  const v = await viewer();
  const k = await db.knowledgeItem.findUniqueOrThrow({ where: { id } });
  const on = !k.savedBy.includes(v.id);
  await db.knowledgeItem.update({ where: { id }, data: { savedBy: on ? { push: v.id } : k.savedBy.filter(x => x !== v.id) } });
  revalidatePath('/collab');
}

export async function commentKnowledge(id: string, text: string) {
  const v = await viewer();
  const t = text.trim().slice(0, 1000); if (!t) return;
  const k = await db.knowledgeItem.findUniqueOrThrow({ where: { id } });
  await db.knowledgeItem.update({ where: { id }, data: { comments: [...(k.comments as { text: string }[]), { text: t + ' (' + v.name + ')' }] } });
  revalidatePath('/collab');
}

/** Human validation before org-wide reuse — team leaders and directors only. */
export async function reviewKnowledge(id: string, decision: 'validate' | 'evidence') {
  const v = await viewer();
  if (v.role !== 'lead' && v.role !== 'director') throw new ForbiddenError('Only team leaders and directors validate contributions');
  const k = await db.knowledgeItem.findUniqueOrThrow({ where: { id } });
  if (k.status !== 'in_review') return { msg: '' };
  if (decision === 'validate') {
    await db.knowledgeItem.update({ where: { id }, data: { status: 'validated' } });
    await audit(v.name, 'Contribution validated', k.title, 'Knowledge');
    await notify('Your contribution “' + k.title + '” was validated for org-wide reuse', ['exec'], 'collab');
    revalidatePath('/', 'layout');
    return { msg: 'Validated — now reusable across the organisation' };
  }
  await db.knowledgeItem.update({ where: { id }, data: { status: 'needs_evidence' } });
  await audit(v.name, 'Evidence requested', k.title, 'Knowledge');
  revalidatePath('/', 'layout');
  return { msg: '' };
}

export async function contributeInsight(input: { title: string; domain: string; body: string }) {
  const v = await viewer();
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, msg: 'Add a title' };
  await db.knowledgeItem.create({ data: { id: 'k' + Date.now(), title, authorName: v.name, domain: DOMAINS.includes(input.domain) ? input.domain : DOMAINS[0], status: 'in_review', date: 'Today', body: input.body.trim().slice(0, 4000) || '—', order: -Date.now() % 1e9 } });
  await audit(v.name, 'Knowledge contribution submitted', title, 'Knowledge');
  await notify('New contribution awaiting validation: “' + title + '”', ['lead', 'director'], 'collab');
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Submitted for review — a team leader will validate it' };
}
