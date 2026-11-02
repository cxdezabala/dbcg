import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { loadReference } from './reference';
import { answer, formatAnswer, ADMIN_REFUSAL } from '@/lib/ai-fallback';
import { parseAnswer } from '@/lib/ai-parse';
import { seedDemo, DEMO_USERS } from '@/server/seed';
import { buildAiContext } from '@/server/ai/context';
import type { Viewer, UserState } from '@/server/session';
import type { Role } from '@/lib/demo/types';

const ref = loadReference();
const db = new PrismaClient();
const V: Record<Role, Viewer> = {} as never;
beforeAll(async () => {
  await seedDemo(db);
  for (const r of ['exec', 'lead', 'director', 'admin'] as Role[]) {
    const u = await db.user.findUniqueOrThrow({ where: { id: DEMO_USERS[r].id } });
    V[r] = { id: u.id, role: r, teamId: u.teamId, orgId: u.orgId, name: u.name, first: u.name.split(' ')[0], title: u.title, initials: u.initials, scope: u.scope, state: u.state as UserState };
  }
});
afterAll(async () => { await db.$disconnect(); });

describe('SYNERGON AI fallback (port of synergon-ai.js)', () => {
  it('matches the prototype answers for every suggested question', async () => {
    const cases: [Role, string, Record<string, string>][] = [['exec', 'home', {}], ['exec', 'ci', { acct: 'meridian' }], ['exec', 'studio', {}], ['exec', 'growth', {}], ['exec', 'collab', {}], ['director', 'command', {}], ['lead', 'command', {}]];
    for (const [role, view, c] of cases) {
      const { ctx } = await buildAiContext(V[role], view, c);
      for (const q of ref.SYNAI.SUGGEST[view]) {
        const r = ref.SYNAI.answer(q, { view, role, acct: c.acct || 'meridian', signal: 's1', linked: {}, minGroup: 5, audit: [], sofia: false, bcStep: '€0.46M', t1count: 6, dossier: null });
        expect(answer(q, { ...ctx, bcStep: '€0.46M' }), `${role}/${view}: ${q}`).toEqual(JSON.parse(JSON.stringify(r)));
      }
    }
  });
  it('admin gets the prototype refusal outside Settings', () => {
    expect(answer('What risks do you see on Meridian?', { view: 'ci', role: 'admin', minGroup: 5 })).toEqual(ADMIN_REFUSAL);
    expect(ADMIN_REFUSAL.text).toBe(ref.SYNAI.answer('x', { view: 'ci', role: 'admin' }).text);
  });
  it('wire format round-trips text, lines and sources', () => {
    const a = { text: 'Hello', lines: ['one', 'two'], sources: ['CRM', 'Radar360 · S1'] };
    expect(parseAnswer(formatAnswer(a))).toEqual(a);
  });
});

describe('AI context only contains authorised data', () => {
  it('admin context has no business content', async () => {
    const { grounding, view } = await buildAiContext(V.admin, 'ci', { acct: 'meridian' });
    expect(view).toBe('settings');
    const s = JSON.stringify(grounding);
    expect(s).not.toContain('Meridian'); expect(s).not.toContain('Elena Vidal');
  });
  it('executive context never includes restricted accounts', async () => {
    const { grounding, ctx } = await buildAiContext(V.exec, 'ci', { acct: 'atlas' });
    const s = JSON.stringify(grounding) + JSON.stringify(ctx);
    // (public market signals may mention company names; CRM content of restricted accounts must not appear)
    expect(s).not.toContain('Faisal Al-Otaibi'); expect(s).not.toContain('stated board priority'); expect(s).not.toContain('Grace Whitfield'); expect(s).not.toContain('board approved scale-up');
  });
  it('team leader command context has no cross-team themes', async () => {
    const { grounding } = await buildAiContext(V.lead, 'command', {});
    expect(JSON.stringify(grounding)).toContain('visible to the Commercial Director only');
  });
});
