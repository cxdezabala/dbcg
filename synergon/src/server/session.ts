import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from './db';
import { canView, homeFor } from '@/lib/rbac';
import type { Role, View } from '@/lib/demo/types';
import { ForbiddenError, UnauthenticatedError } from './errors';

export interface UserState {
  ciViewed?: boolean; themeViewed?: boolean; alignedSeen?: boolean;
  doneActions?: Record<string, boolean>; saved?: string[]; watched?: string[]; rpScore?: number | null;
  lens?: 'consulting' | 'execed'; prep?: Record<string, Prep>; ldOv?: Record<string, { ld?: number; exec?: number }>;
  gapSel?: string; team?: string;
}
export interface Prep { stake: string[]; hooks: string[]; qs: string[]; bu: string | null; comp: boolean; type: 'first' | 'follow'; date: string }

export interface Viewer {
  id: string; role: Role; teamId: string | null; orgId: string; name: string; first: string; title: string; initials: string; scope: string; state: UserState;
}

/** The signed-in user, loaded fresh from the database for every request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await db.user.findUnique({ where: { id: s.user.id } });
  if (!u || !u.canLogin) return null;
  return { id: u.id, role: u.role as Role, teamId: u.teamId, orgId: u.orgId, name: u.name, first: u.name.split(' ')[0], title: u.title, initials: u.initials, scope: u.scope, state: (u.state || {}) as UserState };
});

/** For pages: redirects to /login or to the role's home when the view is not authorised. */
export async function requirePageViewer(view: View): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect('/login');
  if (!canView(v.role, view)) redirect('/' + homeFor(v.role) + '?denied=' + view);
  return v;
}

/** For server actions and API routes: throws instead of redirecting. */
export async function requireViewer(view?: View): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new UnauthenticatedError();
  if (view && !canView(v.role, view)) throw new ForbiddenError();
  return v;
}

/** Business content is never available to administrators. */
export function assertBusiness(v: Viewer) {
  if (v.role === 'admin') throw new ForbiddenError('Administrators configure the platform; business content is not available to them.');
}

export async function updateUserState(userId: string, patch: Partial<UserState> | ((s: UserState) => Partial<UserState>)) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { state: true } });
  const cur = (u.state || {}) as UserState;
  const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
  await db.user.update({ where: { id: userId }, data: { state: next as object } });
  return next;
}
