'use client';

import { PageHeader, PageToolbar } from '@/components/design-system/layout';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { MaturityLevel } from '@/types/maturity';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface OrgMaturitySummary {
  organizationId: string;
  name: string;
  plan: string;
  maturityLevel: MaturityLevel;
  maturityScore: number;
  lastUpdated: string | null;
  companySize: string;
}

const LEVEL_VARIANT: Record<MaturityLevel, 'secondary' | 'success' | 'outline'> = {
  [MaturityLevel.INICIAL]: 'outline',
  [MaturityLevel.ORDENADO]: 'secondary',
  [MaturityLevel.CONTROLADO]: 'secondary',
  [MaturityLevel.MADURO]: 'success',
  [MaturityLevel.EXCELENTE]: 'success',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('es-AR') : 'Nunca';
}

export default function SuperAdminMaturityPage() {
  const [data, setData] = useState<OrgMaturitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/maturity', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar la madurez');
      const json = await res.json();
      setData(json.organizations || []);
    } catch (error) {
      console.error('Error fetching admin maturity data', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      org =>
        org.name.toLowerCase().includes(term) ||
        org.organizationId.toLowerCase().includes(term) ||
        org.plan.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const averageScore = filteredData.length
    ? Math.round(filteredData.reduce((acc, org) => acc + org.maturityScore, 0) / filteredData.length)
    : 0;
  const matureCount = filteredData.filter(org => org.maturityScore >= 60).length;
  const excellentCount = filteredData.filter(org => org.maturityLevel === MaturityLevel.EXCELENTE).length;

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Monitor de organizaciones"
          description="Vista global para detectar donde abrir la ficha individual. El detalle operativo queda dentro de cada organizacion."
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Uso por organizacion' }]}
          actions={
            <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          }
        />

        <section className="ledger-panel rounded-[28px] p-4 md:p-5">
          <PageToolbar
            searchValue={searchTerm}
            onSearch={setSearchTerm}
            searchPlaceholder="Buscar organizacion, plan o id..."
            className="border-white/60 bg-white/75 shadow-[0_12px_32px_rgba(25,28,29,0.06)]"
            filterOptions={
              <div className="flex flex-wrap gap-2">
                <BaseBadge variant="outline">Vista global</BaseBadge>
                <BaseBadge variant="secondary">Entrada al single</BaseBadge>
                <BaseBadge variant="success">Madurez visible</BaseBadge>
              </div>
            }
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPIStatCard
              label="ORGANIZACIONES"
              value={String(filteredData.length)}
              subtext="Base visible en el monitor"
              icon={<Building2 className="h-5 w-5" />}
            />
            <KPIStatCard
              label="PROMEDIO GLOBAL"
              value={`${averageScore}%`}
              subtext="Score medio de madurez"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <KPIStatCard
              label="ORDENADAS O MAS"
              value={String(matureCount)}
              subtext="Con score mayor o igual a 60"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <KPIStatCard
              label="EXCELENTES"
              value={String(excellentCount)}
              subtext="Nivel mas alto detectado"
              icon={<Users className="h-5 w-5" />}
            />
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <BaseCard className="border-white/60 bg-white/80 text-center text-sm text-slate-500">
                Cargando datos de madurez...
              </BaseCard>
            ) : filteredData.length === 0 ? (
              <BaseCard className="border-white/60 bg-white/80 text-center text-sm text-slate-500">
                No se encontraron organizaciones con esos filtros.
              </BaseCard>
            ) : (
              filteredData.map(org => (
                <BaseCard
                  key={org.organizationId}
                  className="border-white/60 bg-white/85 shadow-[0_12px_32px_rgba(25,28,29,0.06)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-950">{org.name}</h2>
                        <BaseBadge variant={LEVEL_VARIANT[org.maturityLevel]}>
                          {org.maturityLevel}
                        </BaseBadge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                        <span>ID: {org.organizationId}</span>
                        <span>Plan: {org.plan}</span>
                        <span>Tamano: {org.companySize || 'Sin dato'}</span>
                        <span>Actualizado: {formatDate(org.lastUpdated)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          Score
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-950">{org.maturityScore}%</p>
                      </div>
                      <Button asChild className="ledger-primary-button border-0">
                        <Link href={`/super-admin/organizaciones/${org.organizationId}`}>
                          Abrir ficha
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/super-admin/organizaciones/${org.organizationId}`}>
                          Ver detalle
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </BaseCard>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
