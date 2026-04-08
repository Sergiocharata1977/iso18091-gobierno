'use client';

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
import { PageHeader } from '@/components/ui/PageHeader';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  Building2,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type EstructuraNode = {
  id: string;
  parentId: string | null;
  nombre: string;
  tipo: string;
  responsable: string | null;
  nivel: number;
  orden: number;
  descripcion: string | null;
};

type EstructuraResponse = {
  success: boolean;
  data?: {
    organigramaId: string | null;
    nombre: string;
    estado: string;
    updatedAt: string | null;
    nodes: EstructuraNode[];
  };
  error?: string;
};

type CreateAreaForm = {
  nombre: string;
  tipo: string;
  responsable: string;
  parentId: string;
  descripcion: string;
};

type TreeNode = EstructuraNode & {
  children: TreeNode[];
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  departamento: 'border-sky-200 bg-sky-50 text-sky-700',
  puesto: 'border-amber-200 bg-amber-50 text-amber-700',
  persona: 'border-violet-200 bg-violet-50 text-violet-700',
};

function getNodeLabelByType(tipo: string) {
  const normalized = tipo.toLowerCase();

  if (normalized === 'departamento') return 'Area';
  if (normalized === 'puesto') return 'Puesto';
  if (normalized === 'persona') return 'Persona';
  return tipo;
}

function buildTree(nodes: EstructuraNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) return;

    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(treeNode);
      return;
    }

    roots.push(treeNode);
  });

  const sortTree = (items: TreeNode[]) => {
    items.sort((a, b) => a.orden - b.orden);
    items.forEach(item => sortTree(item.children));
  };

  sortTree(roots);
  return roots;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap(node => [node, ...flattenTree(node.children)]);
}

function findTreeNode(nodes: TreeNode[], id: string | null): TreeNode | null {
  if (!id) return null;

  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findTreeNode(node.children, id);
    if (nested) return nested;
  }

  return null;
}

function TreeBranch({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: TreeNode[];
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {nodes.map(node => {
        const isSelected = selectedNodeId === node.id;

        return (
          <div key={node.id} className="relative pl-6">
            <span className="absolute left-2 top-0 h-full w-px bg-border" />
            <span className="absolute left-2 top-8 h-px w-4 bg-border" />

            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                'w-full rounded-2xl border p-4 text-left shadow-sm transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : node.parentId
                    ? 'border-border bg-card hover:border-primary/30'
                    : 'border-teal-200 bg-gradient-to-br from-teal-50 to-background hover:border-teal-300'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {node.nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {node.descripcion ||
                      'Unidad registrada en la estructura municipal.'}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'border',
                    TYPE_BADGE_CLASS[node.tipo] ||
                      'border-slate-200 bg-slate-50 text-slate-700'
                  )}
                >
                  {getNodeLabelByType(node.tipo)}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {node.responsable || 'Responsable pendiente'}
                </span>
                <Badge variant="outline">Nivel {node.nivel}</Badge>
                {node.children.length > 0 ? (
                  <Badge variant="outline">{node.children.length} dependencias</Badge>
                ) : null}
              </div>
            </button>

            {node.children.length > 0 ? (
              <div className="mt-4">
                <TreeBranch
                  nodes={node.children}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function MunicipioEstructuraPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<EstructuraResponse['data'] | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAreaForm>({
    nombre: '',
    tipo: 'departamento',
    responsable: '',
    parentId: '',
    descripcion: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/municipio/estructura', {
        cache: 'no-store',
      });
      const json = (await response.json()) as EstructuraResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo obtener la estructura');
      }

      setPayload(json.data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo obtener la estructura'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const nodes = useMemo(() => payload?.nodes ?? [], [payload]);

  const nodesByLevel = useMemo(() => {
    return nodes.reduce<Record<number, EstructuraNode[]>>((acc, node) => {
      if (!acc[node.nivel]) {
        acc[node.nivel] = [];
      }

      acc[node.nivel].push(node);
      acc[node.nivel].sort((a, b) => a.orden - b.orden);
      return acc;
    }, {});
  }, [nodes]);

  const levelEntries = useMemo(
    () =>
      Object.entries(nodesByLevel)
        .map(([nivel, items]) => ({ nivel: Number(nivel), items }))
        .sort((a, b) => a.nivel - b.nivel),
    [nodesByLevel]
  );

  const parentOptions = useMemo(
    () =>
      nodes
        .slice()
        .sort((a, b) => {
          if (a.nivel !== b.nivel) {
            return a.nivel - b.nivel;
          }

          return a.nombre.localeCompare(b.nombre, 'es');
        })
        .map(node => ({
          value: node.id,
          label: `${'· '.repeat(node.nivel)}${node.nombre}`,
        })),
    [nodes]
  );

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const selectedNode = useMemo(
    () => findTreeNode(tree, selectedNodeId) || flattenTree(tree)[0] || null,
    [selectedNodeId, tree]
  );

  useEffect(() => {
    if (!selectedNodeId && nodes[0]) {
      setSelectedNodeId(nodes[0].id);
      return;
    }

    if (selectedNodeId && !nodes.some(node => node.id === selectedNodeId)) {
      setSelectedNodeId(nodes[0]?.id || null);
    }
  }, [nodes, selectedNodeId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const response = await fetch('/api/municipio/estructura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          responsable: form.responsable,
          parentId: form.parentId || null,
          descripcion: form.descripcion,
        }),
      });

      const json = (await response.json()) as EstructuraResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el area');
      }

      toast({
        title: 'Area agregada',
        description: 'La estructura municipal fue actualizada.',
      });

      setForm({
        nombre: '',
        tipo: 'departamento',
        responsable: '',
        parentId: '',
        descripcion: '',
      });

      await loadData();
    } catch (submitError) {
      toast({
        title: 'Error',
        description:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo guardar el area',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Estructura municipal"
        description="Organigrama operativo por niveles, con responsables y alta rapida de areas."
        breadcrumbs={[{ label: 'Municipio' }, { label: 'Estructura' }]}
        actions={
          <Button
            variant="outline"
            onClick={() => void loadData()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Niveles</CardDescription>
            <CardTitle className="text-3xl">{levelEntries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Areas registradas</CardDescription>
            <CardTitle className="text-3xl">{nodes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ultima actualizacion</CardDescription>
            <CardTitle className="text-base">
              {payload?.updatedAt ? formatDate(new Date(payload.updatedAt)) : 'Sin datos'}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-teal-600" />
                  {payload?.nombre || 'Estructura municipal'}
                </CardTitle>
                <CardDescription>
                  Arbol visual por niveles de secretarias, areas y responsables.
                </CardDescription>
              </div>
              <Badge variant="outline">{payload?.estado || 'sin_datos'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando estructura...
              </div>
            ) : nodes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  No hay areas cargadas.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usa el formulario para crear la primera secretaria o area.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">Arbol interactivo</Badge>
                    <p className="text-sm text-muted-foreground">
                      Selecciona un nodo para revisar responsable, nivel y
                      dependencias.
                    </p>
                  </div>
                </div>

                {selectedNode ? (
                  <Card className="border-primary/20 bg-primary/5 shadow-none">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Unidad seleccionada
                        </p>
                        <p className="mt-1 font-semibold">{selectedNode.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Responsable
                        </p>
                        <p className="mt-1">
                          {selectedNode.responsable || 'Pendiente'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Dependencias directas
                        </p>
                        <p className="mt-1">{selectedNode.children.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {levelEntries.map(level => (
                  <div key={level.nivel} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="border border-teal-200 bg-teal-50 text-teal-700">
                        Nivel {level.nivel}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {level.items.length} unidades en este tramo del organigrama.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {level.items.map(node => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={cn(
                            'rounded-2xl border p-4 text-left shadow-sm transition-colors',
                            selectedNodeId === node.id
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border bg-card hover:border-primary/30'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">
                                {node.nombre}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {node.responsable || 'Responsable pendiente'}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {getNodeLabelByType(node.tipo)}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className="border border-teal-200 bg-teal-50 text-teal-700">
                      Vista jerarquica
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Relaciones de dependencia entre secretarias, areas y
                      responsables.
                    </p>
                  </div>
                  <TreeBranch
                    nodes={tree}
                    selectedNodeId={selectedNodeId}
                    onSelect={setSelectedNodeId}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Agregar area
            </CardTitle>
            <CardDescription>
              Alta simple para expandir el organigrama vigente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={event =>
                    setForm(current => ({ ...current, nombre: event.target.value }))
                  }
                  placeholder="Secretaria de Gobierno"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  value={form.tipo}
                  onChange={event =>
                    setForm(current => ({ ...current, tipo: event.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="departamento">Area / Secretaria</option>
                  <option value="puesto">Puesto</option>
                  <option value="persona">Persona</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Depende de</Label>
                <select
                  id="parentId"
                  value={form.parentId}
                  onChange={event =>
                    setForm(current => ({ ...current, parentId: event.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sin dependencia superior</option>
                  {parentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={form.responsable}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      responsable: event.target.value,
                    }))
                  }
                  placeholder="Nombre y apellido"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      descripcion: event.target.value,
                    }))
                  }
                  placeholder="Funciones principales o alcance del area"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar area
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
