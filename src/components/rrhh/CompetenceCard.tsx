'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Competence, CompetenceCategory } from '@/types/rrhh';
import { Edit, Trash2 } from 'lucide-react';

interface Props {
  competence: Competence;
  onEdit?: (competence: Competence) => void;
  onDelete?: (competenceId: string) => void;
}

export function CompetenceCard({ competence, onEdit, onDelete }: Props) {
  const getCategoryColor = (categoria: CompetenceCategory) => {
    switch (categoria) {
      case 'tecnica':
        return 'bg-blue-500';
      case 'blanda':
        return 'bg-green-500';
      case 'seguridad':
        return 'bg-red-500';
      case 'iso_9001':
        return 'bg-purple-500';
      case 'otra':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (categoria: CompetenceCategory) => {
    switch (categoria) {
      case 'tecnica':
        return 'Técnica';
      case 'blanda':
        return 'Blanda';
      case 'seguridad':
        return 'Seguridad';
      case 'iso_9001':
        return 'ISO 9001';
      case 'otra':
        return 'Otra';
      default:
        return categoria;
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Básico';
      case 2:
        return 'Intermedio';
      case 3:
        return 'Avanzado';
      case 4:
        return 'Experto';
      case 5:
        return 'Maestro';
      default:
        return level.toString();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{competence.nombre}</CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(competence)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(competence.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getCategoryColor(competence.categoria)}>
            {getCategoryLabel(competence.categoria)}
          </Badge>
          <Badge variant="outline">Nivel 3 - Avanzado</Badge>
          {!competence.activo && <Badge variant="secondary">Inactiva</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-3">
          {competence.descripcion}
        </p>

        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Fuente:</span> {competence.fuente}
          </div>
          {competence.referenciaNorma && (
            <div>
              <span className="font-medium">Referencia:</span>{' '}
              {competence.referenciaNorma}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          Creado: {new Date(competence.created_at).toLocaleDateString('es-ES')}
        </div>
      </CardContent>
    </Card>
  );
}
