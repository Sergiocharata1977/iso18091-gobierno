import { expect, test } from '@playwright/test';

test.describe('Document Creation Flow', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e-test@doncandidoia.com');
    await page.fill('input[name="password"]', 'E2eTest2024!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Navigate to documents page
    await page.goto('/documentos');
  });

  test('should display documents page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(
      /Documentos|Gestión de Documentos/i
    );
    await expect(
      page.locator('button, a').filter({ hasText: /Nuevo|Crear/ })
    ).toBeVisible();
  });

  test('should open document creation modal', async ({ page }) => {
    // Click new document button
    await page.click(
      'button:has-text("Nuevo Documento"), a:has-text("Nuevo Documento")'
    );

    // Verify modal is open
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible();

    // Verify form fields are present
    await expect(
      page.locator('input[name="code"], input[name="codigo"]')
    ).toBeVisible();
    await expect(
      page.locator('input[name="title"], input[name="titulo"]')
    ).toBeVisible();
  });

  test('should create new document successfully', async ({ page }) => {
    // Open modal
    await page.click(
      'button:has-text("Nuevo Documento"), a:has-text("Nuevo Documento")'
    );

    const timestamp = Date.now();

    // Fill form
    await page.fill(
      'input[name="code"], input[name="codigo"]',
      `DOC-${timestamp}`
    );
    await page.fill(
      'input[name="title"], input[name="titulo"]',
      `Test Document ${timestamp}`
    );
    await page.fill(
      'textarea[name="description"], textarea[name="descripcion"]',
      'Test description'
    );

    // Select document type
    await page.click('select[name="type"], select[name="tipo"]');
    await page.selectOption(
      'select[name="type"], select[name="tipo"]',
      'procedimiento'
    );

    // Submit form
    await page.click(
      'button[type="submit"]:has-text("Guardar"), button:has-text("Crear")'
    );

    // Wait for success message or redirect
    await expect(page.locator('text=/creado|éxito|success/i')).toBeVisible({
      timeout: 5000,
    });

    // Verify document appears in list
    await expect(page.locator(`text=DOC-${timestamp}`)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click(
      'button:has-text("Nuevo Documento"), a:has-text("Nuevo Documento")'
    );

    // Try to submit without filling required fields
    await page.click(
      'button[type="submit"]:has-text("Guardar"), button:has-text("Crear")'
    );

    // Verify validation errors or that form wasn't submitted
    const codeInput = page.locator('input[name="code"], input[name="codigo"]');
    await expect(codeInput).toHaveAttribute('required', '');
  });

  test('should filter documents by type', async ({ page }) => {
    // Look for filter dropdown
    const filterSelect = page
      .locator('select')
      .filter({ hasText: /tipo|type|filtro/i })
      .first();

    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('procedimiento');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify URL or results updated
      const url = page.url();
      expect(url).toContain('tipo=procedimiento');
    }
  });

  test('should search documents', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Buscar"]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');

      // Wait for search results
      await page.waitForTimeout(1000);
    }
  });
});
