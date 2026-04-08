import { expect, test } from '@playwright/test';

import { loginAsOrgUser, waitForMiPanelReady } from '../support/smoke-auth';
import { getOrgSmokeUser } from '../support/smoke-env';

test.describe('PR Smoke M5 - Mi Panel', () => {
  test('carga resumen y cambia a tab de trabajo @smoke', async ({ page }) => {
    await loginAsOrgUser(page, getOrgSmokeUser());

    await page.goto('/mi-panel');
    await waitForMiPanelReady(page);

    const trabajoTab = page.getByRole('tab', { name: /^Trabajo$/i });
    await expect(trabajoTab).toBeVisible();
    await trabajoTab.click();

    await expect(page).toHaveURL(/\/mi-panel.*tab=trabajo/);
    await expect(
      page.getByRole('heading', { name: /Mis Procesos/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Registros de Procesos/i })
    ).toBeVisible();
  });
});
