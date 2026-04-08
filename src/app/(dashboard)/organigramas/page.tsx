'use client';

import { Organigrama } from '@/types/organigramas';
import { Filter, Network, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OrganigramasPage() {
  const [organigramas, setOrganigramas] = useState<Organigrama[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadOrganigramas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadOrganigramas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ organization_id: 'default-org' });
      if (filter !== 'all') params.append('estado', filter);

      const response = await fetch(`/api/organigramas?${params}`);
      const data = await response.json();
      setOrganigramas(data);
    } catch (error) {
      console.error('Error loading organigramas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      vigente: 'bg-green-100 text-green-800',
      borrador: 'bg-gray-100 text-gray-800',
      historico: 'bg-blue-100 text-blue-800',
    };
    return colors[estado as keyof typeof colors] || colors.borrador;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organigramas</h1>
          <p className="text-gray-600 mt-1">Estructura organizacional</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Nuevo Organigrama
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-500" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="borrador">Borradores</option>
            <option value="historico">Históricos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando organigramas...</p>
        </div>
      ) : organigramas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Network size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay organigramas
          </h3>
          <p className="text-gray-500">
            Comienza creando tu primer organigrama
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {organigramas.map(organigrama => (
            <div
              key={organigrama.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">
                      {organigrama.codigo}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(organigrama.estado)}`}
                    >
                      {organigrama.estado.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {organigrama.nombre}
                  </h3>
                  {organigrama.descripcion && (
                    <p className="text-gray-600 mb-3 text-sm">
                      {organigrama.descripcion}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    <span>Versión {organigrama.version}</span>
                    <span>{organigrama.estructura.length} nodos</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Vigente desde:{' '}
                    {new Date(
                      organigrama.fecha_vigencia_desde
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Visualizar
                </button>
                <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
