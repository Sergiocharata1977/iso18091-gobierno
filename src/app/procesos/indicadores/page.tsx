'use client';

import {
  BaseBadge,
  BaseCard,
  DomainCard,
  ListGrid,
  ListTable,
  PageHeader,
  PageToolbar,
  Section,
} from '@/components/design-system';
import { IndicatorFormDialog } from '@/components/quality/IndicatorFormDialog';
import { Button } from '@/components/ui/button';
import { QualityIndicator } from '@/types/quality';
import { Eye, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function IndicadoresListing() {
  const router = useRouter();
  const [indicators, setIndicators] = useState<QualityIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      const response = await fetch('/api/quality/indicators');
      if (response.ok) {
        const data = await response.json();
        setIndicators(data);
      }
    } catch (error) {
      console.error('Error fetching indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIndicators = indicators.filter(indicator => {
    const matchesSearch =
      indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicator.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicator.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || indicator.status === statusFilter;
    const matchesType = typeFilter === 'all' || indicator.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'activo':
        return 'Activo';
      case 'inactivo':
        return 'Inactivo';
      case 'suspendido':
        return 'Suspendido';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'activo':
        return 'success';
      case 'inactivo':
        return 'secondary';
      case 'suspendido':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getTrendVariant = (trend: string): any => {
    switch (trend) {
      case 'ascendente':
        return 'success';
      case 'descendente':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicadores de Calidad"
        description="Métricas y KPIs para monitoreo continuo"
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Procesos', href: '/procesos' },
          { label: 'Indicadores' },
        ]}
        actions={
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Indicador
          </Button>
        }
      />

      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        viewMode={viewMode as any}
        onViewModeChange={mode => setViewMode(mode as 'grid' | 'table')}
        supportedViews={['grid', 'table']}
        filterOptions={
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="suspendido">Suspendido</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="eficacia">Eficacia</option>
              <option value="eficiencia">Eficiencia</option>
              <option value="efectividad">Efectividad</option>
              <option value="calidad">Calidad</option>
              <option value="productividad">Productividad</option>
            </select>
          </div>
        }
      />

      <Section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <BaseCard key={i} className="h-64 animate-pulse bg-slate-100">
                <div />
              </BaseCard>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <ListGrid
            data={filteredIndicators}
            renderItem={indicator => (
              <DomainCard
                title={indicator.name}
                subtitle={indicator.code}
                status={{
                  label: getStatusText(indicator.status),
                  variant: getStatusVariant(indicator.status),
                }}
                meta={
                  <div className="space-y-4 mt-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          Valor Actual
                        </span>
                        <BaseBadge
                          variant={getTrendVariant(indicator.trend)}
                          className="text-[10px] px-1 h-4"
                        >
                          {indicator.trend}
                        </BaseBadge>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {indicator.current_value || 0}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          {indicator.unit}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-2 border-t border-slate-100">
                      <div>
                        Meta Mín:{' '}
                        <span className="font-medium">
                          {indicator.target_min}
                        </span>
                      </div>
                      <div>
                        Meta Máx:{' '}
                        <span className="font-medium">
                          {indicator.target_max}
                        </span>
                      </div>
                    </div>
                  </div>
                }
                actions={[
                  {
                    label: 'Ver detalle',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () =>
                      router.push(`/procesos/indicadores/${indicator.id}`),
                    variant: 'ghost',
                  },
                ]}
              />
            )}
            keyExtractor={ind => ind.id}
          />
        ) : (
          <ListTable
            data={filteredIndicators}
            columns={[
              { header: 'Código', accessorKey: 'code' },
              { header: 'Nombre', accessorKey: 'name' },
              { header: 'Valor Actual', accessorKey: 'current_value' },
              { header: 'Unidad', accessorKey: 'unit' },
              {
                header: 'Estado',
                cell: (ind: any) => (
                  <BaseBadge variant={getStatusVariant(ind.status)}>
                    {getStatusText(ind.status)}
                  </BaseBadge>
                ),
              },
            ]}
            keyExtractor={ind => ind.id}
          />
        )}
      </Section>

      <IndicatorFormDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={() => {
          setShowNewDialog(false);
          fetchIndicators();
        }}
      />
    </div>
  );
}
