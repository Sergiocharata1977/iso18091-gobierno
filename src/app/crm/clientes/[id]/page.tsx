'use client';

import { ClientActionTimeline } from '@/components/crm/actions/ClientActionTimeline';
import { ClasificacionesSection } from '@/components/crm/clasificaciones/ClasificacionesSection';
import { CreditoScoringTab } from '@/components/crm/CreditoScoringTab';
import { ConsultarNosisButton } from '@/components/crm/nosis/ConsultarNosisButton';
import { EntityDetailHeader } from '@/components/design-system/patterns/cards/EntityDetailHeader';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { ProgressBar } from '@/components/design-system/primitives/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/firebase/config';
import { ClienteCRM, TipoCliente } from '@/types/crm';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Receipt,
  UploadCloud,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DocumentoCliente {
  id: string;
  nombreArchivo: string;
  storageUrl: string;
  tipoDocumento: string;
  fechaCarga: string;
}

function ClientDocumentosTab({
  clienteId,
  organizationId,
}: {
  clienteId: string;
  organizationId: string;
}) {
  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tipoDoc, setTipoDoc] = useState('otro');
  const [descripcion, setDescripcion] = useState('');

  const fetchDocumentos = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/crm/historico/${clienteId}/documentos`);
      const data = await res.json();
      if (data.success) setDocumentos(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    void fetchDocumentos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(
        storage,
        `organizations/${organizationId}/clientes/${clienteId}/documentos/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const storageUrl = await getDownloadURL(storageRef);

      await fetch(`/api/crm/historico/${clienteId}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          documentoBaseId: `${clienteId}-${Date.now()}`,
          nombreArchivo: file.name,
          tipoDocumento: tipoDoc,
          descripcion,
          storageUrl,
          tamano: file.size,
          mimeType: file.type,
        }),
      });

      setFile(null);
      setDescripcion('');
      void fetchDocumentos();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Error al subir el documento. Intente de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Subir documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Archivo</label>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de documento</label>
                <Select value={tipoDoc} onValueChange={setTipoDoc}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">Balance / Estados contables</SelectItem>
                    <SelectItem value="estatuto">Estatuto / Contrato social</SelectItem>
                    <SelectItem value="dni">DNI / Documento de identidad</SelectItem>
                    <SelectItem value="poder">Poder notarial</SelectItem>
                    <SelectItem value="garantia">Garantía</SelectItem>
                    <SelectItem value="informe_nosis">Informe Nosis / Veraz</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <Input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Balance 2023, Poder vigente..."
              />
            </div>
            <Button type="submit" disabled={!file || uploading} size="sm">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {uploading ? 'Subiendo...' : 'Subir documento'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Documentos adjuntos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay documentos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documentos.map((doc, idx) => (
                <li
                  key={doc.id || idx}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.nombreArchivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.tipoDocumento}
                      {doc.fechaCarga
                        ? ` · ${new Date(doc.fechaCarga).toLocaleDateString('es-AR')}`
                        : ''}
                    </p>
                  </div>
                  <a
                    href={doc.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-sm ml-4 shrink-0"
                  >
                    Ver
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TIPO_CLIENTE_LABELS: Record<TipoCliente, string> = {
  posible_cliente: 'Posible Cliente',
  cliente_frecuente: 'Cliente Frecuente',
  cliente_antiguo: 'Cliente Antiguo',
};

const TIPO_CLIENTE_COLORS: Record<TipoCliente, 'blue' | 'green' | 'gray'> = {
  posible_cliente: 'blue',
  cliente_frecuente: 'green',
  cliente_antiguo: 'gray',
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ClienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteCRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [updatingTipoCliente, setUpdatingTipoCliente] = useState(false);

  // WhatsApp phone editing
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!user?.organization_id) return;
      try {
        setLoading(true);
        const res = await fetch(
          `/api/crm/clientes/${params.id}?organization_id=${user.organization_id}`
        );
        const data = await res.json();

        if (data.success) {
          setCliente(data.data);
          setWhatsappPhone(data.data.whatsapp_phone ?? '');
        } else {
          setError(data.error || 'No se encontro el cliente');
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Error al cargar datos del cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [params.id, user?.organization_id]);

  const handleSaveWhatsappPhone = async () => {
    if (!cliente || !user?.organization_id) return;
    try {
      setSavingWhatsapp(true);
      setWhatsappError(null);
      const res = await fetch(`/api/crm/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_phone: whatsappPhone || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el número de WhatsApp');
      }
      setCliente(data.data);
    } catch (err) {
      setWhatsappError(
        err instanceof Error ? err.message : 'Error al guardar'
      );
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!cliente || !user?.organization_id) return;
    const phone = cliente.whatsapp_phone || cliente.telefono;
    if (!phone) return;
    try {
      setOpeningWhatsapp(true);
      setWhatsappError(null);
      const res = await fetch(
        `/api/whatsapp/conversations?organization_id=${user.organization_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_e164: phone,
            contact_name: cliente.razon_social,
            client_id: cliente.id,
            type: 'crm',
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo abrir la conversación');
      }
      router.push(`/crm/whatsapp/${data.data.id}`);
    } catch (err) {
      setWhatsappError(
        err instanceof Error ? err.message : 'Error al abrir WhatsApp'
      );
    } finally {
      setOpeningWhatsapp(false);
    }
  };

  const transitionOptions: Record<TipoCliente, TipoCliente[]> = {
    [TipoCliente.POSIBLE_CLIENTE]: [
      TipoCliente.CLIENTE_FRECUENTE,
      TipoCliente.CLIENTE_ANTIGUO,
    ],
    [TipoCliente.CLIENTE_FRECUENTE]: [TipoCliente.CLIENTE_ANTIGUO],
    [TipoCliente.CLIENTE_ANTIGUO]: [TipoCliente.CLIENTE_FRECUENTE],
  };

  const handleTipoClienteChange = async (nextTipo: TipoCliente) => {
    if (
      !cliente ||
      !user?.organization_id ||
      cliente.tipo_cliente === nextTipo
    ) {
      return;
    }

    try {
      setUpdatingTipoCliente(true);
      const res = await fetch(`/api/crm/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_cliente: nextTipo,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.data) {
        throw new Error(
          data.error || 'No se pudo actualizar el tipo de cliente'
        );
      }

      setCliente(data.data);
      alert('Tipo de cliente actualizado correctamente');
    } catch (err) {
      console.error('Error updating tipo_cliente:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Error actualizando tipo de cliente'
      );
    } finally {
      setUpdatingTipoCliente(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-medium">
          {error || 'Cliente no encontrado'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/crm/clientes')}
            className="rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Cuentas corrientes / {cliente.razon_social}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(cliente.whatsapp_phone || cliente.telefono) && (
            <Button
              onClick={handleOpenWhatsApp}
              disabled={openingWhatsapp}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              {openingWhatsapp ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-1" />
              )}
              Abrir WhatsApp
            </Button>
          )}
          <Button variant="outline">Generar reporte</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Agregar <Plus className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <EntityDetailHeader
        name={cliente.razon_social}
        subtitle={cliente.email}
        tags={[
          {
            label: TIPO_CLIENTE_LABELS[cliente.tipo_cliente],
            color: TIPO_CLIENTE_COLORS[cliente.tipo_cliente],
          },
          {
            label: cliente.isActive ? 'Activa' : 'Inactiva',
            color: cliente.isActive ? 'green' : 'gray',
          },
          ...(cliente.categoria_riesgo
            ? [
                {
                  label: `Riesgo ${cliente.categoria_riesgo}`,
                  color: 'amber' as const,
                },
              ]
            : []),
        ]}
        stats={[
          { label: 'PROYECTO', value: cliente.nombre_comercial || '-' },
          {
            label: 'UNIDADES',
            value: `${cliente.cantidad_compras_12m || 0} compras`,
          },
          {
            label: 'VALOR TOTAL CERRADO',
            value: formatCurrency(cliente.monto_total_compras_historico),
          },
        ]}
        actions={[
          {
            icon: <Receipt className="w-4 h-4" />,
            label: 'Facturas',
            onClick: () => setActiveTab('facturas'),
          },
          {
            icon: <FileText className="w-4 h-4" />,
            label: 'Actividad',
            onClick: () => setActiveTab('actividad'),
          },
          {
            icon: <MoreHorizontal className="w-4 h-4" />,
            label: 'Mas acciones',
            onClick: () => alert('Acciones adicionales en desarrollo'),
          },
        ]}
        tabs={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'credito', label: 'Crédito y Scoring' },
          { id: 'cobranzas', label: 'Cobranzas' },
          { id: 'facturas', label: 'Documentos' },
          { id: 'actividad', label: 'Actividad' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Card className="rounded-xl border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Flujo Lead a Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Tipo actual: {TIPO_CLIENTE_LABELS[cliente.tipo_cliente]}
          </p>
          <Select
            value={cliente.tipo_cliente}
            onValueChange={(value: TipoCliente) =>
              handleTipoClienteChange(value)
            }
            disabled={updatingTipoCliente}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Cambiar tipo de cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={cliente.tipo_cliente}>
                {TIPO_CLIENTE_LABELS[cliente.tipo_cliente]} (actual)
              </SelectItem>
              {transitionOptions[cliente.tipo_cliente].map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPO_CLIENTE_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {activeTab === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KPIStatCard
              label="VALOR CERRADO DEL CLIENTE"
              value={formatCurrency(cliente.monto_total_compras_historico)}
              progress={{
                value: Math.min(
                  100,
                  Math.round(cliente.probabilidad_conversion || 0)
                ),
                label: `PROBABILIDAD ${cliente.probabilidad_conversion || 0}%`,
                color: 'info',
              }}
              subtext={`Alta: ${new Date(cliente.created_at).toLocaleDateString('es-AR')}`}
            />
            <KPIStatCard
              label="CUOTAS / ACTIVIDAD"
              value={`${cliente.cantidad_compras_12m || 0}/12`}
              progress={{
                value: Math.min(
                  100,
                  Math.round((cliente.cantidad_compras_12m || 0) * 8.33)
                ),
                label: `TOTAL 12M ${formatCurrency(cliente.total_compras_12m)}`,
                color: 'success',
              }}
              subtext={
                cliente.proxima_accion?.fecha_programada
                  ? `Proxima accion: ${new Date(cliente.proxima_accion.fecha_programada).toLocaleDateString('es-AR')}`
                  : 'Sin proxima accion programada'
              }
            />
          </div>

          <Card className="rounded-xl border border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Resumen de deudas</CardTitle>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">Concepto</th>
                      <th className="py-2">Cobrado a la fecha</th>
                      <th className="py-2">Saldo actual</th>
                      <th className="py-2">Deuda final</th>
                      <th className="py-2">Cuotas pendientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 pr-3">
                        <div className="font-medium">Deuda USD</div>
                        <ProgressBar
                          value={Math.min(
                            100,
                            cliente.probabilidad_conversion || 0
                          )}
                          color="info"
                          size="sm"
                          className="mt-2 max-w-52"
                        />
                      </td>
                      <td>{formatCurrency(cliente.total_compras_12m)}</td>
                      <td>{formatCurrency(cliente.monto_estimado_compra)}</td>
                      <td>
                        {formatCurrency(cliente.monto_total_compras_historico)}
                      </td>
                      <td>
                        {Math.max(0, 12 - (cliente.cantidad_compras_12m || 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3">
                        <div className="font-medium">
                          Deuda total dolarizada
                        </div>
                        <ProgressBar
                          value={Math.min(
                            100,
                            (cliente.cantidad_compras_12m || 0) * 8.33
                          )}
                          color="warning"
                          size="sm"
                          className="mt-2 max-w-52"
                        />
                      </td>
                      <td>{formatCurrency(cliente.total_compras_12m)}</td>
                      <td>{formatCurrency(cliente.monto_estimado_compra)}</td>
                      <td>
                        {formatCurrency(cliente.monto_total_compras_historico)}
                      </td>
                      <td>
                        {Math.max(0, 24 - (cliente.cantidad_compras_12m || 0))}
                        /24
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <ClasificacionesSection
            entidadId={cliente.id}
            entidadTipo="cliente"
            classificationsActuales={cliente.classifications || {}}
            onUpdate={newClassifications =>
              setCliente(current =>
                current
                  ? {
                      ...current,
                      classifications: newClassifications,
                    }
                  : current
              )
            }
          />

          {/* WhatsApp contact section */}
          <Card className="rounded-xl border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                Contacto WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Número WhatsApp
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    placeholder="+549..."
                    className="max-w-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveWhatsappPhone}
                    disabled={savingWhatsapp}
                  >
                    {savingWhatsapp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dejar vacío si es el mismo que el teléfono principal
                </p>
              </div>

              {whatsappError && (
                <p className="text-xs text-red-600">{whatsappError}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <p className="text-sm text-muted-foreground">
                  Teléfono principal:{' '}
                  <span className="font-medium text-slate-800">
                    {cliente.telefono || 'No registrado'}
                  </span>
                </p>
                {(cliente.whatsapp_phone || cliente.telefono) && (
                  <Button
                    onClick={handleOpenWhatsApp}
                    disabled={openingWhatsapp}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {openingWhatsapp ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-1" />
                    )}
                    Abrir WhatsApp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'actividad' && (
        <Card className="rounded-xl border border-slate-200 p-4 min-h-[420px]">
          <ClientActionTimeline
            clienteId={cliente.id}
            clienteNombre={cliente.razon_social}
          />
        </Card>
      )}

      {activeTab === 'cobranzas' && (
        <Card className="rounded-xl border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Cobranzas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>CUIT/CUIL: {cliente.cuit_cuil}</p>
            <p>
              Ultima interaccion:{' '}
              {new Date(cliente.ultima_interaccion).toLocaleDateString('es-AR')}
            </p>
            <p>
              Proxima accion:{' '}
              {cliente.proxima_accion?.descripcion || 'No definida'}
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'facturas' && user?.organization_id && (
        <ClientDocumentosTab
          clienteId={cliente.id}
          organizationId={user.organization_id}
        />
      )}

      {activeTab === 'credito' && user?.organization_id && (
        <div className="space-y-4">
          <Card className="rounded-xl border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consulta externa de riesgo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 flex-wrap">
              <div className="text-sm text-muted-foreground">
                CUIT/CUIL:{' '}
                <span className="font-medium text-slate-800">
                  {cliente.cuit_cuil || 'No registrado'}
                </span>
              </div>
              {cliente.cuit_cuil ? (
                <ConsultarNosisButton
                  clienteId={cliente.id}
                  clienteCuit={cliente.cuit_cuil}
                  clienteNombre={cliente.razon_social}
                  variant="outline"
                  size="sm"
                />
              ) : (
                <p className="text-xs text-amber-600">
                  Complete el CUIT/CUIL del cliente para habilitar la consulta a Nosis.
                </p>
              )}
            </CardContent>
          </Card>
          <CreditoScoringTab
            clienteId={cliente.id}
            organizationId={user.organization_id}
            patrimonioNeto={0}
          />
        </div>
      )}
    </div>
  );
}
