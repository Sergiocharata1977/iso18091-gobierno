'use client';

/**
 * Formulario de Impuestos Mensuales
 * Registro mensual de IVA, Rentas, 931 y comprobantes
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
import { useState } from 'react';

interface ImpuestosMensualesFormProps {
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

export function ImpuestosMensualesForm({
  open,
  onOpenChange,
  organizationId,
  clienteId,
  usuarioActual,
  onSuccess,
}: ImpuestosMensualesFormProps) {
  const [saving, setSaving] = useState(false);

  // Período por defecto: mes actual
  const now = new Date();
  const defaultPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [ivaCompras, setIvaCompras] = useState('');
  const [ivaVentas, setIvaVentas] = useState('');
  const [rentas, setRentas] = useState('');
  const [impuesto931, setImpuesto931] = useState('');
  const [comprobantesUrl, setComprobantesUrl] = useState('');

  const parseNum = (val: string) => parseFloat(val) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calcular totales
  const totalImpuestos =
    parseNum(ivaCompras) +
    parseNum(ivaVentas) +
    parseNum(rentas) +
    parseNum(impuesto931);

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const res = await fetch(`/api/crm/historico/${clienteId}/financial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          tipoSnapshot: 'iva_mensual',
          periodo,
          declaracionMensual: {
            ivaCompras: parseNum(ivaCompras),
            ivaVentas: parseNum(ivaVentas),
            rentas: parseNum(rentas),
            impuesto931: parseNum(impuesto931),
            comprobantesUrl: comprobantesUrl || undefined,
          },
          fuenteDatos: 'declaracion_jurada',
          registradoPor: usuarioActual,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        resetForm();
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

  const resetForm = () => {
    setIvaCompras('');
    setIvaVentas('');
    setRentas('');
    setImpuesto931('');
    setComprobantesUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registro de Impuestos Mensuales</DialogTitle>
          <DialogDescription>
            Registre los impuestos pagados/declarados para el período
            seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Período */}
          <div className="space-y-2">
            <Label>Período (Mes/Año)</Label>
            <Input
              type="month"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              placeholder="2024-03"
            />
            <p className="text-xs text-gray-500">
              Seleccione el mes y año del período fiscal
            </p>
          </div>

          {/* IVA */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-blue-800">IVA</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IVA Compras ($)</Label>
                <Input
                  type="number"
                  value={ivaCompras}
                  onChange={e => setIvaCompras(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>IVA Ventas ($)</Label>
                <Input
                  type="number"
                  value={ivaVentas}
                  onChange={e => setIvaVentas(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="text-right text-sm">
              <span className="font-medium">
                Saldo IVA:{' '}
                {formatCurrency(parseNum(ivaVentas) - parseNum(ivaCompras))}
              </span>
            </div>
          </div>

          {/* Otros Impuestos */}
          <div className="bg-green-50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-green-800">Otros Impuestos</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rentas ($)</Label>
                <Input
                  type="number"
                  value={rentas}
                  onChange={e => setRentas(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>931 ($)</Label>
                <Input
                  type="number"
                  value={impuesto931}
                  onChange={e => setImpuesto931(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Comprobantes */}
          <div className="space-y-2">
            <Label>Comprobantes / Documentos (URL)</Label>
            <Input
              type="text"
              value={comprobantesUrl}
              onChange={e => setComprobantesUrl(e.target.value)}
              placeholder="https://... o ruta a documentos"
            />
            <p className="text-xs text-gray-500">
              Opcional: URL o referencia a los comprobantes de pago
            </p>
          </div>

          {/* Total */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Impuestos Declarados:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(totalImpuestos)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm">
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
            {saving ? 'Guardando...' : 'Guardar Registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
