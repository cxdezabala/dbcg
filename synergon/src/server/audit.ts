import 'server-only';
import { db } from './db';
import type { Role, View } from '@/lib/demo/types';

export async function audit(actor: string, action: string, object: string, category: string, content?: string | null) {
  await db.auditLog.create({ data: { actor, action, object, category, content: content ?? null } });
}
export async function notify(text: string, audience: Role[], view: View) {
  await db.notification.create({ data: { text, audience, view } });
}
