'use client';

import { MeasurementFormDialog } from '@/components/quality/MeasurementFormDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { QualityIndicator } from '@/types/quality';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  Edit,
  Eye,
  Plus,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type EditingSection = 'info' | 'formula' | 'metas' | 'responsables' | null;

export default function IndicatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const indicatorId = params.id as string;

  const [indicator, setIndicator] = useState<QualityIndicator | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [showNewMeasurementDialog, setShowNewMeasurementDialog] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Partial<QualityIndicator>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);

  const loadIndicator = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quality/indicators/${indicatorId}`);
      if (response.ok) {
        const data = await response.json();
        setIndicator(data);
      }
    } catch (error) {
      console.error('Error loading indicator:', error);
    } finally {
      setLoading(false);
    }
  }, [indicatorId]);

  const loadPersonnel = async () => {
    try {
      const response = await fetch(
        `/api/personnel-list?organization_id=${user?.organization_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPersonnel(data || []);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    }
  };

  useEffect(() => {
    loadIndicator();
    loadPersonnel();
    loadMeasurements();
  }, [loadIndicator]);

  const loadMeasurements = async () => {
    try {
      setLoadingMeasurements(true);
      const response = await fetch(
        `/api/quality/measurements?indicator_id=${indicatorId}`
      );
      if (response.ok) {
        const data = await response.json();
        setMeasurements(data || []);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoadingMeasurements(false);
    }
  };

  const startEditing = (section: EditingSection) => {
    setEditingSection(section);
    setEditValues(indicator || {});
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditValues({});
  };

  const saveSection = async () => {
    if (!indicator) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/quality/indicators/${indicatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editValues,
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        await loadIndicator();
        setEditingSection(null);
        setEditValues({});
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'bg-blue-100 text-blue-800';
      case 'inactivo':
        return 'bg-gray-100 text-gray-800';
      case 'suspendido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando indicador...</p>
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Indicador no encontrado</p>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {indicator.name}
              </h1>
              <Badge className={getStatusColor(indicator.status)}>
                {indicator.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Código: <span className="font-mono">{indicator.code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Información General
          </CardTitle>
          {editingSection !== 'info' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('info')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'info' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={editValues.name || ''}
                  onChange={e =>
                    setEditValues({ ...editValues, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={editValues.description || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="text-base font-medium">{indicator.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="text-base">
                  {indicator.description || 'Sin descripción'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="text-base capitalize">{indicator.type}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fórmula y Cálculo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fórmula y Cálculo
          </CardTitle>
          {editingSection !== 'formula' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('formula')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'formula' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Fórmula</label>
                <Input
                  value={editValues.formula || ''}
                  onChange={e =>
                    setEditValues({ ...editValues, formula: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Ej: (Valor A / Valor B) * 100"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Método de Cálculo</label>
                <Textarea
                  value={editValues.calculation_method || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      calculation_method: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fuente de Datos</label>
                <Input
                  value={editValues.data_source || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      data_source: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Fórmula</p>
                <p className="text-base font-mono bg-gray-50 p-2 rounded">
                  {indicator.formula || 'No definida'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Método de Cálculo</p>
                <p className="text-base">
                  {indicator.calculation_method || 'No definido'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuente de Datos</p>
                <p className="text-base">
                  {indicator.data_source || 'No definida'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Metas y Rangos
          </CardTitle>
          {editingSection !== 'metas' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('metas')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'metas' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Meta Mínima</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.target_min || 0}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        target_min: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meta Máxima</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.target_max || 0}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        target_max: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unidad</label>
                  <Input
                    value={editValues.unit || ''}
                    onChange={e =>
                      setEditValues({ ...editValues, unit: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Meta Mínima</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {indicator.target_min} {indicator.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Meta Máxima</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {indicator.target_max} {indicator.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Frecuencia de Medición</p>
                <p className="text-lg font-medium capitalize">
                  {indicator.measurement_frequency}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Responsables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Responsable Principal</p>
              <p className="text-base font-medium">
                {personnel.find(p => p.id === indicator.responsible_user_id)
                  ?.nombre_completo || 'No asignado'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              La asignacion a personal se administra desde Mi Panel. Este
              indicador queda en modo referencia.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mediciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Mediciones
          </CardTitle>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/procesos/mediciones?indicator_id=${indicatorId}`)
            }
            className="gap-2"
          >
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {loadingMeasurements ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando mediciones...</p>
            </div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">
                No hay mediciones registradas para este indicador
              </p>
              <Button
                onClick={() => setShowNewMeasurementDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Medición
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {measurements.slice(0, 5).map(measurement => (
                <Card
                  key={measurement.id}
                  className="border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {measurement.code}
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Valor:</span>{' '}
                            {measurement.value} {indicator?.unit}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              {new Date(
                                measurement.measurement_date
                              ).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Medido por:</span>{' '}
                            {measurement.measured_by}
                          </div>
                        </div>
                        {measurement.observations && (
                          <p className="text-xs text-gray-500 mt-2">
                            {measurement.observations}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/procesos/mediciones/${measurement.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/procesos/mediciones?indicator_id=${indicatorId}`
                    )
                  }
                  className="flex-1"
                >
                  Ver Todas las Mediciones ({measurements.length})
                </Button>
                <Button
                  onClick={() => setShowNewMeasurementDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Medición
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for creating new measurement */}
      <MeasurementFormDialog
        open={showNewMeasurementDialog}
        onOpenChange={setShowNewMeasurementDialog}
        indicatorId={indicatorId}
        onSuccess={() => {
          setShowNewMeasurementDialog(false);
          loadMeasurements();
        }}
      />
    </div>
  );
}
