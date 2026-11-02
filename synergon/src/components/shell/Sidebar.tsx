'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { House, BriefcaseBusiness, Radar, Layers, TrendingUp, Users, Target, SlidersHorizontal, CircleHelp } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import { switchRole } from '@/server/actions/shell';
import { Modal } from '@/components/ui/Modal';
import type { Role, View } from '@/lib/demo/types';
import s from './shell.module.css';

const NAV: { v: View; label: string; n?: string; Icon: typeof House }[] = [
  { v: 'home', label: 'Home', Icon: House },
  { v: 'ci', label: 'Commercial Intelligence AI', n: '01', Icon: BriefcaseBusiness },
  { v: 'radar', label: 'Radar360', n: '02', Icon: Radar },
  { v: 'studio', label: 'Solution Design Studio', n: '03', Icon: Layers },
  { v: 'growth', label: 'Capabilities & Growth', n: '04', Icon: TrendingUp },
  { v: 'collab', label: 'Collaboration & Contribution', n: '05', Icon: Users },
];

export function Sidebar({ role, access, demo, connected, total }: { role: Role; access: View[]; demo: boolean; connected: number; total: number }) {
  const t = useT();
  const path = usePathname();
  const cur = path.split('/')[1] || 'home';
  const [help, setHelp] = useState(false);
  const [pending, start] = useTransition();
  const item = (v: View, label: string, Icon: typeof House, n?: string) => (
    <Link key={v} href={'/' + v} className={cx(s.navItem, cur === v && s.on)} aria-current={cur === v ? 'page' : undefined}>
      <Icon size={18} strokeWidth={1.75} aria-hidden /><span className={s.navLabel}>{t(label)}</span>{n && <span className={s.navNum}>{n}</span>}
    </Link>
  );
  return (
    <aside className={s.aside}>
      <div className={s.brand}>
        <div className={s.brandRow}><div className={s.brandMark} /><div className={s.brandName}>SYNERGON</div></div>
        <div className={s.tagline}>{t('Intelligence · Alignment · Exponential Capabilities Enablement')}</div>
      </div>
      <nav className={s.nav} aria-label="Main">
        {NAV.filter(x => access.includes(x.v)).map(x => item(x.v, x.label, x.Icon, x.n))}
        {access.includes('command') && <>
          <div className={s.layer}>{t('Leadership layer')}</div>
          {item('command', role === 'lead' ? 'Team Intelligence' : 'SYNERGON Command', Target, '06')}
        </>}
        <div className={s.sep} />
        {item('settings', 'Settings & Integrations', SlidersHorizontal)}
        <button type="button" className={s.navItem} style={{ paddingLeft: 20 }} onClick={() => setHelp(true)}><CircleHelp size={18} strokeWidth={1.75} aria-hidden /><span>{t('Help & prototype notes')}</span></button>
      </nav>
      {demo && (
        <div className={s.demoRole}>
          <div className={s.footKicker}>{t('Demo role')}</div>
          <div className={s.demoRoleGrid} role="group" aria-label={t('Demo role')}>
            {([['exec', 'Executive'], ['lead', 'Team lead'], ['director', 'Director'], ['admin', 'Admin']] as [Role, string][]).map(([r, l]) => (
              <button key={r} type="button" disabled={pending} aria-pressed={role === r} data-role={r} className={cx(s.demoRoleBtn, role === r && s.on)} onClick={() => start(() => switchRole(r, cur))}>{t(l)}</button>
            ))}
          </div>
        </div>
      )}
      <div className={s.foot}>
        <div className={s.footKicker}>SYNERGON Intelligence Core</div>
        <div className={s.footOrg}>Asterion Business Solutions</div>
        <div className={s.footLine}><span className={s.sq} />{t(`${connected} of ${total} integrations connected`)}</div>
        <div className={s.footLine}>{t('Fictional demonstration data')}</div>
      </div>
      <Modal open={help} onClose={() => setHelp(false)} label="Help">
        <div className="card-kicker">{t('About this prototype')}</div>
        <div className="dialog-title">{t('SYNERGON — interactive MVP')}</div>
        <p style={{ margin: 0, fontSize: 14 }}>{t('One platform: a shared Intelligence Core, five executive components and the SYNERGON Command leadership layer. Use the Demo role switcher and the Scenario menu to walk the end-to-end story.')}</p>
        <div><h6>{t('Implemented')}</h6><div style={{ fontSize: 13 }}>{t('Authentication with four demo users · role-based access enforced on the server (middleware, every query and the AI context) · PostgreSQL persistence · CRM-style account intelligence (Salesforce read-only adapter) · Radar360 with reported / estimated / AI-hypothesis labels on every figure · seven-stage Solution Design Studio with a persisted business case · expert finder, requests and knowledge validation · contextual learning, quiz and role-play · leadership command center with minimum-group-size privacy thresholds and initiatives · notifications · audit log · EN/ES · light/dark modes.')}</div></div>
        <div><h6>{t('Simulated')}</h6><div style={{ fontSize: 13 }}>{t('Without an ANTHROPIC_API_KEY, SYNERGON AI answers with deterministic, labelled responses grounded in the demo data. All companies, people and sources are fictional. Integrations use mock adapters that read the seed.')}</div></div>
        <div><h6>{t('Planned (P2)')}</h6><div style={{ fontSize: 13 }}>{t('Live CRM and market feeds · enterprise SSO (Microsoft Entra ID prepared) · real-time collaboration · learning-platform integration · document export · knowledge graph · forecasting · security certifications.')}</div></div>
        <div><h6>{t('Design note')}</h6><div style={{ fontSize: 13 }}>{t('Visual identity follows the Modernist design system (ink, single accent, zero radius, strong rules).')}</div></div>
        <div className="dialog-actions"><button className="btn btn-primary" onClick={() => setHelp(false)}>{t('Close')}</button></div>
      </Modal>
    </aside>
  );
}
