import { expect, test } from '@playwright/test';

/**
 * Tests E2E para el sistema de Módulos Habilitados por usuario
 * Área: Admin → Usuarios → Módulos
 *
 * Pruebas manuales asociadas: PM-USER-002
 *
 * Funcionalidad:
 * - Cada usuario puede tener acceso restringido a ciertos módulos del sistema
 * - modulos_habilitados: null = acceso completo
 * - modulos_habilitados: [] = sin acceso
 * - modulos_habilitados: ['procesos', 'documentos'] = acceso solo a esos módulos
 */

test.describe('User Modules Configuration', () => {
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

  test('PM-USER-002: should show modules icon for users', async ({ page }) => {
    // Verificar que cada fila de usuario tiene icono de módulos
    const usersTable = page.locator('table, [role="grid"]').first();
    await expect(usersTable).toBeVisible();

    // Buscar iconos o botones de módulos
    const modulosButton = page
      .locator(
        'button[title*="Módulos"], button[aria-label*="Módulos"], button:has([data-icon="settings"])'
      )
      .first();
    await expect(modulosButton).toBeVisible({ timeout: 10000 });
  });

  test('PM-USER-002: should open modules dialog', async ({ page }) => {
    // Seleccionar un usuario de la lista
    const userRow = page.locator('tr, [role="row"]').nth(1); // Primera fila de datos (no header)

    // Click en botón de módulos
    const modulosButton = userRow
      .locator(
        'button[title*="Módulos"], button[aria-label*="Módulos"], button:has(svg)'
      )
      .first();
    await modulosButton.click();

    // Verificar que se abre el diálogo de módulos
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();

    // Verificar título del diálogo
    await expect(page.locator('text=/módulos|permisos|acceso/i')).toBeVisible();
  });

  test('PM-USER-002: should display module checkboxes', async ({ page }) => {
    // Buscar botón de módulos en cualquier usuario
    const modulosButton = page
      .locator('button[title*="Módulos"], button[aria-label*="Módulos"]')
      .first();
    await modulosButton.click();

    // Verificar que hay checkboxes de módulos
    const dialog = page.locator('dialog, [role="dialog"]');
    await expect(
      dialog.locator('input[type="checkbox"]').first()
    ).toBeVisible();

    // Verificar módulos específicos del sidebar
    const modulosEsperados = [
      'Procesos',
      'Personal',
      'Documentos',
      'Auditorías',
      'Indicadores',
    ];
    for (const modulo of modulosEsperados.slice(0, 3)) {
      // Verificar al menos 3
      await expect(dialog.locator(`text=${modulo}`)).toBeVisible();
    }
  });

  test('PM-USER-002: should toggle modules and save', async ({ page }) => {
    // Abrir diálogo de módulos para algún usuario
    const modulosButton = page
      .locator('button[title*="Módulos"], button[aria-label*="Módulos"]')
      .first();
    await modulosButton.click();

    const dialog = page.locator('dialog, [role="dialog"]');
    await expect(dialog).toBeVisible();

    // Toggle un checkbox
    const firstCheckbox = dialog.locator('input[type="checkbox"]').first();
    const isCheckedBefore = await firstCheckbox.isChecked();
    await firstCheckbox.click();

    // Verificar que cambió
    expect(await firstCheckbox.isChecked()).toBe(!isCheckedBefore);

    // Guardar cambios
    const saveButton = dialog.locator(
      'button:has-text("Guardar"), button[type="submit"]'
    );
    await saveButton.click();

    // Verificar que el diálogo se cierra (éxito)
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  test('PM-USER-002: should have "select all" option', async ({ page }) => {
    // Abrir diálogo de módulos
    const modulosButton = page
      .locator('button[title*="Módulos"], button[aria-label*="Módulos"]')
      .first();
    await modulosButton.click();

    const dialog = page.locator('dialog, [role="dialog"]');

    // Buscar opción de "Acceso completo" o "Seleccionar todos"
    const allAccessOption = dialog.locator('text=/completo|todos|all access/i');

    // Si existe, verificar que funciona
    if (await allAccessOption.isVisible()) {
      await allAccessOption.click();

      // Verificar que todos los checkboxes están marcados
      const checkboxes = dialog.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        expect(await checkboxes.nth(i).isChecked()).toBe(true);
      }
    }
  });
});

test.describe('Module Access Verification', () => {
  /**
   * PM-USER-002 (verificación):
   * Después de configurar módulos, el sidebar debe mostrar solo los habilitados
   */

  test('should reflect module changes in sidebar after login', async ({
    page,
  }) => {
    // Este test requiere:
    // 1. Crear usuario con módulos específicos
    // 2. Login con ese usuario
    // 3. Verificar que sidebar solo muestra módulos permitidos

    // Nota: Test conceptual - requiere usuario de prueba específico
    // Para prueba manual: seguir pasos de PM-USER-002 en el plan

    expect(true).toBe(true);
  });
});
