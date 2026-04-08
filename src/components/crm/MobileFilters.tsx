'use client';

import { FiltrosClasificacion } from '@/components/crm/clasificaciones/FiltrosClasificacion';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { ClasificacionesMap } from '@/types/crm-clasificacion';
import { Filter, X } from 'lucide-react';
import { useState } from 'react';

interface MobileFiltersProps {
  selectedSeller: string;
  selectedType: string;
  selectedZone: string;
  onSellerChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  uniqueSellers: string[];
  uniqueZones: string[];
  totalClientes: number;
  filteredCount: number;
  classificationFilters?: ClasificacionesMap;
  onClassificationFiltersChange?: (value: ClasificacionesMap) => void;
  classificationEntityType?: 'cliente' | 'oportunidad';
}

export function MobileFilters({
  selectedSeller,
  selectedType,
  selectedZone,
  onSellerChange,
  onTypeChange,
  onZoneChange,
  uniqueSellers,
  uniqueZones,
  totalClientes,
  filteredCount,
  classificationFilters = {},
  onClassificationFiltersChange,
  classificationEntityType = 'cliente',
}: MobileFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    selectedSeller !== 'all',
    selectedType !== 'all',
    selectedZone !== 'all',
    ...Object.values(classificationFilters).map(value =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    ),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onSellerChange('all');
    onTypeChange('all');
    onZoneChange('all');
    onClassificationFiltersChange?.({});
  };

  const handleApply = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full touch-target relative"
          size="lg"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filtrar Clientes</SheetTitle>
          <SheetDescription>
            Mostrando {filteredCount} de {totalClientes} clientes
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Filtro Vendedor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Vendedor
            </label>
            <Select value={selectedSeller} onValueChange={onSellerChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vendedores</SelectItem>
                {uniqueSellers.map(seller => (
                  <SelectItem key={seller} value={seller}>
                    {seller}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Tipo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tipo de Cliente
            </label>
            <Select value={selectedType} onValueChange={onTypeChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="Tipo de Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="posible_cliente">
                  🔍 Posible Cliente
                </SelectItem>
                <SelectItem value="cliente_frecuente">
                  ⭐ Cliente Frecuente
                </SelectItem>
                <SelectItem value="cliente_antiguo">
                  📅 Cliente Antiguo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Zona */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Zona (Provincia)
            </label>
            <Select value={selectedZone} onValueChange={onZoneChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="Zona (Provincia)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {uniqueZones.map(zone => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onClassificationFiltersChange && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Clasificaciones
              </label>
              <FiltrosClasificacion
                entidadTipo={classificationEntityType}
                filtrosActivos={classificationFilters}
                onFiltrosChange={onClassificationFiltersChange}
              />
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t space-y-3 pb-safe">
          <Button
            onClick={handleApply}
            className="w-full touch-target"
            size="lg"
          >
            Aplicar Filtros
          </Button>
          {activeFiltersCount > 0 && (
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="w-full touch-target"
              size="lg"
            >
              <X className="h-5 w-5 mr-2" />
              Limpiar Filtros
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
