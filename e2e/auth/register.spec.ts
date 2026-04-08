import { expect, test } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  // SKIPPED: This test creates new users in Firebase Auth which pollute the database.
  // To test registration flow manually, use a dedicated test environment.
  test.skip('should register new user successfully', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');

    await page.click('button[type="submit"]');

    await page.waitForURL(
      /\/(mi-panel|onboarding|noticias|dashboard)(\/|$|\?)/,
      {
        timeout: 20_000,
      }
    );
    await expect(page).toHaveURL(
      /\/(mi-panel|onboarding|noticias|dashboard)(\/|$|\?)/
    );
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'different-password');

    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=/contraseñas no coinciden|contrasenas no coinciden/i')
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register(\?|$)/);
  });

  test('should show error for short password', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '12345');
    await page.fill('input[name="confirmPassword"]', '12345');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=/al menos 6 caracteres/i')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute('required', '');
  });
});
