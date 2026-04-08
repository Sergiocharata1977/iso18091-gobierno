'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Training } from '@/types/rrhh';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, MapPin, Users } from 'lucide-react';

interface TrainingCardProps {
  training: Training;
  onEdit?: (training: Training) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function TrainingCard({
  training,
  onEdit,
  onDelete,
  onViewDetails,
}: TrainingCardProps) {
  const getStatusColor = (status: Training['estado']) => {
    switch (status) {
      case 'planificada':
        return 'bg-blue-500';
      case 'en_curso':
        return 'bg-green-500';
      case 'completada':
        return 'bg-gray-500';
      case 'cancelada':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModalityColor = (modality: Training['modalidad']) => {
    switch (modality) {
      case 'presencial':
        return 'bg-purple-500';
      case 'virtual':
        return 'bg-cyan-500';
      case 'mixta':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{training.tema}</CardTitle>
            {training.descripcion && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {training.descripcion}
              </p>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <Badge className={getStatusColor(training.estado)}>
              {training.estado.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Fechas */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>
              {format(training.fecha_inicio, 'dd MMM yyyy', { locale: es })} -{' '}
              {format(training.fecha_fin, 'dd MMM yyyy', { locale: es })}
            </span>
          </div>

          {/* Horas */}
          {training.horas && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{training.horas} horas</span>
            </div>
          )}

          {/* Modalidad */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-500" />
            <Badge
              className={getModalityColor(training.modalidad)}
              variant="outline"
            >
              {training.modalidad}
            </Badge>
          </div>

          {/* Participantes */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{training.participantes?.length || 0} participantes</span>
          </div>

          {/* Proveedor */}
          {training.proveedor && (
            <div className="text-sm">
              <span className="text-gray-500">Proveedor:</span>{' '}
              <span className="font-medium">{training.proveedor}</span>
            </div>
          )}

          {/* Costo */}
          {training.costo && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                ${training.costo.toLocaleString()}
              </span>
            </div>
          )}

          {/* Competencias desarrolladas */}
          {training.competenciasDesarrolladas &&
            training.competenciasDesarrolladas.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500">Competencias:</span>{' '}
                <span className="font-medium">
                  {training.competenciasDesarrolladas.length}
                </span>
              </div>
            )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(training.id)}
                className="flex-1"
              >
                Ver Detalles
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(training)}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(training.id)}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
