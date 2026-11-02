'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { signIn, signOut, demoMode } from '@/auth';
import { db } from '../db';
import { getViewer, requireViewer, updateUserState, type UserState } from '../session';
import { scenarioTarget } from '../scenario';
import { seedDemo } from '../seed';
import { audit } from '../audit';
import { canView, homeFor } from '@/lib/rbac';
import type { Role, View } from '@/lib/demo/types';
import { ForbiddenError } from '../errors';

const YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: 'en' | 'es') {
  (await cookies()).set('NEXT_LOCALE', locale === 'es' ? 'es' : 'en', { path: '/', maxAge: YEAR, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}
export async function setTheme(theme: 'light' | 'dark') {
  (await cookies()).set('theme', theme === 'dark' ? 'dark' : 'light', { path: '/', maxAge: YEAR, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

/** Demo-role switcher: re-authenticates as another demo user (DEMO_MODE only). */
export async function switchRole(role: Role, currentView?: string) {
  if (!demoMode()) throw new ForbiddenError('Demo mode is disabled');
  const target: View = currentView && canView(role, currentView as View) ? (currentView as View) : homeFor(role);
  await signIn('demo-switch', { role, redirectTo: '/' + target + '?as=' + role });
}

export async function scenarioGo(n: number) {
  if (!demoMode()) throw new ForbiddenError('Demo mode is disabled');
  const v = await getViewer();
  const { role, url } = await scenarioTarget(n);
  if (!v || v.role !== role) await signIn('demo-switch', { role, redirectTo: url + (url.includes('?') ? '&' : '?') + 'as=' + role });
  redirect(url);
}

export async function markNotificationRead(id: string) {
  const v = await requireViewer();
  const n = await db.notification.findUnique({ where: { id } });
  if (!n || !n.audience.includes(v.role)) return;
  if (!n.readBy.includes(v.id)) await db.notification.update({ where: { id }, data: { readBy: { push: v.id } } });
  revalidatePath('/', 'layout');
}
export async function markAllNotificationsRead() {
  const v = await requireViewer();
  const list = await db.notification.findMany({ where: { audience: { has: v.role }, NOT: { readBy: { has: v.id } } } });
  for (const n of list) await db.notification.update({ where: { id: n.id }, data: { readBy: { push: v.id } } });
  revalidatePath('/', 'layout');
}

export async function resetDemo() {
  if (!demoMode()) throw new ForbiddenError('Demo mode is disabled');
  const v = await requireViewer();
  await seedDemo(db);
  await audit(v.name, 'Demo data reset', 'All modules', 'Governance');
  revalidatePath('/', 'layout');
}

/** Story flags the guided scenario relies on (ciViewed, themeViewed, alignedSeen…). */
export async function markSeen(flag: 'ciViewed' | 'themeViewed' | 'alignedSeen') {
  const v = await requireViewer();
  if ((v.state as UserState)[flag]) return;
  await updateUserState(v.id, { [flag]: true });
  revalidatePath('/', 'layout');
}

export async function logout() { await signOut({ redirectTo: '/login' }); }
