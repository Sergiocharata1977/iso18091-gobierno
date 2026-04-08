'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface NormPoint {
  id: string;
  code: string;
  title: string;
  tipo_norma: string;
  chapter?: number;
  is_mandatory?: boolean;
  requirement?: string;
}

interface AddNormPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  onSuccess: () => void;
}

const NORM_TYPES = [
  { value: 'iso_9001', label: 'ISO 9001 - Calidad' },
  { value: 'iso_14001', label: 'ISO 14001 - Medio Ambiente' },
  { value: 'iso_45001', label: 'ISO 45001 - Seguridad y Salud' },
];

export function AddNormPointsDialog({
  open,
  onOpenChange,
  auditId,
  onSuccess,
}: AddNormPointsDialogProps) {
  const [normPoints, setNormPoints] = useState<NormPoint[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedNormType, setSelectedNormType] = useState<string>('iso_9001');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchNormPoints();
    }
  }, [open, selectedNormType]);

  const fetchNormPoints = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/sdk/norm-points?tipo_norma=${selectedNormType}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setNormPoints(result.data);
      }
    } catch (error) {
      console.error('Error fetching norm points:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique chapters for filter
  const chapters = useMemo(() => {
    const uniqueChapters = new Set(
      normPoints.map(np => np.chapter).filter(Boolean)
    );
    return Array.from(uniqueChapters).sort((a, b) => (a || 0) - (b || 0));
  }, [normPoints]);

  // Filter norm points
  const filteredNormPoints = useMemo(() => {
    return normPoints.filter(np => {
      // Filter by chapter
      if (
        selectedChapter !== 'all' &&
        np.chapter !== parseInt(selectedChapter)
      ) {
        return false;
      }
      // Filter by search text
      if (searchText) {
        const search = searchText.toLowerCase();
        return (
          np.code?.toLowerCase().includes(search) ||
          np.title?.toLowerCase().includes(search) ||
          np.requirement?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [normPoints, selectedChapter, searchText]);

  const handleTogglePoint = (pointCode: string) => {
    setSelectedPoints(prev =>
      prev.includes(pointCode)
        ? prev.filter(code => code !== pointCode)
        : [...prev, pointCode]
    );
  };

  const handleSelectAll = () => {
    const allCodes = filteredNormPoints.map(np => np.code);
    const allSelected = allCodes.every(code => selectedPoints.includes(code));

    if (allSelected) {
      // Deselect filtered items
      setSelectedPoints(prev => prev.filter(code => !allCodes.includes(code)));
    } else {
      // Select all filtered items
      setSelectedPoints(prev => [...new Set([...prev, ...allCodes])]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPoints.length === 0) {
      alert('Selecciona al menos un punto de norma');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/audits/${auditId}/add-norm-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normPointCodes: selectedPoints }),
      });

      if (!response.ok) throw new Error('Error al agregar puntos');

      onSuccess();
      onOpenChange(false);
      setSelectedPoints([]);
    } catch (error) {
      console.error('Error adding norm points:', error);
      alert('Error al agregar puntos de norma');
    } finally {
      setSubmitting(false);
    }
  };

  const allFilteredSelected =
    filteredNormPoints.length > 0 &&
    filteredNormPoints.every(np => selectedPoints.includes(np.code));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Puntos de Norma a Auditar</DialogTitle>
          <DialogDescription>
            Selecciona los puntos de norma que deseas incluir en esta auditoría
          </DialogDescription>
        </DialogHeader>

        {/* Filters Section */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Norm Type Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Tipo de Norma</Label>
              <Select
                value={selectedNormType}
                onValueChange={setSelectedNormType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar norma" />
                </SelectTrigger>
                <SelectContent>
                  {NORM_TYPES.map(norm => (
                    <SelectItem key={norm.value} value={norm.value}>
                      {norm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chapter Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Capítulo</Label>
              <Select
                value={selectedChapter}
                onValueChange={setSelectedChapter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los capítulos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los capítulos</SelectItem>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter} value={String(chapter)}>
                      Capítulo {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código o título..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-gray-600">
            Mostrando{' '}
            <span className="font-semibold">{filteredNormPoints.length}</span>{' '}
            de <span className="font-semibold">{normPoints.length}</span> puntos
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredNormPoints.length === 0}
          >
            {allFilteredSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
          </Button>
        </div>

        {/* Norm Points List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredNormPoints.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay puntos de norma que coincidan con los filtros
            </p>
          ) : (
            filteredNormPoints.map(point => (
              <div
                key={point.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedPoints.includes(point.code)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
                onClick={() => handleTogglePoint(point.code)}
              >
                <Checkbox
                  id={point.id}
                  checked={selectedPoints.includes(point.code)}
                  onCheckedChange={() => handleTogglePoint(point.code)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-blue-700">
                      {point.code}
                    </span>
                    {point.is_mandatory && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                        Obligatorio
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                    {point.title || point.requirement}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">
              {selectedPoints.length}
            </span>{' '}
            puntos seleccionados
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || selectedPoints.length === 0}
              className="min-w-[150px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                `Agregar ${selectedPoints.length} Puntos`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
