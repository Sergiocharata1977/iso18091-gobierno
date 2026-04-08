import { ForbiddenError } from '@/lib/sdk/base/BaseError';
import {
  requireOrganization,
  requireRole,
} from '@/lib/sdk/middleware/permissions';
import type { AuthenticatedRequest } from '@/lib/sdk/middleware/auth';

function buildRequest(overrides: Partial<AuthenticatedRequest> = {}) {
  return {
    user: {
      uid: 'user-1',
      email: 'user@test.com',
      role: 'jefe',
      permissions: [],
      organizationId: 'org-a',
    },
    ...overrides,
  } as AuthenticatedRequest;
}

describe('permissions middleware', () => {
  it('denies access when role is not allowed', async () => {
    const handler = requireRole('admin')(async () => {
      return { ok: true } as any;
    });

    const req = buildRequest();
    await expect(handler(req)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('denies access when organization does not match', async () => {
    const handler = requireOrganization(() => 'org-b')(async () => {
      return { ok: true } as any;
    });

    const req = buildRequest();
    await expect(handler(req)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows access when organization matches', async () => {
    const handler = requireOrganization(() => 'org-a')(async () => {
      return { ok: true } as any;
    });

    const req = buildRequest();
    const response = await handler(req);
    expect((response as any).ok).toBe(true);
  });
});
