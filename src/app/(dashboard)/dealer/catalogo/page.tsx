'use client';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import type {
  ProductoCategoria,
  ProductoDealer,
} from '@/types/dealer-catalogo';
import { Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type FilterActivo = 'all' | 'true' | 'false';

type FormState = {
  nombre: string;
  categoria: ProductoCategoria;
  marca: string;
  modelo: string;
  descripcion: string;
  precio_contado: string;
  precio_lista: string;
  destacado: boolean;
  activo: boolean;
  imagenUrl: string;
};

type FormMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

const CATEGORIAS: Array<{ value: ProductoCategoria; label: string }> = [
  { value: 'maquinaria', label: 'Maquinaria' },
  { value: 'implemento', label: 'Implemento' },
  { value: 'repuesto', label: 'Repuesto' },
  { value: 'otro', label: 'Otro' },
];

const emptyForm = (): FormState => ({
  nombre: '',
  categoria: 'maquinaria',
  marca: '',
  modelo: '',
  descripcion: '',
  precio_contado: '',
  precio_lista: '',
  destacado: false,
  activo: true,
  imagenUrl: '',
});

function toFormState(producto: ProductoDealer): FormState {
  return {
    nombre: producto.nombre ?? '',
    categoria: producto.categoria,
    marca: producto.marca ?? '',
    modelo: producto.modelo ?? '',
    descripcion: producto.descripcion ?? '',
    precio_contado:
      producto.precio_contado != null ? String(producto.precio_contado) : '',
    precio_lista:
      producto.precio_lista != null ? String(producto.precio_lista) : '',
    destacado: producto.destacado ?? false,
    activo: producto.activo ?? true,
    imagenUrl: producto.imagenes[0] ?? '',
  };
}

function currency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DealerCatalogoPage() {
  const [productos, setProductos] = useState<ProductoDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedActivo, setSelectedActivo] = useState<FilterActivo>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formMessage, setFormMessage] = useState<FormMessage>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const selectedProducto = useMemo(
    () => productos.find(producto => producto.id === selectedId) ?? null,
    [productos, selectedId]
  );

  const listProductos = async (activo: 'true' | 'false') => {
    const params = new URLSearchParams();
    params.set('activo', activo);
    if (selectedCategoria !== 'all') {
      params.set('categoria', selectedCategoria);
    }

    const response = await fetch(`/api/dealer/productos?${params.toString()}`, {
      cache: 'no-store',
    });
    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || 'No se pudieron obtener los productos');
    }

    return (json.data || []) as ProductoDealer[];
  };

  const loadProductos = async () => {
    try {
      setLoading(true);
      const batches =
        selectedActivo === 'all'
          ? await Promise.all([listProductos('true'), listProductos('false')])
          : [await listProductos(selectedActivo)];

      const merged = batches
        .flat()
        .reduce<ProductoDealer[]>((acc, producto) => {
          if (acc.some(item => item.id === producto.id)) return acc;
          acc.push(producto);
          return acc;
        }, [])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'));

      setProductos(merged);
      setError(null);

      if (selectedId && !merged.some(item => item.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar productos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductoDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const response = await fetch(`/api/dealer/productos/${id}`, {
        cache: 'no-store',
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo obtener el detalle');
      }

      const detail = json.data as ProductoDealer;
      setProductos(prev =>
        prev.map(item => (item.id === detail.id ? detail : item))
      );
      setForm(toFormState(detail));
      setFormMessage(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo obtener el detalle';
      setFormMessage({ type: 'error', text: message });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadProductos();
  }, [selectedCategoria, selectedActivo]);

  useEffect(() => {
    if (isCreating) {
      setForm(emptyForm());
      return;
    }

    if (selectedId) {
      void loadProductoDetail(selectedId);
      return;
    }

    setForm(emptyForm());
    setFormMessage(null);
  }, [selectedId, isCreating]);

  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      marca: form.marca.trim() || undefined,
      modelo: form.modelo.trim() || undefined,
      descripcion: form.descripcion.trim() || undefined,
      precio_contado: form.precio_contado.trim() || undefined,
      precio_lista: form.precio_lista.trim() || undefined,
      destacado: form.destacado,
      activo: form.activo,
      imagenes: form.imagenUrl.trim() ? [form.imagenUrl.trim()] : [],
    };

    return payload;
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setIsCreating(true);
    setForm(emptyForm());
    setFormMessage(null);
  };

  const handleSelectProducto = (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    setFormMessage(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormMessage({
        type: 'error',
        text: 'El nombre es obligatorio.',
      });
      return;
    }

    try {
      setSaving(true);
      const isEditing = !isCreating && !!selectedId;
      const endpoint = isEditing
        ? `/api/dealer/productos/${selectedId}`
        : '/api/dealer/productos';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el producto');
      }

      const saved = json.data as ProductoDealer;

      setProductos(prev => {
        const exists = prev.some(item => item.id === saved.id);
        const next = exists
          ? prev.map(item => (item.id === saved.id ? saved : item))
          : [saved, ...prev];
        return next.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'));
      });

      setSelectedId(saved.id);
      setIsCreating(false);
      setForm(toFormState(saved));
      setFormMessage({
        type: 'success',
        text: isEditing
          ? 'Producto actualizado correctamente.'
          : 'Producto creado correctamente.',
      });
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el producto';
      setFormMessage({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async () => {
    if (!selectedId || isCreating) return;

    const nextActivo = !form.activo;

    try {
      setSaving(true);
      const response = await fetch(`/api/dealer/productos/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nextActivo }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo actualizar el estado');
      }

      const updated = json.data as ProductoDealer;
      setProductos(prev =>
        prev.map(item => (item.id === updated.id ? updated : item))
      );
      setForm(toFormState(updated));
      setFormMessage({
        type: 'success',
        text: updated.activo
          ? 'Producto activado correctamente.'
          : 'Producto desactivado correctamente.',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el estado';
      setFormMessage({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/dealer/productos/${selectedId}`, {
        method: 'DELETE',
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo eliminar el producto');
      }

      setProductos(prev => prev.filter(item => item.id !== selectedId));
      setSelectedId(null);
      setIsCreating(false);
      setForm(emptyForm());
      setFormMessage({
        type: 'success',
        text: 'Producto eliminado correctamente.',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el producto';
      setFormMessage({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
                Dealer
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Catalogo de productos
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Gestiona el catalogo comercial de Agro Biciufa desde un unico
                panel interno, con alta, edicion y baja logica de productos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-48">
                <Select
                  value={selectedCategoria}
                  onValueChange={setSelectedCategoria}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorias</SelectItem>
                    {CATEGORIAS.map(categoria => (
                      <SelectItem key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={selectedActivo}
                  onValueChange={value =>
                    setSelectedActivo(value as FilterActivo)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={() => void loadProductos()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>

              <Button
                onClick={handleCreateNew}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4 text-sm text-slate-500">
              {loading
                ? 'Cargando productos...'
                : `${productos.length} productos`}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Marca / Modelo</th>
                    <th className="px-4 py-3">Precio contado</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productos.map(producto => (
                    <tr
                      key={producto.id}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        producto.id === selectedId && !isCreating
                          ? 'bg-emerald-50/70'
                          : 'bg-white'
                      }`}
                      onClick={() => handleSelectProducto(producto.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {producto.nombre}
                        </div>
                        <div className="text-xs text-slate-500">
                          {producto.destacado
                            ? 'Destacado'
                            : 'Catalogo general'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
                          {producto.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {[producto.marca, producto.modelo]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {currency(producto.precio_contado)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            producto.activo
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && productos.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        No hay productos para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {!isCreating && !selectedProducto ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
                Selecciona un producto o crea uno nuevo para editar el catalogo.
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {isCreating ? 'Nuevo producto' : 'Detalle'}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {isCreating
                      ? 'Alta de producto'
                      : form.nombre || 'Producto'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {isCreating
                      ? 'Carga manual del catalogo dealer.'
                      : loadingDetail
                        ? 'Cargando detalle del producto...'
                        : `Edita precios, descripcion y estado comercial.`}
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={form.nombre}
                      onChange={event =>
                        updateForm('nombre', event.target.value)
                      }
                      placeholder="Ej. Sembradora Agrometal"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={value =>
                        updateForm('categoria', value as ProductoCategoria)
                      }
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(categoria => (
                          <SelectItem
                            key={categoria.value}
                            value={categoria.value}
                          >
                            {categoria.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        value={form.marca}
                        onChange={event =>
                          updateForm('marca', event.target.value)
                        }
                        placeholder="Marca"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        value={form.modelo}
                        onChange={event =>
                          updateForm('modelo', event.target.value)
                        }
                        placeholder="Modelo"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripcion</Label>
                    <Textarea
                      id="descripcion"
                      value={form.descripcion}
                      onChange={event =>
                        updateForm('descripcion', event.target.value)
                      }
                      placeholder="Detalle comercial o tecnico del producto"
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="precio_contado">Precio contado</Label>
                      <Input
                        id="precio_contado"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.precio_contado}
                        onChange={event =>
                          updateForm('precio_contado', event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="precio_lista">Precio lista</Label>
                      <Input
                        id="precio_lista"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.precio_lista}
                        onChange={event =>
                          updateForm('precio_lista', event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="imagen_url">Imagen (URL)</Label>
                    <Input
                      id="imagen_url"
                      type="url"
                      value={form.imagenUrl}
                      onChange={event =>
                        updateForm('imagenUrl', event.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Destacado
                        </p>
                        <p className="text-xs text-slate-500">
                          Prioriza este producto en el catalogo publico.
                        </p>
                      </div>
                      <Switch
                        checked={form.destacado}
                        onCheckedChange={checked =>
                          updateForm('destacado', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Activo
                        </p>
                        <p className="text-xs text-slate-500">
                          Controla si el producto sigue visible para operar.
                        </p>
                      </div>
                      <Switch
                        checked={form.activo}
                        onCheckedChange={checked =>
                          updateForm('activo', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={saving || loadingDetail}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Guardar
                  </Button>

                  {!isCreating && selectedId && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => void handleToggleActivo()}
                        disabled={saving || loadingDetail}
                      >
                        {form.activo ? 'Desactivar' : 'Activar'}
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => void handleDelete()}
                        disabled={saving || loadingDetail}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>

                {formMessage && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      formMessage.type === 'success'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {formMessage.text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
