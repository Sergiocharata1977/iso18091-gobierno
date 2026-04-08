export type SmokeUser = {
  email: string;
  password: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[e2e smoke] Missing required env var ${name}. See e2e/README.md`
    );
  }
  return value;
}

export function getOrgSmokeUser(): SmokeUser {
  return {
    email:
      process.env.E2E_SMOKE_USER_EMAIL?.trim() ||
      process.env.TEST_EMAIL?.trim() ||
      'e2e-test@doncandidoia.com',
    password:
      process.env.E2E_SMOKE_USER_PASSWORD?.trim() ||
      process.env.E2E_SMOKE_PASSWORD?.trim() ||
      process.env.TEST_PASSWORD?.trim() ||
      'E2eTest2024!',
  };
}

export function onboardingSmokeEnabled(): boolean {
  const flag = (process.env.E2E_SMOKE_ONBOARDING_ENABLED || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

export function getOnboardingSmokeUser(): SmokeUser {
  return {
    email: requireEnv('E2E_ONBOARDING_USER_EMAIL'),
    password: requireEnv('E2E_ONBOARDING_USER_PASSWORD'),
  };
}
