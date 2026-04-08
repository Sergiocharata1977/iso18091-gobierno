// src/components/crm/legajo/EstadoResultadosPanel.tsx
// Panel para listar y crear Estados de Resultados

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/contexts/AuthContext';
import type {
  EstadoResultados,
  ResultadosDescontinuacion,
  ResultadosOperacionesContinuan,
} from '@/types/crm-estados-financieros';
import {
  DEFAULT_RESULTADOS_CONTINUAN,
  DEFAULT_RESULTADOS_DESCONTINUACION,
} from '@/types/crm-estados-financieros';
import { Eye, Loader2, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  clienteId: string;
  clienteNombre: string;
  clienteCuit: string;
}

export function EstadoResultadosPanel({
  clienteId,
  clienteNombre,
  clienteCuit,
}: Props) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [estados, setEstados] = useState<EstadoResultados[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [fuenteDatos, setFuenteDatos] = useState<
    'declaracion' | 'auditoria' | 'estimacion'
  >('declaracion');
  const [resultadosContinuan, setResultadosContinuan] =
    useState<ResultadosOperacionesContinuan>({
      ...DEFAULT_RESULTADOS_CONTINUAN,
    });
  const [resultadosDescontinuacion, setResultadosDescontinuacion] =
    useState<ResultadosDescontinuacion>({
      ...DEFAULT_RESULTADOS_DESCONTINUACION,
    });
  const [resultadosExtraordinarios, setResultadosExtraordinarios] = useState(0);

  // Cálculos automáticos
  const gananciaBruta =
    resultadosContinuan.ventas_netas -
    resultadosContinuan.costo_bienes_vendidos;

  const resultadoOperativo =
    gananciaBruta +
    resultadosContinuan.resultado_valuacion_bienes_cambio -
    resultadosContinuan.gastos_comercializacion -
    resultadosContinuan.gastos_administracion -
    resultadosContinuan.otros_gastos;

  const resultadosFinancieros =
    resultadosContinuan.resultados_inversiones_relacionados +
    resultadosContinuan.resultados_otras_inversiones +
    resultadosContinuan.resultados_financieros_activos -
    resultadosContinuan.resultados_financieros_pasivos +
    resultadosContinuan.otros_ingresos_egresos;

  const gananciaAntesImpuestos = resultadoOperativo + resultadosFinancieros;
  const gananciaOpContinuan =
    gananciaAntesImpuestos - resultadosContinuan.impuesto_ganancias;
  const gananciaDescontinuacion =
    resultadosDescontinuacion.resultados_operaciones +
    resultadosDescontinuacion.resultados_disposicion_activos;
  const gananciaEjercicio =
    gananciaOpContinuan + gananciaDescontinuacion + resultadosExtraordinarios;

  const loadEstados = async () => {
    if (!organizationId || !clienteId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/crm/estados-financieros/resultados?organization_id=${organizationId}&cliente_id=${clienteId}`
      );
      const data = await res.json();
      if (data.success) {
        setEstados(data.data);
      }
    } catch (error) {
      console.error('Error loading estados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstados();
  }, [organizationId, clienteId]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/estados-financieros/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: user?.email || 'sistema',
          crm_organizacion_id: clienteId,
          cliente_nombre: clienteNombre,
          cliente_cuit: clienteCuit,
          ejercicio,
          fecha_inicio: fechaInicio,
          fecha_cierre: fechaCierre,
          fuente_datos: fuenteDatos,
          resultados_continuan: resultadosContinuan,
          resultados_descontinuacion: resultadosDescontinuacion,
          resultados_extraordinarios: resultadosExtraordinarios,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        loadEstados();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estado?')) return;
    try {
      await fetch(`/api/crm/estados-financieros/resultados/${id}`, {
        method: 'DELETE',
      });
      loadEstados();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setEjercicio(new Date().getFullYear());
    setFechaInicio('');
    setFechaCierre('');
    setResultadosContinuan({ ...DEFAULT_RESULTADOS_CONTINUAN });
    setResultadosDescontinuacion({ ...DEFAULT_RESULTADOS_DESCONTINUACION });
    setResultadosExtraordinarios(0);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Estado
        </Button>
      </div>

      {estados.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay estados registrados</p>
          <p className="text-sm">Agregue el primer Estado de Resultados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {estados.map(estado => (
            <div
              key={estado.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Ejercicio {estado.ejercicio}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(estado.fecha_inicio).toLocaleDateString(
                        'es-AR'
                      )}{' '}
                      -{' '}
                      {new Date(estado.fecha_cierre).toLocaleDateString(
                        'es-AR'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${estado.ganancia_perdida_ejercicio >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(estado.ganancia_perdida_ejercicio)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {estado.ganancia_perdida_ejercicio >= 0
                        ? 'Ganancia'
                        : 'Pérdida'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(estado.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t text-sm">
                <div>
                  <p className="text-gray-500">Ventas Netas</p>
                  <p className="font-medium">
                    {formatCurrency(estado.resultados_continuan.ventas_netas)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Ganancia Bruta</p>
                  <p className="font-medium">
                    {formatCurrency(estado.ganancia_bruta)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Antes Impuestos</p>
                  <p className="font-medium">
                    {formatCurrency(estado.ganancia_antes_impuestos)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Impuestos</p>
                  <p className="font-medium">
                    {formatCurrency(
                      estado.resultados_continuan.impuesto_ganancias
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-emerald-700 border-b border-emerald-200 pb-3">
              📈 Nuevo Estado de Resultados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Ejercicio</Label>
                <Select
                  value={String(ejercicio)}
                  onValueChange={v => setEjercicio(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Fecha Cierre</Label>
                <Input
                  type="date"
                  value={fechaCierre}
                  onChange={e => setFechaCierre(e.target.value)}
                />
              </div>
              <div>
                <Label>Fuente</Label>
                <Select
                  value={fuenteDatos}
                  onValueChange={(
                    v: 'declaracion' | 'auditoria' | 'estimacion'
                  ) => setFuenteDatos(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="declaracion">Declaración</SelectItem>
                    <SelectItem value="auditoria">Auditoría</SelectItem>
                    <SelectItem value="estimacion">Estimación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resultados de Operaciones que Continúan */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg border-b pb-2">
                RESULTADOS DE OPERACIONES QUE CONTINÚAN
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="w-48">Ventas Netas</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.ventas_netas}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          ventas_netas: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-48">Costo de Bienes Vendidos</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.costo_bienes_vendidos}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          costo_bienes_vendidos: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded font-medium">
                    <span className="w-48">Ganancia Bruta</span>
                    <span
                      className={
                        gananciaBruta >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {formatCurrency(gananciaBruta)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="w-48">Gastos Comercialización</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.gastos_comercializacion}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          gastos_comercializacion: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-48">Gastos Administración</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.gastos_administracion}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          gastos_administracion: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-48">Otros Gastos</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.otros_gastos}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          otros_gastos: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-gray-600">
                    Resultados Financieros
                  </h5>
                  <div className="flex items-center gap-2">
                    <Label className="w-48 text-sm">Por Activos</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.resultados_financieros_activos}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          resultados_financieros_activos: Number(
                            e.target.value
                          ),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-48 text-sm">Por Pasivos</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.resultados_financieros_pasivos}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          resultados_financieros_pasivos: Number(
                            e.target.value
                          ),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-gray-600">Otros</h5>
                  <div className="flex items-center gap-2">
                    <Label className="w-48 text-sm">
                      Otros Ingresos/Egresos
                    </Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.otros_ingresos_egresos}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          otros_ingresos_egresos: Number(e.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-48 text-sm">Impuesto Ganancias</Label>
                    <Input
                      type="number"
                      value={resultadosContinuan.impuesto_ganancias}
                      onChange={e =>
                        setResultadosContinuan({
                          ...resultadosContinuan,
                          impuesto_ganancias: Number(e.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex justify-between font-bold">
                <span>Ganancia Operaciones Continúan</span>
                <span
                  className={
                    gananciaOpContinuan >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatCurrency(gananciaOpContinuan)}
                </span>
              </div>
            </div>

            {/* Operaciones en Descontinuación */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg border-b pb-2">
                OPERACIONES EN DESCONTINUACIÓN
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-48">Resultados Operaciones</Label>
                  <Input
                    type="number"
                    value={resultadosDescontinuacion.resultados_operaciones}
                    onChange={e =>
                      setResultadosDescontinuacion({
                        ...resultadosDescontinuacion,
                        resultados_operaciones: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-48">Disposición Activos</Label>
                  <Input
                    type="number"
                    value={
                      resultadosDescontinuacion.resultados_disposicion_activos
                    }
                    onChange={e =>
                      setResultadosDescontinuacion({
                        ...resultadosDescontinuacion,
                        resultados_disposicion_activos: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Extraordinarios */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg border-b pb-2">
                OPERACIONES EXTRAORDINARIAS
              </h4>
              <div className="flex items-center gap-2">
                <Label className="w-48">Resultados Extraordinarios</Label>
                <Input
                  type="number"
                  value={resultadosExtraordinarios}
                  onChange={e =>
                    setResultadosExtraordinarios(Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Resultado Final */}
            <div
              className={`p-4 rounded-lg font-bold text-xl flex justify-between ${gananciaEjercicio >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <span>GANANCIA (PÉRDIDA) DEL EJERCICIO</span>
              <span
                className={
                  gananciaEjercicio >= 0 ? 'text-green-700' : 'text-red-700'
                }
              >
                {formatCurrency(gananciaEjercicio)}
              </span>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Estado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
