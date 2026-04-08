'use client';

import { PositionWithAssignments } from '@/types/rrhh';
import { Users, Briefcase, Target, TrendingUp } from 'lucide-react';

interface PositionsListProps {
  positions: PositionWithAssignments[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PositionsList({
  positions,
  onView,
  onEdit,
  onDelete,
}: PositionsListProps) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay puestos
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comienza creando un nuevo puesto.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Departamento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Personal
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contexto
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {positions.map(position => (
            <tr
              key={position.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onView(position.id)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {position.nombre}
                    </div>
                    {position.descripcion_responsabilidades && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {position.descripcion_responsabilidades}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {position.departamento_id || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-900">
                    {position.personnel_count || 0}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex gap-2">
                  {(position.procesos_asignados?.length || 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {position.procesos_asignados?.length} procesos
                    </span>
                  )}
                  {(position.objetivos_asignados?.length || 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      <Target className="h-3 w-3 mr-1" />
                      {position.objetivos_asignados?.length} objetivos
                    </span>
                  )}
                  {(position.indicadores_asignados?.length || 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {position.indicadores_asignados?.length} indicadores
                    </span>
                  )}
                  {(position.procesos_asignados?.length || 0) === 0 &&
                    (position.objetivos_asignados?.length || 0) === 0 &&
                    (position.indicadores_asignados?.length || 0) === 0 && (
                      <span className="text-sm text-gray-400">
                        Sin asignaciones
                      </span>
                    )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onView(position.id);
                  }}
                  className="text-green-600 hover:text-green-900 mr-4"
                >
                  Ver
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(position.id);
                  }}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Editar
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(position.id);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
