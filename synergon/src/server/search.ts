import 'server-only';
import { db } from './db';
import type { Viewer } from './session';
import { listAccounts } from './data/accounts';
import { solutionWhere } from './data/solutions';
import { EXPERTS } from '@/lib/demo';

/** Global search — only returns results the role is authorised to open. */
export async function search(v: Viewer, q0: string) {
  const q = q0.trim().toLowerCase();
  if (q.length < 2) return [];
  if (v.role === 'admin') return ['users', 'integrations', 'policies', 'ai', 'audit'].filter(t => t.includes(q)).map(t => ({ kind: 'Settings', label: t, href: '/settings?tab=' + t }));
  const res: { kind: string; label: string; href: string | null; restricted?: string }[] = [];
  for (const a of await listAccounts(v)) if (a.name.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q))
    res.push(a.restricted ? { kind: 'Account', label: a.name + ' · restricted', href: null, restricted: 'Restricted — outside your authorised scope' } : { kind: 'Account', label: a.name, href: '/ci?acct=' + a.id });
  for (const x of await db.signal.findMany()) if (x.title.toLowerCase().includes(q) || x.industry.toLowerCase().includes(q)) res.push({ kind: 'Signal', label: x.title, href: '/radar?tab=signals&signal=' + x.id });
  for (const x of EXPERTS) if ((x.name + x.domains.join(' ') + x.title).toLowerCase().includes(q)) res.push({ kind: 'Expert', label: x.name + ' — ' + x.title, href: '/collab?expert=' + x.id });
  for (const x of await db.solution.findMany({ where: { AND: [await solutionWhere(v), { completed: false }] } })) if (x.title.toLowerCase().includes(q)) res.push({ kind: 'Solution', label: x.title, href: '/studio?sol=' + x.id });
  for (const x of await db.knowledgeItem.findMany()) if (x.title.toLowerCase().includes(q)) res.push({ kind: 'Knowledge', label: x.title, href: '/collab' });
  return res.slice(0, 8);
}
