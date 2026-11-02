// Server-side authorisation tests: every data-access function is called directly with each role
// against the seeded database (run `pnpm db:seed` first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { seedDemo, DEMO_USERS } from '@/server/seed';
import type { Viewer, UserState } from '@/server/session';
import type { Role } from '@/lib/demo/types';
import { listAccounts, getAccount } from '@/server/data/accounts';
import { getPipelineScope } from '@/server/data/pipeline';
import { listSolutions } from '@/server/data/solutions';
import { ciPipe } from '@/server/vm/ci-pipe';
import { commandVM, heatmapRows } from '@/server/vm/command';
import { collabVM } from '@/server/vm/collab';
import { settingsVM } from '@/server/vm/settings';
import { search } from '@/server/search';
import { ForbiddenError } from '@/server/errors';

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

describe('Commercial Intelligence (CRM sharing rules)', () => {
  it('executive cannot read Northstar or Atlas', async () => {
    await expect(getAccount(V.exec, 'northstar')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getAccount(V.exec, 'atlas')).rejects.toBeInstanceOf(ForbiddenError);
    expect((await getAccount(V.exec, 'meridian')).name).toBe('Meridian Financial Group');
  });
  it('restricted accounts in the list carry no business content', async () => {
    const atlas = (await listAccounts(V.lead)).find(a => a.id === 'atlas')!;
    expect(atlas.restricted).toBe(true);
    expect(Object.keys(atlas)).not.toContain('obs');
    expect(Object.keys(atlas)).not.toContain('value');
  });
  it('team leader reads Northstar but not Atlas; director reads all', async () => {
    expect((await getAccount(V.lead, 'northstar')).id).toBe('northstar');
    await expect(getAccount(V.lead, 'atlas')).rejects.toBeInstanceOf(ForbiddenError);
    expect((await listAccounts(V.director)).every(a => !a.restricted)).toBe(true);
  });
});

describe('Pipeline scope', () => {
  it('executive only receives their own opportunities', async () => {
    const s = await getPipelineScope(V.exec);
    expect(s.teams).toHaveLength(0);
    expect(s.self!.name).toBe('Javier Morales');
    const vm = ciPipe(s, {});
    expect(vm.showOwner).toBe(false);
    expect(vm.rows).toHaveLength(6);
  });
  it('team leader only receives their team', async () => {
    const s = await getPipelineScope(V.lead);
    expect(s.teams.map(t => t.id)).toEqual(['eiu']);
    expect(new Set(ciPipe(s, {}).rows.map(r => r.team))).toEqual(new Set(['Enterprise · Iberia & UK']));
  });
  it('director receives every team', async () => {
    expect((await getPipelineScope(V.director)).teams).toHaveLength(6);
  });
});

describe('Administrator never reads business content', () => {
  it.each([
    ['accounts', () => listAccounts(V.admin)], ['account', () => getAccount(V.admin, 'meridian')], ['pipeline', () => getPipelineScope(V.admin)],
    ['solutions', () => listSolutions(V.admin)], ['command', () => commandVM(V.admin)], ['collaboration', () => collabVM(V.admin, {})],
  ])('%s → Forbidden', async (_, fn) => { await expect(fn()).rejects.toBeInstanceOf(ForbiddenError); });
  it('search only returns settings entries for admins', async () => {
    expect(await search(V.admin, 'meridian')).toEqual([]);
    expect((await search(V.admin, 'audit')).every(r => r.kind === 'Settings')).toBe(true);
  });
});

describe('Leadership layer', () => {
  it('executives cannot open SYNERGON Command', async () => { await expect(commandVM(V.exec)).rejects.toBeInstanceOf(ForbiddenError); });
  it('team leader sees team scope only — no cross-team patterns or hypotheses', async () => {
    const c = await commandVM(V.lead);
    expect(c.hero).toBeNull(); expect(c.otherThemes).toEqual([]); expect(c.oppHyps).toEqual([]);
    expect(c.heat.rows.map(r => r.name)).toEqual(['Enterprise · Iberia & UK', 'Organisation average (other teams)']);
  });
  it('groups below minGroup are suppressed on the server (no values sent)', async () => {
    const rows5 = await heatmapRows(V.director, 5);
    expect(rows5.find(r => r.name === 'KSA Public Sector')!.values).toBeNull();
    const rows10 = await heatmapRows(V.director, 10);
    expect(rows10.find(r => r.name === 'Gulf Energy')!.values).toBeNull();
    expect(rows10.find(r => r.name === 'Enterprise · Iberia & UK')!.values).not.toBeNull();
  });
  it('private 1:1 request messages never appear in collaboration or leadership data', async () => {
    await db.expertRequest.create({ data: { solutionId: 'sol-horizon', expertId: 'hannah', requesterId: V.exec.id, status: 'requested', message: 'PRIVATE-NOTE-123' } });
    const c = await collabVM(V.director, {});
    expect(JSON.stringify(c)).not.toContain('PRIVATE-NOTE-123');
    expect(JSON.stringify(await commandVM(V.director))).not.toContain('PRIVATE-NOTE-123');
  });
});

describe('Settings', () => {
  it('non-admins only get integration status and preferences', async () => {
    const s = await settingsVM(V.director);
    expect(s.users).toBeNull(); expect(s.audit).toBeNull(); expect(s.org).toBeNull();
    expect((await settingsVM(V.admin)).audit!.length).toBeGreaterThan(0);
  });
});
