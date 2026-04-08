'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CapabilityTier,
  PlatformCapability,
  PlatformCapabilityStatus,
} from '@/types/plugins';

type FormData = {
  capability_id: string;
  name: string;
  version: string;
  tier: CapabilityTier;
  status: PlatformCapabilityStatus;
  icon: string;
  color: string;
  description: string;
  long_description: string;
  target_audience: string;
  how_it_works: string;
  features: string[];
  benefits: string[];
  system_ids: string[];
  tags_raw: string;
  dependencies_raw: string;
  datasets_raw: string;
};

type GetCapabilityResponse = {
  id: string;
  name: string;
  version: string;
  tier: CapabilityTier;
  status: PlatformCapabilityStatus;
  icon: string;
  color?: string;
  description: string;
  long_description?: string;
  target_audience?: string;
  how_it_works?: string;
  features?: string[];
  benefits?: string[];
  system_ids: string[];
  tags?: string[];
  dependencies?: string[];
  manifest?: PlatformCapability['manifest'];
};

type CapabilityResponse =
  | { success: true; data: GetCapabilityResponse }
  | { success?: false; error?: string; message?: string };

type ApiPayload = {
  capability_id?: string;
  name: string;
  version: string;
  scope: PlatformCapability['scope'];
  tier: CapabilityTier;
  status: PlatformCapabilityStatus;
  icon: string;
  color: string;
  description: string;
  long_description: string;
  target_audience: string;
  how_it_works: string;
  features: string[];
  benefits: string[];
  system_ids: string[];
  tags: string[];
  dependencies: string[];
  manifest: PlatformCapability['manifest'];
};

const KNOWN_SYSTEMS = ['iso9001', 'dealer'];
const CAPABILITY_ID_REGEX = /^[a-z0-9-]+$/;

const EMPTY_FORM: FormData = {
  capability_id: '',
  name: '',
  version: '1.0.0',
  tier: 'opcional',
  status: 'active',
  icon: '',
  color: '',
  description: '',
  long_description: '',
  target_audience: '',
  how_it_works: '',
  features: [],
  benefits: [],
  system_ids: [],
  tags_raw: '',
  dependencies_raw: '',
  datasets_raw: '',
};

interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

interface DynamicListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
}

function DynamicList({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
}: DynamicListProps) {
  function handleChange(index: number, value: string) {
    const next = items.map((item, i) => (i === index ? value : item));
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([...items, '']);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={e => handleChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0 text-slate-500 hover:text-red-600"
            onClick={() => handleRemove(index)}
            aria-label="Eliminar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        {addLabel}
      </Button>
    </div>
  );
}

function parseCommaSeparated(raw: string): string[] {
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function TagPreview({ raw }: { raw: string }) {
  const items = parseCommaSeparated(raw);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {items.map(item => (
        <span
          key={item}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function buildPayload(formData: FormData, isNew: boolean): ApiPayload {
  const version = formData.version.trim() || '1.0.0';
  const capabilityId = formData.capability_id.trim();

  const payload: ApiPayload = {
    name: formData.name.trim(),
    version,
    scope: 'system',
    tier: formData.tier,
    status: formData.status,
    icon: formData.icon.trim(),
    color: formData.color.trim(),
    description: formData.description.trim(),
    long_description: formData.long_description.trim(),
    target_audience: formData.target_audience.trim(),
    how_it_works: formData.how_it_works.trim(),
    features: formData.features.map(item => item.trim()).filter(Boolean),
    benefits: formData.benefits.map(item => item.trim()).filter(Boolean),
    system_ids: formData.system_ids,
    tags: parseCommaSeparated(formData.tags_raw),
    dependencies: parseCommaSeparated(formData.dependencies_raw),
    manifest: {
      capability_id: capabilityId,
      version,
      system_id: formData.system_ids[0] ?? 'iso9001',
      navigation: [],
      datasets: parseCommaSeparated(formData.datasets_raw),
    },
  };

  if (isNew) {
    payload.capability_id = capabilityId;
  }

  return payload;
}

function mapResponseToFormData(data: GetCapabilityResponse): FormData {
  return {
    capability_id: data.id,
    name: data.name,
    version: data.version,
    tier: data.tier,
    status: data.status,
    icon: data.icon,
    color: data.color ?? '',
    description: data.description,
    long_description: data.long_description ?? '',
    target_audience: data.target_audience ?? '',
    how_it_works: data.how_it_works ?? '',
    features: data.features ?? [],
    benefits: data.benefits ?? [],
    system_ids: data.system_ids ?? [],
    tags_raw: (data.tags ?? []).join(', '),
    dependencies_raw: (data.dependencies ?? []).join(', '),
    datasets_raw: (data.manifest?.datasets ?? []).join(', '),
  };
}

export default function CapabilityFormPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const id = params.id;
  const isNew = id === 'nuevo';

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.rol !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (isNew) {
      setFormData(EMPTY_FORM);
      setLoading(false);
      return;
    }

    if (!user || user.rol !== 'super_admin') {
      return;
    }

    void fetchCapability();
  }, [id, isNew, user]);

  async function fetchCapability() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/super-admin/capabilities/${id}`, {
        cache: 'no-store',
      });
      const json = (await response.json()) as CapabilityResponse;

      if (!response.ok) {
        const message =
          ('error' in json && (json.error || json.message)) ||
          'No se pudo cargar el Power.';
        setError(message);
        return;
      }

      if (!('data' in json)) {
        setError('Respuesta invalida al cargar el Power.');
        return;
      }

      setFormData(mapResponseToFormData(json.data));
    } catch (fetchError) {
      console.error('Error al cargar capability:', fetchError);
      setError('Error de conexion al cargar el Power.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isNew && !CAPABILITY_ID_REGEX.test(formData.capability_id.trim())) {
      toast({
        title: 'ID invalido',
        description: 'Usa solo minusculas, numeros y guiones.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.system_ids.length === 0) {
      toast({
        title: 'Falta un sistema',
        description: 'Selecciona al menos un system_id.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        isNew
          ? '/api/super-admin/capabilities'
          : `/api/super-admin/capabilities/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(formData, isNew)),
        }
      );

      const json = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        toast({
          title: 'No se pudo guardar',
          description:
            json.error || json.message || 'La operacion no pudo completarse.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Power guardado',
        description: `"${formData.name}" se guardo correctamente.`,
      });

      router.push('/super-admin/capabilities');
    } catch (submitError) {
      console.error('Error al guardar capability:', submitError);
      toast({
        title: 'Error de conexion',
        description: 'No se pudo guardar el Power.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Eliminar este Power?')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/capabilities/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description:
            'No se puede eliminar porque el Power esta instalado en organizaciones.',
          variant: 'destructive',
        });
        return;
      }

      const json = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        toast({
          title: 'No se pudo eliminar',
          description:
            json.error || json.message || 'La operacion no pudo completarse.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Power eliminado',
        description: 'El Power fue eliminado correctamente.',
      });

      router.push('/super-admin/capabilities');
    } catch (deleteError) {
      console.error('Error al eliminar capability:', deleteError);
      toast({
        title: 'Error de conexion',
        description: 'No se pudo eliminar el Power.',
        variant: 'destructive',
      });
    }
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Cargando Power...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl space-y-6 p-6 md:p-8">
        <PageHeader
          title="Error"
          breadcrumbs={[
            { label: 'Super Admin' },
            { label: 'Powers', href: '/super-admin/capabilities' },
            { label: 'Error' },
          ]}
        />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
        <Button variant="outline" onClick={() => router.push('/super-admin/capabilities')}>
          Volver al catalogo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        title={isNew ? 'Nuevo Power' : 'Editar Power'}
        breadcrumbs={[
          { label: 'Super Admin' },
          { label: 'Powers', href: '/super-admin/capabilities' },
          { label: isNew ? 'Nuevo' : formData.name || id },
        ]}
      />

      <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Identidad</h2>

          {isNew && (
            <FormField
              label="capability_id"
              hint="Slug unico: solo minusculas, numeros y guiones"
            >
              <Input
                value={formData.capability_id}
                onChange={e => setField('capability_id', e.target.value)}
                pattern="[a-z0-9-]+"
                placeholder="ej: dealer-repuestos"
                required
              />
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <Input
                value={formData.name}
                onChange={e => setField('name', e.target.value)}
                required
              />
            </FormField>

            <FormField label="Version">
              <Input
                value={formData.version}
                onChange={e => setField('version', e.target.value)}
                placeholder="1.0.0"
                required
              />
            </FormField>

            <FormField label="Tier">
              <Select
                value={formData.tier}
                onValueChange={value => setField('tier', value as CapabilityTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="opcional">Opcional</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select
                value={formData.status}
                onValueChange={value =>
                  setField('status', value as PlatformCapabilityStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Icon">
              <Input
                value={formData.icon}
                onChange={e => setField('icon', e.target.value)}
                placeholder="bot"
                required
              />
            </FormField>

            <FormField label="Color">
              <Input
                value={formData.color}
                onChange={e => setField('color', e.target.value)}
                placeholder="emerald"
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Descripcion</h2>

          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={e => setField('description', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Long description">
            <Textarea
              value={formData.long_description}
              onChange={e => setField('long_description', e.target.value)}
              rows={4}
            />
          </FormField>

          <FormField label="Target audience">
            <Input
              value={formData.target_audience}
              onChange={e => setField('target_audience', e.target.value)}
            />
          </FormField>

          <FormField label="How it works">
            <Textarea
              value={formData.how_it_works}
              onChange={e => setField('how_it_works', e.target.value)}
              rows={3}
            />
          </FormField>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Funcionalidades</h2>

          <DynamicList
            label="features[]"
            items={formData.features}
            onChange={items => setField('features', items)}
            placeholder="Ej: Gestion de clientes"
            addLabel="+ Agregar funcionalidad"
          />

          <DynamicList
            label="benefits[]"
            items={formData.benefits}
            onChange={items => setField('benefits', items)}
            placeholder="Ej: Ahorra tiempo en seguimientos"
            addLabel="+ Agregar beneficio"
          />
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Tecnico</h2>

          <div>
            <Label className="mb-2 block">system_ids[]</Label>
            <div className="flex flex-wrap gap-4">
              {KNOWN_SYSTEMS.map(sys => (
                <label key={sys} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.system_ids.includes(sys)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...formData.system_ids, sys]
                        : formData.system_ids.filter(item => item !== sys);
                      setField('system_ids', next);
                    }}
                  />
                  {sys}
                </label>
              ))}
            </div>
          </div>

          <FormField label="dependencies[]" hint="Separado por comas">
            <Input
              value={formData.dependencies_raw}
              onChange={e => setField('dependencies_raw', e.target.value)}
              placeholder="crm, otro-power"
            />
            <TagPreview raw={formData.dependencies_raw} />
          </FormField>

          <FormField label="tags[]" hint="Separado por comas">
            <Input
              value={formData.tags_raw}
              onChange={e => setField('tags_raw', e.target.value)}
              placeholder="crm, ventas, contactos"
            />
            <TagPreview raw={formData.tags_raw} />
          </FormField>

          <FormField label="datasets[]" hint="Separado por comas">
            <Input
              value={formData.datasets_raw}
              onChange={e => setField('datasets_raw', e.target.value)}
              placeholder="orders, contacts"
            />
            <TagPreview raw={formData.datasets_raw} />
          </FormField>

          <p className="rounded border bg-slate-50 p-3 text-xs text-muted-foreground">
            La configuracion de navegacion se hace via codigo o seed.
          </p>
        </section>

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/super-admin/capabilities')}
            >
              Cancelar
            </Button>
          </div>

          {!isNew && (
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
              Eliminar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
