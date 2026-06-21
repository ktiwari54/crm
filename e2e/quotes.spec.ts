import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login?auto=1');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test('quotes page lists seeded quotes', async ({ page }) => {
  await login(page);
  await page.goto('/quotes');
  await expect(page.getByRole('heading', { name: 'Quotes' })).toBeVisible();
  await expect(page.getByText('Q-2026-00001')).toBeVisible({ timeout: 10_000 });
});