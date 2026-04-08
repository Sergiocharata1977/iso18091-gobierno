'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Check, Edit, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type EditingSection = 'general' | 'datos' | 'detalles' | null;

export default function MeasurementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const measurementId = params.id as string;

  const [measurement, setMeasurement] = useState<any>(null);
  const [indicator, setIndicator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<any>({});

  const loadMeasurement = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/quality/measurements/${measurementId}`
      );
      if (response.ok) {
        const data = await response.json();
        setMeasurement(data);

        // Load indicator
        if (data.indicator_id) {
          const indResponse = await fetch(
            `/api/quality/indicators/${data.indicator_id}`
          );
          if (indResponse.ok) {
            const indData = await indResponse.json();
            setIndicator(indData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading measurement:', error);
    } finally {
      setLoading(false);
    }
  }, [measurementId]);

  useEffect(() => {
    loadMeasurement();
  }, [loadMeasurement]);

  const startEditing = (section: EditingSection) => {
    setEditingSection(section);
    setEditValues(measurement || {});
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditValues({});
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/quality/measurements/${measurementId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editValues),
        }
      );

      if (response.ok) {
        await loadMeasurement();
        setEditingSection(null);
        setEditValues({});
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando medición...</div>
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">
          Medición no encontrada
        </h2>
        <Button asChild className="mt-4">
          <Link href="/procesos/mediciones">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/procesos/mediciones">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {measurement.code}
            </h1>
            <p className="text-gray-600 mt-1">Detalle de medición</p>
          </div>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información General</CardTitle>
          {editingSection !== 'general' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('general')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'general' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  value={editValues.code || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Indicador</label>
                <Input
                  value={indicator?.name || 'Cargando...'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveChanges} disabled={saving}>
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Código</p>
                <p className="font-medium">{measurement.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Indicador</p>
                <p className="font-medium">
                  {indicator?.code} - {indicator?.name}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datos de Medición */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos de Medición</CardTitle>
          {editingSection !== 'datos' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('datos')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'datos' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor Medido</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.value || 0}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      value: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Medición</label>
                <Input
                  type="date"
                  value={editValues.measurement_date?.split('T')[0] || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      measurement_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveChanges} disabled={saving}>
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Valor Medido</p>
                <p className="text-2xl font-bold text-blue-600">
                  {measurement.value} {indicator?.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Medición</p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <p className="font-medium">
                    {new Date(measurement.measurement_date).toLocaleDateString(
                      'es-ES'
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Medido por</p>
                <p className="font-medium">{measurement.measured_by}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalles</CardTitle>
          {editingSection !== 'detalles' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('detalles')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'detalles' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Método de Medición
                </label>
                <Input
                  value={editValues.measurement_method || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      measurement_method: e.target.value,
                    })
                  }
                  placeholder="Método utilizado..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea
                  value={editValues.observations || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      observations: e.target.value,
                    })
                  }
                  placeholder="Observaciones sobre la medición..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL de Evidencia</label>
                <Input
                  value={editValues.evidence_url || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      evidence_url: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveChanges} disabled={saving}>
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Método de Medición</p>
                <p className="font-medium">
                  {measurement.measurement_method || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Observaciones</p>
                <p className="font-medium">
                  {measurement.observations || 'Sin observaciones'}
                </p>
              </div>
              {measurement.evidence_url && (
                <div>
                  <p className="text-sm text-gray-600">Evidencia</p>
                  <a
                    href={measurement.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ver evidencia
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
