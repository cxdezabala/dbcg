import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getViewer } from '@/server/session';
import { db } from '@/server/db';
import { getScenario } from '@/server/scenario';
import { demoMode } from '@/auth';
import { ACCESS } from '@/lib/rbac';
import { SUGGEST, VIEW_META } from '@/lib/demo';
import { relTime } from '@/lib/format';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { ShellClient } from '@/components/shell/ShellClient';
import s from '@/components/shell/shell.module.css';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const v = await getViewer();
  if (!v) redirect('/login');
  const [notifs, integrations, scenario, locale, jar] = await Promise.all([
    db.notification.findMany({ where: { audience: { has: v.role } }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.integrationConnection.findMany(),
    getScenario(),
    getLocale(),
    cookies(),
  ]);
  const access = ACCESS[v.role];
  const connected = integrations.filter(i => i.status === 'Connected' || i.status === 'Demo data').length;
  const viewNames = Object.fromEntries(Object.entries(VIEW_META).map(([k, m]) => [k, k === 'command' && v.role === 'lead' ? 'Team Intelligence' : m[1]]));
  return (
    <div className={s.app}>
      <ShellClient
        suggest={SUGGEST} viewNames={viewNames} roleTitle={v.title} isAdmin={v.role === 'admin'}
      >
        <Sidebar role={v.role} access={access} demo={demoMode()} connected={connected} total={integrations.length} />
        <div className={s.main}>
          <Topbar
            isAdmin={v.role === 'admin'} user={{ name: v.name, initials: v.initials }} locale={locale === 'es' ? 'es' : 'en'}
            theme={jar.get('theme')?.value === 'dark' ? 'dark' : 'light'} demo={demoMode()}
            notifs={notifs.map(n => ({ id: n.id, text: n.text, time: n.timeLabel || relTime(n.createdAt), unread: !n.readBy.includes(v.id), view: n.view, allowed: (access as string[]).includes(n.view) }))}
            scenario={scenario}
          />
          <main className={s.content}>{children}</main>
        </div>
      </ShellClient>
    </div>
  );
}
