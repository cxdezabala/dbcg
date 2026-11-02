'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Moon, Sun, Bell, Sparkles, LogOut } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cx } from '@/lib/cx';
import { setLocale, setTheme, markAllNotificationsRead, markNotificationRead, resetDemo, scenarioGo, logout } from '@/server/actions/shell';
import { useUI } from './UIProvider';
import type { ScenarioStep } from '@/server/scenario';
import s from './shell.module.css';

export interface NotifVM { id: string; text: string; time: string; unread: boolean; view: string; allowed: boolean }
interface Result { kind: string; label: string; href: string | null; restricted?: string }

export function Topbar(p: {
  isAdmin: boolean; user: { name: string; initials: string }; locale: 'en' | 'es'; theme: 'light' | 'dark'; demo: boolean;
  notifs: NotifVM[]; scenario: { steps: ScenarioStep[]; doneCount: number; current: number };
}) {
  const t = useT();
  const router = useRouter();
  const { toast, aiOpen, setAiOpen } = useUI();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [open, setOpen] = useState<null | 'notif' | 'scen'>(null);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qq = q.trim();
    if (qq.length < 2) { setResults(null); return; }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch('/api/search?q=' + encodeURIComponent(qq), { signal: ctl.signal }).then(r => r.json()).then(d => setResults(d.results || [])).catch(() => {});
    }, 150);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setOpen(null); setResults(null); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const unread = p.notifs.filter(n => n.unread).length;
  const sc = p.scenario;
  const next = sc.current < 0 ? 1 : sc.current + 1;
  const nextLabel = sc.current < 0 ? 'Restart from step 1' : 'Step ' + next + ': ' + sc.steps[sc.current].title;

  return (
    <header className={s.header} ref={wrap}>
      <div className={s.search}>
        <div className={s.searchBox}>
          <Search size={16} aria-hidden />
          <input className={s.searchInput} value={q} onChange={e => setQ(e.target.value)} aria-label={t('Search')}
            placeholder={t(p.isAdmin ? 'Search users, policies, integrations…' : 'Search accounts, signals, experts, solutions…')} />
        </div>
        {results && (
          <div className={s.dropLeft} role="listbox">
            {results.map((r, i) => (
              <button key={i} type="button" className={s.result} onClick={() => { if (r.href) { router.push(r.href); setQ(''); setResults(null); } else toast(r.restricted || 'Restricted — outside your authorised scope'); }}>
                <span className={s.resultKind}>{t(r.kind)}</span><span style={{ fontSize: 14 }}>{r.label}</span>
              </button>
            ))}
            {!results.length && <div style={{ padding: 12, fontSize: 13 }} className="text-muted">{t(p.isAdmin ? 'Administrators cannot search business content.' : 'No authorised results.')}</div>}
          </div>
        )}
      </div>
      <div className={s.spacer} />
      <div className="seg" style={{ display: 'flex', border: '1px solid var(--color-divider)' }} title="Language / Idioma" role="group" aria-label="Language">
        {(['en', 'es'] as const).map(l => (
          <button key={l} type="button" aria-pressed={p.locale === l} onClick={() => start(async () => { await setLocale(l); router.refresh(); })}
            style={{ all: 'unset', cursor: 'pointer', padding: '6px 9px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', background: p.locale === l ? 'var(--color-text)' : 'transparent', color: p.locale === l ? 'var(--color-bg)' : 'var(--color-text)' }}>{l.toUpperCase()}</button>
        ))}
      </div>
      {p.demo && !p.isAdmin && (
        <div className={s.relative}>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(open === 'scen' ? null : 'scen')} aria-expanded={open === 'scen'}>{t('Scenario')} {sc.doneCount}/8</button>
          {open === 'scen' && (
            <div className={cx(s.dropRight, s.scenPanel)}>
              <div className="card-kicker" style={{ color: 'var(--color-accent-700)' }}>{t('End-to-end demonstration')}</div>
              <div className={s.scenTitle}>{t('Emerging AI Transformation Opportunity')}</div>
              {sc.steps.map((st, i) => (
                <button key={st.n} type="button" className={s.step} disabled={pending} onClick={() => start(() => scenarioGo(st.n))}>
                  <span className={cx(s.stepNum, st.done && s.done, i === sc.current && s.cur)}>{st.n}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{t(st.title)}</span><span style={{ fontSize: 11 }} className="text-muted">{t(st.module)} · {t('as')} {st.who}</span></span>
                  <span style={{ fontSize: 11, color: 'var(--color-accent-700)' }}>{t(st.done ? 'Done ✓' : i === sc.current ? 'Next →' : 'Go')}</span>
                </button>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
                <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => start(async () => { await resetDemo(); setOpen(null); toast('Demo data reset'); router.refresh(); })}>{t('Reset demo data')}</button>
                <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(() => scenarioGo(next))}>{t(nextLabel)} →</button>
              </div>
            </div>
          )}
        </div>
      )}
      {p.demo && p.isAdmin && <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => start(async () => { await resetDemo(); toast('Demo data reset'); router.refresh(); })}>{t('Reset demo data')}</button>}
      <button type="button" className="btn btn-secondary btn-icon" style={{ justifyContent: 'center' }} title={t('Light / dark mode')} aria-label={t('Light / dark mode')} onClick={() => start(async () => { await setTheme(p.theme === 'dark' ? 'light' : 'dark'); router.refresh(); })}>
        {p.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className={s.relative}>
        <button type="button" className="btn btn-secondary btn-icon" style={{ justifyContent: 'center', position: 'relative' }} title={t('Notifications')} aria-label={t('Notifications')} aria-expanded={open === 'notif'} onClick={() => setOpen(open === 'notif' ? null : 'notif')}>
          <Bell size={16} />{unread > 0 && <span className={s.badge} data-testid="unread">{unread}</span>}
        </button>
        {open === 'notif' && (
          <div className={cx(s.dropRight, s.notifPanel)}>
            <div className={s.notifHead}><h6 style={{ margin: 0 }}>{t('Notifications')}</h6><button type="button" className="btn btn-ghost" onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>{t('Mark all read')}</button></div>
            <div className={s.notifList}>
              {p.notifs.map(n => (
                <button key={n.id} type="button" className={s.notif} onClick={() => start(async () => { await markNotificationRead(n.id); setOpen(null); if (n.allowed) router.push('/' + n.view); else router.refresh(); })}>
                  <span className={cx(s.notifDot, n.unread && s.unread)} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}><span style={{ fontSize: 13, lineHeight: 1.4 }}>{n.text}</span><span style={{ fontSize: 11 }} className="text-muted">{t(n.time)}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button type="button" className="btn btn-primary" aria-pressed={aiOpen} onClick={() => setAiOpen(!aiOpen)}><Sparkles size={16} fill="currentColor" aria-hidden />SYNERGON AI</button>
      <div className={s.user}>
        <div className={s.userAvatar}>{p.user.initials}</div>
        <span className={s.userName}>{p.user.name}</span>
        <button type="button" className="btn btn-ghost btn-icon" style={{ justifyContent: 'center', color: 'var(--color-text)' }} title={t('Sign out')} aria-label={t('Sign out')} onClick={() => start(() => logout())}><LogOut size={16} /></button>
      </div>
    </header>
  );
}
