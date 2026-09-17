import { test, expect } from '@playwright/test';

test.describe('E2E: Authentication & Complete User Approval Lifecycle', () => {
  test('User Registration -> Pending State -> Admin Approval -> Login Flow', async ({ browser }) => {
    // Context A: New Operator
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    await userPage.goto('/register');
    await expect(userPage).toHaveTitle(/Sentinel|Recon/i);

    const testEmail = `operator_${Date.now()}@sentinelrecon.local`;

    // Fill registration form
    await userPage.fill('input[type="text"]', 'Operator Echo');
    await userPage.fill('input[type="email"]', testEmail);
    
    const passwordInputs = userPage.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('SuperComplex2026!#');
    await passwordInputs.nth(1).fill('SuperComplex2026!#');

    // Select Requested Role
    await userPage.selectOption('select', 'ANALYST');

    // Check ethical agreement
    await userPage.click('#ethical-check');
    await userPage.click('button[type="submit"]');

    // Registration shows Pending Approval state
    await expect(userPage.locator('text=Registration Pending Approval')).toBeVisible({ timeout: 10000 });
    await expect(userPage.locator('text=PENDING REVIEW')).toBeVisible();

    // Context B: Admin Context
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await adminPage.goto('/login');
    await adminPage.fill('input[type="email"]', 'admin@sentinelrecon.local');
    await adminPage.fill('input[type="password"]', 'Admin@Sentinel2026!');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/.*(dashboard|programs|admin)/, { timeout: 15000 });

    // Admin opens User Management
    await adminPage.goto('/admin/users');
    await expect(adminPage.locator(`text=${testEmail}`)).toBeVisible({ timeout: 10000 });

    // Admin clicks "Approve Clearance"
    const userRow = adminPage.locator(`tr:has-text("${testEmail}")`);
    await userRow.locator('button:has-text("Approve")').click();

    // Confirm in approval modal
    await adminPage.locator('button:has-text("Approve & Grant Clearance")').click();
    await expect(adminPage.locator('text=successfully approved')).toBeVisible({ timeout: 10000 });

    // Now User logs in
    await userPage.goto('/login');
    await userPage.fill('input[type="email"]', testEmail);
    await userPage.fill('input[type="password"]', 'SuperComplex2026!#');
    await userPage.click('button[type="submit"]');

    // User successfully enters dashboard
    await userPage.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
    expect(userPage.url()).toMatch(/(dashboard|programs)/);

    await userContext.close();
    await adminContext.close();
  });

  test('Login with Bootstrapped Administrator Account', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=SentinelRecon').or(page.locator('text=ReconFlow')).first()).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"]', 'admin@sentinelrecon.local');
    await page.fill('input[type="password"]', 'Admin@Sentinel2026!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard/programs
    await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
    expect(page.url()).toMatch(/(dashboard|programs)/);
  });

  test('Invalid Password Rejection', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@sentinelrecon.local');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Authentication failed').or(page.locator('text=Invalid email or password'))).toBeVisible({ timeout: 10000 });
  });
});
