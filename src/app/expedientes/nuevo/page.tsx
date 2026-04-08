'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type CanalIngreso = 'presencial' | 'whatsapp' | 'web' | 'telefono' | 'email';
type PrioridadExpediente = 'baja' | 'media' | 'alta' | 'urgente';

type CiudadanoOption = {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  dni?: string;
};

type FormState = {
  tipo: string;
  titulo: string;
  descripcion: string;
  ciudadano_id: string;
  ciudadano_nombre: string;
  ciudadano_query: string;
  canal_ingreso: CanalIngreso;
  prioridad: PrioridadExpediente;
  area_responsable_nombre: string;
  sla_horas: string;
};

const CANAL_OPTIONS: Array<{ value: CanalIngreso; label: string }> = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'telefono', label: 'Telefono' },
  { value: 'email', label: 'Email' },
];

const PRIORIDAD_OPTIONS: Array<{
  value: PrioridadExpediente;
  label: string;
}> = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

function createInitialForm(): FormState {
  return {
    tipo: '',
    titulo: '',
    descripcion: '',
    ciudadano_id: '',
    ciudadano_nombre: '',
    ciudadano_query: '',
    canal_ingreso: 'web',
    prioridad: 'media',
    area_responsable_nombre: '',
    sla_horas: '',
  };
}

function slugifyArea(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NuevoExpedientePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const orgId = user?.organization_id;

  const [form, setForm] = useState<FormState>(createInitialForm());
  const [ciudadanos, setCiudadanos] = useState<CiudadanoOption[]>([]);
  const [loadingCiudadanos, setLoadingCiudadanos] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCiudadanos = useMemo(() => {
    const query = form.ciudadano_query.trim().toLowerCase();
    if (!query) return ciudadanos.slice(0, 8);

    return ciudadanos
      .filter(ciudadano =>
        [
          ciudadano.nombre,
          ciudadano.apellido,
          ciudadano.email,
          ciudadano.telefono,
          ciudadano.dni,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 8);
  }, [ciudadanos, form.ciudadano_query]);

  useEffect(() => {
    async function loadCiudadanos() {
      if (!orgId) {
        setCiudadanos([]);
        setLoadingCiudadanos(false);
        return;
      }

      try {
        setLoadingCiudadanos(true);
        const response = await fetch('/api/ciudadanos', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'No se pudieron cargar los ciudadanos');
        }
        setCiudadanos(Array.isArray(json) ? json : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los ciudadanos');
      } finally {
        setLoadingCiudadanos(false);
      }
    }

    if (!authLoading) {
      void loadCiudadanos();
    }
  }, [authLoading, orgId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function selectCiudadano(ciudadano: CiudadanoOption) {
    setForm(prev => ({
      ...prev,
      ciudadano_id: ciudadano.id,
      ciudadano_nombre: `${ciudadano.nombre} ${ciudadano.apellido}`.trim(),
      ciudadano_query: `${ciudadano.nombre} ${ciudadano.apellido}`.trim(),
    }));
    setShowSuggestions(false);
  }

  function clearCiudadano() {
    setForm(prev => ({
      ...prev,
      ciudadano_id: '',
      ciudadano_nombre: '',
      ciudadano_query: '',
    }));
    setShowSuggestions(false);
  }

  async function handleSubmit() {
    if (!form.tipo.trim() || !form.titulo.trim() || !form.descripcion.trim()) {
      setError('Completa tipo, titulo y descripcion.');
      return;
    }

    try {
      setSaving(true);
      const areaName = form.area_responsable_nombre.trim();
      const response = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo.trim(),
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          ciudadano_id: form.ciudadano_id || undefined,
          ciudadano_nombre: form.ciudadano_nombre || undefined,
          canal_ingreso: form.canal_ingreso,
          prioridad: form.prioridad,
          area_responsable_nombre: areaName || undefined,
          area_responsable_id: areaName ? slugifyArea(areaName) : undefined,
          sla_horas: form.sla_horas ? Number(form.sla_horas) : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear el expediente');
      }

      toast({
        title: 'Expediente creado',
        description: `${json.data.numero} fue registrado correctamente.`,
      });
      router.push(`/expedientes/${json.data.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear el expediente';
      setError(message);
      toast({
        title: 'Error al crear expediente',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link href="/expedientes" className="inline-flex items-center text-sm font-medium text-sky-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a expedientes
        </Link>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-3xl text-slate-900">Nuevo expediente</CardTitle>
            <p className="text-sm text-slate-600">
              Registra un expediente y lo deja listo para seguimiento en lista y kanban.
            </p>
          </CardHeader>
        </Card>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!orgId && !authLoading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay una organizacion activa en la sesion.
          </div>
        )}

        <Card className="border-slate-200">
          <CardContent className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
              <Input
                value={form.tipo}
                onChange={event => updateField('tipo', event.target.value)}
                placeholder="Ej. reclamo urbano, habilitacion, licencia"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Prioridad</label>
              <Select value={form.prioridad} onValueChange={value => updateField('prioridad', value as PrioridadExpediente)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDAD_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Titulo</label>
              <Input
                value={form.titulo}
                onChange={event => updateField('titulo', event.target.value)}
                placeholder="Resumen corto del expediente"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Descripcion</label>
              <Textarea
                value={form.descripcion}
                onChange={event => updateField('descripcion', event.target.value)}
                placeholder="Detalle del problema, solicitud o tramite"
                className="min-h-[140px]"
              />
            </div>

            <div className="relative md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Ciudadano</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={form.ciudadano_query}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={event => {
                    updateField('ciudadano_query', event.target.value);
                    if (form.ciudadano_id) {
                      updateField('ciudadano_id', '');
                      updateField('ciudadano_nombre', '');
                    }
                    setShowSuggestions(true);
                  }}
                  placeholder="Buscar por nombre, DNI, email o telefono"
                  className="pl-9 pr-10"
                />
                {form.ciudadano_id && (
                  <button
                    type="button"
                    onClick={clearCiudadano}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                    aria-label="Limpiar ciudadano"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showSuggestions && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {loadingCiudadanos ? (
                    <div className="px-4 py-3 text-sm text-slate-500">Cargando ciudadanos...</div>
                  ) : filteredCiudadanos.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No hay coincidencias.</div>
                  ) : (
                    filteredCiudadanos.map(ciudadano => (
                      <button
                        key={ciudadano.id}
                        type="button"
                        onClick={() => selectCiudadano(ciudadano)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50',
                          form.ciudadano_id === ciudadano.id && 'bg-sky-50'
                        )}
                      >
                        <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">
                            {ciudadano.nombre} {ciudadano.apellido}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {[ciudadano.dni, ciudadano.email, ciudadano.telefono]
                              .filter(Boolean)
                              .join(' | ') || 'Sin datos extra'}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Canal</label>
              <Select value={form.canal_ingreso} onValueChange={value => updateField('canal_ingreso', value as CanalIngreso)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona canal" />
                </SelectTrigger>
                <SelectContent>
                  {CANAL_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Area responsable</label>
              <Input
                value={form.area_responsable_nombre}
                onChange={event => updateField('area_responsable_nombre', event.target.value)}
                placeholder="Ej. Obras publicas, Habilitaciones"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">SLA horas</label>
              <Input
                type="number"
                min="1"
                value={form.sla_horas}
                onChange={event => updateField('sla_horas', event.target.value)}
                placeholder="Ej. 48"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/expedientes">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={() => void handleSubmit()} disabled={saving || !orgId}>
            {saving ? 'Guardando...' : 'Crear expediente'}
          </Button>
        </div>
      </div>
    </div>
  );
}
