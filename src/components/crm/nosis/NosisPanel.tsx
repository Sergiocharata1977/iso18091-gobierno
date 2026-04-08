'use client';

/**
 * NosisPanel - Dashboard de monitoreo de API Nosis
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { NosisClient } from '@/services/nosis/NosisClient';
import type { NosisConfig, NosisConsulta } from '@/types/nosis';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface NosisPanelProps {
  // organizationId now optional - will use from context if not provided
}

export function NosisPanel({}: NosisPanelProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [config, setConfig] = useState<NosisConfig | null>(null);
  const [consultas, setConsultas] = useState<NosisConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddKey, setShowAddKey] = useState(false);
  const [selectedConsulta, setSelectedConsulta] =
    useState<NosisConsulta | null>(null);

  // Cargar datos
  const loadData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const [configData, consultasData] = await Promise.all([
        NosisClient.getConfig(organizationId),
        NosisClient.getUltimasConsultas(organizationId, 10),
      ]);
      setConfig(configData);
      setConsultas(consultasData);
    } catch (error) {
      console.error('Error loading Nosis data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

  // Verificar conexión
  const handleVerifyConnection = async () => {
    const connected = await NosisClient.verificarConexion(organizationId);
    await loadData();
    return connected;
  };

  // Estadísticas
  const consultasHoy = consultas.filter(c => {
    const today = new Date().toDateString();
    return new Date(c.createdAt).toDateString() === today;
  });
  const exitosas = consultasHoy.filter(c => c.estado === 'exitoso').length;
  const fallidas = consultasHoy.filter(c => c.estado === 'error').length;
  const tiempoPromedio =
    consultasHoy.length > 0
      ? Math.round(
          consultasHoy.reduce((sum, c) => sum + c.tiempoRespuestaMs, 0) /
            consultasHoy.length
        )
      : 0;

  const estadoColor = {
    conectado: 'bg-green-100 text-green-700',
    desconectado: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Cargando configuración Nosis...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">API Nosis no configurada</p>
            <Button onClick={() => setShowAddKey(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Configurar Nosis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado del Servicio */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge className={estadoColor[config.estadoConexion]}>
                  {config.estadoConexion === 'conectado' && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {config.estadoConexion === 'error' && (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {config.estadoConexion}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Consultas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {consultasHoy.length}
                </p>
                <p className="text-xs text-gray-400">
                  ✓ {exitosas} | ✗ {fallidas}
                </p>
              </div>
              <Search className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tiempoPromedio} ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">API Keys</p>
                <p className="text-2xl font-bold text-gray-900">
                  {config.apiKeys.filter(k => k.estado === 'activa').length}/
                  {config.apiKeys.length}
                </p>
                <p className="text-xs text-gray-400">activas</p>
              </div>
              <Key className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Gestión de credenciales Nosis (máximo 3)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleVerifyConnection}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Conexión
              </Button>
              <Button
                onClick={() => setShowAddKey(true)}
                disabled={config.apiKeys.length >= 3}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Uso</TableHead>
                <TableHead>Total Usos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.apiKeys.map(key => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">
                    ••••••••{key.ultimosDigitos}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        key.estado === 'activa' ? 'default' : 'secondary'
                      }
                    >
                      {key.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.ultimoUso
                      ? new Date(key.ultimoUso).toLocaleString('es-AR')
                      : '-'}
                  </TableCell>
                  <TableCell>{key.usosTotal}</TableCell>
                </TableRow>
              ))}
              {config.apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No hay API Keys configuradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Últimas Consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Consultas</CardTitle>
          <CardDescription>Historial de consultas a Nosis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CUIT</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultas.map(consulta => (
                <TableRow key={consulta.id}>
                  <TableCell className="font-mono">
                    {consulta.clienteCuit}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{consulta.tipoConsulta}</Badge>
                  </TableCell>
                  <TableCell>
                    {consulta.estado === 'exitoso' && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Exitoso
                      </Badge>
                    )}
                    {consulta.estado === 'error' && (
                      <Badge className="bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    {consulta.estado === 'procesando' && (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Procesando
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{consulta.scoreObtenido || '-'}</TableCell>
                  <TableCell>{consulta.tiempoRespuestaMs} ms</TableCell>
                  <TableCell>
                    {new Date(consulta.createdAt).toLocaleString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConsulta(consulta)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {consultas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No hay consultas registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para agregar API Key */}
      <AddApiKeyDialog
        open={showAddKey}
        onOpenChange={setShowAddKey}
        organizationId={organizationId}
        onSuccess={loadData}
      />

      {/* Dialog para ver detalle de consulta */}
      <ConsultaDetailDialog
        consulta={selectedConsulta}
        onClose={() => setSelectedConsulta(null)}
      />
    </div>
  );
}

// Dialog para agregar API Key
function AddApiKeyDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apiKey) return;

    setLoading(true);
    try {
      await NosisClient.addApiKey(organizationId, { nombre, apiKey }, 'user');
      onOpenChange(false);
      setNombre('');
      setApiKey('');
      onSuccess();
    } catch (error) {
      console.error('Error adding API key:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar API Key</DialogTitle>
          <DialogDescription>
            Ingrese las credenciales de Nosis. La key será encriptada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: API Key Principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Ingrese la API Key de Nosis"
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            La API Key será encriptada con AES-256 antes de almacenarse.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog para ver detalle de consulta
function ConsultaDetailDialog({
  consulta,
  onClose,
}: {
  consulta: NosisConsulta | null;
  onClose: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);

  if (!consulta) return null;

  return (
    <Dialog open={!!consulta} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Consulta</DialogTitle>
          <DialogDescription>
            CUIT: {consulta.clienteCuit} |{' '}
            {new Date(consulta.createdAt).toLocaleString('es-AR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Estado</p>
              <p className="font-medium">{consulta.estado}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Score</p>
              <p className="font-medium text-lg">
                {consulta.scoreObtenido || '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Tiempo</p>
              <p className="font-medium">{consulta.tiempoRespuestaMs} ms</p>
            </div>
          </div>

          {/* Error si existe */}
          {consulta.errorMensaje && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700">Error</p>
              <p className="text-sm text-red-600">{consulta.errorMensaje}</p>
            </div>
          )}

          {/* Datos extraídos */}
          {consulta.datosExtraidos && (
            <div>
              <h4 className="font-medium mb-2">Datos Extraídos</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Razón Social:</span>
                  <span>{consulta.datosExtraidos.razonSocial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Situación BCRA:</span>
                  <span>
                    {consulta.datosExtraidos.bcra?.situacionActual || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cheques Rechazados:</span>
                  <span>
                    {consulta.datosExtraidos.cheques?.rechazados || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Respuesta bruta */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? 'Ocultar' : 'Ver'} Respuesta Bruta
            </Button>

            {showRaw && consulta.responseJSON && (
              <pre className="mt-2 bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto max-h-60">
                {JSON.stringify(consulta.responseJSON, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
