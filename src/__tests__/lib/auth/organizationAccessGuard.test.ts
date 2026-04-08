/** @jest-environment node */

const mockGetSnapshot = jest.fn();

jest.mock('@/services/billing/OrganizationBillingService', () => ({
  OrganizationBillingService: {
    getSnapshot: (...args: unknown[]) => mockGetSnapshot(...args),
  },
}));

import {
  checkOrganizationBillingAccess,
  hasOrganizationAccess,
} from '@/lib/auth/organizationAccessGuard';
import type { OrganizationBillingSnapshot } from '@/types/organization-billing';

function makeSnapshot(
  accessState: string,
  source: 'organization' | 'legacy_user' | 'none' = 'organization'
): OrganizationBillingSnapshot {
  return {
    organizationId: 'org-1',
    planCode: 'premium',
    subscriptionStatus: 'active',
    source,
    ownerUserId: 'user-1',
    ownerEmail: 'owner@test.com',
    trial: null,
    commercialState: {
      planCode: 'premium',
      subscriptionStatus: 'active',
      accessState: accessState as never,
      accessEndsAt: null,
      graceUntil: null,
      lastPaymentError: null,
      lockedReason: accessState === 'blocked' ? 'payment_required' : null,
    },
    provider: 'mobbex',
    providerSubscriptionId: null,
    providerCustomerId: null,
    providerReference: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    canceledAt: null,
    pastDueAt: null,
    activatedAt: null,
    lastPaymentAt: null,
    lastPaymentError: null,
    metadata: {},
    legacyUserId: null,
    createdAt: null,
    updatedAt: null,
  };
}

describe('organizationAccessGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BILLING_GUARD_DISABLED;
  });

  afterEach(() => {
    delete process.env.BILLING_GUARD_DISABLED;
  });

  describe('checkOrganizationBillingAccess', () => {
    it('allows access when BILLING_GUARD_DISABLED=true (emergency killswitch)', async () => {
      process.env.BILLING_GUARD_DISABLED = 'true';

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('guard_disabled');
      expect(mockGetSnapshot).not.toHaveBeenCalled();
    });

    it('blocks access when organizationId is null', async () => {
      const result = await checkOrganizationBillingAccess(null);

      expect(result.allow).toBe(false);
      expect(result.reason).toBe('no_org_id');
      expect(mockGetSnapshot).not.toHaveBeenCalled();
    });

    it('blocks access when organizationId is empty string', async () => {
      const result = await checkOrganizationBillingAccess('');

      expect(result.allow).toBe(false);
      expect(result.reason).toBe('no_org_id');
    });

    it('allows access when snapshot source is none (org sin billing — legacy no migrada)', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('active', 'none'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('no_snapshot');
    });

    it('allows access for active subscription', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('active'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('active');
    });

    it('allows access for trial subscription', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('trial'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('trial');
    });

    it('allows access for grace_period (pago atrasado dentro del plazo)', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('grace_period'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('grace_period');
    });

    it('allows access for canceled subscription still within period', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('canceled'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('canceled');
    });

    it('blocks access when accessState is blocked', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('blocked'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(false);
      expect(result.reason).toBe('blocked');
      expect(result.lockedReason).toBe('payment_required');
    });

    it('allows access (fail-open) when getSnapshot throws to no interrumpir produccion', async () => {
      mockGetSnapshot.mockRejectedValue(new Error('Firestore unavailable'));

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.allow).toBe(true);
      expect(result.reason).toBe('no_snapshot');
      expect(result.snapshot).toBeNull();
    });

    it('pasa el snapshot en la respuesta cuando existe', async () => {
      const snapshot = makeSnapshot('active');
      mockGetSnapshot.mockResolvedValue(snapshot);

      const result = await checkOrganizationBillingAccess('org-1');

      expect(result.snapshot).toBe(snapshot);
    });
  });

  describe('hasOrganizationAccess', () => {
    it('returns true when org has access', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('active'));

      expect(await hasOrganizationAccess('org-1')).toBe(true);
    });

    it('returns false when org is blocked', async () => {
      mockGetSnapshot.mockResolvedValue(makeSnapshot('blocked'));

      expect(await hasOrganizationAccess('org-1')).toBe(false);
    });

    it('returns false for null orgId', async () => {
      expect(await hasOrganizationAccess(null)).toBe(false);
    });
  });
});
