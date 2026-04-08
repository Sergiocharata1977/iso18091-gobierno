'use client';

/**
 * LegajoFiscalPanel - Panel principal para visualizar y gestionar el legajo fiscal
 * Incluye Estados Financieros, Maquinarias e Inmuebles para análisis de crédito
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { LegajoFiscalService } from '@/services/crm/LegajoFiscalService';
import type {
  Balance,
  Inmueble,
  LegajoFiscal,
  Maquinaria,
} from '@/types/crm-fiscal';
import {
  Building2,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Tractor,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { EstadoResultadosForm } from '../historico/EstadoResultadosForm';
import { SituacionPatrimonialForm } from '../historico/SituacionPatrimonialForm';
import { MaquinariaForm } from './MaquinariaForm';

interface LegajoFiscalPanelProps {
  clienteId: string;
  clienteCuit: string;
  onUpdate?: () => void;
}

export function LegajoFiscalPanel({
  clienteId,
  clienteCuit,
  onUpdate,
}: LegajoFiscalPanelProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [legajo, setLegajo] = useState<LegajoFiscal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMaquinariaForm, setShowMaquinariaForm] = useState(false);
  const [showSituacionForm, setShowSituacionForm] = useState(false);
  const [showResultadosForm, setShowResultadosForm] = useState(false);

  // Cargar legajo fiscal
  const loadLegajo = async () => {
    setLoading(true);
    try {
      let data = await LegajoFiscalService.getByClienteId(
        organizationId,
        clienteId
      );

      // Si no existe, crear uno nuevo
      if (!data) {
        await LegajoFiscalService.create(
          organizationId,
          clienteId,
          clienteCuit,
          'system'
        );
        data = await LegajoFiscalService.getByClienteId(
          organizationId,
          clienteId
        );
      }

      setLegajo(data);
    } catch (error) {
      console.error('Error loading legajo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegajo();
  }, [organizationId, clienteId]);

  const handleAddMaquinaria = async (data: any) => {
    await LegajoFiscalService.addMaquinaria(
      organizationId,
      clienteId,
      data,
      'user'
    );
    await loadLegajo();
    onUpdate?.();
  };

  // Obtener último balance
  const ultimoBalance = legajo?.balances.sort((a, b) =>
    b.ejercicio.localeCompare(a.ejercicio)
  )[0];

  // Calcular totales
  const totalMaquinarias =
    legajo?.maquinarias
      .filter(m => m.propiedad === 'propia')
      .reduce((sum, m) => sum + m.valorActual, 0) || 0;

  const totalInmuebles =
    legajo?.inmuebles
      .filter(i => !i.tieneHipoteca)
      .reduce((sum, i) => sum + (i.valorMercado || 0), 0) || 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Cargando legajo fiscal...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Patrimonio Neto</p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {(ultimoBalance?.patrimonioNeto || 0).toLocaleString('es-AR')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Maquinarias</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalMaquinarias.toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">
                  {legajo?.maquinarias.length || 0} unidades
                </p>
              </div>
              <Tractor className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Inmuebles</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalInmuebles.toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">
                  {legajo?.inmuebles.length || 0} propiedades
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Liquidez</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ultimoBalance?.liquidezCorriente?.toFixed(2) || '-'}
                </p>
                <p className="text-xs text-gray-400">Ratio corriente</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Card>
        <Tabs defaultValue="situacion" className="w-full">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Legajo Fiscal</CardTitle>
              <TabsList>
                <TabsTrigger value="situacion">Est. Sit. Patrim.</TabsTrigger>
                <TabsTrigger value="resultados">Est. Resultado</TabsTrigger>
                <TabsTrigger value="maquinarias">Maquinarias</TabsTrigger>
                <TabsTrigger value="inmuebles">Inmuebles</TabsTrigger>
              </TabsList>
            </div>
            <CardDescription>CUIT: {clienteCuit}</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Est. Sit. Patrim. */}
            <TabsContent value="situacion" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowSituacionForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Situación Patrimonial
                </Button>
              </div>
              <div className="text-center py-10 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Estados de Situación Patrimonial</p>
                <p className="text-sm">
                  Aquí se mostrarán los registros históricos
                </p>
              </div>
            </TabsContent>

            {/* Est. Resultado */}
            <TabsContent value="resultados" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowResultadosForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Estado de Resultados
                </Button>
              </div>
              <div className="text-center py-10 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Estados de Resultados</p>
                <p className="text-sm">
                  Aquí se mostrarán los registros históricos
                </p>
              </div>
            </TabsContent>

            {/* Maquinarias */}
            <TabsContent value="maquinarias" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowMaquinariaForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Maquinaria
                </Button>
              </div>

              {legajo?.maquinarias.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Tractor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay maquinarias registradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {legajo?.maquinarias.map(maq => (
                    <MaquinariaCard key={maq.id} maquinaria={maq} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Inmuebles */}
            <TabsContent value="inmuebles" className="space-y-4">
              <div className="flex justify-end">
                <Button disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Inmueble
                </Button>
              </div>

              {legajo?.inmuebles.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay inmuebles registrados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {legajo?.inmuebles.map(inm => (
                    <InmuebleCard key={inm.id} inmueble={inm} />
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <MaquinariaForm
        open={showMaquinariaForm}
        onOpenChange={setShowMaquinariaForm}
        onSubmit={handleAddMaquinaria}
      />

      {showSituacionForm && (
        <SituacionPatrimonialForm
          open={showSituacionForm}
          onOpenChange={setShowSituacionForm}
          organizationId={organizationId}
          clienteId={clienteId}
          usuarioActual={{
            userId: user?.email || 'sistema',
            nombre: user?.email || 'Sistema',
          }}
          onSuccess={() => {
            setShowSituacionForm(false);
            loadLegajo();
          }}
        />
      )}

      {showResultadosForm && (
        <EstadoResultadosForm
          open={showResultadosForm}
          onOpenChange={setShowResultadosForm}
          organizationId={organizationId}
          clienteId={clienteId}
          usuarioActual={{
            userId: user?.email || 'sistema',
            nombre: user?.email || 'Sistema',
          }}
          onSuccess={() => {
            setShowResultadosForm(false);
            loadLegajo();
          }}
        />
      )}
    </div>
  );
}

// Sub-componentes para las cards
function BalanceCard({ balance }: { balance: Balance }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Ejercicio {balance.ejercicio}</p>
            <p className="text-sm text-gray-500">
              Cierre:{' '}
              {new Date(balance.fechaCierre).toLocaleDateString('es-AR')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-bold ${balance.patrimonioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            ${balance.patrimonioNeto.toLocaleString('es-AR')}
          </p>
          <Badge variant="outline" className="text-xs">
            {balance.fuenteDatos.replace('_', ' ')}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-sm">
        <div>
          <p className="text-gray-500">Activo Total</p>
          <p className="font-medium">
            ${balance.totalActivo?.toLocaleString('es-AR')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Pasivo Total</p>
          <p className="font-medium">
            ${balance.totalPasivo?.toLocaleString('es-AR')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Liquidez</p>
          <p className="font-medium">
            {balance.liquidezCorriente?.toFixed(2) || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MaquinariaCard({ maquinaria }: { maquinaria: Maquinaria }) {
  const estadoColors = {
    excelente: 'bg-green-100 text-green-700',
    bueno: 'bg-blue-100 text-blue-700',
    regular: 'bg-yellow-100 text-yellow-700',
    malo: 'bg-red-100 text-red-700',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Tractor className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium">
              {maquinaria.marca} {maquinaria.modelo}
            </p>
            <p className="text-sm text-gray-500">Año {maquinaria.año}</p>
          </div>
        </div>
        <Badge className={estadoColors[maquinaria.estadoConservacion]}>
          {maquinaria.estadoConservacion}
        </Badge>
      </div>
      <div className="mt-4 pt-4 border-t flex justify-between text-sm">
        <span className="text-gray-500">{maquinaria.propiedad}</span>
        <span className="font-bold text-green-600">
          USD ${maquinaria.valorActual.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  );
}

function InmuebleCard({ inmueble }: { inmueble: Inmueble }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium">{inmueble.descripcion}</p>
            <p className="text-sm text-gray-500">
              {inmueble.localidad}, {inmueble.provincia}
            </p>
          </div>
        </div>
        {inmueble.tieneHipoteca && (
          <Badge variant="destructive">Hipotecado</Badge>
        )}
      </div>
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Superficie</p>
          <p className="font-medium">
            {inmueble.superficieTotal} {inmueble.unidadSuperficie}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Valor</p>
          <p className="font-bold text-green-600">
            $
            {(
              inmueble.valorMercado ||
              inmueble.valorFiscal ||
              0
            ).toLocaleString('es-AR')}
          </p>
        </div>
      </div>
    </div>
  );
}
