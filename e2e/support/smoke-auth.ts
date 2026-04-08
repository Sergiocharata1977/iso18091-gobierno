import { expect, Page } from '@playwright/test';

import type { SmokeUser } from './smoke-env';

const DEFAULT_POST_LOGIN_URL =
  /\/(mi-panel|onboarding|noticias|dashboard|super-admin)(\/|$|\?)/;
const ORG_POST_LOGIN_URL =
  /\/(mi-panel|noticias|dashboard|super-admin)(\/|$|\?)/;
const ONBOARDING_URL = /\/onboarding(\/|$|\?)/;
const LOGIN_ERROR_TEXT = /Firebase:\s*Error|auth\/[a-z-]+/i;

export async function gotoLogin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
}

export async function loginWithCredentials(
  page: Page,
  user: SmokeUser,
  options?: {
    expectedPostLoginUrl?: RegExp;
    timeoutMs?: number;
  }
) {
  const expectedPostLoginUrl =
    options?.expectedPostLoginUrl ?? DEFAULT_POST_LOGIN_URL;
  const timeoutMs = options?.timeoutMs ?? 20_000;

  await gotoLogin(page);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  const loginError = page.getByText(LOGIN_ERROR_TEXT).first();

  const outcome = await Promise.race<
    'expected-url' | 'login-error' | 'unexpected-onboarding'
  >([
    page
      .waitForURL(expectedPostLoginUrl, {
        timeout: timeoutMs,
        waitUntil: 'commit',
      })
      .then(() => 'expected-url'),
    loginError
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => 'login-error'),
    page
      .waitForURL(ONBOARDING_URL, { timeout: timeoutMs, waitUntil: 'commit' })
      .then(() => 'unexpected-onboarding'),
  ]);

  if (outcome === 'login-error') {
    const message =
      (await loginError.textContent())?.trim() || 'Unknown login error';
    throw new Error(
      `[e2e smoke] Login failed for ${user.email}: ${message}. Check credentials/connectivity.`
    );
  }

  if (
    outcome === 'unexpected-onboarding' &&
    !expectedPostLoginUrl.test(page.url())
  ) {
    throw new Error(
      `[e2e smoke] User ${user.email} was redirected to /onboarding but this smoke requires an org-seeded user (organization_id assigned).`
    );
  }

  await expect(page).not.toHaveURL(/\/login(\?|$)/);
}

export async function loginAsOrgUser(page: Page, user: SmokeUser) {
  await loginWithCredentials(page, user, {
    expectedPostLoginUrl: DEFAULT_POST_LOGIN_URL,
  });

  if (ONBOARDING_URL.test(page.url())) {
    throw new Error(
      `[e2e smoke] User ${user.email} authenticated but landed on /onboarding. M1/M2/M5 require a smoke user with organization_id.`
    );
  }

  await expect(page).toHaveURL(ORG_POST_LOGIN_URL);
}

export async function loginExpectOnboarding(page: Page, user: SmokeUser) {
  await gotoLogin(page);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/onboarding(\/|$|\?)/, { timeout: 20_000 });
  await expect(
    page.getByRole('heading', { name: /Onboarding Federado de Plataforma/i })
  ).toBeVisible();
}

export async function waitForMiPanelReady(page: Page) {
  await page.waitForURL(/\/mi-panel(\/|$|\?)/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /Hola /i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Resumen$/i })).toBeVisible();
}

export async function waitForMiSgcHomeReady(page: Page) {
  await page.waitForURL(/\/mi-sgc(\/|$|\?)/, { timeout: 20_000 });
  await expect(
    page.getByRole('heading', { name: /Mi SGC - Centro de Gestion ISO/i })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Ver cumplimiento/i })
  ).toBeVisible();
}
