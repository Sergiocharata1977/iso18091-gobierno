'use client';

import { ABMHeader, ABMViewMode } from '@/components/abm';
import { AccionesGrid } from '@/components/crm/acciones/AccionesGrid';
import { AccionesKanban } from '@/components/crm/acciones/AccionesKanban';
import { AccionesList } from '@/components/crm/acciones/AccionesList';
import { NewActionModal } from '@/components/crm/actions/NewActionModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { CRMAccion, CRMAccionEstado, CRMAccionTipo } from '@/types/crmAcciones';
import { Activity, Calendar, Filter, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AccionesPage() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [loading, setLoading] = useState(true);
  const [acciones, setAcciones] = useState<CRMAccion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<CRMAccionTipo | 'todos'>(
    'todos'
  );
  const [filtroEstado, setFiltroEstado] = useState<CRMAccionEstado | 'todos'>(
    'todos'
  );
  const [viewMode, setViewMode] = useState<ABMViewMode>('list');

  const loadAcciones = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
        limit: '100',
      });

      if (filtroTipo !== 'todos') params.append('tipo', filtroTipo);
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado);

      const res = await fetch(`/api/crm/acciones?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAcciones(data.data);
      }
    } catch (error) {
      console.error('Error loading acciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcciones();
  }, [organizationId, filtroTipo, filtroEstado]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta acción?')) return;
    try {
      await fetch(`/api/crm/acciones/${id}?organization_id=${organizationId}`, {
        method: 'DELETE',
      });
      loadAcciones();
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const filteredAcciones = acciones.filter(acc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      acc.titulo.toLowerCase().includes(searchLower) ||
      acc.descripcion?.toLowerCase().includes(searchLower) ||
      acc.cliente_nombre?.toLowerCase().includes(searchLower) ||
      acc.vendedor_nombre?.toLowerCase().includes(searchLower)
    );
  });

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (viewMode) {
      case 'grid':
        return (
          <AccionesGrid acciones={filteredAcciones} onDelete={handleDelete} />
        );
      case 'kanban':
        return (
          <AccionesKanban acciones={filteredAcciones} onDelete={handleDelete} />
        );
      default:
        return (
          <AccionesList acciones={filteredAcciones} onDelete={handleDelete} />
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ABMHeader
        title="Acciones Comerciales"
        subtitle="Gestión de actividades y seguimiento de clientes"
        icon={<Activity className="text-blue-600" />}
        searchPlaceholder="Buscar por título, cliente, vendedor..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        currentView={viewMode}
        onViewChange={setViewMode}
        hasKanban={true}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={loadAcciones}>
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
            <NewActionModal onActionCreated={loadAcciones} />
          </>
        }
        filters={
          <>
            <Select
              value={filtroTipo}
              onValueChange={v => setFiltroTipo(v as CRMAccionTipo | 'todos')}
            >
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="llamada">Llamada</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
                <SelectItem value="visita">Visita</SelectItem>
                <SelectItem value="reunion">Reunión</SelectItem>
                <SelectItem value="tarea">Tarea</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filtroEstado}
              onValueChange={v =>
                setFiltroEstado(v as CRMAccionEstado | 'todos')
              }
            >
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {renderView()}
    </div>
  );
}
