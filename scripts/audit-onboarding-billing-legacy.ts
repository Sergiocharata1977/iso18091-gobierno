import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type UserRecord = {
  email?: unknown;
  rol?: unknown;
  organization_id?: unknown;
  planType?: unknown;
  billing_status?: unknown;
  status?: unknown;
  activo?: unknown;
  mobbex_transaction_id?: unknown;
  mobbex_subscription_id?: unknown;
  next_billing_date?: unknown;
};

type OrganizationRecord = {
  name?: unknown;
  nombre?: unknown;
  slug?: unknown;
  plan?: unknown;
};

type OrganizationMetaRecord = Record<string, unknown> | null;

type MissingUserOrgEntry = {
  userId: string;
  email: string | null;
  role: string | null;
  organizationId: string | null;
  reason: 'missing_organization_id' | 'organization_not_found';
};

type MissingOrgMetaEntry = {
  organizationId: string;
  organizationName: string | null;
  slug: string | null;
};

type InconsistentUserEntry = {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string | null;
  userPlanType: string | null;
  orgPlanType: string | null;
  userBillingStatus: string | null;
  orgBillingStatus: string | null;
  reasons: string[];
};

type AuditReport = {
  generatedAt: string;
  totals: {
    users: number;
    organizations: number;
    organizationsWithOnboardingMeta: number;
    organizationsWithBillingMeta: number;
  };
  usersWithoutOrganization: MissingUserOrgEntry[];
  organizationsWithoutOnboarding: MissingOrgMetaEntry[];
  organizationsWithoutBilling: MissingOrgMetaEntry[];
  inconsistentUsers: InconsistentUserEntry[];
};

function initAdmin() {
  if (getApps().length > 0) return;

  const serviceAccountPath = path.resolve(
    process.cwd(),
    'service-account.json'
  );
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8')
    );
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Configure service-account.json or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readDateIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && value !== null) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      return maybe.toDate().toISOString();
    }
  }
  return null;
}

function resolveOrgPlan(
  billingMeta: OrganizationMetaRecord,
  organization: OrganizationRecord | null
): string | null {
  const meta = asRecord(billingMeta);
  return (
    readString(meta.plan_type) ||
    readString(meta.planType) ||
    readString(meta.plan) ||
    readString(meta.subscription_plan) ||
    readString(organization?.plan)
  );
}

function resolveOrgBillingStatus(
  billingMeta: OrganizationMetaRecord
): string | null {
  const meta = asRecord(billingMeta);
  return (
    readString(meta.billing_status) ||
    readString(meta.billingStatus) ||
    readString(meta.status) ||
    readString(meta.subscription_status)
  );
}

function formatTable<T>(
  title: string,
  rows: T[],
  columns: Array<{ key: keyof T; label: string }>
): string {
  const printableRows = rows.map(row =>
    columns.map(column => {
      const value = row[column.key];
      if (Array.isArray(value)) return value.join('; ');
      return value === null || value === undefined || value === ''
        ? '-'
        : String(value);
    })
  );

  const widths = columns.map((column, index) =>
    Math.max(
      column.label.length,
      ...printableRows.map(row => row[index]?.length ?? 0)
    )
  );

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index]))
    .join(' | ');
  const separator = widths.map(width => '-'.repeat(width)).join('-|-');
  const body =
    printableRows.length > 0
      ? printableRows
          .map(row =>
            row.map((value, index) => value.padEnd(widths[index])).join(' | ')
          )
          .join('\n')
      : '(sin resultados)';

  return `${title}\n${header}\n${separator}\n${body}\n`;
}

async function main() {
  const jsonMode = process.argv.includes('--json');

  initAdmin();
  const db = getFirestore();

  const [usersSnapshot, organizationsSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collection('organizations').get(),
  ]);

  const organizations = new Map(
    organizationsSnapshot.docs.map(doc => [
      doc.id,
      doc.data() as OrganizationRecord,
    ])
  );

  const organizationMeta = await Promise.all(
    organizationsSnapshot.docs.map(async orgDoc => {
      const [onboardingDoc, billingDoc] = await Promise.all([
        orgDoc.ref.collection('meta').doc('onboarding').get(),
        orgDoc.ref.collection('meta').doc('billing').get(),
      ]);

      return {
        organizationId: orgDoc.id,
        onboarding: onboardingDoc.exists
          ? (onboardingDoc.data() as Record<string, unknown>)
          : null,
        billing: billingDoc.exists
          ? (billingDoc.data() as Record<string, unknown>)
          : null,
      };
    })
  );

  const metaByOrgId = new Map(
    organizationMeta.map(item => [item.organizationId, item])
  );

  const usersWithoutOrganization: MissingUserOrgEntry[] = [];
  const inconsistentUsers: InconsistentUserEntry[] = [];

  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data() as UserRecord;
    const role = readString(data.rol);
    const organizationId = readString(data.organization_id);

    if (!organizationId && role !== 'super_admin') {
      usersWithoutOrganization.push({
        userId: userDoc.id,
        email: readString(data.email),
        role,
        organizationId: null,
        reason: 'missing_organization_id',
      });
      continue;
    }

    if (!organizationId) {
      continue;
    }

    const organization = organizations.get(organizationId) ?? null;
    if (!organization) {
      usersWithoutOrganization.push({
        userId: userDoc.id,
        email: readString(data.email),
        role,
        organizationId,
        reason: 'organization_not_found',
      });
      continue;
    }

    const meta = metaByOrgId.get(organizationId);
    const orgBilling = meta?.billing ?? null;
    const userPlanType = readString(data.planType);
    const userBillingStatus = readString(data.billing_status);
    const orgPlanType = resolveOrgPlan(orgBilling, organization);
    const orgBillingStatus = resolveOrgBillingStatus(orgBilling);
    const reasons: string[] = [];

    if (!orgBilling && (userPlanType || userBillingStatus)) {
      reasons.push(
        'organization missing meta/billing while user still stores legacy billing fields'
      );
    }
    if (userPlanType && orgPlanType && userPlanType !== orgPlanType) {
      reasons.push('user.planType differs from organization billing plan');
    }
    if (
      userBillingStatus &&
      orgBillingStatus &&
      userBillingStatus !== orgBillingStatus
    ) {
      reasons.push(
        'user.billing_status differs from organization billing status'
      );
    }

    if (reasons.length > 0) {
      inconsistentUsers.push({
        userId: userDoc.id,
        email: readString(data.email),
        organizationId,
        organizationName:
          readString(organization.name) || readString(organization.nombre),
        userPlanType,
        orgPlanType,
        userBillingStatus,
        orgBillingStatus,
        reasons,
      });
    }
  }

  const organizationsWithoutOnboarding: MissingOrgMetaEntry[] = [];
  const organizationsWithoutBilling: MissingOrgMetaEntry[] = [];

  for (const orgDoc of organizationsSnapshot.docs) {
    const org = orgDoc.data() as OrganizationRecord;
    const meta = metaByOrgId.get(orgDoc.id);
    const baseEntry = {
      organizationId: orgDoc.id,
      organizationName: readString(org.name) || readString(org.nombre),
      slug: readString(org.slug),
    };

    if (!meta?.onboarding) {
      organizationsWithoutOnboarding.push(baseEntry);
    }
    if (!meta?.billing) {
      organizationsWithoutBilling.push(baseEntry);
    }
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    totals: {
      users: usersSnapshot.size,
      organizations: organizationsSnapshot.size,
      organizationsWithOnboardingMeta:
        organizationsSnapshot.size - organizationsWithoutOnboarding.length,
      organizationsWithBillingMeta:
        organizationsSnapshot.size - organizationsWithoutBilling.length,
    },
    usersWithoutOrganization,
    organizationsWithoutOnboarding,
    organizationsWithoutBilling,
    inconsistentUsers,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('\nAudit: onboarding/billing legacy\n');
  console.log(`Generated at: ${report.generatedAt}`);
  console.log(`Users: ${report.totals.users}`);
  console.log(`Organizations: ${report.totals.organizations}`);
  console.log(
    `Organizations with meta/onboarding: ${report.totals.organizationsWithOnboardingMeta}`
  );
  console.log(
    `Organizations with meta/billing: ${report.totals.organizationsWithBillingMeta}`
  );
  console.log('');

  console.log(
    formatTable('Users without valid organization', usersWithoutOrganization, [
      { key: 'userId', label: 'userId' },
      { key: 'email', label: 'email' },
      { key: 'role', label: 'role' },
      { key: 'organizationId', label: 'organizationId' },
      { key: 'reason', label: 'reason' },
    ])
  );

  console.log(
    formatTable(
      'Organizations without meta/onboarding',
      organizationsWithoutOnboarding,
      [
        { key: 'organizationId', label: 'organizationId' },
        { key: 'organizationName', label: 'name' },
        { key: 'slug', label: 'slug' },
      ]
    )
  );

  console.log(
    formatTable(
      'Organizations without meta/billing',
      organizationsWithoutBilling,
      [
        { key: 'organizationId', label: 'organizationId' },
        { key: 'organizationName', label: 'name' },
        { key: 'slug', label: 'slug' },
      ]
    )
  );

  console.log(
    formatTable(
      'Users inconsistent against organization billing',
      inconsistentUsers,
      [
        { key: 'userId', label: 'userId' },
        { key: 'email', label: 'email' },
        { key: 'organizationId', label: 'organizationId' },
        { key: 'userPlanType', label: 'userPlanType' },
        { key: 'orgPlanType', label: 'orgPlanType' },
        { key: 'userBillingStatus', label: 'userBillingStatus' },
        { key: 'orgBillingStatus', label: 'orgBillingStatus' },
        { key: 'reasons', label: 'reasons' },
      ]
    )
  );

  const nextActions = [
    usersWithoutOrganization.length > 0
      ? '- Resolve users without valid organization_id before enforcing org-only onboarding/billing.'
      : '- No users without organization_id found.',
    organizationsWithoutBilling.length > 0
      ? '- Backfill organizations/{orgId}/meta/billing before moving Mobbex writes away from users.'
      : '- All organizations already have meta/billing.',
    organizationsWithoutOnboarding.length > 0
      ? '- Backfill organizations/{orgId}/meta/onboarding to remove fallback assumptions.'
      : '- All organizations already have meta/onboarding.',
    inconsistentUsers.length > 0
      ? '- Review inconsistent users and decide whether org billing or user legacy fields are authoritative during rollout.'
      : '- No user/org billing inconsistencies detected.',
  ];

  console.log('Recommended next actions');
  console.log(nextActions.join('\n'));
  console.log('');
}

void main().catch(error => {
  console.error('[audit-onboarding-billing-legacy] Error:', error);
  process.exit(1);
});
