import { test, expect } from '@playwright/test';

test.describe('E2E: Programs & Target Perimeter Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  });

  test('View Security Programs List & Program Overview', async ({ page }) => {
    await page.goto('/programs');
    await expect(page.locator('main').locator('text=Apex Financial').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Apex Financial overview
    await page.goto('/programs/apex-financial/overview');
    await expect(page.locator('main').locator('text=Apex Financial').first()).toBeVisible();
    await expect(page.locator('text=Total Targets').or(page.locator('text=Perimeter Assets')).first()).toBeVisible();
  });

  test('View Scoped Targets with Ethical Attestation', async ({ page }) => {
    await page.goto('/programs/apex-financial/targets');
    await expect(page.locator('text=apexfin.internal').first()).toBeVisible({ timeout: 10000 });
    
    // Check that authorization badge or status is displayed
    await expect(page.locator('text=Authorized').or(page.locator('text=In-Scope')).first()).toBeVisible();
  });
});
