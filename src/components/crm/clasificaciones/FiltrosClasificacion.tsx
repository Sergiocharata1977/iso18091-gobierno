'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ClasificacionesMap,
  CriterioClasificacion,
} from '@/types/crm-clasificacion';
import { useEffect, useMemo, useState } from 'react';

interface FiltrosClasificacionProps {
  entidadTipo: 'cliente' | 'oportunidad';
  onFiltrosChange: (filtros: ClasificacionesMap) => void;
  filtrosActivos: ClasificacionesMap;
}

export function FiltrosClasificacion({
  entidadTipo,
  onFiltrosChange,
  filtrosActivos,
}: FiltrosClasificacionProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const [criterios, setCriterios] = useState<CriterioClasificacion[]>([]);

  useEffect(() => {
    if (!organizationId) return;

    const loadCriterios = async () => {
      try {
        const response = await fetch(
          `/api/crm/clasificaciones?organization_id=${organizationId}`
        );
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'No se pudieron cargar los criterios');
        }

        setCriterios(payload.data || []);
      } catch (error) {
        console.error('Error loading classification criteria:', error);
        setCriterios([]);
      }
    };

    void loadCriterios();
  }, [organizationId]);

  const criteriosFiltrados = useMemo(
    () =>
      criterios.filter(criterio =>
        entidadTipo === 'cliente'
          ? criterio.aplica_a_clientes
          : criterio.aplica_a_oportunidades
      ),
    [criterios, entidadTipo]
  );

  if (!criteriosFiltrados.length) {
    return null;
  }

  const handleChange = (slug: string, value: string) => {
    const next = { ...filtrosActivos };

    if (value === 'all') {
      delete next[slug];
    } else {
      next[slug] = value;
    }

    onFiltrosChange(next);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {criteriosFiltrados.map(criterio => {
        const currentValue = filtrosActivos[criterio.slug];
        const selectedValue =
          typeof currentValue === 'string' ? currentValue : 'all';

        return (
          <div key={criterio.id} className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {criterio.nombre}
            </label>
            <Select
              value={selectedValue || 'all'}
              onValueChange={value => handleChange(criterio.slug, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Filtrar por ${criterio.nombre}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {criterio.opciones.map(opcion => (
                  <SelectItem key={opcion.id} value={opcion.slug}>
                    {opcion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
