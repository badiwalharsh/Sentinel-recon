import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/badiw/.gemini/antigravity-ide/brain/d4a2b8d0-0503-4dc4-a7d7-d8adce746143';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('1. Capturing landing page...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page.png') });

  console.log('2. Capturing clean operator login page (no demo accounts)...');
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_login_clean.png') });

  console.log('3. Capturing operator registration page (default role Analyst)...');
  await page.goto('http://localhost:3000/register');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_register_page.png') });

  console.log('4. Capturing email verification page...');
  await page.goto('http://localhost:3000/verify-email?email=analyst@reconflow.local&token=9c4a8f2e1d7b3a6e');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_verify_email.png') });

  console.log('Authenticating as bootstrapped admin...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@reconflow.local');
  await page.fill('input[type="password"]', 'Admin@ReconFlow2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(dashboard|programs)/, { timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log('5. Capturing program overview dashboard...');
  await page.goto('http://localhost:3000/programs/apex-financial/overview');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_program_dashboard.png') });

  console.log('6. Capturing target detail & scoped assets...');
  await page.goto('http://localhost:3000/programs/apex-financial/targets/target_apex_01');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_target_detail.png') });

  console.log('7. Capturing workflow methodology phases...');
  await page.goto('http://localhost:3000/programs/apex-financial/workflow');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_workflow_phases.png') });

  console.log('8. Capturing target intelligence & OSINT search...');
  await page.goto('http://localhost:3000/programs/apex-financial/intelligence');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_target_intelligence.png') });

  console.log('9. Capturing admin user directory & RBAC...');
  await page.goto('http://localhost:3000/admin/users');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_admin_users.png') });

  console.log('10. Capturing immutable system audit log ledger with export buttons...');
  await page.goto('http://localhost:3000/admin/audit-logs');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_admin_audit_logs.png') });

  console.log('11. Capturing admin security policies & settings...');
  await page.goto('http://localhost:3000/admin/settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_admin_settings.png') });

  await browser.close();
  console.log('All ReconFlow visual evidence screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
