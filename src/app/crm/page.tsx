/**
 * Página principal del CRM con vista Kanban de OPORTUNIDADES
 * Refactorizado para mover Oportunidades en lugar de Clientes
 */

'use client';

import { ABMViewMode, ABMViewToggle } from '@/components/abm';
import { PendingActionsWidget } from '@/components/crm/actions/PendingActionsWidget';
import { MobileFilters } from '@/components/crm/MobileFilters';
import { NuevoClienteDialog } from '@/components/crm/NuevoClienteDialog';
import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { OportunidadesGrid } from '@/components/crm/oportunidades/OportunidadesGrid';
import { OportunidadesList } from '@/components/crm/oportunidades/OportunidadesList';
import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import UnifiedKanban from '@/components/ui/unified-kanban';
import { useAuth } from '@/contexts/AuthContext';
import type { ClienteCRM, EstadoClienteKanban } from '@/types/crm';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import type { KanbanColumn, KanbanItem } from '@/types/rrhh';
import {
  Building2,
  DollarSign,
  Loader2,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Personal {
  id: string;
  nombre: string;
  apellido: string;
}

export default function CRMPage() {
  const { user, loading: authLoading } = useAuth();
  const [estados, setEstados] = useState<EstadoClienteKanban[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadCRM[]>([]);
  const [organizaciones, setOrganizaciones] = useState<ClienteCRM[]>([]);
  const [vendedores, setVendedores] = useState<Personal[]>([]);
  const [contactos, setContactos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [showNuevaOportunidadDialog, setShowNuevaOportunidadDialog] =
    useState(false);
  const [saving, setSaving] = useState(false);

  // Form state nueva oportunidad
  const [opNombre, setOpNombre] = useState('');
  const [opDescripcion, setOpDescripcion] = useState('');
  const [opOrganizacionId, setOpOrganizacionId] = useState('');
  const [opContactoId, setOpContactoId] = useState('');
  const [opVendedorId, setOpVendedorId] = useState('');
  const [opMonto, setOpMonto] = useState('');
  const [opEstadoId, setOpEstadoId] = useState('');

  // Estados de Filtros
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ABMViewMode>('kanban');

  const organizationId = user?.organization_id;

  const loadData = async () => {
    if (!organizationId) {
      setError('No se encontró la organización del usuario');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Cargar estados Kanban
      const estadosRes = await fetch(
        `/api/crm/kanban/estados?organization_id=${organizationId}`
      );
      const estadosData = await estadosRes.json();
      if (!estadosData.success) throw new Error(estadosData.error);
      setEstados(estadosData.data);
      if (estadosData.data.length > 0 && !opEstadoId) {
        setOpEstadoId(estadosData.data[0].id);
      }

      // Cargar OPORTUNIDADES
      const opRes = await fetch(
        `/api/crm/oportunidades?organization_id=${organizationId}`
      );
      const opData = await opRes.json();
      if (!opData.success) throw new Error(opData.error);
      setOportunidades(opData.data);

      // Cargar organizaciones para filtros y nueva oportunidad
      const orgRes = await fetch(
        `/api/crm/clientes?organization_id=${organizationId}`
      );
      const orgData = await orgRes.json();
      if (orgData.success) {
        setOrganizaciones(orgData.data);
      }

      // Cargar vendedores (opcional - no rompe si falla)
      try {
        const vendRes = await fetch(
          `/api/rrhh/personnel?organization_id=${organizationId}`
        );
        const vendData = await vendRes.json();
        if (vendData.success && vendData.data) {
          setVendedores(vendData.data);

          // Auto-seleccionar al usuario actual como vendedor
          if (user?.personnel_id) {
            const currentUserPersonnel = vendData.data.find(
              (p: Personal) => p.id === user.personnel_id
            );
            if (currentUserPersonnel) {
              setOpVendedorId(user.personnel_id);
            }
          }
        }
      } catch (err) {
        console.warn('No se pudieron cargar vendedores:', err);
        // Continuar sin vendedores, no es crítico
      }

      setError(null);
    } catch (err: unknown) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (organizationId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [authLoading, organizationId]);

  // Cargar contactos cuando se selecciona una organización
  const loadContactos = async (orgId: string) => {
    if (!orgId) {
      setContactos([]);
      setOpContactoId('');
      return;
    }

    try {
      const res = await fetch(
        `/api/crm/contactos?organization_id=${organizationId}&cliente_id=${orgId}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setContactos(data.data);
      } else {
        setContactos([]);
      }
    } catch (err) {
      console.warn('Error loading contacts:', err);
      setContactos([]);
    }
  };

  // Cargar contactos cuando cambia la organización seleccionada
  useEffect(() => {
    if (opOrganizacionId) {
      loadContactos(opOrganizacionId);
    }
  }, [opOrganizacionId]);

  // Obtener opciones únicas para filtros
  const uniqueSellers = Array.from(
    new Set(
      oportunidades
        .map(o => o.vendedor_nombre)
        .filter((name): name is string => !!name)
    )
  ).sort();

  const uniqueOrgs = Array.from(
    new Set(
      oportunidades
        .map(o => o.organizacion_nombre)
        .filter((name): name is string => !!name)
    )
  ).sort();

  // Filtrar oportunidades
  const filteredOportunidades = oportunidades.filter(op => {
    if (selectedSeller !== 'all' && op.vendedor_nombre !== selectedSeller) {
      return false;
    }
    if (selectedOrg !== 'all' && op.organizacion_nombre !== selectedOrg) {
      return false;
    }
    return true;
  });

  // Convertir estados a columnas de Kanban
  const kanbanColumns: KanbanColumn[] = estados.map((estado, index) => ({
    id: estado.id,
    title: estado.nombre,
    color: estado.color,
    maxItems: undefined,
    allowDrop: true,
    order: index,
  }));

  // Convertir oportunidades a items de Kanban
  const kanbanItems: KanbanItem[] = filteredOportunidades.map(op => ({
    id: op.id,
    columnId: op.estado_kanban_id,
    title: op.nombre,
    description: op.organizacion_nombre,
    assignee: op.vendedor_nombre,
    tags: [],
    priority:
      op.probabilidad >= 70 ? 'high' : op.probabilidad >= 40 ? 'medium' : 'low',
    dueDate: op.fecha_cierre_estimada,
    metadata: {
      monto_estimado: op.monto_estimado,
      probabilidad: op.probabilidad,
      organizacion_id: op.crm_organizacion_id,
      contacto_nombre: op.contacto_nombre,
      resultado: op.resultado,
      crediticio: op.subprocesos?.crediticio,
    },
  }));

  // Handler para mover oportunidades entre columnas
  const handleItemMove = async (
    itemId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newIndex: number
  ) => {
    const targetEstado = estados.find(e => e.id === targetColumnId);
    if (!targetEstado) return;

    try {
      const res = await fetch(`/api/crm/oportunidades/${itemId}/mover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_nuevo_id: targetColumnId,
          estado_nuevo_nombre: targetEstado.nombre,
          estado_nuevo_color: targetEstado.color,
          usuario_id: user?.id || 'sistema',
          usuario_nombre: user?.email?.split('@')[0],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Actualizar localmente
      setOportunidades(prev =>
        prev.map(op =>
          op.id === itemId
            ? {
                ...op,
                estado_kanban_id: targetColumnId,
                estado_kanban_nombre: targetEstado.nombre,
                estado_kanban_color: targetEstado.color,
              }
            : op
        )
      );
    } catch (err) {
      console.error('Error moving opportunity:', err);
      loadData();
    }
  };

  // Handler para click en item - ir a detalle de OPORTUNIDAD
  const handleItemClick = (item: KanbanItem) => {
    window.location.href = `/crm/oportunidades/${item.id}`;
  };

  // Crear nueva oportunidad
  const handleCrearOportunidad = async () => {
    if (!opNombre || !opOrganizacionId || !opVendedorId) {
      alert('Nombre, Organización y Vendedor son requeridos');
      return;
    }

    setSaving(true);
    try {
      const org = organizaciones.find(o => o.id === opOrganizacionId);
      const vendedor = vendedores.find(v => v.id === opVendedorId);
      const contacto = contactos.find((c: any) => c.id === opContactoId);
      const estado = estados.find(e => e.id === opEstadoId) || estados[0];

      const res = await fetch('/api/crm/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: user?.id,
          nombre: opNombre,
          descripcion: opDescripcion,
          crm_organizacion_id: opOrganizacionId,
          organizacion_nombre: org?.razon_social || '',
          organizacion_cuit: org?.cuit_cuil || '',
          contacto_id: opContactoId || undefined,
          contacto_nombre: contacto
            ? `${contacto.nombre} ${contacto.apellido}`
            : undefined,
          vendedor_id: opVendedorId,
          vendedor_nombre: vendedor
            ? `${vendedor.nombre} ${vendedor.apellido}`
            : '',
          estado_kanban_id: estado.id,
          estado_kanban_nombre: estado.nombre,
          estado_kanban_color: estado.color,
          monto_estimado: parseFloat(opMonto) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNuevaOportunidadDialog(false);
        setOpNombre('');
        setOpDescripcion('');
        setOpOrganizacionId('');
        setOpContactoId('');
        setOpVendedorId('');
        setOpMonto('');
        loadData();
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
    } finally {
      setSaving(false);
    }
  };

  // Renderer de tarjetas de OPORTUNIDADES
  const customCardRenderer = (item: KanbanItem) => {
    const metadata = item.metadata as {
      monto_estimado?: number;
      probabilidad?: number;
      organizacion_id?: string;
      contacto_nombre?: string;
      resultado?: string;
      crediticio?: NonNullable<OportunidadCRM['subprocesos']>['crediticio'];
    };

    const getResultadoBadge = () => {
      if (!metadata?.resultado) return null;
      const colors = {
        ganada: 'bg-green-500 text-white',
        perdida: 'bg-red-500 text-white',
        cancelada: 'bg-gray-400 text-white',
      };
      return (
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold ${colors[metadata.resultado as keyof typeof colors]}`}
        >
          {metadata.resultado.toUpperCase()}
        </span>
      );
    };

    return (
      <div
        className={`
          group relative overflow-hidden rounded-2xl bg-white 
          border border-gray-100 shadow-md hover:shadow-xl
          transform hover:-translate-y-1 hover:scale-[1.02]
          transition-all duration-300 ease-out cursor-pointer
          ${metadata?.resultado ? 'opacity-75' : ''}
        `}
      >
        {/* Barra superior con color del estado */}
        <div
          className="h-1.5 w-full"
          style={{
            backgroundColor:
              estados.find(e => e.id === item.columnId)?.color || '#6b7280',
          }}
        />

        {getResultadoBadge()}

        <div className="relative p-4">
          {/* Header con nombre de oportunidad */}
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">
                {item.title}
              </h4>
              <OpportunitySubflowBadge
                creditWorkflow={metadata?.crediticio}
                compact
              />
            </div>
          </div>

          {/* Organización */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="truncate">{item.description}</span>
          </div>

          {/* Monto y Probabilidad */}
          {metadata?.monto_estimado && metadata.monto_estimado > 0 && (
            <div className="flex items-center justify-between mb-3 p-2 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-emerald-700">
                  ${metadata.monto_estimado.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="font-medium text-blue-600">
                  {metadata.probabilidad || 0}%
                </span>
              </div>
            </div>
          )}

          {/* Vendedor */}
          {item.assignee && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {item.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 truncate">
                {item.assignee}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <Button onClick={loadData} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              CRM - Pipeline de Oportunidades
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Gestión de oportunidades de venta con seguimiento completo
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <ContextHelpButton route="/crm" />
            <Button
              onClick={() => (window.location.href = '/crm/metricas')}
              variant="outline"
              className="flex-1 md:flex-none touch-target"
              size="sm"
            >
              📊 Métricas
            </Button>
            <Button
              onClick={() => setShowNuevoClienteDialog(true)}
              variant="outline"
              className="flex-1 md:flex-none touch-target"
              size="sm"
            >
              + Organización
            </Button>
            <Button
              onClick={() => setShowNuevaOportunidadDialog(true)}
              className="flex-1 md:flex-none touch-target bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              + Oportunidad
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros - Desktop */}
      <div className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            Filtrar por:
          </span>
        </div>

        {/* Filtro Vendedor */}
        <div className="w-48">
          <Select value={selectedSeller} onValueChange={setSelectedSeller}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vendedores</SelectItem>
              {uniqueSellers.map(seller => (
                <SelectItem key={seller} value={seller}>
                  {seller}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Organización */}
        <div className="w-48">
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Organización" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las organizaciones</SelectItem>
              {uniqueOrgs.map(org => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contador */}
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Mostrando {filteredOportunidades.length} de {oportunidades.length}{' '}
            oportunidades
          </span>
          <ABMViewToggle
            currentView={viewMode}
            onViewChange={setViewMode}
            hasKanban={true}
          />
          <PendingActionsWidget />
        </div>
      </div>

      {/* Filtros Móviles */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4">
        <MobileFilters
          selectedSeller={selectedSeller}
          selectedType="all"
          selectedZone={selectedOrg}
          onSellerChange={setSelectedSeller}
          onTypeChange={() => {}}
          onZoneChange={setSelectedOrg}
          uniqueSellers={uniqueSellers}
          uniqueZones={uniqueOrgs}
          totalClientes={oportunidades.length}
          filteredCount={filteredOportunidades.length}
        />
      </div>

      {/* Content Area - Conditional Views */}
      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6">
        {viewMode === 'list' && (
          <OportunidadesList oportunidades={filteredOportunidades} />
        )}
        {viewMode === 'grid' && (
          <OportunidadesGrid oportunidades={filteredOportunidades} />
        )}
        {viewMode === 'kanban' && (
          <div className="h-[calc(100vh-16rem)] overflow-hidden bg-gray-50/50 rounded-xl border">
            <UnifiedKanban
              columns={kanbanColumns}
              items={kanbanItems}
              onItemMove={handleItemMove}
              onItemClick={handleItemClick}
              loading={loading}
              error={error || undefined}
              customCardRenderer={customCardRenderer}
              showActions={false}
            />
          </div>
        )}
      </div>

      {/* Dialog Nuevo Cliente/Organización */}
      <NuevoClienteDialog
        open={showNuevoClienteDialog}
        onOpenChange={setShowNuevoClienteDialog}
        onSuccess={loadData}
      />

      {/* Dialog Nueva Oportunidad */}
      <Dialog
        open={showNuevaOportunidadDialog}
        onOpenChange={setShowNuevaOportunidadDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-purple-700 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Nueva Oportunidad
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre de la Oportunidad *</Label>
              <Input
                value={opNombre}
                onChange={e => setOpNombre(e.target.value)}
                placeholder="Ej: Venta de Semillas Campaña 2026"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={opDescripcion}
                onChange={e => setOpDescripcion(e.target.value)}
                placeholder="Detalle de la oportunidad..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Organización *</Label>
                <Select
                  value={opOrganizacionId}
                  onValueChange={setOpOrganizacionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizaciones.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor *</Label>
                <Select value={opVendedorId} onValueChange={setOpVendedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nombre} {v.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contacto (opcional) - Se muestra solo si hay contactos */}
            {opOrganizacionId && contactos.length > 0 && (
              <div>
                <Label>Contacto (opcional)</Label>
                <Select value={opContactoId} onValueChange={setOpContactoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactos.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} {c.apellido}
                        {c.cargo && ` - ${c.cargo}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado Inicial</Label>
                <Select value={opEstadoId} onValueChange={setOpEstadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: e.color }}
                          />
                          {e.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto Estimado ($)</Label>
                <Input
                  type="number"
                  value={opMonto}
                  onChange={e => setOpMonto(e.target.value)}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowNuevaOportunidadDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearOportunidad}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Oportunidad
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
