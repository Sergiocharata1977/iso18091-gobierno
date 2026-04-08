'use client';

/**
 * ConsultarNosisButton - Botón para consultar Nosis desde la ficha del cliente
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { NosisClient } from '@/services/nosis/NosisClient';
import type { NosisResultado, TipoConsultaNosis } from '@/types/nosis';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface ConsultarNosisButtonProps {
  clienteId: string;
  clienteCuit: string;
  clienteNombre: string;
  onConsultaComplete?: (resultado: NosisResultado) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const TIPOS_CONSULTA: {
  value: TipoConsultaNosis;
  label: string;
  descripcion: string;
}[] = [
  {
    value: 'nosis_score',
    label: 'Score Nosis',
    descripcion: 'Solo puntaje crediticio',
  },
  {
    value: 'veraz',
    label: 'Veraz',
    descripcion: 'Información comercial básica',
  },
  {
    value: 'situacion_crediticia',
    label: 'Situación BCRA',
    descripcion: 'Central de deudores BCRA',
  },
  {
    value: 'completo',
    label: 'Informe Completo',
    descripcion: 'Todos los datos disponibles',
  },
];

export function ConsultarNosisButton({
  clienteId,
  clienteCuit,
  clienteNombre,
  onConsultaComplete,
  variant = 'default',
  size = 'default',
}: ConsultarNosisButtonProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [showDialog, setShowDialog] = useState(false);
  const [tipoConsulta, setTipoConsulta] =
    useState<TipoConsultaNosis>('completo');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    data?: NosisResultado;
    error?: string;
  } | null>(null);

  const handleConsultar = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const response = await NosisClient.consultar(
        organizationId,
        {
          clienteId,
          cuit: clienteCuit,
          tipoConsulta,
        },
        'user'
      );

      if (response.success && response.resultado) {
        setResultado({ success: true, data: response.resultado });
        onConsultaComplete?.(response.resultado);
      } else {
        setResultado({
          success: false,
          error: response.error?.mensaje || 'Error desconocido',
        });
      }
    } catch (error: any) {
      setResultado({
        success: false,
        error: error.message || 'Error al consultar Nosis',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-600';
    if (score >= 600) return 'text-blue-600';
    if (score >= 400) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreCategoria = (score: number) => {
    if (score >= 800)
      return { label: 'A', color: 'bg-green-100 text-green-700' };
    if (score >= 600) return { label: 'B', color: 'bg-blue-100 text-blue-700' };
    if (score >= 400)
      return { label: 'C', color: 'bg-yellow-100 text-yellow-700' };
    if (score >= 200)
      return { label: 'D', color: 'bg-orange-100 text-orange-700' };
    return { label: 'E', color: 'bg-red-100 text-red-700' };
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setShowDialog(true)}>
        <Search className="h-4 w-4 mr-2" />
        Consultar Nosis
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Consultar Nosis
            </DialogTitle>
            <DialogDescription>
              {clienteNombre} - CUIT: {clienteCuit}
            </DialogDescription>
          </DialogHeader>

          {!resultado ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Consulta</Label>
                <Select
                  value={tipoConsulta}
                  onValueChange={v => setTipoConsulta(v as TipoConsultaNosis)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONSULTA.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-gray-500">
                            {t.descripcion}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Esta consulta se registrará y consumirá una unidad del plan
                Nosis.
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConsultar} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Consultar Ahora
                </Button>
              </DialogFooter>
            </div>
          ) : resultado.success && resultado.data ? (
            <div className="space-y-4">
              {/* Resultado exitoso */}
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Consulta exitosa</span>
              </div>

              {/* Score */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Score Nosis</p>
                    <p
                      className={`text-4xl font-bold ${getScoreColor(resultado.data.score)}`}
                    >
                      {resultado.data.score}
                    </p>
                  </div>
                  <Badge
                    className={getScoreCategoria(resultado.data.score).color}
                  >
                    Categoría {getScoreCategoria(resultado.data.score).label}
                  </Badge>
                </div>
              </div>

              {/* Resumen de datos */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Situación BCRA</p>
                  <p className="font-medium">
                    {resultado.data.bcra.situacionActual === 1 ? (
                      <span className="text-green-600">Normal</span>
                    ) : (
                      <span className="text-red-600">
                        Situación {resultado.data.bcra.situacionActual}
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Cheques Rechazados</p>
                  <p className="font-medium">
                    {resultado.data.cheques.rechazados === 0 ? (
                      <span className="text-green-600">Ninguno</span>
                    ) : (
                      <span className="text-red-600">
                        {resultado.data.cheques.rechazados}
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Juicios</p>
                  <p className="font-medium">
                    {resultado.data.juicios.activos === 0 ? (
                      <span className="text-green-600">Sin juicios</span>
                    ) : (
                      <span className="text-red-600">
                        {resultado.data.juicios.activos} activos
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Concursos</p>
                  <p className="font-medium">
                    {!resultado.data.concursos.presentados ? (
                      <span className="text-green-600">No presenta</span>
                    ) : (
                      <span className="text-red-600">Sí</span>
                    )}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => setResultado(null)}>
                  Nueva Consulta
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error */}
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error en la consulta</span>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {resultado.error}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => setResultado(null)}>Reintentar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
