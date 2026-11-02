'use client';
import u from '@/styles/ui.module.css';
import { cx } from '@/lib/cx';
import { useT } from '@/i18n/client';
import type { ReactNode } from 'react';

export function Seg<T extends string | number | boolean | null>({ options, value, onChange, plain, label }: { options: [T, string][]; value: T; onChange: (v: T) => void; plain?: boolean; label?: string }) {
  const t = useT();
  return (
    <div className={u.seg} role="group" aria-label={label}>
      {options.map(([id, l]) => (
        <button key={String(id)} type="button" aria-pressed={value === id} className={cx(plain ? u.segBtnPlain : u.segBtn, value === id && u.on)} onClick={() => onChange(id)}>{t(l)}</button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  const t = useT();
  return (
    <div className={u.tabs} role="tablist">
      {tabs.map(([id, l]) => (
        <button key={id} role="tab" type="button" aria-selected={value === id} className={cx(u.tab, value === id && u.on)} onClick={() => onChange(id)}>{t(l)}</button>
      ))}
    </div>
  );
}

export function SectionHead({ title, right, mb, className }: { title: ReactNode; right?: ReactNode; mb?: 0 | 4 | 6 | 10 | 12 | 14 | 16; className?: string }) {
  const m = mb === 0 ? u.mb0 : mb === 4 ? u.mb4 : mb === 10 ? u.mb10 : mb === 12 ? u.mb12 : mb === 14 ? u.mb14 : mb === 16 ? u.mb16 : undefined;
  return <div className={cx(u.sectionHead, m, className)}><h6>{title}</h6>{right}</div>;
}

export function CapsHead({ title, note, mb8 }: { title: ReactNode; note?: ReactNode; mb8?: boolean }) {
  return <div className={mb8 ? u.capsHead8 : u.capsHead}><span>{title}</span>{note != null && <span className={u.note}>{note}</span>}</div>;
}

export function Hint({ children }: { children: ReactNode }) { return <span className={u.hint}>{children}</span>; }

export function Tag({ kind = 'neutral', children, className }: { kind?: 'neutral' | 'outline' | 'accent'; children: ReactNode; className?: string }) {
  return <span className={cx('tag', 'tag-' + kind, className)}>{children}</span>;
}

export function Box({ on }: { on: boolean }) { return <span className={cx(u.box, on && u.on)} aria-hidden />; }

export function HowTo({ text }: { text: string }) {
  const t = useT();
  return <div className={u.howTo}><span className={u.howToLabel}>{t('How to act')}</span><span className={u.howToText}>{t(text)}</span></div>;
}

export function Bar({ w, color, h = 12, track = 'none' }: { w: number; color?: string; h?: number; track?: 'none' | 'light' | 'dark' }) {
  return (
    <span className={track === 'light' ? u.trackLight : track === 'dark' ? u.track : u.trackNone} style={{ display: 'block', flex: 1, height: h }}>
      <span className={u.fill} style={{ width: Math.max(0, Math.min(100, w)) + '%', background: color }} />
    </span>
  );
}
