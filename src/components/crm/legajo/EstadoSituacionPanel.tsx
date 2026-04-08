// src/components/crm/legajo/EstadoSituacionPanel.tsx
// Panel para listar y crear Estados de Situación Patrimonial

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
  ActivoCorriente,
  ActivoNoCorriente,
  EstadoSituacionPatrimonial,
  PasivoCorriente,
  PasivoNoCorriente,
  PatrimonioNeto,
} from '@/types/crm-estados-financieros';
import {
  DEFAULT_ACTIVO_CORRIENTE,
  DEFAULT_ACTIVO_NO_CORRIENTE,
  DEFAULT_PASIVO_CORRIENTE,
  DEFAULT_PASIVO_NO_CORRIENTE,
} from '@/types/crm-estados-financieros';
import { Eye, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  clienteId: string;
  clienteNombre: string;
  clienteCuit: string;
}

export function EstadoSituacionPanel({
  clienteId,
  clienteNombre,
  clienteCuit,
}: Props) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [estados, setEstados] = useState<EstadoSituacionPatrimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear());
  const [fechaCierre, setFechaCierre] = useState('');
  const [fuenteDatos, setFuenteDatos] = useState<
    'declaracion' | 'auditoria' | 'estimacion'
  >('declaracion');
  const [activoCorriente, setActivoCorriente] = useState<ActivoCorriente>({
    ...DEFAULT_ACTIVO_CORRIENTE,
  });
  const [activoNoCorriente, setActivoNoCorriente] = useState<ActivoNoCorriente>(
    { ...DEFAULT_ACTIVO_NO_CORRIENTE }
  );
  const [pasivoCorriente, setPasivoCorriente] = useState<PasivoCorriente>({
    ...DEFAULT_PASIVO_CORRIENTE,
  });
  const [pasivoNoCorriente, setPasivoNoCorriente] = useState<PasivoNoCorriente>(
    { ...DEFAULT_PASIVO_NO_CORRIENTE }
  );
  const [patrimonioNeto, setPatrimonioNeto] = useState<
    Omit<PatrimonioNeto, 'resultado_ejercicio'>
  >({
    capital: 0,
    ajuste_capital: 0,
    reservas: 0,
    resultados_acumulados: 0,
  });

  // Totales calculados
  const totalActivoCorriente = Object.values(activoCorriente).reduce(
    (a, b) => a + b,
    0
  );
  const totalActivoNoCorriente = Object.values(activoNoCorriente).reduce(
    (a, b) => a + b,
    0
  );
  const totalActivo = totalActivoCorriente + totalActivoNoCorriente;
  const totalPasivoCorriente = Object.values(pasivoCorriente).reduce(
    (a, b) => a + b,
    0
  );
  const totalPasivoNoCorriente = Object.values(pasivoNoCorriente).reduce(
    (a, b) => a + b,
    0
  );
  const totalPasivo = totalPasivoCorriente + totalPasivoNoCorriente;
  const totalPN = Object.values(patrimonioNeto).reduce((a, b) => a + b, 0);

  const loadEstados = async () => {
    if (!organizationId || !clienteId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/crm/estados-financieros/situacion?organization_id=${organizationId}&cliente_id=${clienteId}`
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
      const res = await fetch('/api/crm/estados-financieros/situacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: user?.email || 'sistema',
          crm_organizacion_id: clienteId,
          cliente_nombre: clienteNombre,
          cliente_cuit: clienteCuit,
          ejercicio,
          fecha_cierre: fechaCierre,
          fuente_datos: fuenteDatos,
          activo_corriente: activoCorriente,
          activo_no_corriente: activoNoCorriente,
          pasivo_corriente: pasivoCorriente,
          pasivo_no_corriente: pasivoNoCorriente,
          patrimonio_neto: patrimonioNeto,
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
      await fetch(`/api/crm/estados-financieros/situacion/${id}`, {
        method: 'DELETE',
      });
      loadEstados();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setEjercicio(new Date().getFullYear());
    setFechaCierre('');
    setActivoCorriente({ ...DEFAULT_ACTIVO_CORRIENTE });
    setActivoNoCorriente({ ...DEFAULT_ACTIVO_NO_CORRIENTE });
    setPasivoCorriente({ ...DEFAULT_PASIVO_CORRIENTE });
    setPasivoNoCorriente({ ...DEFAULT_PASIVO_NO_CORRIENTE });
    setPatrimonioNeto({
      capital: 0,
      ajuste_capital: 0,
      reservas: 0,
      resultados_acumulados: 0,
    });
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
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay estados registrados</p>
          <p className="text-sm">
            Agregue el primer Estado de Situación Patrimonial
          </p>
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
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Ejercicio {estado.ejercicio}</p>
                    <p className="text-sm text-gray-500">
                      Cierre:{' '}
                      {new Date(estado.fecha_cierre).toLocaleDateString(
                        'es-AR'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-bold ${estado.total_patrimonio_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(estado.total_patrimonio_neto)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {estado.fuente_datos}
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
                  <p className="text-gray-500">Total Activo</p>
                  <p className="font-medium">
                    {formatCurrency(estado.total_activo)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Pasivo</p>
                  <p className="font-medium">
                    {formatCurrency(estado.total_pasivo)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Liquidez</p>
                  <p className="font-medium">
                    {estado.liquidez_corriente.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Solvencia</p>
                  <p className="font-medium">{estado.solvencia.toFixed(2)}</p>
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
              📊 Nuevo Estado de Situación Patrimonial
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4">
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
                <Label>Fecha de Cierre</Label>
                <Input
                  type="date"
                  value={fechaCierre}
                  onChange={e => setFechaCierre(e.target.value)}
                />
              </div>
              <div>
                <Label>Fuente de Datos</Label>
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

            <div className="grid grid-cols-2 gap-8">
              {/* ACTIVO */}
              <div className="space-y-4 border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50/30">
                <h4 className="font-bold text-xl text-emerald-800 border-b-2 border-emerald-300 pb-2">
                  ✅ ACTIVO
                </h4>

                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-2">
                    Activo Corriente
                  </h5>
                  <div className="space-y-2">
                    {[
                      { key: 'caja_bancos', label: 'Caja y Bancos' },
                      {
                        key: 'inversiones_temporarias',
                        label: 'Inversiones Temporarias',
                      },
                      {
                        key: 'creditos_por_ventas',
                        label: 'Créditos por Ventas',
                      },
                      { key: 'otros_creditos', label: 'Otros Créditos' },
                      { key: 'bienes_de_cambio', label: 'Bienes de Cambio' },
                      { key: 'otros_activos', label: 'Otros Activos' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Label className="w-40 text-xs">{item.label}</Label>
                        <Input
                          type="number"
                          value={
                            activoCorriente[item.key as keyof ActivoCorriente]
                          }
                          onChange={e =>
                            setActivoCorriente({
                              ...activoCorriente,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Activo Corriente</span>
                      <span>{formatCurrency(totalActivoCorriente)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-2">
                    Activo No Corriente
                  </h5>
                  <div className="space-y-2">
                    {[
                      { key: 'bienes_de_uso', label: 'Bienes de Uso' },
                      {
                        key: 'participacion_sociedades',
                        label: 'Participación en Sociedades',
                      },
                      { key: 'otras_inversiones', label: 'Otras Inversiones' },
                      {
                        key: 'activos_intangibles',
                        label: 'Activos Intangibles',
                      },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Label className="w-40 text-xs">{item.label}</Label>
                        <Input
                          type="number"
                          value={
                            activoNoCorriente[
                              item.key as keyof ActivoNoCorriente
                            ]
                          }
                          onChange={e =>
                            setActivoNoCorriente({
                              ...activoNoCorriente,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Activo No Corriente</span>
                      <span>{formatCurrency(totalActivoNoCorriente)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg flex justify-between font-bold">
                  <span>TOTAL ACTIVO</span>
                  <span>{formatCurrency(totalActivo)}</span>
                </div>
              </div>

              {/* PASIVO + PATRIMONIO NETO */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg border-b pb-2">
                  PASIVO + PATRIMONIO NETO
                </h4>

                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-2">
                    Pasivo Corriente
                  </h5>
                  <div className="space-y-2">
                    {[
                      {
                        key: 'deudas_comerciales',
                        label: 'Deudas Comerciales',
                      },
                      { key: 'prestamos', label: 'Préstamos' },
                      {
                        key: 'remuneraciones_cargas_sociales',
                        label: 'Remuneraciones',
                      },
                      { key: 'cargas_fiscales', label: 'Cargas Fiscales' },
                      { key: 'otras_deudas', label: 'Otras Deudas' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Label className="w-40 text-xs">{item.label}</Label>
                        <Input
                          type="number"
                          value={
                            pasivoCorriente[item.key as keyof PasivoCorriente]
                          }
                          onChange={e =>
                            setPasivoCorriente({
                              ...pasivoCorriente,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Pasivo Corriente</span>
                      <span>{formatCurrency(totalPasivoCorriente)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-2">
                    Pasivo No Corriente
                  </h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="w-40 text-xs">Deudas</Label>
                      <Input
                        type="number"
                        value={pasivoNoCorriente.deudas}
                        onChange={e =>
                          setPasivoNoCorriente({
                            ...pasivoNoCorriente,
                            deudas: Number(e.target.value),
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-40 text-xs">Previsiones</Label>
                      <Input
                        type="number"
                        value={pasivoNoCorriente.previsiones}
                        onChange={e =>
                          setPasivoNoCorriente({
                            ...pasivoNoCorriente,
                            previsiones: Number(e.target.value),
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Pasivo No Corriente</span>
                      <span>{formatCurrency(totalPasivoNoCorriente)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-100 p-3 rounded-lg flex justify-between font-bold text-red-800 border border-red-300">
                  <span>TOTAL PASIVO</span>
                  <span>{formatCurrency(totalPasivo)}</span>
                </div>

                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-2">
                    Patrimonio Neto
                  </h5>
                  <div className="space-y-2">
                    {[
                      { key: 'capital', label: 'Capital' },
                      { key: 'ajuste_capital', label: 'Ajuste de Capital' },
                      { key: 'reservas', label: 'Reservas' },
                      {
                        key: 'resultados_acumulados',
                        label: 'Resultados Acumulados',
                      },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Label className="w-40 text-xs">{item.label}</Label>
                        <Input
                          type="number"
                          value={
                            patrimonioNeto[
                              item.key as keyof typeof patrimonioNeto
                            ]
                          }
                          onChange={e =>
                            setPatrimonioNeto({
                              ...patrimonioNeto,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Patrimonio Neto</span>
                      <span>{formatCurrency(totalPN)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-100 p-3 rounded-lg flex justify-between font-bold text-emerald-800 border border-emerald-300">
                  <span>TOTAL PASIVO + PN</span>
                  <span>{formatCurrency(totalPasivo + totalPN)}</span>
                </div>
              </div>
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
