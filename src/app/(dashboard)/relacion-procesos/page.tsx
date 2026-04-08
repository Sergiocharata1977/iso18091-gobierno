'use client';

import { RelacionProcesos } from '@/types/relacion-procesos';
import { Filter, Network, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function RelacionProcesosPage() {
  const [relaciones, setRelaciones] = useState<RelacionProcesos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadRelaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRelaciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ organization_id: 'default-org' });
      if (filter !== 'all') params.append('tipo', filter);

      const response = await fetch(`/api/relacion-procesos?${params}`);
      const data = await response.json();
      setRelaciones(data);
    } catch (error) {
      console.error('Error loading relaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImportanciaBadge = (importancia: string) => {
    const colors = {
      critica: 'bg-red-100 text-red-800',
      alta: 'bg-orange-100 text-orange-800',
      media: 'bg-yellow-100 text-yellow-800',
      baja: 'bg-green-100 text-green-800',
    };
    return colors[importancia as keyof typeof colors] || colors.media;
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      entrada: 'Entrada',
      salida: 'Salida',
      proveedor: 'Proveedor',
      cliente: 'Cliente',
      interaccion: 'Interacción',
      dependencia: 'Dependencia',
      colaboracion: 'Colaboración',
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relación de Procesos</h1>
          <p className="text-gray-600 mt-1">Interacciones entre procesos</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Nueva Relación
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
            <option value="all">Todas</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="proveedor">Proveedores</option>
            <option value="cliente">Clientes</option>
            <option value="interaccion">Interacciones</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando relaciones...</p>
        </div>
      ) : relaciones.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Network size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay relaciones
          </h3>
          <p className="text-gray-500">
            Comienza definiendo las relaciones entre procesos
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {relaciones.map(relacion => (
            <div
              key={relacion.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTipoLabel(relacion.tipo_relacion)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanciaBadge(relacion.importancia)}`}
                    >
                      {relacion.importancia.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Origen</div>
                      <div className="font-semibold">
                        {relacion.proceso_origen_nombre}
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Destino</div>
                      <div className="font-semibold">
                        {relacion.proceso_destino_nombre}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{relacion.descripcion}</p>
                  {relacion.elemento_relacionado && (
                    <div className="text-sm text-gray-500 mb-2">
                      📦 {relacion.elemento_relacionado.nombre} (
                      {relacion.elemento_relacionado.tipo})
                    </div>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    {relacion.frecuencia && (
                      <span>Frecuencia: {relacion.frecuencia}</span>
                    )}
                    {relacion.responsable_nombre && (
                      <span>Responsable: {relacion.responsable_nombre}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Ver Detalles
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
