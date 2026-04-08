'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  DESIGN_PRODUCT_TYPE_LABELS,
  DESIGN_PROJECT_STATUS_LABELS,
  type DesignProject,
  type DesignProjectStatus,
} from '@/types/iso-design';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const CAPABILITY_ID = 'iso_design_development';

type CapabilityInstalled = {
  capability_id: string;
  enabled: boolean;
  status: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type FormState = {
  name: string;
  description: string;
  productType: 'product' | 'service';
  responsibleId: string;
  designInputs: string;
  designOutputs: string;
  reviewDates: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  productType: 'product',
  responsibleId: '',
  designInputs: '',
  designOutputs: '',
  reviewDates: '',
};

function splitMultiline(value: string) {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function formatDate(value?: string) {
  if (!value) return 'Pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getStatusTone(status: DesignProjectStatus) {
  switch (status) {
    case 'planning':
      return 'bg-slate-100 text-slate-700';
    case 'design':
      return 'bg-sky-100 text-sky-700';
    case 'verification':
      return 'bg-amber-100 text-amber-800';
    case 'validation':
      return 'bg-violet-100 text-violet-800';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function IsoDesignPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [capabilityEnabled, setCapabilityEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canManage = ['admin', 'gerente', 'super_admin'].includes(
    user?.rol || ''
  );

  const fetchModuleState = async () => {
    try {
      setLoading(true);
      setError(null);

      const capabilityRes = await fetch(
        '/api/capabilities/installed?system_id=iso9001',
        { cache: 'no-store' }
      );
      const capabilityJson = (await capabilityRes.json()) as ApiResponse<
        CapabilityInstalled[]
      >;

      if (!capabilityRes.ok || !capabilityJson.success) {
        throw new Error(
          capabilityJson.error || 'No se pudo validar la capability del modulo'
        );
      }

      const designCapability = (capabilityJson.data || []).find(
        item =>
          item.capability_id === CAPABILITY_ID &&
          item.enabled &&
          item.status === 'enabled'
      );

      if (!designCapability) {
        setCapabilityEnabled(false);
        setProjects([]);
        return;
      }

      setCapabilityEnabled(true);

      const projectRes = await fetch('/api/iso-design', {
        cache: 'no-store',
      });
      const projectJson = (await projectRes.json()) as ApiResponse<
        DesignProject[]
      >;

      if (!projectRes.ok || !projectJson.success) {
        throw new Error(
          projectJson.error || 'No se pudieron obtener los proyectos'
        );
      }

      setProjects(Array.isArray(projectJson.data) ? projectJson.data : []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar el modulo'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    void fetchModuleState();
  }, [authLoading, user]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      planning: projects.filter(project => project.status === 'planning')
        .length,
      verification: projects.filter(
        project => project.status === 'verification'
      ).length,
      validation: projects.filter(project => project.status === 'validation')
        .length,
    }),
    [projects]
  );

  const handleCreateProject = async () => {
    try {
      setSubmitting(true);

      const payload = {
        name: form.name,
        description: form.description,
        productType: form.productType,
        responsibleId: form.responsibleId,
        designInputs: splitMultiline(form.designInputs),
        designOutputs: splitMultiline(form.designOutputs),
        reviewDates: splitMultiline(form.reviewDates),
      };

      const response = await fetch('/api/iso-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as ApiResponse<DesignProject>;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear el proyecto');
      }

      toast({
        title: 'Proyecto creado',
        description: 'El proyecto de diseno ya figura en el tablero.',
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchModuleState();
    } catch (submitError) {
      toast({
        title: 'Error',
        description:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <BaseCard className="min-h-[320px]">
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando modulo ISO 8.3...
          </div>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Diseno y Desarrollo"
        description="Gestiona proyectos ISO 8.3, sus entradas de diseno, revisiones, verificacion y validacion."
        breadcrumbs={[
          { label: 'Mi SGC', href: '/mi-sgc/madurez' },
          { label: 'Diseno y Desarrollo' },
        ]}
        actions={
          canManage && capabilityEnabled ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo proyecto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo proyecto de diseno</DialogTitle>
                  <DialogDescription>
                    Carga el plan inicial del proyecto para habilitar
                    seguimiento, verificacion y validacion.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input
                      value={form.name}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ej. Servicio de instalacion remota"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Descripcion</label>
                    <Textarea
                      value={form.description}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Alcance, objetivo y contexto del proyecto"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select
                      value={form.productType}
                      onValueChange={value =>
                        setForm(current => ({
                          ...current,
                          productType: value as 'product' | 'service',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Producto</SelectItem>
                        <SelectItem value="service">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Responsable</label>
                    <Input
                      value={form.responsibleId}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          responsibleId: event.target.value,
                        }))
                      }
                      placeholder="UID o identificador interno"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Entradas de diseno
                    </label>
                    <Textarea
                      value={form.designInputs}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          designInputs: event.target.value,
                        }))
                      }
                      placeholder={
                        'Una por linea\nRequisitos del cliente\nNormativa aplicable'
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Salidas de diseno
                    </label>
                    <Textarea
                      value={form.designOutputs}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          designOutputs: event.target.value,
                        }))
                      }
                      placeholder={
                        'Una por linea\nEspecificacion tecnica\nCriterios de aceptacion'
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      Fechas de revision
                    </label>
                    <Textarea
                      value={form.reviewDates}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          reviewDates: event.target.value,
                        }))
                      }
                      placeholder={
                        'Una por linea en ISO 8601\n2026-03-15\n2026-04-10'
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => void handleCreateProject()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Crear proyecto
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!capabilityEnabled ? (
        <BaseCard className="border-dashed border-sky-200 bg-sky-50/60 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sky-900">
                <Layers className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  Capability premium no habilitada
                </h2>
              </div>
              <p className="max-w-2xl text-sm text-sky-900/80">
                El modulo ISO 8.3 depende de la capability{' '}
                <code>{CAPABILITY_ID}</code>. Cuando el tenant la instale y
                active desde configuracion, la navegacion y las APIs del modulo
                quedaran operativas.
              </p>
            </div>
            <Badge className="w-fit bg-white text-sky-700">Premium</Badge>
          </div>
        </BaseCard>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <BaseCard padding="md">
              <p className="text-sm text-muted-foreground">Proyectos</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {stats.total}
              </p>
            </BaseCard>
            <BaseCard padding="md">
              <p className="text-sm text-muted-foreground">Planificacion</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {stats.planning}
              </p>
            </BaseCard>
            <BaseCard padding="md">
              <p className="text-sm text-muted-foreground">Verificacion</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">
                {stats.verification}
              </p>
            </BaseCard>
            <BaseCard padding="md">
              <p className="text-sm text-muted-foreground">Validacion</p>
              <p className="mt-2 text-3xl font-semibold text-violet-700">
                {stats.validation}
              </p>
            </BaseCard>
          </section>

          {projects.length === 0 ? (
            <BaseCard className="border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Todavia no hay proyectos de diseno registrados para esta
                organizacion.
              </p>
            </BaseCard>
          ) : (
            <section className="grid gap-4 xl:grid-cols-2">
              {projects.map(project => (
                <BaseCard key={project.id} className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {project.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {project.description || 'Sin descripcion declarada.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusTone(project.status)}>
                        {DESIGN_PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                      <Badge variant="outline">
                        {DESIGN_PRODUCT_TYPE_LABELS[project.productType]}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Plan de diseno
                      </p>
                      <p className="mt-3 text-sm text-slate-700">
                        Responsable: {project.responsibleId}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Revisiones: {project.reviewDates.length}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {project.designInputs.slice(0, 3).map(item => (
                          <li key={item}>Entrada: {item}</li>
                        ))}
                        {project.designInputs.length === 0 ? (
                          <li>Sin entradas cargadas</li>
                        ) : null}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Verificacion
                      </p>
                      <p className="mt-3 text-sm text-amber-900">
                        Fecha: {formatDate(project.verificationDate)}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-amber-900/80">
                        {project.designOutputs.slice(0, 3).map(item => (
                          <li key={item}>Salida: {item}</li>
                        ))}
                        {project.designOutputs.length === 0 ? (
                          <li>Sin salidas cargadas</li>
                        ) : null}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                        Validacion
                      </p>
                      <p className="mt-3 text-sm text-violet-900">
                        Fecha: {formatDate(project.validationDate)}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-violet-900/85">
                        <CheckCircle2 className="h-4 w-4" />
                        Estado actual:{' '}
                        {DESIGN_PROJECT_STATUS_LABELS[project.status]}
                      </div>
                      <p className="mt-3 text-xs text-violet-900/70">
                        Actualizado el {formatDate(project.updatedAt)}
                      </p>
                    </div>
                  </div>
                </BaseCard>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
