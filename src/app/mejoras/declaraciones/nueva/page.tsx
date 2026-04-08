'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  DeclarationCategory,
  DeclarationFormData,
} from '@/types/declarations';
import { DECLARATION_CATEGORY_LABELS } from '@/types/declarations';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function DeclarationFormPage() {
  const [formData, setFormData] = useState<DeclarationFormData>({
    employeeName: '',
    employeeEmail: '',
    category: 'calidad',
    title: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);

      const response = await fetch('/api/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al enviar declaración');
      }

      setSubmitted(true);
      setFormData({
        employeeName: '',
        employeeEmail: '',
        category: 'calidad',
        title: '',
        description: '',
      });
    } catch (err) {
      console.error('Error submitting declaration:', err);
      setError(
        err instanceof Error ? err.message : 'Error al enviar la declaración'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Declaración Enviada!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu declaración ha sido registrada exitosamente. El equipo de calidad
            la revisará pronto.
          </p>
          <Button onClick={() => setSubmitted(false)} className="w-full">
            Enviar Otra Declaración
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Declaración de Empleado
          </h1>
          <p className="text-gray-600">
            Reporta observaciones, sugerencias de mejora, o situaciones que
            requieran atención del equipo de calidad.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Información del Empleado
            </h2>

            <div className="space-y-2">
              <Label htmlFor="employeeName">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="employeeName"
                value={formData.employeeName}
                onChange={e =>
                  setFormData({ ...formData, employeeName: e.target.value })
                }
                required
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeEmail">Email (Opcional)</Label>
              <Input
                id="employeeEmail"
                type="email"
                value={formData.employeeEmail}
                onChange={e =>
                  setFormData({ ...formData, employeeEmail: e.target.value })
                }
                placeholder="tu.email@empresa.com"
              />
            </div>
          </div>

          {/* Declaration Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Detalles de la Declaración
            </h2>

            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría / Proceso <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: DeclarationCategory) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DECLARATION_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Selecciona el proceso o área relacionada con tu declaración
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Título / Asunto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="Breve descripción del asunto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción Detallada <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                rows={6}
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                placeholder="Describe la situación, observación o sugerencia de manera clara y detallada..."
              />
              <p className="text-xs text-gray-500">
                Incluye todos los detalles relevantes: qué, cuándo, dónde, cómo
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Error al enviar
                </h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData({
                  employeeName: '',
                  employeeEmail: '',
                  category: 'calidad',
                  title: '',
                  description: '',
                })
              }
            >
              Limpiar
            </Button>
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Declaración'
              )}
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            ℹ️ Información Importante
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tu declaración será revisada por el equipo de calidad</li>
            <li>• Todas las declaraciones son confidenciales</li>
            <li>• Recibirás una respuesta en un plazo de 5 días hábiles</li>
            <li>
              • Si es urgente, contacta directamente al responsable de calidad
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
