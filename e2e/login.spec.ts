import { expect, test } from '@playwright/test';

test('login with credentials redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@crm.local');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('SSO stub button reaches callback and dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Sign in with Microsoft/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});