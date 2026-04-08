'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NormPoint } from '@/types/normPoints';
import { Check, ChevronsUpDown, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NormPointSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
  suggestionContext?: {
    nombre?: string;
    descripcion?: string;
    categoria?: string;
  };
}

export function NormPointSelector({
  selectedIds,
  onChange,
  readOnly = false,
  suggestionContext,
}: NormPointSelectorProps) {
  const [open, setOpen] = useState(false);
  const [normPoints, setNormPoints] = useState<NormPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar todos los puntos de norma una vez
    const loadNormPoints = async () => {
      try {
        setLoading(true);
        // Usar los mismos parámetros que NormPointsList para traer todos
        const response = await fetch(
          '/api/norm-points?limit=1000&sort=code&order=asc'
        );
        if (response.ok) {
          const data = await response.json();
          // Ordenar manualmente por código numérico
          const sortedPoints = (data.data || []).sort(
            (a: NormPoint, b: NormPoint) => {
              const aNum = parseFloat(a.code.replace(/[^\d.]/g, ''));
              const bNum = parseFloat(b.code.replace(/[^\d.]/g, ''));
              return aNum - bNum;
            }
          );
          setNormPoints(sortedPoints);
        }
      } catch (error) {
        console.error('Error loading norm points:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!readOnly || selectedIds.length > 0) {
      loadNormPoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, selectedIds.length]); // Solo recargar si cambia readOnly/estado inicial

  const handleAutoSuggest = () => {
    if (normPoints.length === 0) return;

    const text =
      `${suggestionContext?.nombre || ''} ${suggestionContext?.descripcion || ''} ${suggestionContext?.categoria || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const suggested = new Set<string>();

    const addByCodePrefix = (...prefixes: string[]) => {
      for (const point of normPoints) {
        if (prefixes.some(prefix => point.code?.startsWith(prefix))) {
          suggested.add(point.id);
        }
      }
    };

    const addByTitleKeyword = (...keywords: string[]) => {
      for (const point of normPoints) {
        const haystack =
          `${point.code || ''} ${point.title || ''} ${point.description || ''}`.toLowerCase();
        if (keywords.some(keyword => haystack.includes(keyword))) {
          suggested.add(point.id);
        }
      }
    };

    // Base general de procesos
    addByCodePrefix('4.4', '5.1', '6.1', '7.5', '9.1', '10.2');

    if (/(comercial|venta|cliente|cotizacion|pedido|atencion)/.test(text)) {
      addByCodePrefix('8.2', '8.5', '9.1.2');
      addByTitleKeyword('cliente', 'requisitos', 'comunicacion');
    }
    if (/(compra|compras|proveedor|abastecimiento)/.test(text)) {
      addByCodePrefix('8.4');
      addByTitleKeyword('proveedor', 'externamente');
    }
    if (/(produccion|operacion|fabricacion|servicio)/.test(text)) {
      addByCodePrefix('8.1', '8.5', '8.6', '8.7');
      addByTitleKeyword('produccion', 'prestacion del servicio');
    }
    if (
      /(calidad|mejora|no conformidad|hallazgo|accion correctiva)/.test(text)
    ) {
      addByCodePrefix('10.2', '10.3', '9.3');
      addByTitleKeyword('mejora', 'no conform');
    }
    if (/(auditoria|auditoria interna|interna)/.test(text)) {
      addByCodePrefix('9.2');
      addByTitleKeyword('auditoria interna');
    }
    if (/(rrhh|recursos humanos|capacitacion|competencia)/.test(text)) {
      addByCodePrefix('7.1.2', '7.2', '7.3');
      addByTitleKeyword('competencia', 'toma de conciencia');
    }
    if (/(document|registro)/.test(text)) {
      addByCodePrefix('7.5');
      addByTitleKeyword('informacion documentada');
    }

    if (suggested.size > 0) {
      onChange(Array.from(suggested));
      setOpen(false);
    }
  };

  // Si es readOnly, mostramos badges simples
  if (readOnly) {
    if (selectedIds.length === 0) {
      return (
        <span className="text-gray-400 italic">Ninguna norma vinculada</span>
      );
    }
    // Necesitamos los datos para mostrar nombres, si no los tenemos cargados, mostramos IDs o un loader
    if (normPoints.length === 0 && selectedIds.length > 0) {
      // Podríamos intentar cargarlos incluso en readOnly si queremos mostrar nombres bonitos
      // Por ahora asumimos que el padre pasa la info o se carga
      // Como fallback mostramos los IDs
      return (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map(id => (
            <Badge
              key={id}
              variant="outline"
              className="bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              {/* Intentar buscar en el estado si ya cargó */}
              {normPoints.find(np => np.id === id)?.code || id}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedIds.map(id => {
          const np = normPoints.find(p => p.id === id);
          return (
            <Badge
              key={id}
              variant="outline"
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              title={np?.description}
            >
              {np ? (
                <>
                  <span className="font-bold mr-1">{np.code}</span>
                  <span className="truncate max-w-[200px]">{np.title}</span>
                </>
              ) : (
                id
              )}
            </Badge>
          );
        })}
      </div>
    );
  }

  const handleSelect = (id: string) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter(s => s !== id)
      : [...selectedIds, id];
    onChange(newSelected);
  };

  const selectedPoints = normPoints.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-3">
      {suggestionContext && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoSuggest}
            disabled={loading || normPoints.length === 0}
          >
            Sugerir automÃ¡ticamente
          </Button>
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
            disabled={loading}
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} normas seleccionadas`
              : 'Seleccionar puntos de norma ISO...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar norma (ej: 4.4)..." />
            <CommandList>
              <CommandEmpty>No se encontraron normas.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[300px]">
                  {normPoints.map(np => (
                    <CommandItem
                      key={np.id}
                      value={`${np.code} ${np.title}`}
                      onSelect={() => handleSelect(np.id)}
                    >
                      <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                        <Check
                          className={
                            selectedIds.includes(np.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {np.code} - {np.title}
                        </span>
                        {np.chapter && (
                          <span className="text-xs text-gray-400">
                            Cap. {np.chapter}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Lista de seleccionados con opción de eliminar */}
      {selectedPoints.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedPoints.map(np => (
            <Badge
              key={np.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100"
            >
              <span className="font-bold text-xs">{np.code}</span>
              <span className="truncate max-w-[150px] text-xs" title={np.title}>
                {np.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-blue-200 rounded-full"
                onClick={() => handleSelect(np.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              {np.description && (
                <div title={np.description} className="cursor-help ml-1">
                  <Info className="h-3 w-3 text-blue-400" />
                </div>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
