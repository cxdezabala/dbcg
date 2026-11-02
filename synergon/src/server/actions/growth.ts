'use server';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { requireViewer, assertBusiness, updateUserState } from '../session';
import { audit, notify } from '../audit';

/** Records learning activity only — capability levels change exclusively through validated evidence. */
export async function completeLesson(score: number) {
  const v = await requireViewer('growth'); assertBusiness(v);
  const title = 'Value-based selling for AI transformation';
  const existing = await db.learningAssignment.findFirst({ where: { userId: v.id, title } });
  const first = existing?.status !== 'completed';
  if (existing) await db.learningAssignment.update({ where: { id: existing.id }, data: { status: 'completed', completedAt: existing.completedAt ?? new Date(), score: score + ' of 2' } });
  else await db.learningAssignment.create({ data: { userId: v.id, title, kind: 'lesson', source: 'contextual', minutes: 5, status: 'completed', completedAt: new Date(), score: score + ' of 2' } });
  // Leadership-assigned readiness path (initiative) is satisfied by the same lesson.
  await db.learningAssignment.updateMany({ where: { userId: v.id, source: 'initiative', status: 'assigned' }, data: { status: 'completed', completedAt: new Date() } });
  if (first) {
    await notify('Learning recorded: ' + title, ['exec'], 'growth');
    await audit(v.name, 'Learning activity completed', title, 'Growth');
  }
  revalidatePath('/', 'layout');
}

export async function saveRoleplayScore(score: number) {
  const v = await requireViewer('growth'); assertBusiness(v);
  await updateUserState(v.id, { rpScore: score });
  await db.learningAssignment.create({ data: { userId: v.id, title: 'AI role-play: procurement pushback', kind: 'roleplay', source: 'contextual', minutes: 6, status: 'completed', completedAt: new Date(), score: score + ' / 4' } });
  revalidatePath('/growth');
}

export async function markVideoWatched(id: string, title: string) {
  const v = await requireViewer('growth'); assertBusiness(v);
  if ((v.state.watched || []).includes(id)) return;
  await updateUserState(v.id, s => ({ watched: [...(s.watched || []), id] }));
  await audit(v.name, 'Expert video watched', title, 'Growth');
  revalidatePath('/growth');
}

export async function selectGap(id: string) {
  const v = await requireViewer('growth');
  await updateUserState(v.id, { gapSel: id });
  revalidatePath('/growth');
}
