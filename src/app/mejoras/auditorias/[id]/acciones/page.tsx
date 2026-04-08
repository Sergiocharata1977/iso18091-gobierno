'use client';

import { Button } from '@/components/ui/button';
import type { Action } from '@/lib/sdk/modules/actions/types';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuditActionsPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchActions();
  }, [auditId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sdk/audits/${auditId}/actions`);
      const result = await response.json();

      if (result.success && result.data) {
        setActions(result.data);
      } else {
        setActions([]);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    if (filter === 'all') return true;
    return action.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baja':
        return 'text-green-600';
      case 'media':
        return 'text-yellow-600';
      case 'alta':
        return 'text-orange-600';
      case 'critica':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const isOverdue = (dueDate: any) => {
    if (!dueDate) return false;
    const date = dueDate.toDate?.() || new Date(dueDate);
    return date < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando acciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Acciones de Auditoría
          </h1>
          <p className="text-gray-600 mt-1">
            Seguimiento de acciones correctivas y preventivas
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/mejoras/auditorias/${auditId}`)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Acción
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{actions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pendientes</p>
          <p className="text-2xl font-bold text-blue-600">
            {actions.filter(a => a.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">En Progreso</p>
          <p className="text-2xl font-bold text-yellow-600">
            {actions.filter(a => a.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Completadas</p>
          <p className="text-2xl font-bold text-green-600">
            {actions.filter(a => a.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Vencidas</p>
          <p className="text-2xl font-bold text-red-600">
            {
              actions.filter(
                a => isOverdue(a.dueDate) && a.status !== 'cancelled'
              ).length
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(
            status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusLabel(status)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Actions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredActions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No hay acciones que mostrar</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredActions.map(action => (
              <div
                key={action.id}
                className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                  isOverdue(action.dueDate) && action.status !== 'cancelled'
                    ? 'border-l-4 border-red-500'
                    : ''
                }`}
                onClick={() => router.push(`/mejoras/acciones/${action.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {action.description}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(action.status)}`}
                      >
                        {getStatusLabel(action.status)}
                      </span>
                      {isOverdue(action.dueDate) &&
                        (action.status as any) !== 'cancelled' && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            Vencida
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">{action.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Progreso</p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{
                          width: `${(action as any).progressPercentage || 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {(action as any).progressPercentage || 0}%
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mb-3">{action.details}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Responsable</p>
                    <p className="font-medium text-gray-900">
                      {action.responsible}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Prioridad</p>
                    <p
                      className={`font-medium ${getPriorityColor(action.priority)}`}
                    >
                      {action.priority?.charAt(0).toUpperCase() +
                        action.priority?.slice(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha Límite</p>
                    <p className="font-medium text-gray-900">
                      {action.dueDate
                        ? (
                            action.dueDate.toDate?.() ||
                            new Date(action.dueDate)
                          ).toLocaleDateString('es-ES')
                        : 'Sin fecha'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tipo</p>
                    <p className="font-medium text-gray-900">
                      {action.type === 'correctiva'
                        ? 'Correctiva'
                        : 'Preventiva'}
                    </p>
                  </div>
                </div>

                {action.evidence && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      Evidencia: {action.evidence}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ActionForm
                auditId={auditId}
                onSuccess={() => {
                  setShowForm(false);
                  fetchActions();
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionFormProps {
  auditId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function ActionForm({ auditId, onSuccess, onCancel }: ActionFormProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState({
    description: '',
    details: '',
    responsible: '',
    priority: 'media',
    type: 'correctiva',
    dueDate: '',
    evidence: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/sdk/audits/${auditId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...action,
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
          status: 'planificada',
          progress: 0,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving action:', error);
      alert('Error al guardar la acción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Nueva Acción</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción *
        </label>
        <input
          type="text"
          value={action.description}
          onChange={e => setAction({ ...action, description: e.target.value })}
          placeholder="Ej: Implementar procedimiento de control"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Detalles
        </label>
        <textarea
          value={action.details}
          onChange={e => setAction({ ...action, details: e.target.value })}
          placeholder="Describe la acción en detalle"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsable *
          </label>
          <input
            type="text"
            value={action.responsible}
            onChange={e =>
              setAction({ ...action, responsible: e.target.value })
            }
            placeholder="Nombre del responsable"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <select
            value={action.priority}
            onChange={e => setAction({ ...action, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            value={action.type}
            onChange={e => setAction({ ...action, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="correctiva">Correctiva</option>
            <option value="preventiva">Preventiva</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Límite
          </label>
          <input
            type="date"
            value={action.dueDate}
            onChange={e => setAction({ ...action, dueDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear Acción
        </Button>
      </div>
    </form>
  );
}
