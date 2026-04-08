'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import type { Competence } from '@/types/rrhh';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  trigger?: React.ReactNode;
  multiple?: boolean;
}

export function CompetenceSelector({
  selectedIds,
  onSelectionChange,
  trigger,
  multiple = true,
}: Props) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [competences, setCompetences] = useState<Competence[]>([]);
  const [filteredCompetences, setFilteredCompetences] = useState<Competence[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && organizationId) {
      loadCompetences();
    }
  }, [open, organizationId]);

  useEffect(() => {
    filterCompetences();
  }, [competences, searchTerm]);

  const loadCompetences = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/rrhh/competencias?organization_id=${organizationId}`
      );
      const data = await response.json();
      setCompetences(data);
    } catch (error) {
      console.error('Error al cargar competencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompetences = () => {
    if (!searchTerm) {
      setFilteredCompetences(competences);
      return;
    }

    const filtered = competences.filter(
      comp =>
        comp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompetences(filtered);
  };

  const handleCompetenceToggle = (competenceId: string) => {
    if (multiple) {
      const newSelection = selectedIds.includes(competenceId)
        ? selectedIds.filter(id => id !== competenceId)
        : [...selectedIds, competenceId];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([competenceId]);
      setOpen(false);
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
      case 'otra':
        return 'bg-gray-500';
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
      case 'otra':
        return 'Otra';
      default:
        return categoria;
    }
  };

  const selectedCompetences = competences.filter(comp =>
    selectedIds.includes(comp.id)
  );

  const defaultTrigger = (
    <Button variant="outline" className="w-full justify-start">
      <Plus className="h-4 w-4 mr-2" />
      {selectedIds.length === 0
        ? 'Seleccionar competencias...'
        : `${selectedIds.length} competencia(s) seleccionada(s)`}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Seleccionar Competencias
            {selectedIds.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedIds.length} seleccionada(s)
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar competencias..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de competencias */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {!organizationId ? (
              <div className="text-center py-4 text-yellow-600">
                Sesión no disponible
              </div>
            ) : loading ? (
              <div className="text-center py-4">Cargando competencias...</div>
            ) : filteredCompetences.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchTerm
                  ? 'No se encontraron competencias'
                  : 'No hay competencias disponibles'}
              </div>
            ) : (
              filteredCompetences.map(competence => (
                <div
                  key={competence.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedIds.includes(competence.id)}
                    onCheckedChange={() =>
                      handleCompetenceToggle(competence.id)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {competence.nombre}
                      </h4>
                      <Badge
                        className={`${getCategoryColor(competence.categoria)} text-white text-xs`}
                      >
                        {getCategoryLabel(competence.categoria)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {competence.descripcion}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Nivel requerido: 3
                      </span>
                      <span className="text-xs text-gray-500">
                        Fuente: {competence.fuente}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Competencias seleccionadas */}
          {selectedCompetences.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Seleccionadas:</h4>
              <div className="flex flex-wrap gap-1">
                {selectedCompetences.map(comp => (
                  <Badge key={comp.id} variant="secondary" className="text-xs">
                    {comp.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            {!multiple && selectedIds.length > 0 && (
              <Button onClick={() => setOpen(false)}>Seleccionar</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
