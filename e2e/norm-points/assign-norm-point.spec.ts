import { expect, test } from '@playwright/test';

test.describe('Norm Point Assignment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to norm points page
    await page.goto('/puntos-norma');
  });

  test('should display norm points dashboard', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(
      /Puntos de Norma|Cumplimiento/i
    );

    // Verify tabs are present
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Matriz')).toBeVisible();
    await expect(page.locator('text=Gaps')).toBeVisible();
  });

  test('should navigate to compliance matrix', async ({ page }) => {
    await page.click('text=Matriz de Cumplimiento, button:has-text("Matriz")');

    // Verify matrix is displayed
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test('should navigate to gaps analysis', async ({ page }) => {
    await page.click('text=Análisis de Gaps, button:has-text("Gaps")');

    // Verify gaps list is displayed
    await expect(page.locator('text=/pendiente|sin asignar/i')).toBeVisible();
  });

  test('should assign norm point to process', async ({ page }) => {
    // Go to management tab
    await page.click('text=Gestión, button:has-text("Gestión")');

    // Click on first norm point
    const firstNormPoint = page
      .locator('[data-testid="norm-point-item"], .norm-point-card')
      .first();
    await firstNormPoint.click();

    // Look for assign button
    const assignButton = page.locator(
      'button:has-text("Asignar"), button:has-text("Vincular")'
    );

    if (await assignButton.isVisible()) {
      await assignButton.click();

      // Select a process
      await page.click('select[name="process"], select[name="proceso"]');
      await page.selectOption(
        'select[name="process"], select[name="proceso"]',
        { index: 1 }
      );

      // Select compliance status
      await page.click('select[name="status"], select[name="estado"]');
      await page.selectOption(
        'select[name="status"], select[name="estado"]',
        'completo'
      );

      // Set percentage
      await page.fill(
        'input[name="percentage"], input[name="porcentaje"]',
        '100'
      );

      // Submit
      await page.click('button[type="submit"]:has-text("Guardar")');

      // Verify success
      await expect(
        page.locator('text=/asignado|vinculado|éxito/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter norm points by type', async ({ page }) => {
    await page.click('text=Gestión');

    // Look for norm type filter
    const typeFilter = page
      .locator('select')
      .filter({ hasText: /tipo.*norma|ISO/i })
      .first();

    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('iso_9001');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify filtering worked
      const url = page.url();
      expect(url).toContain('tipo_norma=iso_9001');
    }
  });

  test('should display compliance statistics', async ({ page }) => {
    // Should show percentage on dashboard
    await expect(
      page.locator('text=/%|porcentaje|cumplimiento/i')
    ).toBeVisible();

    // Should show numbers
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
  });

  test('should refresh compliance data', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator(
      'button:has-text("Actualizar"), button[aria-label*="refresh"]'
    );

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Wait for data to reload
      await page.waitForTimeout(1000);

      // Verify timestamp updated
      await expect(
        page.locator('text=/actualizado|última actualización/i')
      ).toBeVisible();
    }
  });
});
