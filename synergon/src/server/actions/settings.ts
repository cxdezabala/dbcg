'use server';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { requireViewer, updateUserState } from '../session';
import { audit } from '../audit';
import { ForbiddenError } from '../errors';
import { adapters } from '../integrations';

async function admin() { const v = await requireViewer('settings'); if (v.role !== 'admin') throw new ForbiddenError('Governance settings are managed by the platform administrator'); return v; }
const ROLES = ['Commercial Executive', 'Commercial Team Leader', 'Commercial Director', 'Subject-Matter Expert', 'Platform Administrator'];

export async function setMinGroup(n: number) {
  const v = await admin();
  if (![3, 5, 10].includes(n)) throw new Error('invalid');
  await db.organization.update({ where: { id: v.orgId }, data: { minGroup: n } });
  await audit(v.name, 'Policy changed', 'Minimum aggregation group = ' + n, 'Governance');
  revalidatePath('/', 'layout');
  return { msg: 'Policy updated — SYNERGON Command heatmap now suppresses groups < ' + n };
}

export async function setAiContentLogging(on: boolean) {
  const v = await admin();
  await db.organization.update({ where: { id: v.orgId }, data: { aiLogContent: on } });
  await audit(v.name, 'Policy changed', 'AI prompt/answer content logging = ' + (on ? 'on' : 'off'), 'Governance');
  revalidatePath('/settings');
  return { msg: on ? 'AI conversations will be stored in the audit log (30 days)' : 'AI audit entries will record metadata only' };
}

/** Role changes are logged and stay pending until a second administrator approves (production). */
export async function requestRoleChange(userId: string, role: string) {
  const v = await admin();
  if (!ROLES.includes(role)) throw new Error('invalid');
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await updateUserState(v.id, s => ({ pendingRoles: { ...(s.pendingRoles || {}), [userId]: role } }));
  await audit(v.name, 'Role change requested (pending second approval)', u.name + ' → ' + role, 'Governance');
  revalidatePath('/settings');
  return { msg: 'Role change logged — pending second-administrator approval' };
}

export async function syncIntegration(id: string) {
  const v = await admin();
  const conn = await db.integrationConnection.findUniqueOrThrow({ where: { id } });
  if (!conn.canSync) throw new ForbiddenError('Integration not connected');
  const r = await adapters()[id].sync();
  const hh = String(r.at.getHours()).padStart(2, '0') + ':' + String(r.at.getMinutes()).padStart(2, '0');
  await db.integrationConnection.update({ where: { id }, data: { lastSyncAt: r.at, records: r.records, meta: id === 'salesforce' ? 'Last sync today ' + hh + ' · ' + r.records.toLocaleString('en-GB') + ' records' : id === 'teams' ? 'Webhook healthy · checked ' + hh : 'Last sync today ' + hh } });
  await audit(v.name, 'Manual sync triggered', conn.name, 'Integration');
  revalidatePath('/settings');
  return { msg: conn.name + ' sync queued' };
}
