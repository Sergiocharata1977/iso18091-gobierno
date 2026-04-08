'use client';

/**
 * Formulario de Estado de Situación Patrimonial
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface SituacionPatrimonialFormProps {
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

export function SituacionPatrimonialForm({
  open,
  onOpenChange,
  organizationId,
  clienteId,
  usuarioActual,
  onSuccess,
}: SituacionPatrimonialFormProps) {
  const [saving, setSaving] = useState(false);
  const [periodo, setPeriodo] = useState(new Date().getFullYear().toString());
  const [fuenteDatos, setFuenteDatos] = useState('balance_auditado');

  // Activo Corriente
  const [cajaYBancos, setCajaYBancos] = useState('');
  const [inversionesTemporarias, setInversionesTemporarias] = useState('');
  const [creditosPorVentasCte, setCreditosPorVentasCte] = useState('');
  const [otrosCreditosCte, setOtrosCreditosCte] = useState('');
  const [bienesDeCambioCte, setBienesDeCambioCte] = useState('');
  const [otrosActivosCte, setOtrosActivosCte] = useState('');

  // Activo No Corriente
  const [creditosPorVentasNoCte, setCreditosPorVentasNoCte] = useState('');
  const [otrosCreditosNoCte, setOtrosCreditosNoCte] = useState('');
  const [bienesDeCambioNoCte, setBienesDeCambioNoCte] = useState('');
  const [bienesDeUso, setBienesDeUso] = useState('');
  const [participacionSociedades, setParticipacionSociedades] = useState('');
  const [otrasInversiones, setOtrasInversiones] = useState('');
  const [activosIntangibles, setActivosIntangibles] = useState('');
  const [otrosActivosNoCte, setOtrosActivosNoCte] = useState('');

  // Pasivo Corriente
  const [deudasComerciales, setDeudasComerciales] = useState('');
  const [prestamos, setPrestamos] = useState('');
  const [remuneracionesYCargasSoc, setRemuneracionesYCargasSoc] = useState('');
  const [cargasFiscales, setCargasFiscales] = useState('');
  const [anticiposClientes, setAnticiposClientes] = useState('');
  const [dividendosAPagar, setDividendosAPagar] = useState('');
  const [otrasDeudas, setOtrasDeudas] = useState('');
  const [previsionesCte, setPrevisionesCte] = useState('');

  // Pasivo No Corriente
  const [deudasNoCte, setDeudasNoCte] = useState('');
  const [previsionesNoCte, setPrevisionesNoCte] = useState('');

  // Patrimonio Neto
  const [capital, setCapital] = useState('');
  const [reservas, setReservas] = useState('');
  const [resultadosAcumulados, setResultadosAcumulados] = useState('');
  const [resultadoEjercicio, setResultadoEjercicio] = useState('');

  const parseNum = (val: string) => parseFloat(val) || 0;

  // Cálculos automáticos
  const totalActivoCte =
    parseNum(cajaYBancos) +
    parseNum(inversionesTemporarias) +
    parseNum(creditosPorVentasCte) +
    parseNum(otrosCreditosCte) +
    parseNum(bienesDeCambioCte) +
    parseNum(otrosActivosCte);

  const totalActivoNoCte =
    parseNum(creditosPorVentasNoCte) +
    parseNum(otrosCreditosNoCte) +
    parseNum(bienesDeCambioNoCte) +
    parseNum(bienesDeUso) +
    parseNum(participacionSociedades) +
    parseNum(otrasInversiones) +
    parseNum(activosIntangibles) +
    parseNum(otrosActivosNoCte);

  const totalActivo = totalActivoCte + totalActivoNoCte;

  const totalPasivoCte =
    parseNum(deudasComerciales) +
    parseNum(prestamos) +
    parseNum(remuneracionesYCargasSoc) +
    parseNum(cargasFiscales) +
    parseNum(anticiposClientes) +
    parseNum(dividendosAPagar) +
    parseNum(otrasDeudas) +
    parseNum(previsionesCte);

  const totalPasivoNoCte = parseNum(deudasNoCte) + parseNum(previsionesNoCte);
  const totalPasivo = totalPasivoCte + totalPasivoNoCte;

  const totalPN =
    parseNum(capital) +
    parseNum(reservas) +
    parseNum(resultadosAcumulados) +
    parseNum(resultadoEjercicio);

  const totalPasivoYPN = totalPasivo + totalPN;

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
          tipoSnapshot: 'situacion_patrimonial',
          periodo,
          situacionPatrimonial: {
            activoCorriente: {
              cajaYBancos: parseNum(cajaYBancos),
              inversionesTemporarias: parseNum(inversionesTemporarias),
              creditosPorVentas: parseNum(creditosPorVentasCte),
              otrosCreditos: parseNum(otrosCreditosCte),
              bienesDeCambio: parseNum(bienesDeCambioCte),
              otrosActivos: parseNum(otrosActivosCte),
              total: totalActivoCte,
            },
            activoNoCorriente: {
              creditosPorVentas: parseNum(creditosPorVentasNoCte),
              otrosCreditos: parseNum(otrosCreditosNoCte),
              bienesDeCambio: parseNum(bienesDeCambioNoCte),
              bienesDeUso: parseNum(bienesDeUso),
              participacionSociedades: parseNum(participacionSociedades),
              otrasInversiones: parseNum(otrasInversiones),
              activosIntangibles: parseNum(activosIntangibles),
              otrosActivos: parseNum(otrosActivosNoCte),
              total: totalActivoNoCte,
            },
            totalActivo,
            pasivoCorriente: {
              deudasComerciales: parseNum(deudasComerciales),
              prestamos: parseNum(prestamos),
              remuneracionesYCargasSoc: parseNum(remuneracionesYCargasSoc),
              cargasFiscales: parseNum(cargasFiscales),
              anticiposClientes: parseNum(anticiposClientes),
              dividendosAPagar: parseNum(dividendosAPagar),
              otrasDeudas: parseNum(otrasDeudas),
              previsiones: parseNum(previsionesCte),
              total: totalPasivoCte,
            },
            pasivoNoCorriente: {
              deudas: parseNum(deudasNoCte),
              previsiones: parseNum(previsionesNoCte),
              total: totalPasivoNoCte,
            },
            totalPasivo,
            patrimonioNeto: {
              capital: parseNum(capital),
              reservas: parseNum(reservas),
              resultadosAcumulados: parseNum(resultadosAcumulados),
              resultadoEjercicio: parseNum(resultadoEjercicio),
              total: totalPN,
            },
            totalPasivoYPatrimonio: totalPasivoYPN,
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
    className = '',
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
  }) => (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estado de Situación Patrimonial</DialogTitle>
          <DialogDescription>
            Ingrese los datos del balance - Período {periodo}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="space-y-1 col-span-2">
            <Label>Período (Ejercicio)</Label>
            <Input
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              placeholder="2024"
            />
          </div>
          <div className="space-y-1 col-span-2">
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

        <Tabs defaultValue="activo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activo">ACTIVO</TabsTrigger>
            <TabsTrigger value="pasivo">PASIVO</TabsTrigger>
            <TabsTrigger value="pn">PATRIMONIO NETO</TabsTrigger>
          </TabsList>

          <TabsContent value="activo" className="space-y-4 pt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">
                Activo Corriente
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="Caja y Bancos"
                  value={cajaYBancos}
                  onChange={setCajaYBancos}
                />
                <InputField
                  label="Inversiones Temporarias"
                  value={inversionesTemporarias}
                  onChange={setInversionesTemporarias}
                />
                <InputField
                  label="Créditos por Ventas"
                  value={creditosPorVentasCte}
                  onChange={setCreditosPorVentasCte}
                />
                <InputField
                  label="Otros Créditos"
                  value={otrosCreditosCte}
                  onChange={setOtrosCreditosCte}
                />
                <InputField
                  label="Bienes de Cambio"
                  value={bienesDeCambioCte}
                  onChange={setBienesDeCambioCte}
                />
                <InputField
                  label="Otros Activos"
                  value={otrosActivosCte}
                  onChange={setOtrosActivosCte}
                />
              </div>
              <div className="text-right mt-2 font-bold text-blue-800">
                Total Activo Corriente: {formatCurrency(totalActivoCte)}
              </div>
            </div>

            <div className="bg-blue-100 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">
                Activo No Corriente
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="Créditos por Ventas"
                  value={creditosPorVentasNoCte}
                  onChange={setCreditosPorVentasNoCte}
                />
                <InputField
                  label="Otros Créditos"
                  value={otrosCreditosNoCte}
                  onChange={setOtrosCreditosNoCte}
                />
                <InputField
                  label="Bienes de Cambio"
                  value={bienesDeCambioNoCte}
                  onChange={setBienesDeCambioNoCte}
                />
                <InputField
                  label="Bienes de Uso"
                  value={bienesDeUso}
                  onChange={setBienesDeUso}
                />
                <InputField
                  label="Participación en Sociedades"
                  value={participacionSociedades}
                  onChange={setParticipacionSociedades}
                />
                <InputField
                  label="Otras Inversiones"
                  value={otrasInversiones}
                  onChange={setOtrasInversiones}
                />
                <InputField
                  label="Activos Intangibles"
                  value={activosIntangibles}
                  onChange={setActivosIntangibles}
                />
                <InputField
                  label="Otros Activos"
                  value={otrosActivosNoCte}
                  onChange={setOtrosActivosNoCte}
                />
              </div>
              <div className="text-right mt-2 font-bold text-blue-800">
                Total Activo No Corriente: {formatCurrency(totalActivoNoCte)}
              </div>
            </div>

            <div className="bg-blue-200 p-3 rounded-lg text-right">
              <span className="text-xl font-bold text-blue-900">
                TOTAL ACTIVO: {formatCurrency(totalActivo)}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="pasivo" className="space-y-4 pt-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-3">
                Pasivo Corriente
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="Deudas Comerciales"
                  value={deudasComerciales}
                  onChange={setDeudasComerciales}
                />
                <InputField
                  label="Préstamos"
                  value={prestamos}
                  onChange={setPrestamos}
                />
                <InputField
                  label="Remuner. y Cargas Soc."
                  value={remuneracionesYCargasSoc}
                  onChange={setRemuneracionesYCargasSoc}
                />
                <InputField
                  label="Cargas Fiscales"
                  value={cargasFiscales}
                  onChange={setCargasFiscales}
                />
                <InputField
                  label="Anticipos de Clientes"
                  value={anticiposClientes}
                  onChange={setAnticiposClientes}
                />
                <InputField
                  label="Dividendos a Pagar"
                  value={dividendosAPagar}
                  onChange={setDividendosAPagar}
                />
                <InputField
                  label="Otras Deudas"
                  value={otrasDeudas}
                  onChange={setOtrasDeudas}
                />
                <InputField
                  label="Previsiones"
                  value={previsionesCte}
                  onChange={setPrevisionesCte}
                />
              </div>
              <div className="text-right mt-2 font-bold text-red-800">
                Total Pasivo Corriente: {formatCurrency(totalPasivoCte)}
              </div>
            </div>

            <div className="bg-red-100 p-3 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-3">
                Pasivo No Corriente
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="Deudas"
                  value={deudasNoCte}
                  onChange={setDeudasNoCte}
                />
                <InputField
                  label="Previsiones"
                  value={previsionesNoCte}
                  onChange={setPrevisionesNoCte}
                />
              </div>
              <div className="text-right mt-2 font-bold text-red-800">
                Total Pasivo No Corriente: {formatCurrency(totalPasivoNoCte)}
              </div>
            </div>

            <div className="bg-red-200 p-3 rounded-lg text-right">
              <span className="text-xl font-bold text-red-900">
                TOTAL PASIVO: {formatCurrency(totalPasivo)}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="pn" className="space-y-4 pt-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3">
                Patrimonio Neto
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Capital"
                  value={capital}
                  onChange={setCapital}
                />
                <InputField
                  label="Reservas"
                  value={reservas}
                  onChange={setReservas}
                />
                <InputField
                  label="Resultados Acumulados"
                  value={resultadosAcumulados}
                  onChange={setResultadosAcumulados}
                />
                <InputField
                  label="Resultado del Ejercicio"
                  value={resultadoEjercicio}
                  onChange={setResultadoEjercicio}
                />
              </div>
              <div className="text-right mt-2 font-bold text-green-800">
                Total Patrimonio Neto: {formatCurrency(totalPN)}
              </div>
            </div>

            <div className="bg-green-200 p-3 rounded-lg text-right">
              <span className="text-xl font-bold text-green-900">
                TOTAL PASIVO + PN: {formatCurrency(totalPasivoYPN)}
              </span>
              {Math.abs(totalActivo - totalPasivoYPN) > 0.01 && (
                <p className="text-red-600 text-sm mt-1">
                  ⚠️ Diferencia con Activo:{' '}
                  {formatCurrency(totalActivo - totalPasivoYPN)}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

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
            {saving ? 'Guardando...' : 'Guardar Situación Patrimonial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
