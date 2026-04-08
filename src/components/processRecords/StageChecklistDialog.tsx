'use client';

import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { ChecklistFieldType, FIELD_TYPES } from '@/types/checklists';
import {
  ClipboardCheck,
  Edit,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistField {
  id: string;
  orden: number;
  tipo: ChecklistFieldType;
  etiqueta: string;
  descripcion?: string;
  requerido: boolean;
  valor_esperado?: string;
  unidad?: string;
  opciones?: string[];
  valor_minimo?: number;
  valor_maximo?: number;
}

interface StageChecklist {
  id?: string;
  stage_id: string;
  process_record_id: string;
  nombre: string;
  campos: ChecklistField[];
}

interface StageChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  processRecordId: string;
}

export function StageChecklistDialog({
  open,
  onClose,
  stageId,
  stageName,
  processRecordId,
}: StageChecklistDialogProps) {
  const [checklist, setChecklist] = useState<StageChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<ChecklistField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    tipo: 'si_no' as ChecklistFieldType,
    etiqueta: '',
    descripcion: '',
    requerido: true,
    valor_esperado: '',
    unidad: '',
    opciones: '',
    valor_minimo: '',
    valor_maximo: '',
  });

  useEffect(() => {
    if (open) {
      loadChecklist();
    }
  }, [open, stageId]);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      // Try to load existing checklist for this stage
      const res = await fetch(
        `/api/checklists/stage-checklists?stage_id=${stageId}&process_record_id=${processRecordId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setChecklist(data);
        } else {
          // Create empty checklist structure
          setChecklist({
            stage_id: stageId,
            process_record_id: processRecordId,
            nombre: `Checklist - ${stageName}`,
            campos: [],
          });
        }
      } else {
        setChecklist({
          stage_id: stageId,
          process_record_id: processRecordId,
          nombre: `Checklist - ${stageName}`,
          campos: [],
        });
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      setChecklist({
        stage_id: stageId,
        process_record_id: processRecordId,
        nombre: `Checklist - ${stageName}`,
        campos: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChecklist = async () => {
    if (!checklist) return;

    setSaving(true);
    try {
      const res = await fetch('/api/checklists/stage-checklists', {
        method: checklist.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklist),
      });

      if (res.ok) {
        const data = await res.json();
        setChecklist(prev => (prev ? { ...prev, id: data.id } : prev));
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
    } finally {
      setSaving(false);
    }
  };

  const openFieldForm = (field?: ChecklistField) => {
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
        tipo: 'si_no',
        etiqueta: '',
        descripcion: '',
        requerido: true,
        valor_esperado: '',
        unidad: '',
        opciones: '',
        valor_minimo: '',
        valor_maximo: '',
      });
    }
    setShowFieldForm(true);
  };

  const saveField = () => {
    if (!checklist || !fieldForm.etiqueta.trim()) return;

    const field: ChecklistField = {
      id: editingField?.id || uuidv4(),
      orden: editingField?.orden ?? checklist.campos.length,
      tipo: fieldForm.tipo,
      etiqueta: fieldForm.etiqueta,
      descripcion: fieldForm.descripcion || undefined,
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

    let newCampos;
    if (editingField) {
      newCampos = checklist.campos.map(c =>
        c.id === editingField.id ? field : c
      );
    } else {
      newCampos = [...checklist.campos, field];
    }

    setChecklist({ ...checklist, campos: newCampos });
    setShowFieldForm(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (!checklist) return;
    const newCampos = checklist.campos.filter(c => c.id !== fieldId);
    setChecklist({ ...checklist, campos: newCampos });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist - {stageName}</DialogTitle>
            <DialogDescription>
              Cargando checklist de la etapa...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            Checklist - {stageName}
          </DialogTitle>
          <DialogDescription>
            Define los puntos de verificación para esta etapa del proceso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Field Form */}
          {showFieldForm ? (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <h4 className="font-medium">
                {editingField ? 'Editar Campo' : 'Nuevo Campo'}
              </h4>

              <div>
                <Label>Tipo</Label>
                <Select
                  value={fieldForm.tipo}
                  onValueChange={value =>
                    setFieldForm({
                      ...fieldForm,
                      tipo: value as ChecklistFieldType,
                    })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-[100]">
                    {Object.entries(FIELD_TYPES).map(([key, type]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="hover:bg-gray-100"
                      >
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pregunta / Verificación *</Label>
                <Input
                  value={fieldForm.etiqueta}
                  onChange={e =>
                    setFieldForm({ ...fieldForm, etiqueta: e.target.value })
                  }
                  placeholder="Ej. ¿El producto cumple con las especificaciones?"
                />
              </div>

              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={fieldForm.descripcion}
                  onChange={e =>
                    setFieldForm({ ...fieldForm, descripcion: e.target.value })
                  }
                  placeholder="Instrucciones adicionales..."
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

              {fieldForm.tipo === 'numero' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Mínimo</Label>
                    <Input
                      type="number"
                      value={fieldForm.valor_minimo}
                      onChange={e =>
                        setFieldForm({
                          ...fieldForm,
                          valor_minimo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Máximo</Label>
                    <Input
                      type="number"
                      value={fieldForm.valor_maximo}
                      onChange={e =>
                        setFieldForm({
                          ...fieldForm,
                          valor_maximo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <Input
                      value={fieldForm.unidad}
                      onChange={e =>
                        setFieldForm({ ...fieldForm, unidad: e.target.value })
                      }
                      placeholder="kg, °C..."
                    />
                  </div>
                </div>
              )}

              {fieldForm.tipo === 'seleccion' && (
                <div>
                  <Label>Opciones (separadas por coma)</Label>
                  <Input
                    value={fieldForm.opciones}
                    onChange={e =>
                      setFieldForm({ ...fieldForm, opciones: e.target.value })
                    }
                    placeholder="Bueno, Regular, Malo"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFieldForm(false);
                    setEditingField(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveField}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!fieldForm.etiqueta.trim()}
                >
                  {editingField ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => openFieldForm()}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Punto de Verificación
            </Button>
          )}

          {/* Fields List */}
          {checklist && checklist.campos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">
                Puntos de Verificación ({checklist.campos.length})
              </h4>
              {checklist.campos.map((field, index) => {
                const fieldType = FIELD_TYPES[field.tipo] || FIELD_TYPES.texto;
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-2 bg-white border rounded-lg"
                  >
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <span className="text-lg">{fieldType.icon}</span>
                    <div className="flex-1">
                      <span className="font-medium text-sm">
                        {field.etiqueta}
                      </span>
                      {field.requerido && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs text-red-500 border-red-200"
                        >
                          *
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openFieldForm(field)}
                    >
                      <Edit className="h-3 w-3 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteField(field.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {checklist && checklist.campos.length === 0 && !showFieldForm && (
            <div className="text-center py-8 text-gray-500">
              <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No hay puntos de verificación</p>
              <p className="text-sm">Agrega puntos para esta etapa</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveChecklist}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving || !checklist?.campos.length}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Guardar Checklist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
