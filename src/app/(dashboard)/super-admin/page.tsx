'use client';

import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  MessageSquare,
  Palette,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  pendingDemoRequests: number;
}

interface CrmAdoptionMetrics {
  overview: {
    totalOrganizations: number;
    organizationsUsingCrm: number;
    adoptionRate: number;
    totalClientes: number;
    totalActiveOpportunities: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    status: string;
    crmInstalled: boolean;
    clientesCount: number;
    activeOpportunitiesCount: number;
  }>;
}

interface AICostMetrics {
  overview: {
    totalCostMonth: number;
    totalActualCostMonth: number;
    totalCallsMonth: number;
    activeOrganizationsMonth: number;
    organizationsNearLimit: number;
  };
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    pendingDemoRequests: 0,
  });
  const [crmMetrics, setCrmMetrics] = useState<CrmAdoptionMetrics | null>(null);
  const [aiCostMetrics, setAiCostMetrics] = useState<AICostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [orgsResponse, demoResponse, crmResponse, aiCostResponse] = await Promise.all([
        fetch('/api/super-admin/organizations', { cache: 'no-store' }),
        fetch('/api/super-admin/demo-requests', { cache: 'no-store' }),
        fetch('/api/super-admin/capabilities/crm/metrics', {
          cache: 'no-store',
        }),
        fetch('/api/super-admin/ai-pricing/stats', { cache: 'no-store' }),
      ]);

      const [orgsData, demoData, crmData, aiCostData] = await Promise.all([
        orgsResponse.json(),
        demoResponse.json(),
        crmResponse.json(),
        aiCostResponse.json(),
      ]);

      if (!orgsResponse.ok || !demoResponse.ok || !crmResponse.ok || !aiCostResponse.ok) {
        const orgError = orgsData?.error || orgsData?.message;
        const demoError = demoData?.error || demoData?.message;
        const crmError = crmData?.error || crmData?.message;
        const aiCostError = aiCostData?.error || aiCostData?.message;
        setError(
          orgError ||
            demoError ||
            crmError ||
            aiCostError ||
            'No se pudo cargar el dashboard.'
        );
      }

      setStats({
        totalOrganizations: orgsData.organizations?.length || 0,
        activeOrganizations:
          orgsData.organizations?.filter((org: { status?: string }) =>
            org.status === 'active'
          ).length || 0,
        totalUsers: 0,
        pendingDemoRequests:
          demoData.data?.filter((req: { status?: string }) =>
            req.status === 'pending'
          ).length || 0,
      });

      setCrmMetrics(crmData?.success ? crmData.data : null);
      setAiCostMetrics(aiCostData?.success ? aiCostData.data : null);
    } catch (loadError) {
      console.error('Error loading stats:', loadError);
      setError('No se pudo cargar el dashboard.');
      setCrmMetrics(null);
      setAiCostMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="Dashboard Super Admin"
          description="Panel de control global del sistema Don Cándido IA"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Dashboard' },
          ]}
        />

        {error && (
          <BaseCard
            padding="md"
            className="border border-amber-200 bg-amber-50"
          >
            <p className="text-sm text-amber-800">
              No se pudieron cargar todos los datos de Super Admin. Detalle:{' '}
              {error}
            </p>
          </BaseCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Organizaciones"
            value={loading ? '...' : stats.totalOrganizations}
            subtitle={`${stats.activeOrganizations} activas`}
            icon={<Building2 className="w-6 h-6" />}
            color="blue"
            href="/super-admin/organizaciones"
          />
          <StatCard
            title="Usuarios Globales"
            value={loading ? '...' : stats.totalUsers}
            subtitle="En todas las organizaciones"
            icon={<Users className="w-6 h-6" />}
            color="emerald"
            href="/super-admin/usuarios"
          />
          <StatCard
            title="Solicitudes Demo"
            value={loading ? '...' : stats.pendingDemoRequests}
            subtitle="Pendientes de revisión"
            icon={<MessageSquare className="w-6 h-6" />}
            color="amber"
            href="/super-admin/organizaciones"
          />
          <StatCard
            title="Estadísticas"
            value="Ver"
            subtitle="Métricas globales"
            icon={<BarChart3 className="w-6 h-6" />}
            color="purple"
            href="/super-admin/stats"
          />
          <StatCard
            title="Costo IA mes"
            value={
              loading
                ? '...'
                : `USD ${Number(
                    aiCostMetrics?.overview.totalCostMonth || 0
                  ).toFixed(2)}`
            }
            subtitle={`${aiCostMetrics?.overview.organizationsNearLimit || 0} orgs cerca del limite`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="emerald"
            href="/super-admin/stats/costos-ia"
          />
        </div>

        <BaseCard padding="lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                  <BriefcaseBusiness className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Adopción CRM</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Cuántas organizaciones usan CRM, volumen de clientes y pipeline
                activo por tenant.
              </p>
            </div>
            <Link href="/super-admin/capabilities">
              <Button variant="outline" size="sm">
                Ver capabilities
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricTile
              label="Orgs con CRM"
              value={
                loading
                  ? '...'
                  : `${crmMetrics?.overview.organizationsUsingCrm || 0}`
              }
              helper={
                crmMetrics
                  ? `${crmMetrics.overview.adoptionRate}% de adopción`
                  : 'Sin datos'
              }
            />
            <MetricTile
              label="Clientes cargados"
              value={loading ? '...' : crmMetrics?.overview.totalClientes || 0}
              helper="Registros activos en CRM"
            />
            <MetricTile
              label="Oportunidades activas"
              value={
                loading
                  ? '...'
                  : crmMetrics?.overview.totalActiveOpportunities || 0
              }
              helper="Oportunidades abiertas del pipeline"
            />
          </div>

          <div className="space-y-3">
            {(crmMetrics?.tenants || []).slice(0, 5).map(tenant => (
              <div
                key={tenant.id}
                className="flex items-center justify-between rounded-lg border bg-surface-subtle px-4 py-3"
              >
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.id} · {tenant.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {tenant.clientesCount} clientes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.activeOpportunitiesCount} oportunidades activas
                  </p>
                </div>
              </div>
            ))}

            {!loading && (!crmMetrics || crmMetrics.tenants.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No hay tenants con CRM instalado todavía.
              </p>
            )}
          </div>
        </BaseCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BaseCard padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  Gestión de Organizaciones
                </h3>
              </div>
              <Link href="/super-admin/organizaciones?create=1">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Administra organizaciones, usuarios y configuraciones multi-tenant
            </p>
            <div className="space-y-2">
              <QuickLink
                href="/super-admin/organizaciones"
                label="Abrir pipeline unificado"
              />
              <QuickLink
                href="/super-admin/organizaciones?create=1"
                label="Crear nueva organización"
              />
            </div>
          </BaseCard>

          <BaseCard padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">
                Herramientas del Sistema
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Acceso rápido a configuración y monitoreo del sistema
            </p>
            <div className="space-y-2">
              <QuickLink
                href="/super-admin/design-system"
                label="Design System"
                icon={<Palette className="w-4 h-4" />}
              />
              <QuickLink
                href="/super-admin/stats"
                label="Estadísticas Globales"
                icon={<BarChart3 className="w-4 h-4" />}
              />
              <QuickLink
                href="/super-admin/ia-precios"
                label="Precios IA"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <QuickLink
                href="/super-admin/stats/costos-ia"
                label="Costos IA"
                icon={<BarChart3 className="w-4 h-4" />}
              />
              <QuickLink
                href="/super-admin/maturity"
                label="Madurez del Sistema"
              />
            </div>
          </BaseCard>
        </div>

        <BaseCard padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-surface-subtle p-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Estado del Sistema</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SystemStatusItem
              label="Servidor"
              status="Operativo"
              variant="success"
            />
            <SystemStatusItem
              label="Base de Datos"
              status="Operativo"
              variant="success"
            />
            <SystemStatusItem
              label="Almacenamiento"
              status="Operativo"
              variant="success"
            />
          </div>
        </BaseCard>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-xl border bg-surface-subtle p-4">
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  href: string;
}) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    emerald:
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber:
      'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    purple:
      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <Link href={href}>
      <BaseCard
        padding="lg"
        className="hover:shadow-lg transition-shadow cursor-pointer h-full"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
      </BaseCard>
    </Link>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SystemStatusItem({
  label,
  status,
  variant,
}: {
  label: string;
  status: string;
  variant: 'success' | 'warning' | 'error';
}) {
  const variantMap = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-subtle p-3">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`text-xs font-semibold px-2 py-1 rounded ${variantMap[variant]}`}
      >
        {status}
      </span>
    </div>
  );
}
