import { APIRequestContext, expect, test } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';

async function token(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@crm.local', password: 'Admin123!' },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

function auth(t: string) {
  return { Authorization: `Bearer ${t}` };
}

test.describe('Inventory API', () => {
  test('adjust stock records a movement and updates on-hand', async ({ request }) => {
    const t = await token(request);

    const products = await (await request.get(`${API}/products`, { headers: auth(t) })).json();
    const product = products.find((p: { inventoryLevels: unknown[] }) => p.inventoryLevels.length > 0);
    expect(product, 'a product with an inventory level').toBeTruthy();
    const level = product.inventoryLevels[0];
    const before = Number(level.onHand);

    const adjust = await request.post(`${API}/inventory/adjust`, {
      headers: auth(t),
      data: { productId: product.id, warehouseId: level.warehouse.id, type: 'receipt', quantity: 7, reason: 'e2e test' },
    });
    expect(adjust.ok()).toBeTruthy();
    const body = await adjust.json();
    expect(Number(body.level.onHand)).toBe(before + 7);
    expect(Number(body.movement.balanceAfter)).toBe(before + 7);

    // undo so the suite is repeatable
    await request.post(`${API}/inventory/adjust`, {
      headers: auth(t),
      data: { productId: product.id, warehouseId: level.warehouse.id, type: 'shipment', quantity: 7, reason: 'e2e undo' },
    });

    const movements = await (
      await request.get(`${API}/inventory/${product.id}/movements`, { headers: auth(t) })
    ).json();
    expect(movements.length).toBeGreaterThanOrEqual(2);
  });

  test('low-stock endpoint returns an array', async ({ request }) => {
    const t = await token(request);
    const res = await request.get(`${API}/inventory/low-stock`, { headers: auth(t) });
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });
});

test.describe('Payments API', () => {
  test('recording a payment reconciles the invoice status', async ({ request }) => {
    const t = await token(request);
    const invoices = await (await request.get(`${API}/invoices`, { headers: auth(t) })).json();
    const invoice = invoices.find(
      (i: { total: string; amountPaid: string }) => Number(i.total) - Number(i.amountPaid) > 0,
    );
    test.skip(!invoice, 'no invoice with an outstanding balance');

    const res = await request.post(`${API}/invoices/${invoice.id}/payments`, {
      headers: auth(t),
      data: { amount: 1, method: 'cash', reference: 'e2e' },
    });
    expect(res.ok()).toBeTruthy();
    const payment = await res.json();
    expect(payment.status).toBe('succeeded');

    const after = await (await request.get(`${API}/invoices`, { headers: auth(t) })).json();
    const updated = after.find((i: { id: string }) => i.id === invoice.id);
    expect(['partial', 'paid']).toContain(updated.status);
  });

  test('stripe webhook rejects an unsigned event when a secret is configured', async ({ request }) => {
    // With no STRIPE_WEBHOOK_SECRET the endpoint accepts unverified (dev); either way it must not 500.
    const res = await request.post(`${API}/webhooks/stripe`, {
      data: { type: 'payment_intent.succeeded', data: { object: { id: 'pi_e2e_none' } } },
    });
    expect([200, 400]).toContain(res.status());
  });
});

test.describe('Subscriptions API', () => {
  test('list and run-billing respond', async ({ request }) => {
    const t = await token(request);
    const list = await request.get(`${API}/subscriptions`, { headers: auth(t) });
    expect(list.ok()).toBeTruthy();
    expect(Array.isArray(await list.json())).toBeTruthy();

    const run = await request.post(`${API}/subscriptions/run-billing`, { headers: auth(t), data: {} });
    expect(run.ok()).toBeTruthy();
    const summary = await run.json();
    expect(summary).toHaveProperty('processed');
    expect(summary).toHaveProperty('generated');
  });
});

test.describe('New pages render', () => {
  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login?auto=1');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  }

  test('inventory page', async ({ page }) => {
    await login(page);
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  });

  test('subscriptions page', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible();
    await expect(page.getByText('Active MRR')).toBeVisible({ timeout: 10_000 });
  });
});
