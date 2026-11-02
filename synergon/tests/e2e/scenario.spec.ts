// End-to-end guided demo: "Emerging AI Transformation Opportunity" — runs without an API key (fallback AI).
import { test, expect } from '@playwright/test';
import { loginAs, resetDemo, scenarioCount } from './helpers';

test('guided scenario completes 8/8 across executive and director', async ({ page }) => {
  await resetDemo(page);
  await expect.poll(async () => { await page.reload(); return scenarioCount(page); }).toBe(0);

  // 1 · Account intelligence (Javier)
  await page.goto('/ci?acct=meridian');
  await expect(page.getByRole('heading', { name: 'Meridian Financial Group' })).toBeVisible();
  await expect.poll(async () => { await page.reload(); return scenarioCount(page); }).toBe(1);

  // AI on the account (fallback, cites sources)
  await page.getByRole('button', { name: 'Ask SYNERGON AI', exact: true }).click();
  await expect(page.getByTestId('ai-answer').first()).toContainText('Briefing for your next meeting with Meridian Financial Group');
  await expect(page.getByTestId('ai-answer').first()).toContainText('CRM · interactions');
  await page.getByRole('button', { name: 'Close' }).first().click();

  // 2 · Connect market signal S1 to Meridian (Radar360)
  await page.goto('/radar?tab=dossier&co=meridian&dtab=overview');
  await page.getByTestId('connect-s1').click();
  await expect(page.getByTestId('connect-s1')).toHaveText('Connected to account ✓');
  await expect(page.getByText('Reported').first()).toBeVisible();
  await expect(page.getByText('Estimated ±20%').first()).toBeVisible();

  // 3 · Frame the solution (Studio)
  await page.goto('/ci?acct=meridian');
  await page.getByTestId('send-to-studio').click();
  await page.waitForURL(/\/studio\?sol=/);
  await expect(page.getByRole('heading', { name: 'AI-enabled Customer Operations' })).toBeVisible();
  await page.getByTestId('sol-next').click(); // → stage 2
  await page.getByTestId('frame').click();
  await expect(page.getByText('Root problem', { exact: true })).toBeVisible();

  // 4 · Mobilise expertise (Sofia Chen)
  await page.getByRole('button', { name: /05\s*Expert collaboration/ }).click();
  await page.getByTestId('request-sofia').click();
  await expect(page.getByTestId('sofia-contribution')).toBeVisible({ timeout: 30_000 });

  // 5 · Learn in the flow of work
  await page.goto('/growth');
  await page.getByRole('button', { name: /Value-based selling for AI transformation/ }).first().click();
  for (let i = 0; i < 3; i++) await page.getByRole('dialog').getByRole('button', { name: /^(Next|Knowledge check)$/ }).click();
  await page.getByTestId('quiz-0-1').click();
  await page.getByTestId('quiz-1-0').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Complete lesson' }).click();
  await expect(page.getByRole('dialog')).toContainText('Lesson completed — 2 of 2 correct');
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('learning-completed')).toContainText('4');
  await expect(page.getByTestId('demonstrated')).toContainText('1'); // completion ≠ demonstrated capability
  expect(await scenarioCount(page)).toBe(5);

  // 6 · Detect the pattern & 7 · Launch initiative (Daniel)
  await loginAs(page, 'director');
  await page.goto('/command?theme=t1');
  await expect(page.getByTestId('theme-t1')).toContainText('7 executives across 3 business units');
  await page.getByTestId('create-initiative').click();
  await page.getByTestId('launch-initiative').click();
  await expect(page.getByRole('status')).toContainText('Initiative launched');
  await expect.poll(async () => { await page.reload(); return scenarioCount(page); }).toBe(7);

  // 8 · Organizational alignment (Javier sees the initiative on Home)
  await loginAs(page, 'exec');
  await page.goto('/home');
  await expect(page.getByTestId('initiative-banner')).toContainText('AI Customer Operations Proposition');
  await expect.poll(async () => { await page.reload(); return scenarioCount(page); }).toBe(8);
});
