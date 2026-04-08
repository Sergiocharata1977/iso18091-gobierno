'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface ClasificacionesSectionProps {
  entidadTipo: 'cliente' | 'oportunidad';
  entidadId: string;
  classifications?: ClasificacionesMap;
  classificationsActuales?: ClasificacionesMap;
  modoEdicion?: boolean;
  onUpdated?: (classifications: ClasificacionesMap) => void;
  onUpdate?: (classifications: ClasificacionesMap) => void;
}

export function ClasificacionesSection({
  entidadTipo,
  entidadId,
  classifications,
  classificationsActuales,
  modoEdicion,
  onUpdated,
  onUpdate,
}: ClasificacionesSectionProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const initialClassifications = classifications ?? classificationsActuales ?? {};
  const [criterios, setCriterios] = useState<CriterioClasificacion[]>([]);
  const [localValues, setLocalValues] = useState<ClasificacionesMap>(
    initialClassifications
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalValues(initialClassifications);
  }, [initialClassifications]);

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

  const resumen = useMemo(
    () =>
      criteriosFiltrados.flatMap(criterio => {
        const rawValue = localValues[criterio.slug];
        const selectedValues = Array.isArray(rawValue)
          ? rawValue
          : rawValue
            ? [rawValue]
            : [];

        return selectedValues
          .map(value => criterio.opciones.find(opcion => opcion.slug === value))
          .filter(Boolean)
          .map(opcion => ({
            criterio: criterio.nombre,
            label: opcion!.label,
          }));
      }),
    [criteriosFiltrados, localValues]
  );

  const handleValueChange = (slug: string, value: string) => {
    setLocalValues(current => {
      const next = { ...current };

      if (value === 'none') {
        delete next[slug];
      } else {
        next[slug] = value;
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/crm/${entidadTipo === 'cliente' ? 'clientes' : 'oportunidades'}/${entidadId}/clasificaciones?organization_id=${organizationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classifications: localValues }),
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error || 'No se pudieron guardar las clasificaciones'
        );
      }

      const nextValues = payload.data.classifications || localValues;
      onUpdated?.(nextValues);
      onUpdate?.(nextValues);
    } catch (error) {
      console.error('Error saving classifications:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4 text-blue-600" />
          Clasificaciones comerciales
        </CardTitle>
        {!!resumen.length && (
          <div className="flex flex-wrap gap-2">
            {resumen.map(item => (
              <Badge key={`${item.criterio}-${item.label}`} variant="secondary">
                {item.criterio}: {item.label}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {criteriosFiltrados.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {criteriosFiltrados.map(criterio => {
                const currentValue = localValues[criterio.slug];
                const selectedValue =
                  typeof currentValue === 'string' ? currentValue : 'none';

                return (
                  <div key={criterio.id} className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {criterio.nombre}
                    </label>
                    <Select
                      value={selectedValue || 'none'}
                      onValueChange={value =>
                        handleValueChange(criterio.slug, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${criterio.nombre}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin definir</SelectItem>
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
            {modoEdicion !== false && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || !organizationId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar clasificaciones
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            No hay criterios activos para esta entidad.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
