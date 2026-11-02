import { getT } from '@/i18n/server';
import s from './shell.module.css';

export async function PageHeader({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  const { t } = await getT();
  return (
    <div className={s.titleBlock}>
      <div style={{ minWidth: 0 }}>
        <div className={s.viewKicker}>{t(kicker)}</div>
        <h1 className={s.viewTitle}>{t(title)}</h1>
        <p className={s.viewSub}>{t(sub)}</p>
      </div>
    </div>
  );
}
