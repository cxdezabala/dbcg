'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import u from '@/styles/ui.module.css';
import { Tag, Seg } from '@/components/ui/controls';
import { useUI } from '@/components/shell/UIProvider';
import { setTheme } from '@/server/actions/shell';
import { setMinGroup, setAiContentLogging, requestRoleChange, syncIntegration } from '@/server/actions/settings';
import type { SettingsVM } from '@/server/vm/settings';
import s from './settings.module.css';

const ROLES = ['Commercial Executive', 'Commercial Team Leader', 'Commercial Director', 'Subject-Matter Expert', 'Platform Administrator'];

export function SettingsView({ vm, tab: tab0, dark }: { vm: SettingsVM; tab: string | null; dark: boolean; denied: string | null }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useUI();
  const [pending, start] = useTransition();
  const tabs: [string, string][] = vm.isAdmin ? [['users', 'Users & roles'], ['integrations', 'Integrations'], ['policies', 'Data access policies'], ['ai', 'AI governance'], ['audit', 'Audit log']] : [['integrations', 'Integrations'], ['prefs', 'Preferences']];
  const tab = tabs.find(x => x[0] === tab0) ? tab0! : tabs[0][0];
  const run = (fn: () => Promise<{ msg?: string }>) => start(async () => { const r = await fn(); if (r.msg) toast(r.msg); router.refresh(); });
  const row = (title: string, desc: string, right: React.ReactNode) => <div className={s.row}><span><b>{t(title)}</b><br /><span className={cx(u.s13, u.muted)}>{t(desc)}</span></span>{right}</div>;
  return (
    <div className={u.stack} style={{ gap: 24 }}>
      <div className={u.tabs} style={{ marginBottom: 0 }} role="tablist">
        {tabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={cx(u.tab, tab === id && u.on)} onClick={() => router.push('/settings?tab=' + id, { scroll: false })}>{t(l)}</button>)}
      </div>
      {tab === 'users' && vm.users && <>
        <div className={u.tableWrap}><table className="table"><thead><tr><th>{t('User')}</th><th>{t('Role')}</th><th>{t('Team')}</th><th>{t('Data scope')}</th><th>{t('Last active')}</th></tr></thead><tbody>
          {vm.users.map(x => <tr key={x.id}><td style={{ fontWeight: 700 }}>{x.name}</td>
            <td><select className="input" style={{ minHeight: 30, padding: '3px 6px', width: 'auto' }} value={x.role} aria-label={t('Role') + ' · ' + x.name} onChange={e => run(() => requestRoleChange(x.id, e.target.value))}>{ROLES.map(r => <option key={r} value={r}>{t(r)}</option>)}</select>{x.pending && <> <Tag kind="outline">{t('Pending approval')}</Tag></>}</td>
            <td>{x.team}</td><td>{t(x.scope)}</td><td className={u.muted}>{t(x.last)}</td></tr>)}
        </tbody></table></div>
        <div className={cx(u.s13, u.muted)}>{t('Role changes are logged and require approval by a second administrator in production. 60 commercial executives, 6 team leaders, 1 director and 74 subject-matter experts provisioned via SSO (planned).')}</div>
      </>}
      {tab === 'integrations' && (
        <div className={u.grid260}>
          {vm.integrations.map(ig => (
            <div key={ig.id} className="card" style={{ padding: 18, gap: 8, borderTop: '3px solid ' + (ig.status === 'Connected' ? 'var(--color-text)' : 'var(--color-neutral-300)') }}>
              <div className={cx(u.row, u.between)} style={{ gap: 8 }}><div className="card-title">{ig.name}</div><Tag kind={ig.status === 'Connected' ? 'neutral' : ig.status === 'Planned' ? 'outline' : 'accent'}>{t(ig.status)}</Tag></div>
              <p className="card-body">{t(ig.desc)}</p><div className="card-meta">{t(ig.meta)}</div>
              {ig.canSync && <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} disabled={pending} onClick={() => run(() => syncIntegration(ig.id))}>{t('Sync now')}</button>}
            </div>
          ))}
        </div>
      )}
      {tab === 'policies' && vm.org && (
        <div className={u.stack}>
          {row('Minimum aggregation group size', 'Leadership capability and collaboration insights are suppressed for groups smaller than this. Affects the SYNERGON Command heatmap.', <Seg plain options={[[3, '3'], [5, '5'], [10, '10']]} value={vm.org.minGroup} onChange={n => run(() => setMinGroup(n))} label={t('Minimum aggregation group size')} />)}
          {[['Leadership access to private collaboration content', 'Private 1:1 messages and drafts are never surfaced in leadership intelligence.', 'Off · locked', 'accent'], ['Administrator access to confidential business content', 'Administrators configure the platform; account, solution and knowledge content is not visible to them.', 'Off · locked', 'accent'], ['Human validation before org-wide knowledge sharing', 'Contributions are reviewed by a team leader or director before reuse.', 'Required', 'neutral'], ['AI-generated content labels', 'All AI interpretations, hypotheses and drafts are labelled at the point of display.', 'Always on', 'neutral'], ['Organisation-level data isolation', 'Tenant data is isolated per organisation. Enforced server-side.', 'Enforced', 'neutral'], ['Individual behavioural profiling', 'No individual productivity scores or behavioural profiles are generated.', 'Disabled', 'accent']].map(([n, d, st, k]) => <div key={n}>{row(n, d, <Tag kind={k as 'accent' | 'neutral'}>{t(st)}</Tag>)}</div>)}
        </div>
      )}
      {tab === 'ai' && vm.org && <>
        <div className={u.grid260} style={{ gap: 24 }}>
          {[{ h: 'Model & grounding', items: ['Claude via the Anthropic API when ANTHROPIC_API_KEY is set; otherwise deterministic, labelled fallback responses', 'Retrieval over permitted data only — context is filtered on the server before it reaches the model', 'Every answer cites sources; hypotheses labelled'] }, { h: 'Guardrails', items: ['Permission filtering before retrieval', 'No training on customer data', 'Sensitive-employee topics routed to HR policy', 'Confidence indicators on leadership insights'] }, { h: 'Retention & logging', items: ['Every AI call is recorded in the audit log', 'Prompt logs retained 30 days for audit (when content logging is on)', 'Export of logs to SIEM (planned)'] }].map(g => <div key={g.h}><h6>{t(g.h)}</h6>{g.items.map(x => <div key={x} className={cx(u.rule, u.s13)} style={{ padding: '7px 0' }}>{t(x)}</div>)}</div>)}
        </div>
        {row('Store AI prompt and answer content in the audit log', 'When off, AI calls are logged with metadata only (user, view, engine, time).', <Seg plain options={[[false, 'Off'], [true, 'On']]} value={vm.org.aiLogContent} onChange={on => run(() => setAiContentLogging(on))} />)}
      </>}
      {tab === 'audit' && vm.audit && (
        <div className={u.tableWrap}><table className="table"><thead><tr><th>{t('Time')}</th><th>{t('Actor')}</th><th>{t('Action')}</th><th>{t('Object')}</th><th>{t('Category')}</th></tr></thead><tbody>
          {vm.audit.map(a => <tr key={a.id}><td style={{ whiteSpace: 'nowrap' }}>{t(a.t)}</td><td>{a.actor}</td><td style={{ fontWeight: 600 }}>{t(a.action)}{a.content && <div className={cx(u.xs, u.muted)} style={{ fontWeight: 400 }}>{a.content}</div>}</td><td>{a.obj}</td><td><Tag>{t(a.cls)}</Tag></td></tr>)}
        </tbody></table></div>
      )}
      {tab === 'prefs' && (
        <div className={u.stack} style={{ maxWidth: 720 }}>
          {row('Appearance', 'Light or dark interface', <button className="btn btn-secondary" onClick={() => start(async () => { await setTheme(dark ? 'light' : 'dark'); router.refresh(); })}>{t(dark ? 'Switch to light' : 'Switch to dark')}</button>)}
          {row('Your data scope', vm.user.scope, <Tag>{t(vm.user.title)}</Tag>)}
          {row('Governance settings', 'Users, policies, AI governance and audit are managed by your platform administrator.', <Tag>{t('Admin only')}</Tag>)}
        </div>
      )}
    </div>
  );
}
