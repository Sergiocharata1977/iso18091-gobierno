'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TerminalTable } from '@/components/terminal/TerminalTable';
import type { Terminal } from '@/types/terminal';
import { Monitor, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TerminalesPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quarantineLoading, setQuarantineLoading] = useState<string | null>(null);

  // New terminal form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [personnelId, setPersonnelId] = useState('');
  const [creating, setCreating] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  useEffect(() => {
    loadTerminals();
  }, []);

  const loadTerminals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/terminals');
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cargar terminales');
      setTerminals(data.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleQuarantine = async (id: string) => {
    if (!confirm('¿Cuarentenar esta terminal? El agente quedará bloqueado inmediatamente.')) return;
    try {
      setQuarantineLoading(id);
      const res = await fetch(`/api/admin/terminals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'quarantined' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cuarentenar');
      await loadTerminals();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cuarentenar');
    } finally {
      setQuarantineLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!nombre.trim() || !personnelId.trim()) return;
    try {
      setCreating(true);
      const res = await fetch('/api/admin/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), personnel_id: personnelId.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al crear terminal');
      setPairingCode(data.data.pairing_code);
      await loadTerminals();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear terminal');
      setCreating(false);
    }
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setNombre('');
    setPersonnelId('');
    setPairingCode(null);
    setCreating(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Terminales</h1>
            <p className="text-sm text-muted-foreground">Control de equipos y agentes locales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTerminals} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={open => { if (!open) handleCloseCreate(); else setIsCreateOpen(true); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva terminal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {pairingCode ? 'Terminal creada — código de activación' : 'Nueva terminal'}
                </DialogTitle>
              </DialogHeader>

              {pairingCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Copia este código y dáselo al empleado para activar el agente en su máquina. Válido por 24 horas.
                  </p>
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <code className="text-2xl font-mono font-bold tracking-widest">
                      {pairingCode}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El empleado ejecuta:{' '}
                    <code className="bg-muted px-1 rounded">
                      don-candido-agent pair --code {pairingCode} --org [dominio]
                    </code>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre descriptivo</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Notebook Marketing - Ana López"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personnel_id">ID del empleado (Personnel)</Label>
                    <Input
                      id="personnel_id"
                      placeholder="ID en RRHH"
                      value={personnelId}
                      onChange={e => setPersonnelId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                {pairingCode ? (
                  <Button onClick={handleCloseCreate}>Cerrar</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCloseCreate}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !nombre.trim() || !personnelId.trim()}
                    >
                      {creating ? 'Creando...' : 'Crear terminal'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-muted-foreground">
            {loading
              ? 'Cargando...'
              : `${terminals.length} terminal${terminals.length !== 1 ? 'es' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive text-sm py-4">{error}</div>
          ) : loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Cargando terminales...
            </div>
          ) : (
            <TerminalTable
              terminals={terminals}
              onQuarantine={handleQuarantine}
              quarantineLoading={quarantineLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
