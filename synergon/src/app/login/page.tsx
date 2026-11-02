import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, demoMode } from '@/auth';
import { getViewer } from '@/server/session';
import { homeFor } from '@/lib/rbac';
import { getT } from '@/i18n/server';
import { ROLE_INFO } from '@/lib/demo';
import { DEMO_USERS } from '@/server/seed';
import s from './login.module.css';

async function login(fd: FormData) {
  'use server';
  try {
    await signIn('credentials', { email: fd.get('email'), password: fd.get('password'), redirectTo: '/' });
  } catch (e) {
    if (e instanceof AuthError) redirect('/login?error=1');
    throw e;
  }
}
async function loginAs(fd: FormData) {
  'use server';
  await signIn('demo-switch', { role: String(fd.get('role')), redirectTo: '/' });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const v = await getViewer();
  if (v) redirect('/' + homeFor(v.role));
  const { error } = await searchParams;
  const { t } = await getT();
  const demo = demoMode();
  return (
    <main className={s.wrap}>
      <section className={s.panel}>
        <div className={s.brandRow}><div className={s.mark} /><div className={s.brand}>SYNERGON</div></div>
        <div className={s.tagline}>{t('Intelligence · Alignment · Exponential Capabilities Enablement')}</div>
        <h1 className={s.title}>{t('Sign in')}</h1>
        <form action={login} className={s.form}>
          <div className="field"><label htmlFor="email">{t('Email')}</label><input id="email" name="email" className="input" type="email" autoComplete="username" defaultValue={demo ? DEMO_USERS.exec.email : ''} required /></div>
          <div className="field"><label htmlFor="password">{t('Password')}</label><input id="password" name="password" className="input" type="password" autoComplete="current-password" required /></div>
          {error && <div className={s.error} role="alert">{t('Invalid email or password.')}</div>}
          <button className="btn btn-primary" type="submit">{t('Sign in')}</button>
        </form>
        {process.env.AUTH_MICROSOFT_ENTRA_ID_ID && (
          <form action={async () => { 'use server'; await signIn('microsoft-entra-id', { redirectTo: '/' }); }}>
            <button className="btn btn-secondary btn-block" type="submit">{t('Sign in with Microsoft')}</button>
          </form>
        )}
        {demo && (
          <div className={s.demo}>
            <div className={s.kicker}>{t('Demo users')}</div>
            <p className={s.note}>{t('Password for all demo users')}: <code>{process.env.DEMO_PASSWORD || 'synergon-demo'}</code></p>
            {(Object.keys(DEMO_USERS) as (keyof typeof DEMO_USERS)[]).map(r => (
              <form key={r} action={loginAs} className={s.demoRow}>
                <input type="hidden" name="role" value={r} />
                <button className={s.demoBtn} type="submit" data-role={r}>
                  <span className={s.demoName}>{ROLE_INFO[r].name}</span>
                  <span className={s.demoMeta}>{t(ROLE_INFO[r].title)} · {DEMO_USERS[r].email}</span>
                </button>
              </form>
            ))}
          </div>
        )}
        <div className={s.foot}>Asterion Business Solutions · {t('Fictional demonstration data')}</div>
      </section>
    </main>
  );
}
