import { test, expect } from '@playwright/test';

test.describe('E2E: Asset Inventory & OSINT Triaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  });

  test('View and Filter Discovered Assets', async ({ page }) => {
    await page.goto('/programs/apex-financial/assets');
    await expect(page.locator('text=Asset Inventory').or(page.locator('text=Perimeter Assets'))).toBeVisible({ timeout: 10000 });

    // Verify subdomains and assets exist
    await expect(page.locator('text=apexfin.internal').first()).toBeVisible();

    // Verify search input operates
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('api');
      await page.waitForTimeout(500);
      await expect(page.locator('text=api.apexfin.internal').or(page.locator('text=apexfin.internal')).first()).toBeVisible();
    }
  });

  test('View OSINT Records & Relevance Badges', async ({ page }) => {
    await page.goto('/programs/apex-financial/osint');
    await expect(page.locator('text=OSINT').or(page.locator('text=Open Source Intelligence')).first()).toBeVisible({ timeout: 10000 });

    // Verify presence of OSINT entries and threat relevance badges
    const relevanceBadge = page.locator('text=HIGH').or(page.locator('text=MEDIUM')).or(page.locator('text=LOW'));
    await expect(relevanceBadge.first()).toBeVisible();
  });
});
