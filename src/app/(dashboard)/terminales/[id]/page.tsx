'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TerminalActionLogTable } from '@/components/terminal/TerminalActionLogTable';
import { TerminalStatusBadge } from '@/components/terminal/TerminalStatusBadge';
import type { Terminal } from '@/types/terminal';
import type { TerminalActionLog } from '@/types/terminal-action-log';
import type { EffectivePolicy } from '@/types/terminal-policy';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, RefreshCw, RotateCcw, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function TerminalDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [effectivePolicy, setEffectivePolicy] = useState<EffectivePolicy | null>(null);
  const [logs, setLogs] = useState<TerminalActionLog[]>([]);
  const [pendingLogs, setPendingLogs] = useState<TerminalActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [termRes, logRes] = await Promise.all([
        fetch(`/api/admin/terminals/${id}`),
        fetch(`/api/admin/terminals/${id}/log?limit=20`),
      ]);

      const termData = await termRes.json();
      if (!termData.success) throw new Error(termData.error ?? 'Terminal no encontrada');
      setTerminal(termData.data);

      const logData = await logRes.json();
      if (logData.success) {
        const allLogs: TerminalActionLog[] = logData.data ?? [];
        setLogs(allLogs);
        setPendingLogs(allLogs.filter(l => l.result === 'pending_approval'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (logId: string) => {
    if (!confirm('¿Aprobar esta acción?')) return;
    try {
      setActionLoading(logId);
      const res = await fetch(`/api/admin/terminals/${id}/log?logId=${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al aprobar');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (logId: string) => {
    if (!confirm('¿Rechazar esta acción?')) return;
    try {
      setActionLoading(logId);
      const res = await fetch(`/api/admin/terminals/${id}/log?logId=${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuarantine = async () => {
    if (!terminal) return;
    if (!confirm('¿Cuarentenar esta terminal? El agente quedará bloqueado inmediatamente.')) return;
    try {
      const res = await fetch(`/api/admin/terminals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'quarantined' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cuarentenar');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cuarentenar');
    }
  };

  const handleRevoke = async () => {
    if (!terminal) return;
    if (!confirm('¿Revocar y reactivar? El token actual quedará inválido y se generará un nuevo pairing code.')) return;
    try {
      const res = await fetch(`/api/admin/terminals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al revocar');
      setPairingCode(data.data.pairing_code ?? null);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al revocar');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="text-center py-16 text-muted-foreground">Cargando terminal...</div>
      </div>
    );
  }

  if (error || !terminal) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <Link href="/terminales">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="text-destructive">{error ?? 'Terminal no encontrada'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/terminales">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{terminal.nombre}</h1>
              <TerminalStatusBadge status={terminal.status} />
            </div>
            {terminal.hostname && (
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{terminal.hostname}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevoke}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Revocar y reactivar
          </Button>
          {terminal.status !== 'quarantined' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleQuarantine}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Cuarentenar
            </Button>
          )}
        </div>
      </div>

      {/* Pairing code after revoke */}
      {pairingCode && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium">Nuevo pairing code generado:</p>
            <code className="text-xl font-mono font-bold tracking-widest block text-center py-3 bg-background rounded-md border">
              {pairingCode}
            </code>
            <p className="text-xs text-muted-foreground">
              Válido 24 horas. El empleado ejecuta:{' '}
              <code className="bg-muted px-1 rounded">
                don-candido-agent pair --code {pairingCode} --org [dominio]
              </code>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Sistema operativo" value={terminal.os?.toUpperCase() ?? '—'} />
            <InfoRow label="Versión agente" value={terminal.agent_version || '—'} />
            <InfoRow label="Empleado (Personnel ID)" value={terminal.personnel_id} />
            <InfoRow label="Departamento" value={terminal.departamento_nombre} />
            <InfoRow label="Puesto" value={terminal.puesto_nombre} />
            {terminal.ip_local && <InfoRow label="IP local" value={terminal.ip_local} mono />}
            {terminal.mac_address && <InfoRow label="MAC" value={terminal.mac_address} mono />}
            {terminal.activated_at && (
              <InfoRow
                label="Activada el"
                value={format(terminal.activated_at.toDate(), "d 'de' MMMM yyyy", { locale: es })}
              />
            )}
            {terminal.pairing_code && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Pairing code vigente</p>
                <code className="font-mono font-bold text-base tracking-widest">
                  {terminal.pairing_code}
                </code>
                {terminal.pairing_expires_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Expira: {format(terminal.pairing_expires_at.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Effective policy section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Política efectiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {effectivePolicy ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tools permitidas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {effectivePolicy.allowed_tools.map(tool => (
                      <Badge key={tool} variant="success" className="font-mono text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
                {effectivePolicy.require_approval_for.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Requieren aprobación</p>
                    <div className="flex flex-wrap gap-1.5">
                      {effectivePolicy.require_approval_for.map(tool => (
                        <Badge key={tool} variant="secondary" className="font-mono text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  La política efectiva se resuelve combinando las reglas de Departamento → Puesto → Terminal (mayor prioridad gana).
                </p>
                <Link href="/terminales/politicas">
                  <Button variant="outline" size="sm" className="mt-2">
                    Gestionar políticas
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      {pendingLogs.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Aprobaciones pendientes
              <Badge variant="secondary">{pendingLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TerminalActionLogTable
              logs={pendingLogs}
              onApprove={handleApprove}
              onReject={handleReject}
              actionLoading={actionLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <TerminalActionLogTable logs={logs.slice(0, 20)} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
