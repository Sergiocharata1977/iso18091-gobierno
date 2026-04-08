import { expect, test } from '@playwright/test';

/**
 * Tests E2E para la creación de usuarios
 * Área: Admin → Usuarios
 *
 * Pruebas manuales asociadas: PM-USER-001
 */

test.describe('User Creation', () => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Navegar a gestión de usuarios
    await page.goto('/admin/usuarios');
    await page.waitForLoadState('networkidle');
  });

  test('PM-USER-001: should display users list', async ({ page }) => {
    // Verificar que estamos en la página de usuarios
    await expect(page.locator('h1, h2').first()).toContainText(/usuario/i);

    // Verificar que hay una tabla o lista de usuarios
    await expect(
      page.locator('table, [role="grid"], [data-testid="users-list"]').first()
    ).toBeVisible();
  });

  test('PM-USER-001: should open create user dialog', async ({ page }) => {
    // Buscar botón de crear usuario
    const createButton = page
      .locator(
        'button:has-text("Crear"), button:has-text("Nuevo"), button:has-text("Agregar")'
      )
      .first();
    await createButton.click();

    // Verificar que el diálogo se abre
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();

    // Verificar campos del formulario
    await expect(
      page.locator('input[id="email"], input[type="email"]')
    ).toBeVisible();
    await expect(
      page.locator('input[id="password"], input[type="password"]').first()
    ).toBeVisible();
  });

  test('PM-USER-001: should validate email format', async ({ page }) => {
    // Abrir diálogo de creación
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nuevo")')
      .first();
    await createButton.click();

    // Ingresar email inválido
    await page.fill('input[id="email"], input[type="email"]', 'email-invalido');

    // Verificar validación HTML5
    const emailInput = page.locator('input[id="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('PM-USER-001: should validate password confirmation', async ({
    page,
  }) => {
    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nuevo")')
      .first();
    await createButton.click();

    // Llenar contraseñas diferentes
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'diferente456');

    // Verificar mensaje de error de contraseñas no coinciden
    await expect(
      page.locator("text=/no coinciden|don't match/i")
    ).toBeVisible();
  });

  test('PM-USER-001: should show role selector', async ({ page }) => {
    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nuevo")')
      .first();
    await createButton.click();

    // Verificar que hay selector de rol
    const roleSelector = page.locator(
      'button:has-text("Rol"), select[id="role"], [id="role"]'
    );
    await expect(roleSelector).toBeVisible();

    // Click para ver opciones
    await roleSelector.click();

    // Verificar opciones de rol
    await expect(
      page.locator('text=/admin|operario|jefe/i').first()
    ).toBeVisible();
  });

  test('PM-USER-001: should create user with valid data', async ({ page }) => {
    // Generar email único
    const testEmail = `test.user.${Date.now()}@test.com`;
    const testPassword = 'TestPassword123';

    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nuevo")')
      .first();
    await createButton.click();

    // Llenar formulario
    await page.fill('input[id="email"], input[type="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.fill('input[id="confirmPassword"]', testPassword);

    // Seleccionar rol operario
    const roleSelector = page.locator('button:has-text("Rol"), [id="role"]');
    if (await roleSelector.isVisible()) {
      await roleSelector.click();
      await page.click('text="Operario"');
    }

    // Llenar datos de personnel si está habilitado
    const personnelCheckbox = page.locator('input[id="createPersonnel"]');
    if (await personnelCheckbox.isChecked()) {
      await page.fill('input[id="nombres"]', 'Test');
      await page.fill('input[id="apellidos"]', 'Usuario');
    }

    // Enviar formulario
    const submitButton = page.locator(
      'dialog button[type="submit"], [role="dialog"] button:has-text("Crear")'
    );
    await submitButton.click();

    // Esperar a que cierre el diálogo (éxito)
    await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible({
      timeout: 15000,
    });

    // Verificar toast de éxito o que aparezca en lista
    // Nota: Dependiendo de la implementación, verificar uno u otro
  });

  test('should show existing email error', async ({ page }) => {
    // Abrir diálogo
    const createButton = page
      .locator('button:has-text("Crear"), button:has-text("Nuevo")')
      .first();
    await createButton.click();

    // Usar email que ya existe (admin)
    await page.fill('input[id="email"], input[type="email"]', ADMIN_EMAIL);

    // Esperar verificación de email
    await page.waitForTimeout(1500);

    // Verificar mensaje de email existente
    await expect(
      page.locator('text=/ya está en uso|already exists|ya existe/i')
    ).toBeVisible();
  });
});
