'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CompetenceEvaluation, PerformanceEvaluation } from '@/types/rrhh';
import { useState } from 'react';

interface EvaluationFormProps {
  evaluation?: PerformanceEvaluation;
  onSubmit: (data: Partial<PerformanceEvaluation>) => void;
  onCancel: () => void;
}

export function EvaluationForm({
  evaluation,
  onSubmit,
  onCancel,
}: EvaluationFormProps) {
  const [formData, setFormData] = useState<Partial<PerformanceEvaluation>>({
    personnel_id: evaluation?.personnel_id || '',
    puestoId: evaluation?.puestoId || '',
    periodo: evaluation?.periodo || '',
    fecha_evaluacion: evaluation?.fecha_evaluacion || new Date(),
    evaluador_id: evaluation?.evaluador_id || '',
    competencias: evaluation?.competencias || [],
    resultado_global: evaluation?.resultado_global || 'Apto',
    comentarios_generales: evaluation?.comentarios_generales || '',
    plan_mejora: evaluation?.plan_mejora || '',
    estado: evaluation?.estado || 'borrador',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof PerformanceEvaluation, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompetenceChange = (
    index: number,
    field: keyof CompetenceEvaluation,
    value: any
  ) => {
    const updatedCompetencias = [...(formData.competencias || [])];
    updatedCompetencias[index] = {
      ...updatedCompetencias[index],
      [field]: value,
    };

    // Recalcular brecha
    if (field === 'nivelEvaluado' || field === 'nivelRequerido') {
      const comp = updatedCompetencias[index];
      comp.brecha = comp.nivelRequerido - comp.nivelEvaluado;
    }

    setFormData(prev => ({ ...prev, competencias: updatedCompetencias }));
  };

  const addCompetence = () => {
    const newCompetence: CompetenceEvaluation = {
      competenciaId: '',
      nombreCompetencia: '',
      nivelRequerido: 3,
      nivelEvaluado: 0,
      observaciones: '',
      brecha: 3,
    };
    setFormData(prev => ({
      ...prev,
      competencias: [...(prev.competencias || []), newCompetence],
    }));
  };

  const removeCompetence = (index: number) => {
    const updatedCompetencias = formData.competencias?.filter(
      (_, i) => i !== index
    );
    setFormData(prev => ({ ...prev, competencias: updatedCompetencias }));
  };

  const getBrechaColor = (brecha: number) => {
    if (brecha >= 3) return 'bg-red-500';
    if (brecha >= 2) return 'bg-yellow-500';
    if (brecha >= 1) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        <SectionHeader
          title="Información Básica"
          description="Datos generales de la evaluación"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="periodo">Período *</Label>
            <Input
              id="periodo"
              value={formData.periodo}
              onChange={e => handleChange('periodo', e.target.value)}
              required
              placeholder="Ej: 2024-Q1"
              className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <Label htmlFor="fecha_evaluacion">Fecha Evaluación *</Label>
            <Input
              id="fecha_evaluacion"
              type="date"
              value={
                formData.fecha_evaluacion instanceof Date
                  ? formData.fecha_evaluacion.toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                handleChange('fecha_evaluacion', new Date(e.target.value))
              }
              required
              className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="estado">Estado *</Label>
          <Select
            value={formData.estado}
            onValueChange={value => handleChange('estado', value)}
          >
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
              <SelectItem value="cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Competencias */}
      <Card className="border-0 shadow-sm bg-slate-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Competencias Evaluadas</CardTitle>
            <Button
              type="button"
              onClick={addCompetence}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              Agregar Competencia
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.competencias?.map((comp, index) => (
            <Card key={index} className="p-4 border-0 shadow-sm bg-white">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Nombre de la competencia"
                    value={comp.nombreCompetencia}
                    onChange={e =>
                      handleCompetenceChange(
                        index,
                        'nombreCompetencia',
                        e.target.value
                      )
                    }
                    className="focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeCompetence(index)}
                    className="ml-2"
                  >
                    Eliminar
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Nivel Requerido</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={comp.nivelRequerido}
                      onChange={e =>
                        handleCompetenceChange(
                          index,
                          'nivelRequerido',
                          parseInt(e.target.value)
                        )
                      }
                      className="focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <Label>Nivel Evaluado</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      value={comp.nivelEvaluado}
                      onChange={e =>
                        handleCompetenceChange(
                          index,
                          'nivelEvaluado',
                          parseInt(e.target.value)
                        )
                      }
                      className="focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <Label>Brecha</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getBrechaColor(comp.brecha)}>
                        {comp.brecha > 0 ? `-${comp.brecha}` : '✓'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <Textarea
                    value={comp.observaciones}
                    onChange={e =>
                      handleCompetenceChange(
                        index,
                        'observaciones',
                        e.target.value
                      )
                    }
                    rows={2}
                    className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </Card>
          ))}

          {(!formData.competencias || formData.competencias.length === 0) && (
            <p className="text-center text-gray-500 py-4">
              No hay competencias agregadas. Haz clic en "Agregar Competencia"
              para comenzar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resultado y Plan de Mejora */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Resultado y Plan de Mejora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resultado_global">Resultado Global *</Label>
            <Select
              value={formData.resultado_global}
              onValueChange={value => handleChange('resultado_global', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apto">Apto</SelectItem>
                <SelectItem value="No Apto">No Apto</SelectItem>
                <SelectItem value="Requiere Capacitación">
                  Requiere Capacitación
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comentarios_generales">Comentarios Generales</Label>
            <Textarea
              id="comentarios_generales"
              value={formData.comentarios_generales}
              onChange={e =>
                handleChange('comentarios_generales', e.target.value)
              }
              rows={3}
              className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <Label htmlFor="plan_mejora">Plan de Mejora</Label>
            <Textarea
              id="plan_mejora"
              value={formData.plan_mejora}
              onChange={e => handleChange('plan_mejora', e.target.value)}
              rows={3}
              className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          {evaluation ? 'Actualizar' : 'Crear'} Evaluación
        </Button>
      </div>
    </form>
  );
}
