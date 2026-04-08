'use client';

import EmbeddedSignupFlow from '@/components/crm/whatsapp/EmbeddedSignupFlow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type {
  OrganizationWhatsAppConfig,
  WhatsAppConnectionStatus,
} from '@/types/whatsapp';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ApiResponse {
  success: boolean;
  data?: OrganizationWhatsAppConfig;
  error?: string;
}

const DEFAULT_CONFIG: OrganizationWhatsAppConfig = {
  enabled: false,
  provider: 'meta',
  mode: 'inbox',
  connection_method: 'embedded_signup',
  connection_status: 'not_connected',
  auto_reply_enabled: false,
  welcome_message: '',
  out_of_hours_message: '',
};

function statusBadgeVariant(
  status: WhatsAppConnectionStatus
): 'success' | 'destructive' | 'warning' {
  if (status === 'connected') return 'success';
  if (status === 'error' || status === 'token_expired') return 'destructive';
  return 'warning';
}

function statusLabel(status: WhatsAppConnectionStatus) {
  if (status === 'connected') return 'Conectado';
  if (status === 'error') return 'Error';
  if (status === 'token_expired') return 'Token vencido';
  return 'No conectado';
}

export default function CRMWhatsAppConfigPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [config, setConfig] = useState<OrganizationWhatsAppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionStatus =
    (config.connection_status as WhatsAppConnectionStatus | undefined) ??
    'not_connected';

  const loadConfig = useCallback(async () => {
    if (!orgId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/whatsapp/config?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      );

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'No se pudo obtener la configuracion.');
      }

      setConfig({ ...DEFAULT_CONFIG, ...payload.data });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error inesperado al cargar configuracion.'
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfiguration = useCallback(async () => {
    if (!orgId || !user) return;

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/whatsapp/config?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auto_reply_enabled: Boolean(config.auto_reply_enabled),
            welcome_message: config.welcome_message ?? '',
            out_of_hours_message: config.out_of_hours_message ?? '',
          }),
        }
      );

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'No se pudo guardar la configuracion.');
      }

      setConfig({ ...DEFAULT_CONFIG, ...payload.data });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error inesperado al guardar configuracion.'
      );
    } finally {
      setSaving(false);
    }
  }, [config, orgId, user]);

  const handleDisconnect = useCallback(async () => {
    if (!orgId || !user) return;

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/whatsapp/config?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: false,
            connection_status: 'not_connected',
            connected_waba_id: '',
            whatsapp_business_account_id: '',
            whatsapp_phone_number_id: '',
            outbound_number_label: '',
            access_token: '',
          }),
        }
      );

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'No se pudo desconectar la cuenta.');
      }

      setConfig({ ...DEFAULT_CONFIG, ...payload.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al desconectar.');
    } finally {
      setSaving(false);
    }
  }, [orgId, user]);

  const canConnect = useMemo(
    () => connectionStatus === 'not_connected' || connectionStatus === 'error',
    [connectionStatus]
  );

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando configuracion de WhatsApp...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>WhatsApp CRM - Configuracion</CardTitle>
              <CardDescription>
                Administra la conexion de Meta y ajustes operativos por organizacion.
              </CardDescription>
            </div>
            <Badge variant={statusBadgeVariant(connectionStatus)}>
              {statusLabel(connectionStatus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {canConnect ? (
            <EmbeddedSignupFlow
              organizationId={orgId ?? ''}
              getAuthToken={async () => {
                if (!user) throw new Error('Sesion no disponible.');
                return user.getIdToken();
              }}
              onConnected={() => {
                void loadConfig();
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de conexion</CardTitle>
                <CardDescription>
                  Numero conectado: {config.outbound_number_label || 'No disponible'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">WABA ID:</span>{' '}
                  {config.connected_waba_id || config.whatsapp_business_account_id ||
                    'No disponible'}
                </p>
                <p>
                  <span className="font-medium">Phone Number ID:</span>{' '}
                  {config.whatsapp_phone_number_id || 'No disponible'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void handleDisconnect()}
                  disabled={saving}
                >
                  Desconectar
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuracion</CardTitle>
          <CardDescription>
            Ajustes de respuestas automaticas del canal WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="auto_reply_enabled"
              type="checkbox"
              checked={Boolean(config.auto_reply_enabled)}
              onChange={event =>
                setConfig(previous => ({
                  ...previous,
                  auto_reply_enabled: event.target.checked,
                }))
              }
              className="h-4 w-4"
            />
            <Label htmlFor="auto_reply_enabled">Habilitar auto respuesta</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome_message">Mensaje de bienvenida</Label>
            <Textarea
              id="welcome_message"
              value={config.welcome_message ?? ''}
              onChange={event =>
                setConfig(previous => ({
                  ...previous,
                  welcome_message: event.target.value,
                }))
              }
              placeholder="Hola, gracias por escribirnos..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="out_of_hours_message">Mensaje fuera de horario</Label>
            <Input
              id="out_of_hours_message"
              value={config.out_of_hours_message ?? ''}
              onChange={event =>
                setConfig(previous => ({
                  ...previous,
                  out_of_hours_message: event.target.value,
                }))
              }
              placeholder="En este momento estamos fuera de horario..."
            />
          </div>

          <Button onClick={() => void saveConfiguration()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar configuracion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
