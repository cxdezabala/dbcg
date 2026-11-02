'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useT } from '@/i18n/client';
import s from './shell.module.css';

export interface AiMsg { who: 'user' | 'ai'; text: string; lines: string[]; sources: string[]; engine?: string; streaming?: boolean }
export interface AiCtx { acct?: string; signal?: string; sol?: string; co?: string; lens?: string; label?: string }

interface UI {
  toast: (m: string) => void;
  aiOpen: boolean; setAiOpen: (o: boolean) => void;
  msgs: AiMsg[]; thinking: boolean; ask: (q: string) => void; resetAi: () => void;
  aiCtx: AiCtx; setAiCtx: (c: AiCtx) => void;
}
const Ctx = createContext<UI | null>(null);
export const useUI = () => { const c = useContext(Ctx); if (!c) throw new Error('UIProvider missing'); return c; };

/** Registers the active entity of a view (account, signal, solution…) as SYNERGON AI context. */
export function useAiContext(c: AiCtx) {
  const { setAiCtx } = useUI();
  const key = JSON.stringify(c);
  useEffect(() => { setAiCtx(JSON.parse(key)); }, [key, setAiCtx]);
}

/** Parses the streamed answer format: first line = summary, "- " lines = points, "Sources: a; b" = citations. */
export function parseAnswer(raw: string): Pick<AiMsg, 'text' | 'lines' | 'sources'> {
  const rows = raw.replace(/\r/g, '').split('\n');
  let text = ''; const lines: string[] = []; let sources: string[] = [];
  for (const r of rows) {
    const x = r.trim(); if (!x) continue;
    const src = x.match(/^(?:Sources|Fuentes)\s*:\s*(.*)$/i);
    if (src) { sources = src[1].split(';').map(s => s.trim()).filter(Boolean); continue; }
    const li = x.match(/^[-–•*]\s+(.*)$/);
    if (li) lines.push(li[1]); else if (!text) text = x; else lines.push(x);
  }
  return { text, lines, sources };
}

export function UIProvider({ children, view }: { children: ReactNode; view: string }) {
  const t = useT();
  const [toastMsg, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => { clearTimeout(timer.current); setToast(m); timer.current = setTimeout(() => setToast(null), 3400); }, []);
  const [aiOpen, setAiOpen] = useState(false);
  const [msgs, setMsgs] = useState<AiMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [aiCtx, setAiCtx] = useState<AiCtx>({});
  const pathname = usePathname();
  const ctxRef = useRef(aiCtx); ctxRef.current = aiCtx;
  const viewRef = useRef(view); viewRef.current = view;
  useEffect(() => { setAiCtx({}); }, [pathname]);
  const sp = useSearchParams();
  const denied = sp.get('denied'), as = sp.get('as');
  useEffect(() => { if (denied) toast('Restricted — outside your authorised scope'); }, [denied, toast]);
  useEffect(() => { if (as) { setMsgs([]); toast('Viewing as ' + ({ exec: 'Javier Morales — Commercial Executive', lead: 'Laura Bennett — Commercial Team Leader', director: 'Daniel Foster — Commercial Director', admin: 'Omar Haddad — Platform Administrator' } as Record<string, string>)[as]); } }, [as, toast]);

  const ask = useCallback(async (q0: string) => {
    const q = (q0 || '').trim(); if (!q) return;
    setAiOpen(true);
    setMsgs(m => [...m, { who: 'user', text: q, lines: [], sources: [] }]);
    setThinking(true);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, view: viewRef.current, ctx: ctxRef.current }) });
      if (!res.ok || !res.body) throw new Error('AI unavailable (' + res.status + ')');
      const engine = res.headers.get('x-synergon-engine') || 'fallback';
      const reader = res.body.getReader(); const dec = new TextDecoder(); let raw = ''; let started = false;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        raw += dec.decode(value, { stream: true });
        if (!started) { started = true; setThinking(false); setMsgs(m => [...m, { who: 'ai', ...parseAnswer(raw), engine, streaming: true }]); }
        else setMsgs(m => [...m.slice(0, -1), { who: 'ai', ...parseAnswer(raw), engine, streaming: true }]);
      }
      setMsgs(m => (started ? [...m.slice(0, -1), { who: 'ai', ...parseAnswer(raw), engine }] : m));
    } catch (e) {
      setMsgs(m => [...m, { who: 'ai', text: (e as Error).message, lines: [], sources: [] }]);
    } finally { setThinking(false); }
  }, []);

  return (
    <Ctx.Provider value={{ toast, aiOpen, setAiOpen, msgs, thinking, ask, resetAi: () => setMsgs([]), aiCtx, setAiCtx }}>
      {children}
      {toastMsg && <div className={s.toast} role="status">{t(toastMsg)}</div>}
    </Ctx.Provider>
  );
}
