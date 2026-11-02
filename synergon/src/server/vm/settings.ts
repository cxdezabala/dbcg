import 'server-only';
import { db } from '../db';
import type { Viewer } from '../session';
import { DEMO_USERS } from '../seed';

/** Settings view-model. Non-admins only receive integration status and their own preferences. */
export async function settingsVM(v: Viewer) {
  const isAdmin = v.role === 'admin';
  const integrations = (await db.integrationConnection.findMany({ orderBy: { order: 'asc' } })).map(i => ({ id: i.id, name: i.name, status: i.status, desc: i.description, meta: i.meta, canSync: i.canSync && isAdmin }));
  const base = { isAdmin, integrations, user: { scope: v.scope, title: v.title } };
  if (!isAdmin) return { ...base, users: null, org: null, audit: null };
  const org = await db.organization.findUniqueOrThrow({ where: { id: v.orgId } });
  const ids = [DEMO_USERS.exec.id, DEMO_USERS.lead.id, DEMO_USERS.director.id, 'u-sofia', DEMO_USERS.admin.id];
  const users = await db.user.findMany({ where: { id: { in: ids } }, include: { team: true } });
  users.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const SCOPE: Record<string, string> = { exec: 'Own accounts', lead: 'Team (10)', director: 'Organisation (aggregated)', expert: 'Assigned solutions', admin: 'Configuration only' };
  const TEAM: Record<string, string> = { director: 'Leadership', admin: 'IT & Governance', expert: 'AI Service Transformation' };
  const pending = v.state.pendingRoles || {};
  const audit = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return {
    ...base,
    users: users.map(u => ({ id: u.id, name: u.name, role: pending[u.id] || u.title, pending: !!pending[u.id], team: u.team?.name || TEAM[u.role] || '—', scope: SCOPE[u.role], last: u.lastActive || '—' })),
    org: { minGroup: org.minGroup, aiLogContent: org.aiLogContent },
    audit: audit.map(a => ({ id: a.id, t: a.timeLabel || 'Today ' + String(a.createdAt.getHours()).padStart(2, '0') + ':' + String(a.createdAt.getMinutes()).padStart(2, '0'), actor: a.actor, action: a.action, obj: a.object, cls: a.category, content: a.content })),
  };
}
export type SettingsVM = Awaited<ReturnType<typeof settingsVM>>;
