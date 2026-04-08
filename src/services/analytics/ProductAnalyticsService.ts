import { getAdminFirestore } from '@/lib/firebase/admin';

type FirestoreDateLike = {
  toDate?: () => Date;
  _seconds?: number;
};

type ProductEventRecord = {
  event_name?: unknown;
  distinct_id?: unknown;
  organization_id?: unknown;
  properties?: unknown;
  source?: unknown;
  created_at?: unknown;
};

const TTFV_COLLECTIONS = [
  'documents',
  'processDefinitions',
  'processRecords',
  'quality_objectives',
  'quality_indicators',
  'measurements',
  'norm_points',
] as const;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    const maybe = value as FirestoreDateLike;
    if (typeof maybe.toDate === 'function') return maybe.toDate();
    if (typeof maybe._seconds === 'number') {
      return new Date(maybe._seconds * 1000);
    }
  }
  return null;
}

function isCompletedOnboarding(data: Record<string, unknown> | undefined) {
  if (!data) return false;

  const phase = String(data.onboarding_phase || '').trim();
  return (
    Boolean(data.completed_at) ||
    ['completed', 'onboarding_completed', 'drafts_generated'].includes(phase)
  );
}

async function getOrganizationOnboardingDoc(organizationId: string) {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('meta')
    .doc('onboarding')
    .get();

  return snapshot.exists
    ? (snapshot.data() as Record<string, unknown> | undefined)
    : undefined;
}

async function getFirstIsoRecord(
  organizationId: string
): Promise<{ source: string; createdAt: Date } | null> {
  const db = getAdminFirestore();

  const results = await Promise.all(
    TTFV_COLLECTIONS.map(async collectionName => {
      try {
        const snapshot = await db
          .collection(collectionName)
          .where('organization_id', '==', organizationId)
          .get();

        const earliest = snapshot.docs
          .map(doc => toDate(doc.data().created_at))
          .filter((value): value is Date => value instanceof Date)
          .sort((a, b) => a.getTime() - b.getTime())[0];

        if (!earliest) return null;

        return {
          source: collectionName,
          createdAt: earliest,
        };
      } catch {
        return null;
      }
    })
  );

  const nonNull = results.filter(
    (v): v is NonNullable<(typeof results)[number]> => v !== null
  );
  return (
    nonNull.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ??
    null
  );
}

export class ProductAnalyticsService {
  static async trackClientEvent(input: {
    event: string;
    distinctId: string;
    organizationId?: string | null;
    properties?: Record<string, unknown>;
    source?: string;
  }) {
    const db = getAdminFirestore();

    await db.collection('product_analytics_events').add({
      event_name: input.event,
      distinct_id: input.distinctId,
      organization_id: input.organizationId ?? null,
      properties: input.properties ?? {},
      source: input.source ?? 'client',
      created_at: new Date(),
    });
  }

  static async getDashboardMetrics() {
    const db = getAdminFirestore();
    const orgsSnapshot = await db.collection('organizations').get();
    const organizations = orgsSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    }));

    const onboardingStates = await Promise.all(
      organizations.map(async org => ({
        organizationId: org.id,
        onboarding: await getOrganizationOnboardingDoc(org.id),
      }))
    );

    const completedOnboardingCount = onboardingStates.filter(entry =>
      isCompletedOnboarding(entry.onboarding)
    ).length;

    const ttfvRows = await Promise.all(
      onboardingStates.map(async entry => {
        const onboardingStartedAt =
          toDate(entry.onboarding?.created_at) ||
          toDate(entry.onboarding?.phase_updated_at);
        if (!onboardingStartedAt) {
          return null;
        }

        const firstRecord = await getFirstIsoRecord(entry.organizationId);
        if (!firstRecord) {
          return null;
        }

        return {
          organizationId: entry.organizationId,
          startedAt: onboardingStartedAt.toISOString(),
          firstValueAt: firstRecord.createdAt.toISOString(),
          source: firstRecord.source,
          durationMs: Math.max(
            0,
            firstRecord.createdAt.getTime() - onboardingStartedAt.getTime()
          ),
        };
      })
    );

    const validTtfvRows = ttfvRows.filter(
      (
        value
      ): value is {
        organizationId: string;
        startedAt: string;
        firstValueAt: string;
        source: string;
        durationMs: number;
      } => value !== null
    );

    const analyticsSnapshot = await db
      .collection('product_analytics_events')
      .get();
    const analyticsEvents = analyticsSnapshot.docs.map(
      doc => doc.data() as ProductEventRecord
    );

    const docsHelpRows = analyticsEvents
      .filter(event => event.event_name === 'doc_help_opened')
      .reduce<
        Record<
          string,
          {
            route: string;
            module: string;
            opens: number;
          }
        >
      >((acc, event) => {
        const properties =
          event.properties && typeof event.properties === 'object'
            ? (event.properties as Record<string, unknown>)
            : {};
        const route = String(properties.pathname || properties.route || 'N/D');
        const docModule = String(properties.module || 'general');
        const key = `${docModule}:${route}`;

        if (!acc[key]) {
          acc[key] = { route, module: docModule, opens: 0 };
        }

        acc[key].opens += 1;
        return acc;
      }, {});

    const avgTtfvMs =
      validTtfvRows.length > 0
        ? Math.round(
            validTtfvRows.reduce((acc, row) => acc + row.durationMs, 0) /
              validTtfvRows.length
          )
        : null;

    return {
      overview: {
        organizations: organizations.length,
        onboardingCompletionRate:
          organizations.length > 0
            ? Math.round(
                (completedOnboardingCount / organizations.length) * 100
              )
            : 0,
        completedOnboardingCount,
        averageTtfvMs: avgTtfvMs,
      },
      docsMostConsulted: Object.values(docsHelpRows)
        .sort((a, b) => b.opens - a.opens)
        .slice(0, 10),
      ttfvByOrganization: validTtfvRows.sort(
        (a, b) => a.durationMs - b.durationMs
      ),
    };
  }

  static async getCapabilitiesUsageStats(): Promise<{
    byCapability: Array<{ capabilityId: string; orgsCount: number }>;
    totalInstallations: number;
  }> {
    const db = getAdminFirestore();
    const orgsSnapshot = await db.collection('organizations').get();

    const countMap = new Map<string, number>();
    let totalInstallations = 0;

    await Promise.all(
      orgsSnapshot.docs.map(async orgDoc => {
        const installedSnap = await db
          .collection('organizations')
          .doc(orgDoc.id)
          .collection('installed_capabilities')
          .get();

        for (const capDoc of installedSnap.docs) {
          const capId = capDoc.id;
          countMap.set(capId, (countMap.get(capId) ?? 0) + 1);
          totalInstallations++;
        }
      })
    );

    const byCapability = Array.from(countMap.entries())
      .map(([capabilityId, orgsCount]) => ({ capabilityId, orgsCount }))
      .sort((a, b) => b.orgsCount - a.orgsCount);

    return { byCapability, totalInstallations };
  }

  static async getActiveUsersStats(): Promise<{
    totalUsers: number;
    activeUsers30d: number;
    byOrganization: Array<{ organizationId: string; activeCount: number }>;
  }> {
    const db = getAdminFirestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersSnapshot = await db
      .collection('users')
      .where('activo', '==', true)
      .get();

    const totalUsers = usersSnapshot.size;
    let activeUsers30d = 0;
    const orgMap = new Map<string, number>();

    for (const doc of usersSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      const orgId = String(data.organization_id || '');
      if (!orgId || orgId === 'null') continue;

      const lastLogin = toDate(data.last_login ?? data.lastLogin ?? null);
      if (lastLogin && lastLogin >= thirtyDaysAgo) {
        activeUsers30d++;
        orgMap.set(orgId, (orgMap.get(orgId) ?? 0) + 1);
      }
    }

    const byOrganization = Array.from(orgMap.entries())
      .map(([organizationId, activeCount]) => ({ organizationId, activeCount }))
      .sort((a, b) => b.activeCount - a.activeCount);

    return { totalUsers, activeUsers30d, byOrganization };
  }
}
