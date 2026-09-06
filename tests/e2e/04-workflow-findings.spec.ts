import { test, expect } from '@playwright/test';

test.describe('E2E: Reconnaissance Workflow & Vulnerability Findings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  });

  test('View Reconnaissance Workflow Phases', async ({ page }) => {
    await page.goto('/programs/apex-financial/workflow');
    await expect(page.locator('text=Workflow').or(page.locator('text=Methodology Phases')).first()).toBeVisible({ timeout: 10000 });

    // Verify presence of standard recon phases
    await expect(page.locator('text=Passive OSINT').or(page.locator('text=DNS')).first()).toBeVisible();
  });

  test('View Vulnerability Findings with Severity & CVSS Metrics', async ({ page }) => {
    await page.goto('/programs/apex-financial/findings');
    await expect(page.locator('text=Vulnerability Findings').or(page.locator('text=Security Findings')).first()).toBeVisible({ timeout: 10000 });

    // Verify finding items are present
    const findingItem = page.locator('text=CRITICAL').or(page.locator('text=HIGH')).or(page.locator('text=CVSS'));
    await expect(findingItem.first()).toBeVisible();
  });
});
