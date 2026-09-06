import { test, expect } from '@playwright/test';

test.describe('E2E: Target Intelligence & OSINT Search Engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  });

  test('Execute Intelligence Search Query & View Results', async ({ page }) => {
    await page.goto('/programs/apex-financial/intelligence');
    await expect(page.locator('text=Target Intelligence').or(page.locator('text=Intelligence & OSINT Search'))).toBeVisible({ timeout: 10000 });

    // Look for search input or query templates
    const searchInput = page.locator('input[placeholder*="query" i], input[placeholder*="Search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('apexfin.internal data breach');
      const submitBtn = page.locator('button:has-text("Search"), button:has-text("Run Query")');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify presence of intelligence records or results
    await expect(page.locator('text=Security Relevance').or(page.locator('text=RELEVANCE')).or(page.locator('text=apexfin')).first()).toBeVisible({ timeout: 10000 });
  });
});
