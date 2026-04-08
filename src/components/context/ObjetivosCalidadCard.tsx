import { QualityObjective } from '@/types/quality';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';

interface ObjetivosCalidadCardProps {
  objetivos: QualityObjective[];
}

export function ObjetivosCalidadCard({ objetivos }: ObjetivosCalidadCardProps) {
  const getEstado = (objetivo: QualityObjective) => {
    const actual = objetivo.current_value || 0;
    const meta = objetivo.target_value;

    if (actual >= meta) {
      return { label: '✅ En Meta', color: 'green' as const };
    }
    if (actual >= meta * 0.8) {
      return { label: '⚠️ Cerca', color: 'yellow' as const };
    }
    return { label: '❌ Fuera', color: 'red' as const };
  };

  if (objetivos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h2 className="text-xl font-bold text-gray-900">
            Objetivos de Calidad
          </h2>
        </div>
        <EmptyState
          icon="🎯"
          message="No tienes objetivos de calidad asignados. Contacta a tu supervisor."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎯</span>
        <h2 className="text-xl font-bold text-gray-900">
          Objetivos de Calidad ({objetivos.length})
        </h2>
      </div>

      <div className="space-y-4">
        {objetivos.map(objetivo => {
          const estado = getEstado(objetivo);
          const progreso =
            (objetivo.current_value / objetivo.target_value) * 100;

          return (
            <div
              key={objetivo.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {objetivo.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {objetivo.description}
                  </p>
                </div>
                <Badge variant={estado.color}>{estado.label}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Meta:</span>
                  <span className="font-medium ml-1">
                    {objetivo.target_value} {objetivo.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-medium ml-1">
                    {objetivo.current_value} {objetivo.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Progreso:</span>
                  <span className="font-medium ml-1">
                    {progreso.toFixed(0)}%
                  </span>
                </div>
              </div>

              <ProgressBar value={progreso} color={estado.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
