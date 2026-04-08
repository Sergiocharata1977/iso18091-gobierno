'use client';

import { Flujograma } from '@/types/flujogramas';
import { Filter, GitBranch, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FlujogramasPage() {
  const [flujogramas, setFlujogramas] = useState<Flujograma[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadFlujogramas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadFlujogramas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ organization_id: 'default-org' });
      if (filter !== 'all') params.append('estado', filter);

      const response = await fetch(`/api/flujogramas?${params}`);
      const data = await response.json();
      setFlujogramas(data);
    } catch (error) {
      console.error('Error loading flujogramas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      vigente: 'bg-green-100 text-green-800',
      borrador: 'bg-gray-100 text-gray-800',
      aprobado: 'bg-blue-100 text-blue-800',
      obsoleto: 'bg-red-100 text-red-800',
    };
    return colors[estado as keyof typeof colors] || colors.borrador;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flujogramas</h1>
          <p className="text-gray-600 mt-1">Diagramas de flujo de procesos</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Nuevo Flujograma
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
            <option value="aprobado">Aprobados</option>
            <option value="obsoleto">Obsoletos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando flujogramas...</p>
        </div>
      ) : flujogramas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <GitBranch size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay flujogramas
          </h3>
          <p className="text-gray-500">Comienza creando tu primer flujograma</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flujogramas.map(flujograma => (
            <div
              key={flujograma.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">
                      {flujograma.codigo}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(flujograma.estado)}`}
                    >
                      {flujograma.estado.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {flujograma.nombre}
                  </h3>
                  {flujograma.descripcion && (
                    <p className="text-gray-600 mb-3 text-sm">
                      {flujograma.descripcion}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    <span>Versión {flujograma.version}</span>
                    <span>{flujograma.elementos.length} elementos</span>
                    <span>{flujograma.conexiones.length} conexiones</span>
                  </div>
                  {flujograma.proceso_nombre && (
                    <div className="text-sm text-gray-500">
                      Proceso: {flujograma.proceso_nombre}
                    </div>
                  )}
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
