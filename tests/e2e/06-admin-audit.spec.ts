import { test, expect } from '@playwright/test';

test.describe('E2E: Administration & Immutable Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  });

  test('Admin Access to User Management Directory', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('text=System Users & RBAC Provisioning').or(page.locator('text=System Users'))).toBeVisible({ timeout: 10000 });

    // Verify bootstrapped administrator appears in list
    await expect(page.locator('text=admin@reconflow.local')).toBeVisible();
  });

  test('Admin Access to System Audit Ledger & Export', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await expect(page.locator('h1:has-text("Tamper-Evident"), h1:has-text("Audit Ledger")').first()).toBeVisible({ timeout: 10000 });

    // Verify presence of audit actions (e.g. USER_LOGIN or FINDING)
    const auditActionBadge = page.locator('text=USER_LOGIN').or(page.locator('text=FINDING')).or(page.locator('text=SECURITY'));
    await expect(auditActionBadge.first()).toBeVisible({ timeout: 10000 });

    // Verify export buttons are present
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
  });

  test('Admin Access to Security Policies & Settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.locator('text=Platform Security Policies & Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Passphrase & Session Hardening')).toBeVisible();
  });
});
