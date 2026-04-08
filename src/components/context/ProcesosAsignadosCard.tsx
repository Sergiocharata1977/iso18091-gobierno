import { ProcessDefinition, ProcessRecord } from '@/types/procesos';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';

interface ProcesosAsignadosCardProps {
  procesos: ProcessDefinition[];
  processRecords?: ProcessRecord[];
}

export function ProcesosAsignadosCard({
  procesos,
  processRecords = [],
}: ProcesosAsignadosCardProps) {
  const getPendingRecordsCount = (processId: string) => {
    return processRecords.filter(
      r => r.processId === processId && r.estado !== 'completado'
    ).length;
  };

  if (procesos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span>
          <h2 className="text-xl font-bold text-gray-900">
            Procesos Asignados
          </h2>
        </div>
        <EmptyState
          icon="📋"
          message="No tienes procesos asignados. Contacta a tu supervisor para que te asigne procesos relevantes a tu puesto."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📋</span>
        <h2 className="text-xl font-bold text-gray-900">
          Procesos Asignados ({procesos.length})
        </h2>
      </div>

      <div className="space-y-3">
        {procesos.map(proceso => {
          const pendingCount = getPendingRecordsCount(proceso.id);

          return (
            <div
              key={proceso.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {proceso.codigo}: {proceso.nombre}
                  </h4>
                  {proceso.objetivo && (
                    <p className="text-sm text-gray-600 mt-1">
                      {proceso.objetivo}
                    </p>
                  )}
                </div>
                {pendingCount > 0 && (
                  <Badge variant="yellow">{pendingCount} pendientes</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
