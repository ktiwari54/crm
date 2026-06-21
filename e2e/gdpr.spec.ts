import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login?auto=1');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test('GDPR toolkit lists requests and opens new request modal', async ({ page }) => {
  await login(page);
  await page.goto('/admin/gdpr');
  await expect(page.getByRole('heading', { name: 'GDPR Toolkit' })).toBeVisible();
  await expect(page.getByText(/consent|export|delete/i).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'New Request' }).click();
  await expect(page.getByText('New GDPR Request')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
});