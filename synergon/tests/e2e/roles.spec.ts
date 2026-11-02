// Role-based access, end to end: screens, API and AI for each demo role.
import { test, expect } from '@playwright/test';
import { loginAs, apiAs, type Role } from './helpers';

const VIEWS = ['home', 'ci', 'radar', 'studio', 'growth', 'collab', 'command', 'settings'] as const;
const ALLOWED: Record<Role, string[]> = { exec: VIEWS.filter(v => v !== 'command'), lead: [...VIEWS], director: [...VIEWS], admin: ['settings'] };
const TITLE: Record<string, RegExp> = { home: /Good (morning|afternoon|evening)/, ci: /Account Intelligence Workspace/, radar: /Client & Market Intelligence/, studio: /Solution Design Studio/, growth: /Growth Workspace/, collab: /Collaboration & Expertise/, command: /(Leadership|Team) Intelligence/, settings: /Settings/ };

for (const role of ['exec', 'lead', 'director', 'admin'] as Role[]) {
  test(`${role}: navigation, views and API scope`, async ({ page, request }) => {
    await loginAs(page, role);
    for (const v of VIEWS) {
      await page.goto('/' + v);
      if (ALLOWED[role].includes(v)) await expect(page.locator('h1')).toHaveText(TITLE[v]);
      else await expect(page).toHaveURL(new RegExp('denied=' + v));
    }
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByText('Leadership layer')).toHaveCount(role === 'lead' || role === 'director' ? 1 : 0);

    const status = async (p: string) => (await apiAs(request, page, p)).status();
    if (role === 'admin') {
      for (const p of ['/api/accounts', '/api/accounts/meridian', '/api/pipeline', '/api/solutions', '/api/knowledge', '/api/command', '/api/signals']) expect(await status(p), p).toBe(403);
      expect(await status('/api/audit')).toBe(200);
      const s = await (await apiAs(request, page, '/api/search?q=meridian')).json();
      expect(s.results).toEqual([]);
    } else {
      expect(await status('/api/audit')).toBe(403);
      expect(await status('/api/accounts/atlas')).toBe(role === 'director' ? 200 : 403);
      expect(await status('/api/accounts/northstar')).toBe(role === 'exec' ? 403 : 200);
      expect(await status('/api/command')).toBe(role === 'exec' ? 403 : 200);
      const p = await (await apiAs(request, page, '/api/pipeline')).json();
      if (role === 'exec') expect(p.scope.rows.every((r: { owner: string }) => r.owner === 'Javier Morales')).toBe(true);
      if (role === 'lead') expect(new Set(p.scope.rows.map((r: { team: string }) => r.team))).toEqual(new Set(['Enterprise · Iberia & UK']));
      const s = await (await apiAs(request, page, '/api/search?q=atlas')).json();
      const atlas = s.results.find((r: { kind: string; label: string }) => r.kind === 'Account');
      if (role !== 'director') expect(atlas.href).toBeNull();
    }
  });
}

test('admin asking SYNERGON AI about business content gets the refusal', async ({ page }) => {
  await loginAs(page, 'admin');
  const res = await page.request.post('/api/ai', { data: { q: 'What risks do you see on Meridian?', view: 'ci', ctx: { acct: 'meridian' } } });
  const txt = await res.text();
  expect(txt).toContain('As Platform Administrator you manage configuration, not business content.');
  expect(txt).not.toContain('Elena Vidal');
});

test('EN/ES switch translates the interface', async ({ page }) => {
  await loginAs(page, 'exec');
  await page.goto('/ci');
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'ES' }).click();
  await expect(page.locator('h1')).toHaveText('Espacio de Inteligencia de Cuentas');
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText('Inteligencia Comercial IA');
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'EN' }).click();
  await expect(page.locator('h1')).toHaveText('Account Intelligence Workspace');
});

test('minimum group size is enforced in SYNERGON Command', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/settings?tab=policies');
  await page.getByRole('group', { name: 'Minimum aggregation group size' }).getByRole('button', { name: '10' }).click();
  await expect(page.getByRole('status')).toContainText('suppresses groups < 10');
  await loginAs(page, 'director');
  await page.goto('/command');
  await expect(page.getByTestId('heat-row').filter({ hasText: 'Gulf Energy' }).locator('[data-suppressed]')).toHaveCount(8);
  await loginAs(page, 'admin');
  await page.goto('/settings?tab=policies');
  await page.getByRole('group', { name: 'Minimum aggregation group size' }).getByRole('button', { name: '5' }).click();
  await expect(page.getByRole('status')).toContainText('suppresses groups < 5');
});
