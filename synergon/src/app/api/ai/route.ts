import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getLocale } from 'next-intl/server';
import { getViewer, type Viewer } from '@/server/session';
import { db } from '@/server/db';
import { audit } from '@/server/audit';
import { buildAiContext, type ClientCtx } from '@/server/ai/context';
import { answer, formatAnswer, ADMIN_REFUSAL } from '@/lib/ai-fallback';
import { parseAnswer } from '@/lib/ai-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Model pinned by the product spec; override with ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const enc = new TextEncoder();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function systemPrompt(v: Viewer, view: string, entity: string, grounding: unknown, locale: string) {
  return [
    'You are SYNERGON AI, the assistant of SYNERGON — a commercial-intelligence platform for professional-services firms (consulting and executive education).',
    `The user is ${v.name}, ${v.title}. Role: ${v.role}. Active module: ${view}. Active entity: ${entity}.`,
    'You may ONLY use the authorised context below. It has already been filtered by the server for this role; if the answer is not in it, say that it is outside the authorised scope. Never invent accounts, people or figures.',
    'Leadership information is aggregated only; never reveal individual-level or private 1:1 collaboration content. Salesforce is read-only: you interpret CRM data, you do not change it.',
    'Answer format (plain text, no markdown headings or bold):',
    'Line 1: one short summary sentence.',
    'Then 2–6 lines, each starting with "- ".',
    'Last line: "Sources: " followed by the sources you used separated by "; " (e.g. CRM · Meridian Financial Group; Radar360 · S1).',
    'Prefix any inference that is not directly supported by the data with "Hypothesis:".',
    locale === 'es' ? 'Respond in Spanish.' : 'Respond in English.',
    'All data is fictional demonstration data (Asterion Business Solutions).',
    '<authorised_context>', JSON.stringify(grounding), '</authorised_context>',
  ].join('\n');
}

async function persist(v: Viewer, view: string, q: string, raw: string, engine: string) {
  const parsed = parseAnswer(raw);
  const conv = (await db.aiConversation.findFirst({ where: { userId: v.id, view }, orderBy: { createdAt: 'desc' } })) || (await db.aiConversation.create({ data: { userId: v.id, view } }));
  await db.aiMessage.createMany({ data: [{ conversationId: conv.id, who: 'user', text: q, lines: [], sources: [] }, { conversationId: conv.id, who: 'ai', text: parsed.text, lines: parsed.lines, sources: parsed.sources, engine }] });
  const org = await db.organization.findUnique({ where: { id: v.orgId } });
  // Every AI call is audited; prompt/answer content only when the AI-governance policy allows it.
  await audit(v.name, 'AI query (' + engine + ')', view, 'AI', org?.aiLogContent ? 'Q: ' + q.slice(0, 500) + ' — A: ' + parsed.text.slice(0, 500) : null);
}

export async function POST(req: Request) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { q?: string; view?: string; ctx?: ClientCtx };
  const q = String(body.q || '').trim().slice(0, 2000);
  if (!q) return NextResponse.json({ error: 'empty question' }, { status: 400 });
  const { view, ctx, grounding, entity } = await buildAiContext(v, String(body.view || 'home'), body.ctx || {});
  const locale = await getLocale();

  // Admins never reach the model with business questions — same refusal as the prototype.
  const deterministic = v.role === 'admin' && (view !== 'settings' || String(body.view || 'settings') !== 'settings') ? ADMIN_REFUSAL : null;
  const key = process.env.ANTHROPIC_API_KEY;

  if (key && !deterministic) {
    try {
      const client = new Anthropic({ apiKey: key });
      const stream = client.messages.stream({ model: MODEL, max_tokens: 2048, system: systemPrompt(v, view, entity, grounding, locale), messages: [{ role: 'user', content: q }] });
      const it = stream[Symbol.asyncIterator]();
      const first = await it.next(); // surfaces auth / availability errors before committing to the stream
      let raw = '';
      const out = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for (let r = first; !r.done; r = await it.next()) {
              const ev = r.value;
              if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { raw += ev.delta.text; controller.enqueue(enc.encode(ev.delta.text)); }
            }
          } catch (e) {
            const msg = '\n- The response was interrupted (' + (e instanceof Anthropic.APIError ? e.status : 'network') + ').';
            raw += msg; controller.enqueue(enc.encode(msg));
          }
          controller.close();
          await persist(v, view, q, raw, 'anthropic');
        },
      });
      return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-synergon-engine': 'anthropic', 'cache-control': 'no-store' } });
    } catch (e) {
      console.warn('SYNERGON AI: Anthropic unavailable, using fallback —', e instanceof Anthropic.APIError ? e.status + ' ' + e.message : e);
    }
  }

  // Deterministic fallback (port of synergon-ai.js), streamed line by line.
  const raw = formatAnswer(deterministic || answer(q, ctx));
  const latency = Number(process.env.AI_FALLBACK_LATENCY_MS ?? 600);
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      await sleep(latency);
      for (const line of raw.split('\n')) { controller.enqueue(enc.encode(line + '\n')); await sleep(Math.min(80, latency / 6)); }
      controller.close();
      await persist(v, view, q, raw, 'fallback');
    },
  });
  return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-synergon-engine': 'fallback', 'cache-control': 'no-store' } });
}
