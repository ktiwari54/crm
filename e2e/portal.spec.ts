import { expect, test } from '@playwright/test';

test('partner portal loads with demo token', async ({ page }) => {
  await page.goto('/portal?token=demo-portal-token-brightwave');
  await expect(page.getByText(/BrightWave|portal/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/quote|order|case/i).first()).toBeVisible({ timeout: 15_000 });
});