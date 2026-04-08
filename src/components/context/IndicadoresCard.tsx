import { QualityIndicator } from '@/types/quality';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';

interface IndicadoresCardProps {
  indicadores: QualityIndicator[];
}

export function IndicadoresCard({ indicadores }: IndicadoresCardProps) {
  const getEstado = (indicador: QualityIndicator) => {
    const actual = indicador.current_value || 0;

    // Check if indicator has thresholds
    if (!indicador.target_min && !indicador.target_max) {
      return { label: '⚪ Sin umbral', color: 'gray' as const };
    }

    // Check minimum threshold
    if (indicador.target_min && actual >= indicador.target_min) {
      return { label: '✅ OK', color: 'green' as const };
    }

    // Check maximum threshold
    if (indicador.target_max && actual <= indicador.target_max) {
      return { label: '✅ OK', color: 'green' as const };
    }

    return { label: '⚠️ Alerta', color: 'red' as const };
  };

  const formatThreshold = (indicador: QualityIndicator) => {
    if (indicador.target_min && indicador.target_max) {
      return `${indicador.target_min} - ${indicador.target_max}`;
    }
    if (indicador.target_min) {
      return `≥ ${indicador.target_min}`;
    }
    if (indicador.target_max) {
      return `≤ ${indicador.target_max}`;
    }
    return 'No definido';
  };

  if (indicadores.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-bold text-gray-900">
            Indicadores a Monitorear
          </h2>
        </div>
        <EmptyState
          icon="📊"
          message="No tienes indicadores asignados. Contacta a tu supervisor."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h2 className="text-xl font-bold text-gray-900">
          Indicadores a Monitorear ({indicadores.length})
        </h2>
      </div>

      <div className="space-y-3">
        {indicadores.map(indicador => {
          const estado = getEstado(indicador);

          return (
            <div
              key={indicador.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {indicador.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {indicador.description}
                  </p>
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Umbral:</span>{' '}
                    {formatThreshold(indicador)}
                    <span className="mx-2">|</span>
                    <span className="font-medium">Actual:</span>{' '}
                    <span className="font-semibold">
                      {indicador.current_value || 0} {indicador.unit}
                    </span>
                  </div>
                </div>
                <Badge variant={estado.color}>{estado.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
