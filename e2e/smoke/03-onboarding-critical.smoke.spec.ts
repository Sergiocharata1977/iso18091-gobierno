import { expect, test } from '@playwright/test';

import { loginExpectOnboarding } from '../support/smoke-auth';
import {
  getOnboardingSmokeUser,
  onboardingSmokeEnabled,
} from '../support/smoke-env';

const ONBOARDING_ENABLED = onboardingSmokeEnabled();

test.describe('PR Smoke M4 - Onboarding critico', () => {
  test.skip(
    !ONBOARDING_ENABLED,
    'Requires E2E_SMOKE_ONBOARDING_ENABLED + onboarding test user without organization'
  );

  test('avanza wizard hasta resumen sin provisionar @smoke', async ({
    page,
  }) => {
    test.slow();

    await loginExpectOnboarding(page, getOnboardingSmokeUser());

    const nextButton = page.getByRole('button', { name: /^Siguiente$/i });
    await expect(nextButton).toBeEnabled({ timeout: 20_000 });

    await expect(page.getByText(/Paso 1 de 5/i)).toBeVisible();
    await nextButton.click();

    await expect(page.getByText(/Paso 2 de 5/i)).toBeVisible();
    await page.locator('#company_name').fill('QA Smoke Onboarding SA');
    await page.locator('#company_contact').fill('qa-smoke@example.com');
    await page.locator('#company_sector').fill('Servicios');
    await nextButton.click();

    await expect(page.getByText(/Paso 3 de 5/i)).toBeVisible();
    await expect(page.getByText(/ISO 9001:2015/i)).toBeVisible();
    await nextButton.click();

    await expect(page.getByText(/Paso 4 de 5/i)).toBeVisible();
    await expect(
      page.getByText(/Procesos ISO clasicos|Procesos ISO clasicos \(15\)/i)
    ).toBeVisible();
    await nextButton.click();

    await expect(page.getByText(/Paso 5 de 5/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Confirmar y provisionar/i })
    ).toBeVisible();
  });
});
