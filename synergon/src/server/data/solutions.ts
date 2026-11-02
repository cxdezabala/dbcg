import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer } from '../session';
import { ForbiddenError } from '../errors';
import type { Prisma } from '@prisma/client';

/** Solutions visible to the viewer: own (exec), own team's (lead), all (director). */
export async function solutionWhere(v: Viewer): Promise<Prisma.SolutionWhereInput> {
  assertBusiness(v);
  if (v.role === 'director') return {};
  if (v.role === 'lead') {
    const team = await db.user.findMany({ where: { teamId: v.teamId }, select: { id: true } });
    return { OR: [{ ownerId: { in: team.map(t => t.id) } }, { completed: true }] };
  }
  return { OR: [{ ownerId: v.id }, { completed: true }] };
}

export async function listSolutions(v: Viewer) {
  const where = await solutionWhere(v);
  return db.solution.findMany({ where, include: { account: true, requests: true, businessCase: true }, orderBy: { createdAt: 'desc' } });
}

export async function getSolution(v: Viewer, id: string) {
  const where = await solutionWhere(v);
  const s = await db.solution.findFirst({ where: { AND: [where, { id }] }, include: { account: true, requests: true, businessCase: true } });
  if (!s) {
    const exists = await db.solution.findUnique({ where: { id }, select: { id: true } });
    if (exists) throw new ForbiddenError();
    throw new Error('not_found');
  }
  return s;
}

/** The guided-demo solution (Meridian · AI-enabled Customer Operations), if created and visible. */
export async function storySolution(v: Viewer) {
  const where = await solutionWhere(v);
  return db.solution.findFirst({ where: { AND: [where, { story: true }] }, include: { requests: true } });
}

export const expertStatus = (s: { requests: { expertId: string | null; status: string }[] }) =>
  Object.fromEntries(s.requests.filter(r => r.expertId).map(r => [r.expertId!, r.status])) as Record<string, string>;

export async function t1count() { return 6 + ((await db.solution.count({ where: { story: true } })) ? 1 : 0); }

export async function pendingValidation() { return db.knowledgeItem.count({ where: { status: 'in_review' } }); }

export async function lessonDone(userId: string) {
  return !!(await db.learningAssignment.findFirst({ where: { userId, title: 'Value-based selling for AI transformation', status: 'completed' } }));
}
