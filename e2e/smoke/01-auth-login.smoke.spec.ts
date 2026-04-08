import { expect, test } from '@playwright/test';

import { gotoLogin, loginAsOrgUser } from '../support/smoke-auth';
import { getOrgSmokeUser } from '../support/smoke-env';

test.describe('PR Smoke M1 - Login basico', () => {
  test('renderiza formulario de login @smoke', async ({ page }) => {
    await gotoLogin(page);

    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveAttribute(
      'type',
      'email'
    );
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('autentica y redirige a shell protegida @smoke', async ({ page }) => {
    await loginAsOrgUser(page, getOrgSmokeUser());

    await expect(page).toHaveURL(
      /\/(mi-panel|noticias|dashboard|super-admin)(\/|$|\?)/
    );
    await expect(page.locator('body')).toBeVisible();
  });
});
