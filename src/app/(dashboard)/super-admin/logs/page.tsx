import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { getAdminFirestore } from '@/lib/firebase/admin';

type AuditLogRow = {
  id: string;
  organization_id: string;
  user_email: string;
  timestamp: Date | null;
  details?: Record<string, unknown>;
};

async function loadOnboardingPhaseLogs(): Promise<AuditLogRow[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  return snapshot.docs
    .map(doc => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        organization_id: String(data.organization_id || ''),
        user_email: String(data.user_email || 'system@local'),
        timestamp:
          typeof (data.timestamp as { toDate?: () => Date })?.toDate ===
          'function'
            ? (data.timestamp as { toDate: () => Date }).toDate()
            : null,
        details:
          data.details && typeof data.details === 'object'
            ? (data.details as Record<string, unknown>)
            : undefined,
      };
    })
    .filter(row => {
      return (
        row.details?.source === 'api/onboarding/provision' ||
        row.details?.source ===
          'api/onboarding/generate-drafts-from-strategy' ||
        row.details?.source === 'api/onboarding/recover' ||
        row.details?.source === 'onboarding_metrics'
      );
    });
}

export default async function SuperAdminLogsPage() {
  const logs = await loadOnboardingPhaseLogs();

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <PageHeader
        title="Logs y Auditoria"
        description="Transiciones recientes de fase del onboarding."
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Logs y Auditoria' },
        ]}
      />

      <BaseCard padding="lg">
        <h3 className="text-lg font-semibold mb-4">
          Transiciones de onboarding
        </h3>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay transiciones de onboarding registradas todavia.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-col gap-1 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
                  <span className="font-medium">
                    Org: {log.organization_id || 'sin_org'}
                  </span>
                  <span>
                    {log.timestamp
                      ? log.timestamp.toLocaleString('es-AR')
                      : 'sin fecha'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {String(log.details?.previous_phase || 'desconocida')} {'->'}{' '}
                  {String(log.details?.next_phase || 'desconocida')}
                </p>
                <p className="text-xs text-slate-500">
                  Usuario: {log.user_email} | Fuente:{' '}
                  {String(log.details?.source || 'desconocida')}
                </p>
              </div>
            ))}
          </div>
        )}
      </BaseCard>
    </div>
  );
}
