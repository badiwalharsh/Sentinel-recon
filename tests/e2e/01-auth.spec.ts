import { test, expect } from '@playwright/test';

test.describe('E2E: Authentication & Ethical Conduct Flow', () => {
  test('User Registration with Email Verification Flow', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/ReconFlow/i);

    const testEmail = `operator_${Date.now()}@reconflow.local`;

    // Fill registration form
    await page.fill('input[type="text"]', 'Agent Cipher');
    await page.fill('input[type="email"]', testEmail);
    
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('SuperComplex2026!#');
    await passwordInputs.nth(1).fill('SuperComplex2026!#');

    // Attempt submit without checking ethical agreement
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Ethical Use Policy').first()).toBeVisible({ timeout: 5000 });

    // Check ethical agreement
    await page.click('#ethical-check');
    await page.click('button[type="submit"]');

    // Registration navigates to verify-email with prefilled token
    await page.waitForURL(/.*verify-email/, { timeout: 15000 });
    expect(page.url()).toContain('verify-email');

    // Confirm verification
    await page.click('button[type="submit"]');

    // Successful verification navigates to dashboard
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
    expect(page.url()).toMatch(/(dashboard|programs)/);
  });

  test('Login with Bootstrapped Administrator Account', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=ReconFlow OSINT Workbench').first()).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard/programs
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
    expect(page.url()).toMatch(/(dashboard|programs)/);
  });

  test('Invalid Password Rejection', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reconflow.local');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Authentication failed').or(page.locator('text=Invalid email or password'))).toBeVisible({ timeout: 10000 });
  });
});
