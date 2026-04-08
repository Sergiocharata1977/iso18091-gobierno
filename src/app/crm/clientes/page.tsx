'use client';

import { FiltrosClasificacion } from '@/components/crm/clasificaciones/FiltrosClasificacion';
import { ClientesGrid } from '@/components/crm/clientes/ClientesGrid';
import { ClientesList } from '@/components/crm/clientes/ClientesList';
import { NuevoClienteDialog } from '@/components/crm/NuevoClienteDialog';
import { EntityDetailHeader } from '@/components/design-system/patterns/cards/EntityDetailHeader';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { InlineTagList } from '@/components/design-system/primitives/InlineTagList';
import { ProgressBar } from '@/components/design-system/primitives/ProgressBar';
import { TabPanel } from '@/components/design-system/primitives/TabPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { ClienteCRM, TipoCliente } from '@/types/crm';
import type { ClasificacionesMap } from '@/types/crm-clasificacion';
import {
  Building2,
  Grid3X3,
  List,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type ViewMode = 'list' | 'grid';

const TIPO_LABELS: Record<TipoCliente, string> = {
  posible_cliente: 'Posible cliente',
  cliente_frecuente: 'Cliente frecuente',
  cliente_antiguo: 'Cliente antiguo',
};

const TIPO_COLORS: Record<TipoCliente, 'blue' | 'green' | 'gray'> = {
  posible_cliente: 'blue',
  cliente_frecuente: 'green',
  cliente_antiguo: 'gray',
};

const VIEW_TABS = [
  { id: 'list', label: 'Lista', icon: <List className="h-4 w-4" /> },
  { id: 'grid', label: 'Tarjetas', icon: <Grid3X3 className="h-4 w-4" /> },
];

export default function ClientesPage() {
  const { user, loading: authLoading } = useAuth();
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filtrosClasificacion, setFiltrosClasificacion] =
    useState<ClasificacionesMap>({});
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const organizationId = user?.organization_id;

  const loadClientes = async () => {
    if (!organizationId) {
      setError('No se encontro la organizacion');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `/api/crm/clientes?organization_id=${organizationId}`
      );
      const data = await res.json();
      if (data.success) {
        setClientes(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (organizationId) {
      loadClientes();
    } else {
      setLoading(false);
    }
  }, [authLoading, organizationId]);

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch =
      cliente.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cuit_cuil?.includes(searchTerm) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo =
      filterTipo === 'all' || cliente.tipo_cliente === filterTipo;

    const matchesClasificaciones = Object.entries(filtrosClasificacion).every(
      ([slug, valorFiltro]) => {
        if (!valorFiltro) return true;

        const valorCliente = cliente.classifications?.[slug];
        const valoresCliente = Array.isArray(valorCliente)
          ? valorCliente
          : valorCliente
            ? [valorCliente]
            : [];
        const valoresFiltro = Array.isArray(valorFiltro)
          ? valorFiltro
          : [valorFiltro];

        return valoresFiltro.every(valor => valoresCliente.includes(valor));
      }
    );

    return matchesSearch && matchesTipo && matchesClasificaciones;
  });

  const totalClientes = clientes.length;
  const activos = clientes.filter(cliente => cliente.isActive).length;
  const posiblesClientes = clientes.filter(
    cliente => cliente.tipo_cliente === 'posible_cliente'
  ).length;
  const clientesFrecuentes = clientes.filter(
    cliente => cliente.tipo_cliente === 'cliente_frecuente'
  ).length;
  const contactosCompletos = clientes.filter(cliente =>
    Boolean(cliente.email && cliente.telefono)
  ).length;
  const scoreActividad =
    totalClientes > 0 ? (clientesFrecuentes / totalClientes) * 100 : 0;
  const scoreContacto =
    totalClientes > 0 ? (contactosCompletos / totalClientes) * 100 : 0;

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 rounded-xl border border-slate-200 bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-red-600 rounded-xl border border-red-200 bg-red-50">
          {error}
        </div>
      );
    }

    return viewMode === 'grid' ? (
      <ClientesGrid clientes={filteredClientes} />
    ) : (
      <ClientesList clientes={filteredClientes} />
    );
  };

  const activeFilterTags = [
    { label: `Mostrando ${filteredClientes.length} de ${totalClientes}` },
    ...(filterTipo !== 'all' && TIPO_LABELS[filterTipo as TipoCliente]
      ? [
          {
            label: `Tipo ${TIPO_LABELS[filterTipo as TipoCliente]}`,
            color: TIPO_COLORS[filterTipo as TipoCliente],
          },
        ]
      : []),
    ...(searchTerm.trim()
      ? [{ label: 'Busqueda activa', color: 'blue' as const }]
      : []),
    ...Object.entries(filtrosClasificacion).flatMap(([slug, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values
        .filter(Boolean)
        .map(item => ({ label: `${slug}: ${item}`, color: 'green' as const }));
    }),
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4">
      <EntityDetailHeader
        name="Clientes y organizaciones"
        subtitle="Panel operativo CRM con lectura comercial y financiera"
        tags={[
          { label: `${totalClientes} total`, color: 'gray' },
          { label: `${filteredClientes.length} visibles`, color: 'blue' },
          { label: `${activos} activos`, color: 'green' },
          ...(filterTipo !== 'all' && TIPO_LABELS[filterTipo as TipoCliente]
            ? [
                {
                  label: `Filtro: ${TIPO_LABELS[filterTipo as TipoCliente]}`,
                  color: TIPO_COLORS[filterTipo as TipoCliente],
                },
              ]
            : []),
        ]}
        stats={[
          { label: 'UNIDAD', value: 'CRM B2B' },
          { label: 'ACTIVOS', value: `${activos}/${totalClientes}` },
          { label: 'PIPELINE', value: `${posiblesClientes} leads` },
        ]}
        actions={[
          {
            icon: <Users className="h-4 w-4" />,
            label: 'Vista lista',
            onClick: () => setViewMode('list'),
          },
          {
            icon: <Grid3X3 className="h-4 w-4" />,
            label: 'Vista tarjetas',
            onClick: () => setViewMode('grid'),
          },
          {
            icon: <Plus className="h-4 w-4" />,
            label: 'Nuevo cliente',
            onClick: () => setShowNuevoClienteDialog(true),
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPIStatCard
          label="CARTERA TOTAL"
          value={`${totalClientes}`}
          subtext={`${filteredClientes.length} en vista actual`}
          progress={{
            value: totalClientes > 0 ? (activos / totalClientes) * 100 : 0,
            label: 'Activos',
            color: 'success',
          }}
        />
        <KPIStatCard
          label="CLIENTES FRECUENTES"
          value={`${clientesFrecuentes}`}
          subtext={`${posiblesClientes} posibles clientes`}
          progress={{
            value: scoreActividad,
            label: 'Indice de actividad',
            color: 'info',
          }}
        />
        <KPIStatCard
          label="CONTACTABILIDAD"
          value={`${Math.round(scoreContacto)}%`}
          subtext="Email + telefono completos"
          progress={{
            value: scoreContacto,
            label: `${contactosCompletos}/${totalClientes} fichas completas`,
            color: 'warning',
          }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-blue-600" />
            Monitor de clientes
          </div>
          <Button
            onClick={() => setShowNuevoClienteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por razon social, CUIT o email..."
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Tipo de cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="posible_cliente">Posible cliente</SelectItem>
              <SelectItem value="cliente_frecuente">
                Cliente frecuente
              </SelectItem>
              <SelectItem value="cliente_antiguo">Cliente antiguo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FiltrosClasificacion
          entidadTipo="cliente"
          filtrosActivos={filtrosClasificacion}
          onFiltrosChange={setFiltrosClasificacion}
        />

        <TabPanel
          tabs={VIEW_TABS.map(tab => ({
            ...tab,
            badge: tab.id === viewMode ? filteredClientes.length : undefined,
          }))}
          activeTab={viewMode}
          onChange={tabId => setViewMode(tabId as ViewMode)}
          variant="pills"
        />

        <div className="space-y-2">
          <InlineTagList tags={activeFilterTags} />
          <ProgressBar
            value={
              totalClientes > 0
                ? (filteredClientes.length / totalClientes) * 100
                : 0
            }
            label="Cobertura de filtros"
            showPercentage
            color="info"
          />
        </div>
      </div>

      {renderView()}

      <NuevoClienteDialog
        open={showNuevoClienteDialog}
        onOpenChange={setShowNuevoClienteDialog}
        onSuccess={loadClientes}
      />
    </div>
  );
}
