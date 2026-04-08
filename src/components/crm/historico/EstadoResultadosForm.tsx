'use client';

/**
 * Formulario de Estado de Resultados
 * Estructura completa según modelo contable argentino
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useState } from 'react';

interface EstadoResultadosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  clienteId: string;
  usuarioActual: {
    userId: string;
    nombre: string;
    cargo?: string;
  };
  onSuccess?: () => void;
}

export function EstadoResultadosForm({
  open,
  onOpenChange,
  organizationId,
  clienteId,
  usuarioActual,
  onSuccess,
}: EstadoResultadosFormProps) {
  const [saving, setSaving] = useState(false);
  const [periodo, setPeriodo] = useState(new Date().getFullYear().toString());
  const [fuenteDatos, setFuenteDatos] = useState('balance_auditado');

  // Ingresos
  const [ventasNetas, setVentasNetas] = useState('');
  const [costoBienesVendidos, setCostoBienesVendidos] = useState('');

  // Resultados por valuación
  const [resultadoValuacionBienesCambio, setResultadoValuacionBienesCambio] =
    useState('');

  // Gastos operativos
  const [gastosComercializacion, setGastosComercializacion] = useState('');
  const [gastosAdministracion, setGastosAdministracion] = useState('');
  const [otrosGastos, setOtrosGastos] = useState('');

  // Otros resultados
  const [
    resultadoInversionesEntesRelacionados,
    setResultadoInversionesEntesRelacionados,
  ] = useState('');
  const [resultadoOtrasInversiones, setResultadoOtrasInversiones] =
    useState('');

  // Resultados financieros
  const [resultadosFinActivos, setResultadosFinActivos] = useState('');
  const [resultadosFinPasivos, setResultadosFinPasivos] = useState('');

  // Otros
  const [otrosIngresosEgresos, setOtrosIngresosEgresos] = useState('');
  const [impuestoGanancias, setImpuestoGanancias] = useState('');

  const parseNum = (val: string) => parseFloat(val) || 0;

  // Cálculos automáticos
  const gananciaBruta = parseNum(ventasNetas) - parseNum(costoBienesVendidos);

  const totalGastosOperativos =
    parseNum(gastosComercializacion) +
    parseNum(gastosAdministracion) +
    parseNum(otrosGastos);

  const totalResultadosFinancieros =
    parseNum(resultadosFinActivos) + parseNum(resultadosFinPasivos);

  const gananciaAntesImpuestos =
    gananciaBruta +
    parseNum(resultadoValuacionBienesCambio) -
    totalGastosOperativos +
    parseNum(resultadoInversionesEntesRelacionados) +
    parseNum(resultadoOtrasInversiones) +
    totalResultadosFinancieros +
    parseNum(otrosIngresosEgresos);

  const gananciaNeta = gananciaAntesImpuestos - parseNum(impuestoGanancias);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const res = await fetch(`/api/crm/historico/${clienteId}/financial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          tipoSnapshot: 'estado_resultados',
          periodo,
          estadoResultados: {
            ventasNetas: parseNum(ventasNetas),
            costoBienesVendidos: parseNum(costoBienesVendidos),
            gananciaBruta,
            resultadoValuacionBienesCambio: parseNum(
              resultadoValuacionBienesCambio
            ),
            gastosComercializacion: parseNum(gastosComercializacion),
            gastosAdministracion: parseNum(gastosAdministracion),
            otrosGastos: parseNum(otrosGastos),
            resultadoInversionesEntesRelacionados: parseNum(
              resultadoInversionesEntesRelacionados
            ),
            resultadoOtrasInversiones: parseNum(resultadoOtrasInversiones),
            resultadosFinancieros: {
              generadosPorActivos: parseNum(resultadosFinActivos),
              generadosPorPasivos: parseNum(resultadosFinPasivos),
              total: totalResultadosFinancieros,
            },
            otrosIngresosEgresos: parseNum(otrosIngresosEgresos),
            gananciaAntesImpuestos,
            impuestoGanancias: parseNum(impuestoGanancias),
            gananciaNeta,
          },
          fuenteDatos,
          registradoPor: usuarioActual,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({
    label,
    value,
    onChange,
    sublabel,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    sublabel?: string;
  }) => (
    <div className="flex items-center gap-4 py-2 border-b">
      <div className="flex-1">
        <span className="text-sm">{label}</span>
        {sublabel && (
          <span className="text-xs text-gray-500 ml-2">({sublabel})</span>
        )}
      </div>
      <div className="w-48">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="text-right"
        />
      </div>
    </div>
  );

  const ResultRow = ({
    label,
    value,
    bold = false,
    highlight = false,
  }: {
    label: string;
    value: number;
    bold?: boolean;
    highlight?: boolean;
  }) => (
    <div
      className={`flex items-center gap-4 py-2 border-b ${highlight ? 'bg-gray-100' : ''}`}
    >
      <div className="flex-1">
        <span className={`text-sm ${bold ? 'font-bold' : 'italic'}`}>
          {label}
        </span>
      </div>
      <div
        className={`w-48 text-right ${bold ? 'font-bold' : ''} ${value < 0 ? 'text-red-600' : 'text-green-600'}`}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estado de Resultados</DialogTitle>
          <DialogDescription>
            Resultados de las operaciones - Período {periodo}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <Label>Período (Ejercicio)</Label>
            <Input
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              placeholder="2024"
            />
          </div>
          <div className="space-y-1">
            <Label>Fuente de Datos</Label>
            <Select value={fuenteDatos} onValueChange={setFuenteDatos}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance_auditado">
                  Balance Auditado
                </SelectItem>
                <SelectItem value="declaracion_jurada">
                  Declaración Jurada
                </SelectItem>
                <SelectItem value="estimacion">Estimación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          {/* Ingresos */}
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Ingresos</h4>
            <InputField
              label="Ventas Netas de Bienes (o Servicios)"
              value={ventasNetas}
              onChange={setVentasNetas}
            />
            <InputField
              label="Costo de los Bienes Vendidos (o Servicios Prestados)"
              value={costoBienesVendidos}
              onChange={setCostoBienesVendidos}
              sublabel="Anexo"
            />
            <ResultRow label="Ganancia (Pérdida) Bruta" value={gananciaBruta} />
          </div>

          {/* Resultados por Valuación */}
          <div className=" p-3 rounded-lg">
            <InputField
              label="Resultado por Valuación de Bienes de Cambio al VNR"
              value={resultadoValuacionBienesCambio}
              onChange={setResultadoValuacionBienesCambio}
              sublabel="Nota"
            />
          </div>

          {/* Gastos Operativos */}
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">
              Gastos Operativos
            </h4>
            <InputField
              label="Gastos de Comercialización"
              value={gastosComercializacion}
              onChange={setGastosComercializacion}
              sublabel="Anexo"
            />
            <InputField
              label="Gastos de Administración"
              value={gastosAdministracion}
              onChange={setGastosAdministracion}
              sublabel="Anexo"
            />
            <InputField
              label="Otros Gastos"
              value={otrosGastos}
              onChange={setOtrosGastos}
              sublabel="Anexo"
            />
          </div>

          {/* Otros Resultados */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              Otros Resultados
            </h4>
            <InputField
              label="Resultados de Inversiones en Entes Relacionados"
              value={resultadoInversionesEntesRelacionados}
              onChange={setResultadoInversionesEntesRelacionados}
              sublabel="Nota"
            />
            <InputField
              label="Resultados de Otras Inversiones"
              value={resultadoOtrasInversiones}
              onChange={setResultadoOtrasInversiones}
              sublabel="Nota"
            />
          </div>

          {/* Resultados Financieros */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">
              Resultados Financieros y por Tenencia
            </h4>
            <InputField
              label="> Generados por Activos"
              value={resultadosFinActivos}
              onChange={setResultadosFinActivos}
              sublabel="Nota"
            />
            <InputField
              label="> Generados por Pasivos"
              value={resultadosFinPasivos}
              onChange={setResultadosFinPasivos}
              sublabel="Nota"
            />
          </div>

          {/* Otros */}
          <div className="p-3">
            <InputField
              label="Otros Ingresos y Egresos"
              value={otrosIngresosEgresos}
              onChange={setOtrosIngresosEgresos}
              sublabel="Nota"
            />
          </div>

          {/* Resultados Finales */}
          <div className="bg-gray-100 p-3 rounded-lg">
            <ResultRow
              label="Ganancia (Pérdida) Antes del Impuesto a las Ganancias"
              value={gananciaAntesImpuestos}
              bold
            />
            <InputField
              label="Impuesto a las Ganancias"
              value={impuestoGanancias}
              onChange={setImpuestoGanancias}
              sublabel="Nota"
            />
          </div>

          <div className="bg-green-200 p-4 rounded-lg">
            <ResultRow
              label="GANANCIA (PÉRDIDA) NETA DEL EJERCICIO"
              value={gananciaNeta}
              bold
              highlight
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm mt-4">
          <p className="text-gray-600">
            <strong>Registrado por:</strong> {usuarioActual.nombre}
            {usuarioActual.cargo && ` (${usuarioActual.cargo})`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Estado de Resultados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
