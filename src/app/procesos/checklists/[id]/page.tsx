'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import {
  CHECKLIST_CATEGORIES,
  ChecklistField,
  ChecklistFieldType,
  ChecklistTemplate,
  FIELD_TYPES,
} from '@/types/checklists';
import {
  ArrowLeft,
  Edit,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function ChecklistTemplateEditorPage() {
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<ChecklistField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    tipo: 'texto' as ChecklistFieldType,
    etiqueta: '',
    descripcion: '',
    requerido: false,
    valor_esperado: '',
    unidad: '',
    opciones: '',
    valor_minimo: '',
    valor_maximo: '',
  });

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/checklists/templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async () => {
    if (!template || !fieldForm.etiqueta.trim()) return;

    setSaving(true);
    try {
      const field: ChecklistField = {
        id: editingField?.id || uuidv4(),
        orden: editingField?.orden ?? template.campos.length,
        tipo: fieldForm.tipo,
        etiqueta: fieldForm.etiqueta,
        descripcion: fieldForm.descripcion,
        requerido: fieldForm.requerido,
        valor_esperado: fieldForm.valor_esperado || undefined,
        unidad: fieldForm.unidad || undefined,
        opciones:
          fieldForm.tipo === 'seleccion' && fieldForm.opciones
            ? fieldForm.opciones.split(',').map(o => o.trim())
            : undefined,
        valor_minimo: fieldForm.valor_minimo
          ? Number(fieldForm.valor_minimo)
          : undefined,
        valor_maximo: fieldForm.valor_maximo
          ? Number(fieldForm.valor_maximo)
          : undefined,
      };

      // Update local state
      let newCampos;
      if (editingField) {
        newCampos = template.campos.map(c =>
          c.id === editingField.id ? field : c
        );
      } else {
        newCampos = [...template.campos, field];
      }

      // Save to API
      await fetch(`/api/checklists/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos: newCampos }),
      });

      setTemplate({ ...template, campos: newCampos });
      closeFieldDialog();
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!template) return;
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;

    setSaving(true);
    try {
      const newCampos = template.campos.filter(c => c.id !== fieldId);

      await fetch(`/api/checklists/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos: newCampos }),
      });

      setTemplate({ ...template, campos: newCampos });
    } catch (error) {
      console.error('Error deleting field:', error);
    } finally {
      setSaving(false);
    }
  };

  const openFieldDialog = (field?: ChecklistField) => {
    if (field) {
      setEditingField(field);
      setFieldForm({
        tipo: field.tipo,
        etiqueta: field.etiqueta,
        descripcion: field.descripcion || '',
        requerido: field.requerido,
        valor_esperado: field.valor_esperado || '',
        unidad: field.unidad || '',
        opciones: field.opciones?.join(', ') || '',
        valor_minimo: field.valor_minimo?.toString() || '',
        valor_maximo: field.valor_maximo?.toString() || '',
      });
    } else {
      setEditingField(null);
      setFieldForm({
        tipo: 'texto',
        etiqueta: '',
        descripcion: '',
        requerido: false,
        valor_esperado: '',
        unidad: '',
        opciones: '',
        valor_minimo: '',
        valor_maximo: '',
      });
    }
    setShowFieldDialog(true);
  };

  const closeFieldDialog = () => {
    setShowFieldDialog(false);
    setEditingField(null);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Plantilla no encontrada
            </h3>
            <Link href="/procesos/checklists">
              <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category =
    CHECKLIST_CATEGORIES[
      template.categoria as keyof typeof CHECKLIST_CATEGORIES
    ] || CHECKLIST_CATEGORIES.otro;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/procesos/checklists">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {template.nombre}
              </h1>
              <Badge className={category.color}>
                {category.icon} {category.label}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {template.descripcion || 'Sin descripción'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {template.codigo}
          </Badge>
          <Badge className="bg-gray-100 text-gray-800">
            v{template.version}
          </Badge>
        </div>
      </div>

      {/* Fields List */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Campos del Checklist ({template.campos.length})
          </CardTitle>
          <Button
            onClick={() => openFieldDialog()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Campo
          </Button>
        </CardHeader>
        <CardContent>
          {template.campos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay campos configurados</p>
              <p className="text-sm mt-1">
                Agrega campos para definir qué información se debe completar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {template.campos.map((field, index) => {
                const fieldType = FIELD_TYPES[field.tipo] || FIELD_TYPES.texto;

                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="text-lg">{fieldType.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.etiqueta}</span>
                        {field.requerido && (
                          <Badge
                            variant="outline"
                            className="text-xs text-red-600 border-red-200"
                          >
                            Requerido
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {fieldType.label}
                        </Badge>
                      </div>
                      {field.descripcion && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {field.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openFieldDialog(field)}
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Nuevo Campo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Tipo de Campo *</Label>
              <Select
                value={fieldForm.tipo}
                onValueChange={value =>
                  setFieldForm({
                    ...fieldForm,
                    tipo: value as ChecklistFieldType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type.icon} {type.label} - {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Etiqueta *</Label>
              <Input
                value={fieldForm.etiqueta}
                onChange={e =>
                  setFieldForm({ ...fieldForm, etiqueta: e.target.value })
                }
                placeholder="Ej. Verificar peso del producto"
              />
            </div>

            <div>
              <Label>Descripción / Instrucciones</Label>
              <Textarea
                value={fieldForm.descripcion}
                onChange={e =>
                  setFieldForm({ ...fieldForm, descripcion: e.target.value })
                }
                placeholder="Instrucciones adicionales para completar este campo..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requerido"
                checked={fieldForm.requerido}
                onCheckedChange={checked =>
                  setFieldForm({ ...fieldForm, requerido: !!checked })
                }
              />
              <Label htmlFor="requerido" className="cursor-pointer">
                Campo requerido
              </Label>
            </div>

            {/* Conditional fields based on type */}
            {fieldForm.tipo === 'numero' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Mínimo</Label>
                    <Input
                      type="number"
                      value={fieldForm.valor_minimo}
                      onChange={e =>
                        setFieldForm({
                          ...fieldForm,
                          valor_minimo: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Valor Máximo</Label>
                    <Input
                      type="number"
                      value={fieldForm.valor_maximo}
                      onChange={e =>
                        setFieldForm({
                          ...fieldForm,
                          valor_maximo: e.target.value,
                        })
                      }
                      placeholder="100"
                    />
                  </div>
                </div>
                <div>
                  <Label>Unidad de Medida</Label>
                  <Input
                    value={fieldForm.unidad}
                    onChange={e =>
                      setFieldForm({ ...fieldForm, unidad: e.target.value })
                    }
                    placeholder="Ej. kg, °C, %, mm"
                  />
                </div>
              </>
            )}

            {fieldForm.tipo === 'seleccion' && (
              <div>
                <Label>Opciones (separadas por coma)</Label>
                <Textarea
                  value={fieldForm.opciones}
                  onChange={e =>
                    setFieldForm({ ...fieldForm, opciones: e.target.value })
                  }
                  placeholder="Ej. Bueno, Regular, Malo"
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label>Valor Esperado / Referencia</Label>
              <Input
                value={fieldForm.valor_esperado}
                onChange={e =>
                  setFieldForm({ ...fieldForm, valor_esperado: e.target.value })
                }
                placeholder="Ej. Sí, 10-15 kg, Verde"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeFieldDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveField}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={saving || !fieldForm.etiqueta.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {editingField ? 'Guardar Cambios' : 'Agregar Campo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
