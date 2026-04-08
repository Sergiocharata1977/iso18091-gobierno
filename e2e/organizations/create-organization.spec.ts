import { expect, test } from '@playwright/test';

/**
 * Tests E2E para la creación y gestión de Organizaciones
 * Área: Super Admin → Organizaciones
 *
 * Prerrequisitos:
 * - Usuario super admin logueado
 * - Acceso a /super-admin/organizaciones
 */

test.describe('Organization Management', () => {
  // Usar credenciales de super admin para estos tests
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@test.com';
  const SUPER_ADMIN_PASSWORD =
    process.env.SUPER_ADMIN_PASSWORD || 'password123';

  test.beforeEach(async ({ page }) => {
    // Login como super admin
    await page.goto('/login');
    await page.fill('input[name="email"]', SUPER_ADMIN_EMAIL);
    await page.fill('input[name="password"]', SUPER_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Esperar redirección al dashboard
    await page.waitForURL(/dashboard|super-admin/, { timeout: 15000 });

    // Navegar a gestión de organizaciones
    await page.goto('/super-admin/organizaciones');
    await page.waitForLoadState('networkidle');
  });

  test('PM-ORG-001: should display organizations list', async ({ page }) => {
    // Verificar que estamos en la página de organizaciones
    await expect(page.locator('h1, h2').first()).toContainText(/organizacion/i);

    // Verificar que hay al menos una organización listada (Los Señores del Agro)
    await expect(
      page.locator('text="Los Señores del Agro"').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('PM-ORG-001: should open create organization dialog', async ({
    page,
  }) => {
    // Buscar botón de crear organización
    const createButton = page
      .locator(
        'button:has-text("Crear"), button:has-text("Nueva"), button:has-text("Agregar")'
      )
      .first();
    await createButton.click();

    // Verificar que el diálogo se abre
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();

    // Verificar campos del formulario
    await expect(
      page.locator('input[id="name"], input[placeholder*="Nombre"]')
    ).toBeVisible();
  });

  test('PM-ORG-001: should validate required fields', async ({ page }) => {
    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nueva")')
      .first();
    await createButton.click();

    // Intentar enviar formulario vacío
    const submitButton = page.locator(
      'dialog button[type="submit"], [role="dialog"] button:has-text("Crear")'
    );
    await submitButton.click();

    // Verificar validación HTML5 - el campo nombre debería ser requerido
    const nameInput = page.locator('input[id="name"], input[required]').first();
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('PM-ORG-001: should create organization with valid data', async ({
    page,
  }) => {
    // Generar nombre único para evitar conflictos
    const orgName = `Test Org ${Date.now()}`;

    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nueva")')
      .first();
    await createButton.click();

    // Llenar formulario
    await page.fill('input[id="name"]', orgName);

    // Seleccionar plan (si hay selector)
    const planSelector = page.locator('button:has-text("Plan"), [id="plan"]');
    if (await planSelector.isVisible()) {
      await planSelector.click();
      await page.click('text="Professional"');
    }

    // Enviar formulario
    const submitButton = page.locator(
      'dialog button[type="submit"], [role="dialog"] button:has-text("Crear")'
    );
    await submitButton.click();

    // Esperar a que el diálogo se cierre
    await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible({
      timeout: 10000,
    });

    // Verificar que la nueva organización aparece en la lista
    await expect(page.locator(`text="${orgName}"`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display organization details', async ({ page }) => {
    // Click en una organización existente
    await page.click('text="Los Señores del Agro"');

    // Verificar que se muestra información de la organización
    await expect(
      page.locator('text=/plan|configuración|usuarios/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
