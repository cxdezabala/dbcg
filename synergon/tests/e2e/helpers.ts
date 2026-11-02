import { expect, type Page, type APIRequestContext } from '@playwright/test';

export type Role = 'exec' | 'lead' | 'director' | 'admin';

export async function loginAs(page: Page, role: Role) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.click(`button[data-role="${role}"]`);
  await page.waitForURL(u => !u.pathname.startsWith('/login'));
}

/** Reset demo data through the UI (DEMO_MODE) so each spec starts from the seed. */
export async function resetDemo(page: Page) {
  await loginAs(page, 'exec');
  await page.getByRole('button', { name: /^Scenario/ }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByRole('status')).toContainText('Demo data reset');
}

export async function apiAs(request: APIRequestContext, page: Page, path: string) {
  const cookies = (await page.context().cookies()).map(c => c.name + '=' + c.value).join('; ');
  return request.get(path, { headers: { cookie: cookies }, maxRedirects: 0 });
}

export async function scenarioCount(page: Page) {
  const txt = await page.getByRole('button', { name: /^Scenario/ }).innerText();
  return Number(txt.match(/(\d)\/8/)![1]);
}
