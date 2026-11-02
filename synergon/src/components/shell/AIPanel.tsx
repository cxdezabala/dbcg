'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { useUI } from './UIProvider';
import s from './shell.module.css';

export function AIPanel({ context, suggestions }: { context: string; suggestions: string[] }) {
  const t = useT();
  const { aiOpen, setAiOpen, msgs, thinking, ask, aiCtx } = useUI();
  const [input, setInput] = useState('');
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [msgs, thinking]);
  if (!aiOpen) return null;
  const send = () => { ask(input); setInput(''); };
  return (
    <aside className={s.ai} aria-label="SYNERGON AI">
      <div className={s.aiHead}>
        <div>
          <div className={s.aiBrand}><span className={s.aiMark} />SYNERGON AI</div>
          <div style={{ fontSize: 12, marginTop: 4 }} className="text-muted">{t('Context:')} {context.split(' · ').map(t).join(' · ')}{aiCtx.label ? ' · ' + aiCtx.label : ''}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" style={{ justifyContent: 'center' }} title={t('Close')} aria-label={t('Close')} onClick={() => setAiOpen(false)}><X size={18} /></button>
      </div>
      <div className={s.aiBody} ref={body} data-testid="ai-messages">
        {!msgs.length && <div style={{ fontSize: 14 }} className="text-muted">{t('I understand your active module, selection and role. Ask anything, or start with a suggestion below.')}</div>}
        {msgs.map((m, i) => m.who === 'user'
          ? <div key={i} className={s.aiUser}>{m.text}</div>
          : (
            <div key={i} className={s.aiAnswer} data-testid="ai-answer">
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.text}</div>
              {m.lines.map((l, j) => <div key={j} className={s.aiLine}>{l}</div>)}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{m.sources.map((x, j) => <span key={j} className="tag tag-neutral">{x}</span>)}</div>
              <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
                {t(m.engine === 'anthropic' ? 'AI-generated · grounded in authorised data' : 'Simulated response · grounded in demo data')}
              </span>
            </div>
          ))}
        {thinking && <div style={{ fontSize: 13 }} className="text-muted">{t('Analysing authorised context…')}</div>}
      </div>
      <div className={s.aiFoot}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {suggestions.slice(0, 3).map(q => <button key={q} type="button" className={s.aiSuggest} onClick={() => ask(q)}>{t(q)}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder={t('Ask SYNERGON AI…')} aria-label={t('Ask SYNERGON AI…')} />
          <button type="button" className="btn btn-primary" onClick={send}>{t('Send')}</button>
        </div>
        <div style={{ fontSize: 11 }} className="text-muted">{t('Responses respect your role’s permissions. Every answer cites its sources and labels hypotheses.')}</div>
      </div>
    </aside>
  );
}
