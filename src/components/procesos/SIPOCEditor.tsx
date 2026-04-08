import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  calculateRPN,
  createEmptySIPOC,
  ProcessActivity,
  ProcessControl,
  ProcessInput,
  ProcessOutput,
  ProcessRisk,
  ProcessSIPOC,
} from '@/types/processes-unified';
import { ProcessCategoryId } from '@/types/processRecords';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ProcessAISuggestionDialog,
  SIPOCSuggestion,
} from './ProcessAISuggestionDialog';

interface SIPOCEditorProps {
  initialData?: ProcessSIPOC;
  onChange: (data: ProcessSIPOC) => void;
  readOnly?: boolean;
  processName?: string;
  category?: ProcessCategoryId;
}

export function SIPOCEditor({
  initialData,
  onChange,
  readOnly = false,
  processName,
  category,
}: SIPOCEditorProps) {
  const [data, setData] = useState<ProcessSIPOC>(
    initialData || createEmptySIPOC()
  );
  const [showAIDialog, setShowAIDialog] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const updateData = (newData: ProcessSIPOC) => {
    setData(newData);
    onChange(newData);
  };

  const handleAddInput = () => {
    const newInput: ProcessInput = {
      id: crypto.randomUUID(),
      description: '', // Was name
      supplier: '',
      required: true,
      validation_criteria: '', // Was requirements
    };
    updateData({ ...data, inputs: [...data.inputs, newInput] });
  };

  const handleAddActivity = () => {
    const newActivity: ProcessActivity = {
      id: crypto.randomUUID(),
      step: data.activities.length + 1, // Was order
      name: '',
      description: '',
      responsible_position_id: '', // Was role_responsible
    };
    updateData({ ...data, activities: [...data.activities, newActivity] });
  };

  const handleAddOutput = () => {
    const newOutput: ProcessOutput = {
      id: crypto.randomUUID(),
      description: '', // Was name
      customer: '',
      quality_criteria: '',
    };
    updateData({ ...data, outputs: [...data.outputs, newOutput] });
  };

  const handleAddControl = () => {
    const newControl: ProcessControl = {
      id: crypto.randomUUID(),
      description: '', // Was name
      type: 'review', // Fixed literal type
      frequency: '',
      responsible_position_id: '', // Was responsible
    };
    updateData({ ...data, controls: [...data.controls, newControl] });
  };

  const handleAddRisk = () => {
    const newRisk: ProcessRisk = {
      id: crypto.randomUUID(),
      description: '',
      severity: 'baja', // Fixed qualitative type
      probability: 'baja',
      detection: 'media',
      rpn: 1, // Will be calculated
    };
    newRisk.rpn = calculateRPN(newRisk);
    updateData({ ...data, risks: [...data.risks, newRisk] });
  };

  const removeItem = (section: keyof ProcessSIPOC, id: string) => {
    const list = data[section] as any[];
    const newList = list.filter(item => item.id !== id);
    updateData({ ...data, [section]: newList });
  };

  const updateItem = (
    section: keyof ProcessSIPOC,
    id: string,
    field: string,
    value: any
  ) => {
    const list = data[section] as any[];
    const newList = list.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate RPN for risks
        if (
          section === 'risks' &&
          (field === 'severity' ||
            field === 'probability' ||
            field === 'detection')
        ) {
          updated.rpn = calculateRPN(updated as ProcessRisk);
        }
        return updated;
      }
      return item;
    });
    updateData({ ...data, [section]: newList });
  };

  const handleAIApply = (suggestion: any) => {
    // Cast strict type
    const sipocSuggestion = suggestion as SIPOCSuggestion;

    // Map suggestion to ProcessSIPOC with new IDs
    const newSIPOC: ProcessSIPOC = {
      inputs:
        sipocSuggestion.inputs?.map(i => ({
          id: crypto.randomUUID(),
          description: i.description,
          supplier: i.supplier,
          validation_criteria: i.validation_criteria,
          required: true,
        })) || [],
      activities:
        sipocSuggestion.activities?.map((a, index) => ({
          id: crypto.randomUUID(),
          step: index + 1,
          name: a.name,
          description: a.description,
          responsible_position_id: a.responsible_position_id,
        })) || [],
      outputs:
        sipocSuggestion.outputs?.map(o => ({
          id: crypto.randomUUID(),
          description: o.description,
          customer: o.customer,
          quality_criteria: o.quality_criteria,
        })) || [],
      controls:
        sipocSuggestion.controls?.map(c => ({
          id: crypto.randomUUID(),
          description: c.description,
          type: (c.type as any) || 'review',
          frequency: c.frequency,
          responsible_position_id: c.responsible_position_id,
        })) || [],
      risks:
        sipocSuggestion.risks?.map(r => {
          const risk: ProcessRisk = {
            id: crypto.randomUUID(),
            description: r.description,
            severity: (r.severity as any) || 'baja',
            probability: (r.probability as any) || 'baja',
            detection: (r.detection as any) || 'media',
            rpn: 0,
          };
          risk.rpn = calculateRPN(risk);
          return risk;
        }) || [],
      compliance_tracking: data.compliance_tracking, // Preserve existing tracking
    };

    updateData(newSIPOC);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Estructura SIPOC</CardTitle>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
            onClick={() => setShowAIDialog(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Sugerir con IA
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ProcessAISuggestionDialog
          open={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          mode="sipoc"
          processName={processName}
          category={category}
          onApply={handleAIApply}
        />
        <Tabs defaultValue="activities">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="inputs">
              Entradas ({data.inputs.length})
            </TabsTrigger>
            <TabsTrigger value="activities">
              Actividades ({data.activities.length})
            </TabsTrigger>
            <TabsTrigger value="outputs">
              Salidas ({data.outputs.length})
            </TabsTrigger>
            <TabsTrigger value="controls">
              Controles ({data.controls.length})
            </TabsTrigger>
            <TabsTrigger value="risks">
              Riesgos ({data.risks.length})
            </TabsTrigger>
          </TabsList>

          {/* INPUTS */}
          <TabsContent value="inputs" className="space-y-4">
            {data.inputs.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center border p-2 rounded"
              >
                <div className="col-span-3">
                  <Label>Proveedor</Label>
                  <Input
                    value={item.supplier || ''}
                    onChange={e =>
                      updateItem('inputs', item.id, 'supplier', e.target.value)
                    }
                    placeholder="Quién provee"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-4">
                  <Label>Entrada (Descripción)</Label>
                  <Input
                    value={item.description || ''}
                    onChange={e =>
                      updateItem(
                        'inputs',
                        item.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Qué entra"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-4">
                  <Label>Criterio Validación</Label>
                  <Input
                    value={item.validation_criteria || ''}
                    onChange={e =>
                      updateItem(
                        'inputs',
                        item.id,
                        'validation_criteria',
                        e.target.value
                      )
                    }
                    placeholder="Requisitos"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-1 flex justify-end mt-4">
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('inputs', item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button onClick={handleAddInput}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Entrada
              </Button>
            )}
          </TabsContent>

          {/* ACTIVITIES */}
          <TabsContent value="activities" className="space-y-4">
            {data.activities.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-start border p-2 rounded"
              >
                <div className="col-span-1 pt-8 text-center font-bold text-gray-500">
                  #{item.step}
                </div>
                <div className="col-span-4">
                  <Label>Actividad (Nombre)</Label>
                  <Input
                    value={item.name || ''}
                    onChange={e =>
                      updateItem('activities', item.id, 'name', e.target.value)
                    }
                    placeholder="Nombre corto"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-4">
                  <Label>Detalle</Label>
                  <Textarea
                    value={item.description || ''}
                    onChange={e =>
                      updateItem(
                        'activities',
                        item.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Descripción detallada"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Rol Responsable</Label>
                  <Input
                    value={item.responsible_position_id || ''}
                    onChange={e =>
                      updateItem(
                        'activities',
                        item.id,
                        'responsible_position_id',
                        e.target.value
                      )
                    }
                    placeholder="ID Puesto"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-1 pt-8">
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('activities', item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button onClick={handleAddActivity}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Actividad
              </Button>
            )}
          </TabsContent>

          {/* OUTPUTS */}
          <TabsContent value="outputs" className="space-y-4">
            {data.outputs.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center border p-2 rounded"
              >
                <div className="col-span-4">
                  <Label>Salida (Descripción)</Label>
                  <Input
                    value={item.description || ''}
                    onChange={e =>
                      updateItem(
                        'outputs',
                        item.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Producto/Servicio"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-3">
                  <Label>Cliente</Label>
                  <Input
                    value={item.customer || ''}
                    onChange={e =>
                      updateItem('outputs', item.id, 'customer', e.target.value)
                    }
                    placeholder="Quién recibe"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-4">
                  <Label>Criterios de Aceptación</Label>
                  <Input
                    value={item.quality_criteria || ''}
                    onChange={e =>
                      updateItem(
                        'outputs',
                        item.id,
                        'quality_criteria',
                        e.target.value
                      )
                    }
                    placeholder="Criterios de calidad"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-1 flex justify-end mt-4">
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('outputs', item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button onClick={handleAddOutput}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Salida
              </Button>
            )}
          </TabsContent>

          {/* CONTROLS */}
          <TabsContent value="controls" className="space-y-4">
            {data.controls.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center border p-2 rounded"
              >
                <div className="col-span-3">
                  <Label>Control (Desc.)</Label>
                  <Input
                    value={item.description || ''}
                    onChange={e =>
                      updateItem(
                        'controls',
                        item.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Qué se controla"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-3">
                  <Label>Tipo</Label>
                  <Select
                    value={item.type}
                    onValueChange={val =>
                      updateItem('controls', item.id, 'type', val)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicator">Indicador</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="inspection">Inspección</SelectItem>
                      <SelectItem value="review">Revisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>Frecuencia</Label>
                  <Input
                    value={item.frequency || ''}
                    onChange={e =>
                      updateItem(
                        'controls',
                        item.id,
                        'frequency',
                        e.target.value
                      )
                    }
                    placeholder="Cada cuánto"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Responsable (ID)</Label>
                  <Input
                    value={item.responsible_position_id || ''}
                    onChange={e =>
                      updateItem(
                        'controls',
                        item.id,
                        'responsible_position_id',
                        e.target.value
                      )
                    }
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-1 flex justify-end mt-4">
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('controls', item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button onClick={handleAddControl}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Control
              </Button>
            )}
          </TabsContent>

          {/* RISKS */}
          <TabsContent value="risks" className="space-y-4">
            {data.risks.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-start border p-2 rounded"
              >
                <div className="col-span-4">
                  <Label>Riesgo (Descripción)</Label>
                  <Textarea
                    value={item.description || ''}
                    onChange={e =>
                      updateItem(
                        'risks',
                        item.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Descripción del riesgo"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Severidad</Label>
                  <Select
                    value={item.severity}
                    onValueChange={val =>
                      updateItem('risks', item.id, 'severity', val)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Probabilidad</Label>
                  <Select
                    value={item.probability}
                    onValueChange={val =>
                      updateItem('risks', item.id, 'probability', val)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Detección</Label>
                  <Select
                    value={item.detection}
                    onValueChange={val =>
                      updateItem('risks', item.id, 'detection', val)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Label>RPN</Label>
                  <div
                    className={`mt-2 font-bold ${
                      (item.rpn || 0) > 150 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {item.rpn || 0}
                  </div>
                </div>

                <div className="col-span-1 flex justify-end mt-4">
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('risks', item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button onClick={handleAddRisk}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Riesgo
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
