import type { AiAnswer } from './ai-fallback';

/** Parses the streamed answer format: first line = summary, "- " lines = points, "Sources: a; b" = citations. */
export function parseAnswer(raw: string): AiAnswer {
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

