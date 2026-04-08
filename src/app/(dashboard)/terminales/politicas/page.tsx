'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TerminalPolicy } from '@/types/terminal-policy';
import type { ToolName } from '@/types/terminal';
import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TOOLS: ToolName[] = [
  'browser_navigate',
  'browser_screenshot',
  'browser_click',
  'browser_fill_form',
  'file_read',
  'file_write',
  'clipboard_read',
  'clipboard_write',
  'app_open',
  'don_candido_chat',
];

const TOOL_LABELS: Record<ToolName, string> = {
  browser_navigate: 'Navegar URL',
  browser_screenshot: 'Captura de pantalla',
  browser_click: 'Click en browser',
  browser_fill_form: 'Rellenar formulario',
  file_read: 'Leer archivos',
  file_write: 'Escribir archivos',
  clipboard_read: 'Leer portapapeles',
  clipboard_write: 'Escribir portapapeles',
  app_open: 'Abrir aplicación',
  don_candido_chat: 'Chat Don Cándido',
};

type ScopeType = 'departamento' | 'puesto' | 'terminal';

const SCOPE_LABELS: Record<ScopeType, string> = {
  departamento: 'Departamento',
  puesto: 'Puesto',
  terminal: 'Terminal',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScopeLabel(policy: TerminalPolicy): string {
  if (policy.terminal_id) return 'Terminal';
  if (policy.puesto_id) return 'Puesto';
  if (policy.departamento_id) return 'Departamento';
  return '—';
}

function getScopeId(policy: TerminalPolicy): string {
  return policy.terminal_id ?? policy.puesto_id ?? policy.departamento_id ?? '—';
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

interface PolicyFormState {
  nombre: string;
  scopeType: ScopeType;
  scopeId: string;
  prioridad: number;
  allowedTools: ToolName[];
  requireApprovalFor: ToolName[];
  enableHours: boolean;
  hoursFrom: string;
  hoursTo: string;
  activo: boolean;
}

const defaultForm = (): PolicyFormState => ({
  nombre: '',
  scopeType: 'departamento',
  scopeId: '',
  prioridad: 1,
  allowedTools: [],
  requireApprovalFor: [],
  enableHours: false,
  hoursFrom: '09:00',
  hoursTo: '18:00',
  activo: true,
});

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PoliticasPage() {
  const [policies, setPolicies] = useState<TerminalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(defaultForm());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/terminal-policies');
      const data: { success: boolean; data?: TerminalPolicy[]; error?: string } = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cargar políticas');
      setPolicies(data.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTool = (tool: ToolName) => {
    setForm(prev => {
      const isAllowed = prev.allowedTools.includes(tool);
      const newAllowed = isAllowed
        ? prev.allowedTools.filter(t => t !== tool)
        : [...prev.allowedTools, tool];
      // Remove from require_approval_for if no longer in allowed_tools
      const newApproval = prev.requireApprovalFor.filter(t => newAllowed.includes(t));
      return { ...prev, allowedTools: newAllowed, requireApprovalFor: newApproval };
    });
  };

  const handleToggleApproval = (tool: ToolName) => {
    setForm(prev => {
      const isRequired = prev.requireApprovalFor.includes(tool);
      const newApproval = isRequired
        ? prev.requireApprovalFor.filter(t => t !== tool)
        : [...prev.requireApprovalFor, tool];
      return { ...prev, requireApprovalFor: newApproval };
    });
  };

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.scopeId.trim()) return;

    const body: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      prioridad: form.prioridad,
      allowed_tools: form.allowedTools,
      require_approval_for: form.requireApprovalFor,
      activo: form.activo,
    };

    if (form.scopeType === 'departamento') body.departamento_id = form.scopeId.trim();
    else if (form.scopeType === 'puesto') body.puesto_id = form.scopeId.trim();
    else body.terminal_id = form.scopeId.trim();

    if (form.enableHours) {
      body.allowed_hours = { from: form.hoursFrom, to: form.hoursTo };
    }

    try {
      setCreating(true);
      const res = await fetch('/api/admin/terminal-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: { success: boolean; data?: TerminalPolicy; error?: string } = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al crear política');
      await loadPolicies();
      handleCloseCreate();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear política');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setForm(defaultForm());
    setCreating(false);
  };

  const isFormValid = form.nombre.trim().length > 0 && form.scopeId.trim().length > 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Políticas de Terminales</h1>
            <p className="text-sm text-muted-foreground">
              Controla qué herramientas pueden usar los agentes según departamento, puesto o terminal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPolicies} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog
            open={isCreateOpen}
            onOpenChange={open => {
              if (!open) handleCloseCreate();
              else setIsCreateOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva política
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva política de terminal</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="pol-nombre">Nombre</Label>
                  <Input
                    id="pol-nombre"
                    placeholder="Ej: Política base Ventas"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>

                {/* Scope type */}
                <div className="space-y-2">
                  <Label htmlFor="pol-scope-type">Alcance</Label>
                  <Select
                    value={form.scopeType}
                    onValueChange={v =>
                      setForm(prev => ({ ...prev, scopeType: v as ScopeType, scopeId: '' }))
                    }
                  >
                    <SelectTrigger id="pol-scope-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="departamento">Departamento</SelectItem>
                      <SelectItem value="puesto">Puesto</SelectItem>
                      <SelectItem value="terminal">Terminal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope ID */}
                <div className="space-y-2">
                  <Label htmlFor="pol-scope-id">
                    {SCOPE_LABELS[form.scopeType]} ID
                  </Label>
                  <Input
                    id="pol-scope-id"
                    placeholder={`ID de ${SCOPE_LABELS[form.scopeType].toLowerCase()}`}
                    value={form.scopeId}
                    onChange={e => setForm(prev => ({ ...prev, scopeId: e.target.value }))}
                  />
                </div>

                {/* Prioridad */}
                <div className="space-y-2">
                  <Label htmlFor="pol-prioridad">Prioridad</Label>
                  <Input
                    id="pol-prioridad"
                    type="number"
                    min={1}
                    max={100}
                    value={form.prioridad}
                    onChange={e =>
                      setForm(prev => ({ ...prev, prioridad: parseInt(e.target.value, 10) || 1 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Mayor número = mayor prioridad. Terminal &gt; Puesto &gt; Departamento.
                  </p>
                </div>

                {/* Tools permitidas */}
                <div className="space-y-2">
                  <Label>Herramientas permitidas</Label>
                  <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
                    {ALL_TOOLS.map(tool => (
                      <div key={tool} className="flex items-center gap-2">
                        <Checkbox
                          id={`allow-${tool}`}
                          checked={form.allowedTools.includes(tool)}
                          onCheckedChange={() => handleToggleTool(tool)}
                        />
                        <Label htmlFor={`allow-${tool}`} className="font-normal cursor-pointer">
                          {TOOL_LABELS[tool]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools que requieren aprobación */}
                <div className="space-y-2">
                  <Label>Requieren aprobación</Label>
                  {form.allowedTools.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-md border p-3">
                      Selecciona al menos una herramienta permitida primero.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
                      {form.allowedTools.map(tool => (
                        <div key={tool} className="flex items-center gap-2">
                          <Checkbox
                            id={`approval-${tool}`}
                            checked={form.requireApprovalFor.includes(tool)}
                            onCheckedChange={() => handleToggleApproval(tool)}
                          />
                          <Label
                            htmlFor={`approval-${tool}`}
                            className="font-normal cursor-pointer"
                          >
                            {TOOL_LABELS[tool]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Horario */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pol-enable-hours"
                      checked={form.enableHours}
                      onCheckedChange={v =>
                        setForm(prev => ({ ...prev, enableHours: v === true }))
                      }
                    />
                    <Label htmlFor="pol-enable-hours" className="font-normal cursor-pointer">
                      Restringir horario de uso
                    </Label>
                  </div>
                  {form.enableHours && (
                    <div className="flex items-center gap-3 pl-6">
                      <div className="space-y-1">
                        <Label htmlFor="pol-hours-from" className="text-xs">
                          Desde
                        </Label>
                        <Input
                          id="pol-hours-from"
                          type="time"
                          value={form.hoursFrom}
                          onChange={e =>
                            setForm(prev => ({ ...prev, hoursFrom: e.target.value }))
                          }
                          className="w-32"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pol-hours-to" className="text-xs">
                          Hasta
                        </Label>
                        <Input
                          id="pol-hours-to"
                          type="time"
                          value={form.hoursTo}
                          onChange={e => setForm(prev => ({ ...prev, hoursTo: e.target.value }))}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Activo */}
                <div className="flex items-center gap-3">
                  <Switch
                    id="pol-activo"
                    checked={form.activo}
                    onCheckedChange={v => setForm(prev => ({ ...prev, activo: v }))}
                  />
                  <Label htmlFor="pol-activo" className="cursor-pointer">
                    Política activa
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreate} disabled={creating}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating || !isFormValid}>
                  {creating ? 'Guardando...' : 'Crear política'}
                </Button>
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
              : `${policies.length} política${policies.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive text-sm py-4">{error}</div>
          ) : loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Cargando políticas...
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay políticas configuradas. Crea la primera con el botón &quot;Nueva política&quot;.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>ID de alcance</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead className="text-center">Tools permitidas</TableHead>
                  <TableHead className="text-center">Requieren aprobación</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(policy => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getScopeLabel(policy)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {getScopeId(policy)}
                    </TableCell>
                    <TableCell className="text-center">{policy.prioridad}</TableCell>
                    <TableCell className="text-center">
                      <span
                        title={policy.allowed_tools.map(t => TOOL_LABELS[t]).join(', ')}
                        className="cursor-default"
                      >
                        {policy.allowed_tools.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        title={policy.require_approval_for.map(t => TOOL_LABELS[t]).join(', ')}
                        className="cursor-default"
                      >
                        {policy.require_approval_for.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {policy.activo ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
