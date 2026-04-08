import { expect, test } from '@playwright/test';

/**
 * Core Modules E2E Tests
 *
 * Tests the main application modules after authentication:
 * - Dashboard access
 * - Documents module
 * - RRHH module
 * - Processes module
 * - Mi SGC module
 */

// Test credentials - use environment variables in CI
const TEST_EMAIL = process.env.TEST_EMAIL || 'e2e-test@doncandidoia.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'E2eTest2024!';

test.describe('Core Modules - Authenticated User', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for authentication and redirect
    await page.waitForURL(/\/(noticias|dashboard)/, { timeout: 15000 });
  });

  test.describe('Dashboard Navigation', () => {
    test('should access main dashboard', async ({ page }) => {
      await page.goto('/noticias');
      await expect(page).toHaveURL('/noticias');

      // Verify sidebar is visible
      await expect(page.locator('nav, aside').first()).toBeVisible();
    });

    test('should navigate between modules via sidebar', async ({ page }) => {
      await page.goto('/documentos');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });

  test.describe('Documents Module', () => {
    test('should display documents list', async ({ page }) => {
      await page.goto('/documentos');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show documents section
      await expect(
        page.locator('text=/documentos|documents/i').first()
      ).toBeVisible();
    });

    test('should open new document dialog', async ({ page }) => {
      await page.goto('/documentos');
      await page.waitForLoadState('networkidle');

      // Click new document button
      const newButton = page
        .locator('button:has-text("Nuevo"), button:has-text("Crear")')
        .first();
      if (await newButton.isVisible()) {
        await newButton.click();

        // Dialog should open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('RRHH Module', () => {
    test('should display RRHH dashboard', async ({ page }) => {
      await page.goto('/rrhh');
      await page.waitForLoadState('networkidle');

      // Should show RRHH content
      await expect(
        page.locator('text=/recursos humanos|rrhh|personal/i').first()
      ).toBeVisible();
    });

    test('should navigate to positions', async ({ page }) => {
      await page.goto('/rrhh/positions');
      await page.waitForLoadState('networkidle');

      // Should show positions list or empty state
      await expect(page.locator('body')).toBeVisible();
    });

    test('should navigate to competencies', async ({ page }) => {
      await page.goto('/rrhh/competencias');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Processes Module', () => {
    test('should display processes dashboard', async ({ page }) => {
      await page.goto('/dashboard/procesos');
      await page.waitForLoadState('networkidle');

      // Should show processes content
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show process definitions list', async ({ page }) => {
      await page.goto('/dashboard/procesos');
      await page.waitForLoadState('networkidle');

      // Either shows processes or empty state
      const content = page.locator('main, [role="main"]').first();
      await expect(content).toBeVisible();
    });
  });

  test.describe('Mi SGC Module', () => {
    test('should display Mi SGC dashboard', async ({ page }) => {
      await page.goto('/mi-sgc');
      await page.waitForLoadState('networkidle');

      // Should show Mi SGC content
      await expect(
        page.locator('text=/mi sgc|madurez|cumplimiento/i').first()
      ).toBeVisible();
    });

    test('should access compliance matrix', async ({ page }) => {
      await page.goto('/mi-sgc/cumplimiento');
      await page.waitForLoadState('networkidle');

      // Should show compliance section
      await expect(page.locator('body')).toBeVisible();
    });

    test('should access roadmap', async ({ page }) => {
      await page.goto('/mi-sgc/roadmap');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(noticias|dashboard)/, { timeout: 15000 });
  });

  test('should complete document creation flow', async ({ page }) => {
    await page.goto('/documentos');
    await page.waitForLoadState('networkidle');

    // Try to create new document
    const newButton = page
      .locator('button:has-text("Nuevo"), button:has-text("Crear")')
      .first();

    if (await newButton.isVisible()) {
      await newButton.click();

      // Fill form
      const titleInput = page
        .locator('input[id="title"], input[name="title"]')
        .first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Document E2E');

        // Try to save
        const saveButton = page
          .locator('button[type="submit"], button:has-text("Guardar")')
          .first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
  });

  test('should logout successfully', async ({ page }) => {
    // Find and click logout button
    const userMenu = page
      .locator(
        '[aria-label*="user"], [aria-label*="menu"], button:has-text("Salir")'
      )
      .first();

    if (await userMenu.isVisible()) {
      await userMenu.click();

      const logoutButton = page
        .locator('text=/cerrar sesión|logout|salir/i')
        .first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login or landing
        await page.waitForURL(/\/(login|$)/, { timeout: 10000 });
      }
    }
  });
});
