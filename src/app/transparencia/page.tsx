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
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/api/authFetch';
import {
  TRANSPARENCIA_CATEGORIAS,
  type TransparenciaCategoria,
  type TransparenciaRegistroSerialized,
} from '@/types/gov/transparencia';
import {
  AlertTriangle,
  CircleDollarSign,
  FileText,
  Gauge,
  Gavel,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

type TransparenciaResponse = {
  success: boolean;
  data?: TransparenciaRegistroSerialized[];
  error?: string;
  meta?: {
    scope: 'public' | 'internal';
    resumen: Record<TransparenciaCategoria, number>;
  };
};

const CATEGORY_LABELS: Record<TransparenciaCategoria, string> = {
  presupuesto: 'Presupuesto',
  compras: 'Compras',
  actos_administrativos: 'Actos administrativos',
  indicadores_gestion: 'Indicadores de gestion',
};

const CATEGORY_ICONS: Record<TransparenciaCategoria, typeof FileText> = {
  presupuesto: CircleDollarSign,
  compras: FileText,
  actos_administrativos: Gavel,
  indicadores_gestion: Gauge,
};

const initialForm = {
  categoria: 'presupuesto' as TransparenciaCategoria,
  titulo: '',
  resumen: '',
  periodo: new Date().getFullYear().toString(),
  fecha_publicacion: new Date().toISOString().slice(0, 10),
  area_responsable: '',
  monto: '',
  unidad: '',
  valor_actual: '',
  meta: '',
  url_documento: '',
  etiquetas: '',
  destacado: false,
};

export default function TransparenciaPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<'all' | TransparenciaCategoria>('all');
  const [items, setItems] = useState<TransparenciaRegistroSerialized[]>([]);
  const [summary, setSummary] = useState<Record<TransparenciaCategoria, number>>({
    presupuesto: 0,
    compras: 0,
    actos_administrativos: 0,
    indicadores_gestion: 0,
  });
  const deferredQuery = useDeferredValue(query);

  const loadItems = async () => {
    if (!user?.organization_id) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        organization_id: user.organization_id,
      });
      const response = await authFetch(`/api/transparencia?${params.toString()}`);
      const json = (await response.json()) as TransparenciaResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo cargar transparencia');
      }

      setItems(json.data);
      if (json.meta?.resumen) {
        setSummary(json.meta.resumen);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar transparencia'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadItems();
  }, [authLoading, user?.organization_id]);

  const filteredItems = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase('es');
    return items.filter(item => {
      const matchesCategory = categoria === 'all' || item.categoria === categoria;
      const matchesSearch =
        term.length === 0 ||
        [item.codigo, item.titulo, item.resumen, item.area_responsable, item.periodo]
          .filter((value): value is string => typeof value === 'string')
          .some(value => value.toLocaleLowerCase('es').includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [categoria, deferredQuery, items]);

  const destacados = useMemo(
    () => items.filter(item => item.destacado && item.publicado).length,
    [items]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.organization_id) {
      setError('No se encontro organizacion activa para publicar informacion.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        organization_id: user.organization_id,
        categoria: form.categoria,
        titulo: form.titulo,
        resumen: form.resumen,
        periodo: form.periodo,
        fecha_publicacion: form.fecha_publicacion,
        area_responsable: form.area_responsable,
        monto: form.monto ? Number(form.monto) : undefined,
        unidad: form.unidad || undefined,
        valor_actual: form.valor_actual ? Number(form.valor_actual) : undefined,
        meta: form.meta ? Number(form.meta) : undefined,
        url_documento: form.url_documento || undefined,
        etiquetas: form.etiquetas
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
        destacado: form.destacado,
        publicado: true,
        estado: 'publicado' as const,
        datos: {},
      };

      const response = await authFetch('/api/transparencia', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as TransparenciaResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el registro');
      }

      setForm(initialForm);
      setSuccessMessage('Registro publicado en el portal de transparencia.');
      await loadItems();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el registro'
      );
    } finally {
      setSaving(false);
    }
  };

  const [form, setForm] = useState(initialForm);

  if (!authLoading && !user?.organization_id) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <PageHeader
          title="Transparencia activa"
          description="Se requiere una organizacion activa para gestionar el portal."
          breadcrumbs={[{ label: 'Gobierno local' }, { label: 'Transparencia' }]}
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin contexto organizacional</AlertTitle>
          <AlertDescription>
            El usuario autenticado no tiene una organizacion asignada.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Transparencia activa"
        description="Carga interna de presupuesto, compras, actos administrativos e indicadores con salida publica por tenant."
        breadcrumbs={[{ label: 'Gobierno local' }, { label: 'Transparencia' }]}
        actions={
          <Button variant="outline" onClick={() => void loadItems()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registros publicados</CardDescription>
            <CardTitle className="text-3xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Destacados</CardDescription>
            <CardTitle className="text-3xl">{destacados}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compras + presupuesto</CardDescription>
            <CardTitle className="text-3xl">
              {summary.compras + summary.presupuesto}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actos + indicadores</CardDescription>
            <CardTitle className="text-3xl">
              {summary.actos_administrativos + summary.indicadores_gestion}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert>
          <Plus className="h-4 w-4" />
          <AlertTitle>Publicacion realizada</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva publicacion</CardTitle>
            <CardDescription>
              Carga un registro y publícalo en el portal ciudadano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select
                  value={form.categoria}
                  onValueChange={value =>
                    setForm(current => ({
                      ...current,
                      categoria: value as TransparenciaCategoria,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPARENCIA_CATEGORIAS.map(item => (
                      <SelectItem key={item} value={item}>
                        {CATEGORY_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Titulo</label>
                <Input
                  value={form.titulo}
                  onChange={event =>
                    setForm(current => ({ ...current, titulo: event.target.value }))
                  }
                  placeholder="Ejecucion presupuestaria febrero"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resumen</label>
                <Input
                  value={form.resumen}
                  onChange={event =>
                    setForm(current => ({ ...current, resumen: event.target.value }))
                  }
                  placeholder="Resumen ejecutivo para el portal"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodo</label>
                  <Input
                    value={form.periodo}
                    onChange={event =>
                      setForm(current => ({ ...current, periodo: event.target.value }))
                    }
                    placeholder="2026-Q1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <Input
                    type="date"
                    value={form.fecha_publicacion}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        fecha_publicacion: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Area responsable</label>
                <Input
                  value={form.area_responsable}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      area_responsable: event.target.value,
                    }))
                  }
                  placeholder="Secretaria de Hacienda"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.monto}
                    onChange={event =>
                      setForm(current => ({ ...current, monto: event.target.value }))
                    }
                    placeholder="1500000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unidad</label>
                  <Input
                    value={form.unidad}
                    onChange={event =>
                      setForm(current => ({ ...current, unidad: event.target.value }))
                    }
                    placeholder="ARS, %, expedientes"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor actual</label>
                  <Input
                    type="number"
                    value={form.valor_actual}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        valor_actual: event.target.value,
                      }))
                    }
                    placeholder="82"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meta</label>
                  <Input
                    type="number"
                    value={form.meta}
                    onChange={event =>
                      setForm(current => ({ ...current, meta: event.target.value }))
                    }
                    placeholder="90"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Documento</label>
                <Input
                  type="url"
                  value={form.url_documento}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      url_documento: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Etiquetas</label>
                <Input
                  value={form.etiquetas}
                  onChange={event =>
                    setForm(current => ({ ...current, etiquetas: event.target.value }))
                  }
                  placeholder="obra publica, trimestral, abierto"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.destacado}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      destacado: event.target.checked,
                    }))
                  }
                />
                Marcar como destacado del portal
              </label>

              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Publicar registro
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panel operativo</CardTitle>
            <CardDescription>
              Filtra y verifica lo que ya esta visible en el portal ciudadano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar por titulo, codigo o area"
              />
              <Select
                value={categoria}
                onValueChange={value =>
                  setCategoria(value as 'all' | TransparenciaCategoria)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorias</SelectItem>
                  {TRANSPARENCIA_CATEGORIAS.map(item => (
                    <SelectItem key={item} value={item}>
                      {CATEGORY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No hay registros para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredItems.map(item => {
                  const Icon = CATEGORY_ICONS[item.categoria];
                  return (
                    <Card key={item.id} className="border-slate-200">
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{item.codigo}</Badge>
                              <Badge variant="secondary">
                                {CATEGORY_LABELS[item.categoria]}
                              </Badge>
                              {item.destacado ? <Badge variant="success">Destacado</Badge> : null}
                            </div>
                            <CardTitle className="mt-3 text-lg">{item.titulo}</CardTitle>
                          </div>
                          <Icon className="h-5 w-5 text-slate-400" />
                        </div>
                        <CardDescription>{item.resumen}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-slate-700">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Periodo
                            </p>
                            <p className="mt-1 font-medium">{item.periodo}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Area
                            </p>
                            <p className="mt-1 font-medium">{item.area_responsable}</p>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Monto
                            </p>
                            <p className="mt-1">{item.monto ?? 'N/D'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Valor
                            </p>
                            <p className="mt-1">{item.valor_actual ?? 'N/D'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Meta
                            </p>
                            <p className="mt-1">{item.meta ?? 'N/D'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
