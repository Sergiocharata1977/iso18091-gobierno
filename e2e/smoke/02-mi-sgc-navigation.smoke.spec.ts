import { expect, test } from '@playwright/test';

import { loginAsOrgUser, waitForMiSgcHomeReady } from '../support/smoke-auth';
import { getOrgSmokeUser } from '../support/smoke-env';

test.describe('PR Smoke M2 - Mi SGC', () => {
  test('accede a /mi-sgc y navega a cumplimiento/roadmap @smoke', async ({
    page,
  }) => {
    await loginAsOrgUser(page, getOrgSmokeUser());

    await page.goto('/mi-sgc');
    await waitForMiSgcHomeReady(page);

    await page.getByRole('link', { name: /Ver cumplimiento/i }).click();
    await page.waitForURL(/\/mi-sgc\/cumplimiento(\/|$|\?)/, {
      timeout: 20_000,
    });
    await expect(
      page.getByRole('heading', { name: /Cumplimiento ISO 9001/i })
    ).toBeVisible();

    await page.goto('/mi-sgc/roadmap');
    await page.waitForURL(/\/mi-sgc\/roadmap(\/|$|\?)/, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: /Tu Camino hacia ISO 9001/i })
    ).toBeVisible();
  });
});
