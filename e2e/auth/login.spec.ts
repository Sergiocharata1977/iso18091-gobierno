import { expect, test } from '@playwright/test';

import { gotoLogin, loginWithCredentials } from '../support/smoke-auth';
import { getOrgSmokeUser } from '../support/smoke-env';

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLogin(page);
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginWithCredentials(page, getOrgSmokeUser(), {
      expectedPostLoginUrl:
        /\/(mi-panel|noticias|dashboard|super-admin)(\/|$|\?)/,
      timeoutMs: 20_000,
    });

    await expect(page).toHaveURL(
      /\/(mi-panel|noticias|dashboard|super-admin)(\/|$|\?)/
    );
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=/error|incorrecto|invalido|inválido/i')
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL(/\/register(\?|$)/);
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');

    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should show loading state during login', async ({ page }) => {
    const user = getOrgSmokeUser();
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await expect(submitButton).toBeDisabled();
  });
});
