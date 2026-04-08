'use client';

import { PageHeader, PageToolbar } from '@/components/design-system/layout';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { EntityDetailHeader } from '@/components/design-system/patterns/cards/EntityDetailHeader';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseButton } from '@/components/design-system/primitives/BaseButtonPrimitive';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { InlineTagList } from '@/components/design-system/primitives/InlineTagList';
import { ModuleSidebar } from '@/components/design-system/primitives/ModuleSidebar';
import { ProgressBar } from '@/components/design-system/primitives/ProgressBar';
import { SidebarShell } from '@/components/design-system/primitives/SidebarShell';
import { TabPanel } from '@/components/design-system/primitives/TabPanel';
import { moduleAccents, radius, typography } from '@/components/design-system/tokens';
import { Button } from '@/components/ui/button';
import {
  Eye,
  FileText,
  Layers,
  Palette,
  Plus,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';

const ITEMS = [
  {
    id: '1',
    title: 'Auditoria interna ISO 9001',
    code: 'AUD-2026-001',
    description: 'Revision anual de procesos criticos, evidencia y cierre.',
    status: { label: 'Completada', variant: 'success' as const },
    responsible: 'Maria Garcia',
  },
  {
    id: '2',
    title: 'Revision de procesos comerciales',
    code: 'AUD-2026-002',
    description: 'Evaluacion del flujo comercial y del servicio postventa.',
    status: { label: 'En progreso', variant: 'warning' as const },
    responsible: 'Carlos Lopez',
  },
  {
    id: '3',
    title: 'Control de proveedores criticos',
    code: 'AUD-2026-003',
    description: 'Seguimiento de requisitos, riesgos y desempeno de terceros.',
    status: { label: 'Planificada', variant: 'secondary' as const },
    responsible: 'Ana Martinez',
  },
];

export default function DesignSystemPage() {
  const [search, setSearch] = useState('');
  const [entityTab, setEntityTab] = useState('resumen');
  const [tabVariant, setTabVariant] = useState<'underline' | 'pills'>('underline');

  const filtered = ITEMS.filter(item => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="ledger-panel rounded-[28px] p-8 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                <Palette className="h-4 w-4" />
                Super menu - catalogo canonico
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Design System
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Esta pagina concentra el modelo visual de toda la web. Aqui se
                define como deben verse los componentes, las sidebars, los ABM y
                las vistas de detalle antes de expandirse al resto de modulos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <RuleCard title="Superficies antes que bordes" />
              <RuleCard title="Sidebar como pilar visual" />
              <RuleCard title="CTA premium con gradiente" />
            </div>
          </div>
        </section>

        <SectionTitle
          title="Workspace de referencia"
          description="La pagina del Super menu ahora deja explicito el modelo base para toda la web."
        />

        <section className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="ledger-sidebar rounded-[28px] p-4 text-white">
            <SidebarShell
              title="Super Admin"
              scope="platform"
              activeHref="/super-admin/design-system"
              className="w-full border-white/10 bg-transparent p-0 shadow-none"
              items={[
                { label: 'Dashboard', href: '/super-admin', icon: TrendingUp },
                {
                  label: 'Organizaciones',
                  href: '/super-admin/organizaciones',
                  icon: Users,
                },
                {
                  label: 'Design System',
                  href: '/super-admin/design-system',
                  icon: Palette,
                  badge: 'Canon',
                },
              ]}
            />
          </div>

          <div className="ledger-panel rounded-[28px] p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <PageHeader
                  className="rounded-[24px] bg-white/80 px-0 py-0"
                  title="Modelo operacional de interfaz"
                  description="Patron para paginas de gestion, seguimiento y cumplimiento."
                  breadcrumbs={[
                    { label: 'Super Admin', href: '/super-admin' },
                    { label: 'Design System' },
                  ]}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 bg-white/70"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Tokens
                      </Button>
                      <Button size="sm" className="ledger-primary-button border-0">
                        <Plus className="mr-2 h-4 w-4" />
                        Accion principal
                      </Button>
                    </div>
                  }
                />
              </div>

              <ModuleSidebar
                moduleName="Calidad"
                className="w-full max-w-xs"
                activeHref="/calidad/auditorias"
                items={[
                  { label: 'Auditorias', href: '/calidad/auditorias', icon: FileText },
                  { label: 'Procesos', href: '/calidad/procesos', icon: Layers },
                  { label: 'Indicadores', href: '/calidad/indicadores', icon: TrendingUp },
                ]}
              />
            </div>

            <div className="rounded-[24px] bg-[#f3f4f5] p-4 md:p-5">
              <PageToolbar
                searchValue={search}
                onSearch={setSearch}
                searchPlaceholder="Buscar componente, patron o modulo..."
                className="border-white/60 bg-white/75 shadow-[0_12px_32px_rgba(25,28,29,0.06)]"
                filterOptions={
                  <div className="flex flex-wrap gap-2">
                    <BaseBadge variant="outline">ABM</BaseBadge>
                    <BaseBadge variant="outline">KPI</BaseBadge>
                    <BaseBadge variant="outline">Sidebar</BaseBadge>
                    <BaseBadge variant="success">Canon</BaseBadge>
                  </div>
                }
              />

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <StatCard label="Componentes" value="32" />
                <StatCard label="Patrones" value="12" />
                <StatCard label="Modulos" value="8" />
                <StatCard label="Adopcion" value="76%" />
              </div>

              <div className="mt-5">
                <ListGrid
                  data={filtered}
                  keyExtractor={item => item.id}
                  renderItem={item => (
                    <DomainCard
                      title={item.title}
                      subtitle={item.code}
                      status={item.status}
                      meta={
                        <div className="text-xs text-muted-foreground">
                          Responsable: {item.responsible}
                        </div>
                      }
                      actions={[
                        {
                          label: 'Ver',
                          onClick: () => {},
                          icon: <Eye className="h-4 w-4" />,
                        },
                        {
                          label: 'Editar',
                          onClick: () => {},
                          icon: <Settings className="h-4 w-4" />,
                        },
                      ]}
                    >
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </DomainCard>
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Tokens
            </p>
            <div className="mt-4 space-y-3">
              <p className={typography.h2}>Headline / H2</p>
              <p className={typography.p}>
                El catalogo del Super menu sigue siendo la referencia base de
                tipografia y ritmo visual.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(radius).slice(0, 3).map(([name, className]) => (
                  <div key={name} className="text-center">
                    <div
                      className={`flex h-12 items-center justify-center bg-slate-950 text-xs font-semibold text-white ${className}`}
                    >
                      {name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BaseCard>

          <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Module accents
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(moduleAccents).map(([name, accent]) => (
                <div
                  key={name}
                  className={`rounded-2xl border p-4 ${accent.light} ${accent.border}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${accent.text}`}>
                      {name}
                    </span>
                    <span className={`h-3 w-10 rounded-full ${accent.accent}`} />
                  </div>
                </div>
              ))}
            </div>
          </BaseCard>

          <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Primitivas
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <BaseButton>Default</BaseButton>
              <BaseButton variant="secondary">Secondary</BaseButton>
              <BaseButton variant="outline">Outline</BaseButton>
              <BaseBadge variant="success">Success</BaseBadge>
              <BaseBadge variant="outline">Outline</BaseBadge>
            </div>
          </BaseCard>
        </section>

        <SectionTitle
          title="Nuevos P0"
          description="Detalle de entidad, metricas, tabs y tags integrados dentro del mismo catalogo."
        />

        <section className="grid gap-6">
          <EntityDetailHeader
            name="Lucas Perez"
            subtitle="lucas.perez@gmail.com"
            tags={[
              { label: 'Consumidor final', color: 'blue' },
              { label: 'Activa', color: 'green' },
              { label: 'VIP', color: 'amber' },
            ]}
            stats={[
              { label: 'PROYECTO', value: 'Elloy Village' },
              { label: 'UNIDADES', value: 'Unidad 102' },
              { label: 'VALOR TOTAL', value: 'USD 2.400.000' },
            ]}
            actions={[
              {
                icon: <Eye className="h-4 w-4" />,
                label: 'Ver',
                onClick: () => {},
              },
              {
                icon: <Settings className="h-4 w-4" />,
                label: 'Configurar',
                onClick: () => {},
              },
            ]}
            tabs={[
              { id: 'resumen', label: 'Resumen', icon: <FileText className="h-4 w-4" /> },
              { id: 'facturas', label: 'Facturas', badge: 3 },
              { id: 'actividad', label: 'Actividad' },
            ]}
            activeTab={entityTab}
            onTabChange={setEntityTab}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <KPIStatCard
              label="VALOR CERRADO"
              value="USD 2.400.000"
              progress={{
                value: 58,
                label: 'Abonado USD 1.380.000',
                color: 'info',
              }}
              subtext="12 NOV 2024"
            />
            <KPIStatCard
              label="CUOTAS ABONADAS"
              value="1/12"
              progress={{
                value: 8,
                label: 'Progreso de cuotas',
                color: 'success',
              }}
              subtext="Proximo vencimiento 12/12/2025"
            />
            <KPIStatCard
              label="RENDIMIENTO MENSUAL"
              value="+12.5%"
              trend={{ value: '+2.3%', direction: 'up' }}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
            <div className="flex gap-2">
              <Button
                variant={tabVariant === 'underline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTabVariant('underline')}
              >
                Underline
              </Button>
              <Button
                variant={tabVariant === 'pills' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTabVariant('pills')}
              >
                Pills
              </Button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <TabPanel
                  variant={tabVariant}
                  tabs={[
                    { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
                    { id: 'permisos', label: 'Permisos', badge: 5 },
                    { id: 'historial', label: 'Historial' },
                  ]}
                  activeTab={entityTab}
                  onChange={setEntityTab}
                />
                <ProgressBar
                  value={75}
                  color="primary"
                  label="Primary"
                  showPercentage
                />
                <ProgressBar
                  value={58}
                  color="info"
                  label="Info"
                  showPercentage
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-900">
                  InlineTagList
                </p>
                <InlineTagList
                  tags={[
                    { label: 'ISO 9001', color: 'blue' },
                    { label: 'Agro', color: 'green' },
                    { label: 'Finanzas', color: 'amber' },
                    { label: 'Premium', color: 'purple' },
                  ]}
                  maxVisible={3}
                />
              </div>
            </div>
          </BaseCard>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function RuleCard({ title }: { title: string }) {
  return (
    <div className="ledger-panel-subtle rounded-2xl p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/85 p-4 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
