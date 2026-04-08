const mockGetById = jest.fn();

jest.mock('@/services/auth/UserService', () => ({
  UserService: {
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
  verifyTargetUserOrganizationScope,
  verifyUserOrganization,
} from '@/middleware/verifyOrganization';

describe('middleware/verifyOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toOrganizationApiError', () => {
    it('infers ORGANIZATION_REQUIRED (400) when status is 400 without errorCode', () => {
      expect(toOrganizationApiError({ status: 400 })).toEqual({
        status: 400,
        error: 'organization_id es requerido',
        errorCode: 'ORGANIZATION_REQUIRED',
      });
    });

    it('allows endpoint-specific message overrides by errorCode', () => {
      expect(
        toOrganizationApiError(
          {
            status: 403,
            error: 'Acceso denegado',
            errorCode: 'ORGANIZATION_MISMATCH',
          },
          {
            messageOverrides: {
              ORGANIZATION_MISMATCH: 'No puedes provisionar otra organizacion',
            },
          }
        )
      ).toEqual({
        status: 403,
        error: 'No puedes provisionar otra organizacion',
        errorCode: 'ORGANIZATION_MISMATCH',
      });
    });
  });

  describe('verifyUserOrganization', () => {
    it('returns USER_NOT_FOUND when user does not exist', async () => {
      mockGetById.mockResolvedValue(null);

      await expect(verifyUserOrganization('u-1')).resolves.toEqual({
        valid: false,
        error: 'Usuario no encontrado',
        errorCode: 'USER_NOT_FOUND',
      });
    });

    it('returns NO_ORGANIZATION when user lacks organization_id', async () => {
      mockGetById.mockResolvedValue({ id: 'u-1', organization_id: null });

      await expect(verifyUserOrganization('u-1')).resolves.toEqual({
        valid: false,
        error:
          'Usuario sin organizacion asignada. Por favor contacte al administrador.',
        errorCode: 'NO_ORGANIZATION',
      });
    });
  });

  describe('resolveAuthorizedOrganizationId', () => {
    it('returns ORGANIZATION_REQUIRED (400) for super_admin without effective org when required', async () => {
      const result = await resolveAuthorizedOrganizationId(
        { uid: 'sa-1', role: 'super_admin', organizationId: null as any },
        undefined,
        { requireOrg: true }
      );

      expect(result).toEqual({
        ok: false,
        status: 400,
        error: 'organization_id es requerido',
        errorCode: 'ORGANIZATION_REQUIRED',
      });
    });

    it('returns ORGANIZATION_MISMATCH (403) for admin cross-org access', async () => {
      mockGetById.mockResolvedValue({ id: 'a-1', organization_id: 'org-1' });

      const result = await resolveAuthorizedOrganizationId(
        { uid: 'a-1', role: 'admin', organizationId: 'org-1' as any },
        'org-2',
        { requireOrg: true }
      );

      expect(result).toMatchObject({
        ok: false,
        status: 403,
        errorCode: 'ORGANIZATION_MISMATCH',
      });
    });

    it('returns NO_ORGANIZATION (403) when non-super admin has no org context', async () => {
      const result = await resolveAuthorizedOrganizationId(
        { uid: 'a-1', role: 'admin', organizationId: null as any },
        undefined,
        { requireOrg: true }
      );

      expect(result).toEqual({
        ok: false,
        status: 403,
        error:
          'Usuario sin organizacion asignada. Por favor contacte al administrador.',
        errorCode: 'NO_ORGANIZATION',
      });
    });
  });

  describe('verifyTargetUserOrganizationScope', () => {
    it('returns USER_NOT_FOUND as 404 for missing target user', async () => {
      mockGetById.mockImplementation(async (userId: string) => {
        if (userId === 'target-missing') return null;
        return { id: userId, organization_id: 'org-1' };
      });

      const result = await verifyTargetUserOrganizationScope(
        { uid: 'actor-1', role: 'admin', organizationId: 'org-1' as any },
        'target-missing'
      );

      expect(result).toEqual({
        ok: false,
        status: 404,
        error: 'Usuario no encontrado',
        errorCode: 'USER_NOT_FOUND',
      });
    });

    it('returns ORGANIZATION_MISMATCH (403) when actor and target differ in org', async () => {
      mockGetById.mockImplementation(async (userId: string) => {
        if (userId === 'target-1')
          return { id: 'target-1', organization_id: 'org-2' };
        return { id: userId, organization_id: 'org-1' };
      });

      const result = await verifyTargetUserOrganizationScope(
        { uid: 'actor-1', role: 'admin', organizationId: 'org-1' as any },
        'target-1'
      );

      expect(result).toMatchObject({
        ok: false,
        status: 403,
        errorCode: 'ORGANIZATION_MISMATCH',
      });
    });
  });
});
