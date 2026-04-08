import { expect, test } from '@playwright/test';

/**
 * Tests E2E para verificar aislamiento de contexto multi-tenant en IA
 * Área: IA → Contexto → Multi-tenant
 */

test.describe('IA Context Multi-Tenant Isolation', () => {
  const ORG_A_USER = process.env.ORG_A_USER_EMAIL || 'user_org_a@test.com';
  const ORG_A_PASSWORD = process.env.ORG_A_PASSWORD || 'password123';
  const ORG_A_USER_ID = process.env.ORG_A_USER_ID || 'uid_org_a';

  test.beforeEach(async ({ page }) => {
    // Login como usuario de Org A
    await page.goto('/login');
    await page.fill('input[name="email"]', ORG_A_USER);
    await page.fill('input[name="password"]', ORG_A_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should verify user has organization assigned', async ({ page }) => {
    // Verificar health check
    const response = await page.request.get(
      `/api/ia/health?userId=${ORG_A_USER_ID}`
    );
    const data = await response.json();

    expect(data.status).toBe('healthy');
    expect(data.checks.user_exists).toBe(true);
    expect(data.checks.has_organization).toBe(true);
    expect(data.checks.organization_valid).toBe(true);
  });

  test('should get correct context for own organization', async ({ page }) => {
    const response = await page.request.get(
      `/api/ia/context?userId=${ORG_A_USER_ID}&light=true`
    );
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.contexto).toBeDefined();
    expect(data.contexto.user).toBeDefined();
    expect(data.contexto.user.organization_id).toBeDefined();
  });

  test('should fail gracefully when user has no organization', async ({
    page,
  }) => {
    // Intentar obtener contexto de usuario sin organización
    const response = await page.request.get(
      '/api/ia/context?userId=user_without_org'
    );

    // Debe retornar error 403 o 500 con mensaje claro
    expect([403, 500]).toContain(response.status());

    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.message || data.error).toMatch(/organization|organización/i);
  });

  test('should show organization info in health check', async ({ page }) => {
    const response = await page.request.get(
      `/api/ia/health?userId=${ORG_A_USER_ID}`
    );
    const data = await response.json();

    expect(data.details.organization).toBeDefined();
    expect(data.details.organization.id).toBeDefined();
    expect(data.details.organization.name).toBeDefined();
  });

  test('should measure context fetch performance', async ({ page }) => {
    const response = await page.request.get(
      `/api/ia/health?userId=${ORG_A_USER_ID}`
    );
    const data = await response.json();

    expect(data.details.context).toBeDefined();
    expect(data.details.context.fetch_time_ms).toBeDefined();

    // Verificar que el fetch no tome más de 3 segundos
    expect(data.details.context.fetch_time_ms).toBeLessThan(3000);
  });
});

test.describe('IA Context Error Handling', () => {
  test('should return 400 for missing userId', async ({ request }) => {
    const response = await request.get('/api/ia/context');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toMatch(/userId/i);
  });

  test('should return 404 for non-existent user', async ({ request }) => {
    const response = await request.get(
      '/api/ia/context?userId=non_existent_user_12345'
    );

    // Puede ser 404 o 500 dependiendo de la implementación
    expect([404, 500]).toContain(response.status());
  });

  test('health check should return 400 for missing userId', async ({
    request,
  }) => {
    const response = await request.get('/api/ia/health');
    expect(response.status()).toBe(400);
  });
});
