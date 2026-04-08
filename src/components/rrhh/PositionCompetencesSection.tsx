'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Competence, PositionCompetence } from '@/types/rrhh';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  positionId: string;
  initialCompetences?: PositionCompetence[];
  onUpdate?: () => void;
}

export function PositionCompetencesSection({
  positionId,
  initialCompetences = [],
  onUpdate,
}: Props) {
  const [competences, setCompetences] =
    useState<PositionCompetence[]>(initialCompetences);
  const [availableCompetences, setAvailableCompetences] = useState<
    Competence[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCompetenceId, setSelectedCompetenceId] = useState('');
  const [selectedNivel, setSelectedNivel] = useState<number>(3);

  useEffect(() => {
    loadAvailableCompetences();
    loadPositionCompetences();
  }, [positionId]);

  const loadAvailableCompetences = async () => {
    try {
      const response = await fetch('/api/rrhh/competencias');
      if (!response.ok) {
        console.error('Error al cargar competencias disponibles');
        setAvailableCompetences([]);
        return;
      }
      const data = await response.json();
      setAvailableCompetences(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar competencias disponibles:', error);
      setAvailableCompetences([]);
    }
  };

  const loadPositionCompetences = async () => {
    try {
      const response = await fetch(
        `/api/rrhh/puestos/${positionId}/competencias`
      );
      if (response.ok) {
        const data = await response.json();
        setCompetences(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar competencias del puesto:', error);
    }
  };

  const handleAddCompetence = async () => {
    if (!selectedCompetenceId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/rrhh/puestos/${positionId}/competencias`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competenceId: selectedCompetenceId,
            nivelRequerido: selectedNivel,
          }),
        }
      );

      if (response.ok) {
        await loadPositionCompetences();
        setShowAddDialog(false);
        setSelectedCompetenceId('');
        setSelectedNivel(3);
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al asignar competencia');
      }
    } catch (error) {
      console.error('Error al asignar competencia:', error);
      alert('Error al asignar competencia');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCompetence = async (competenceId: string) => {
    if (
      !confirm('¿Está seguro de que desea quitar esta competencia del puesto?')
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/rrhh/puestos/${positionId}/competencias/${competenceId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadPositionCompetences();
        onUpdate?.();
      } else {
        alert('Error al quitar competencia');
      }
    } catch (error) {
      console.error('Error al quitar competencia:', error);
      alert('Error al quitar competencia');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case 'tecnica':
        return 'bg-blue-500';
      case 'blanda':
        return 'bg-green-500';
      case 'seguridad':
        return 'bg-red-500';
      case 'iso_9001':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
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
      default:
        return 'Otra';
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
        return `Nivel ${level}`;
    }
  };

  // Filtrar competencias que no están ya asignadas
  const assignedIds = competences.map(c => c.competenciaId);
  const unassignedCompetences = availableCompetences.filter(
    comp => !assignedIds.includes(comp.id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Competencias Requeridas del Puesto</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Competencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Competencia al Puesto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seleccionar Competencia</Label>
                  <Select
                    value={selectedCompetenceId}
                    onValueChange={setSelectedCompetenceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir competencia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedCompetences.map(comp => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nivel Requerido</Label>
                  <Select
                    value={selectedNivel.toString()}
                    onValueChange={v => setSelectedNivel(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Básico</SelectItem>
                      <SelectItem value="2">2 - Intermedio</SelectItem>
                      <SelectItem value="3">3 - Avanzado</SelectItem>
                      <SelectItem value="4">4 - Experto</SelectItem>
                      <SelectItem value="5">5 - Maestro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddCompetence}
                    disabled={loading || !selectedCompetenceId}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {competences.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay competencias asignadas a este puesto
          </div>
        ) : (
          <div className="grid gap-3">
            {competences.map(competence => (
              <div
                key={competence.competenciaId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={getCategoryColor(
                      competence.nombreCompetencia || 'otra'
                    )}
                  >
                    {competence.nivelRequerido}
                  </Badge>
                  <div>
                    <h4 className="font-medium">
                      {competence.nombreCompetencia}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Nivel requerido:{' '}
                      {getLevelLabel(competence.nivelRequerido)}
                      {competence.esCritica && (
                        <span className="ml-2 text-red-600 font-semibold">
                          ⚠ Crítica
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleRemoveCompetence(competence.competenciaId)
                  }
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
