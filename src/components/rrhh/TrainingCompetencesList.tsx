'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, X } from 'lucide-react';
import type { Competence } from '@/types/rrhh';

interface Props {
  trainingId: string;
  canEdit?: boolean;
  onAddCompetence?: () => void;
  onRemoveCompetence?: (competenceId: string) => void;
}

export function TrainingCompetencesList({
  trainingId,
  canEdit = false,
  onAddCompetence,
  onRemoveCompetence,
}: Props) {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompetences();
  }, [trainingId]);

  const loadCompetences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/rrhh/trainings/${trainingId}/competencias`
      );

      if (response.ok) {
        const data = await response.json();
        setCompetences(data);
      }
    } catch (error) {
      console.error('Error al cargar competencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'tecnica':
        return 'bg-blue-100 text-blue-800';
      case 'blanda':
        return 'bg-green-100 text-green-800';
      case 'seguridad':
        return 'bg-red-100 text-red-800';
      case 'iso_9001':
        return 'bg-purple-100 text-purple-800';
      case 'otra':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (categoria: string) => {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Competencias Desarrolladas ({competences.length})
          </CardTitle>
          {canEdit && onAddCompetence && (
            <Button size="sm" onClick={onAddCompetence}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {competences.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              No hay competencias asignadas a esta capacitación
            </p>
            {canEdit && onAddCompetence && (
              <Button variant="outline" onClick={onAddCompetence}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Competencias
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {competences.map(competence => (
              <div
                key={competence.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 truncate">
                      {competence.nombre}
                    </h4>
                    <Badge className={getCategoryColor(competence.categoria)}>
                      {getCategoryLabel(competence.categoria)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {competence.descripcion}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Nivel requerido: 3</span>
                    <span>Fuente: {competence.fuente}</span>
                    {competence.referenciaNorma && (
                      <span>Norma: {competence.referenciaNorma}</span>
                    )}
                  </div>
                </div>

                {canEdit && onRemoveCompetence && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveCompetence(competence.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {competences.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {competences.filter(c => c.categoria === 'tecnica').length}
                </div>
                <div className="text-xs text-blue-700">Técnicas</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {competences.filter(c => c.categoria === 'blanda').length}
                </div>
                <div className="text-xs text-green-700">Blandas</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {competences.filter(c => c.categoria === 'seguridad').length}
                </div>
                <div className="text-xs text-red-700">Seguridad</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {competences.filter(c => c.categoria === 'iso_9001').length}
                </div>
                <div className="text-xs text-purple-700">ISO 9001</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
