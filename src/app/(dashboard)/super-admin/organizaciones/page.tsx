'use client';

import { ListTable, PageHeader, PageToolbar } from '@/components/design-system';
import { CreateOrganizationDialog } from '@/components/super-admin/CreateOrganizationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { OrganizationRecord } from '@/types/organization';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  KanbanSquare,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Rocket,
  Rows3,
  Users,
  XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface Organization extends Pick<
  OrganizationRecord,
  | 'id'
  | 'name'
  | 'plan'
  | 'tenant_type'
  | 'tenantType'
  | 'ai_plan_id'
  | 'created_at'
  | 'updated_at'
> {
  features: { max_users: number };
  crm?: { installed: boolean };
}

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  whatsapp: string;
  employees: string;
  message: string;
  status: 'pending' | 'contacted' | 'closed' | 'activated';
  created_at: unknown;
  spamScore?: number;
  isLikelySpam?: boolean;
}

type RequestStatus = 'pending' | 'contacted' | 'closed';
type ViewMode = 'list' | 'cards' | 'kanban';

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fromNow(value: unknown) {
  const date = normalizeDate(value);
  return date
    ? formatDistanceToNow(date, { addSuffix: true, locale: es })
    : 'Fecha no disponible';
}

function sortByRecent<T extends { created_at: unknown; updated_at?: unknown }>(items: T[]) {
  return [...items].sort((a, b) => {
    const first = normalizeDate(a.updated_at ?? a.created_at)?.getTime() ?? 0;
    const second = normalizeDate(b.updated_at ?? b.created_at)?.getTime() ?? 0;
    return second - first;
  });
}

export default function OrganizacionesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [entityFilter, setEntityFilter] = useState<
    'all' | 'requests' | 'organizations'
  >('all');
  const [search, setSearch] = useState('');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.rol !== 'super_admin') router.push('/dashboard');
    if (user) void loadData();
  }, [user, router]);

  useEffect(() => {
    setShowCreateDialog(searchParams.get('create') === '1');
  }, [searchParams]);

  const loadData = async () => {
    try {
      setError(null);
      const [orgsResponse, requestsResponse] = await Promise.all([
        fetch('/api/super-admin/organizations', { cache: 'no-store' }),
        fetch('/api/super-admin/demo-requests', { cache: 'no-store' }),
      ]);
      const [orgsData, requestsData] = await Promise.all([
        orgsResponse.json(),
        requestsResponse.json(),
      ]);
      if (!orgsResponse.ok || !requestsResponse.ok) {
        setError(orgsData?.error || requestsData?.error || 'No se pudo cargar la vista.');
      }
      setOrganizations(orgsData.organizations || []);
      setRequests(requestsData.data || []);
    } catch (loadError) {
      console.error(loadError);
      setError('Error de red al cargar organizaciones y solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  const setCreateOpen = (open: boolean) => {
    setShowCreateDialog(open);
    router.replace(open ? '/super-admin/organizaciones?create=1' : '/super-admin/organizaciones');
  };

  const updateRequestStatus = async (id: string, status: RequestStatus) => {
    const response = await fetch(`/api/super-admin/demo-requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setRequests(prev => prev.map(item => (item.id === id ? { ...item, status } : item)));
  };

  const activateRequest = async (request: DemoRequest) => {
    setActivatingId(request.id);
    try {
      const response = await fetch('/api/demo-requests/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoRequestId: request.id,
          name: request.name,
          email: request.email,
          company: request.company,
          whatsapp: request.whatsapp,
          trialDays: 30,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo activar.');
      setRequests(prev =>
        prev.map(item => (item.id === request.id ? { ...item, status: 'activated' } : item))
      );
      toast({ title: 'Demo activada', description: 'Se genero el acceso correctamente.' });
    } catch (activationError) {
      toast({
        title: 'Error al activar',
        description: activationError instanceof Error ? activationError.message : 'Error.',
        variant: 'destructive',
      });
    } finally {
      setActivatingId(null);
    }
  };

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = sortByRecent(organizations);
    if (!query) return base;
    return base.filter(org =>
      [org.name, org.id, org.plan, org.tenant_type, org.tenantType]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    );
  }, [organizations, search]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = sortByRecent(requests);
    if (!query) return base;
    return base.filter(item =>
      [item.name, item.email, item.company, item.whatsapp, item.message]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    );
  }, [requests, search]);

  const pending = filteredRequests.filter(item => item.status === 'pending' && !item.isLikelySpam);
  const contacted = filteredRequests.filter(item => item.status === 'contacted' && !item.isLikelySpam);
  const activated = filteredRequests.filter(item => item.status === 'activated' && !item.isLikelySpam);
  const archived = filteredRequests.filter(item => item.status === 'closed' || item.isLikelySpam);
  const unified = sortByRecent([
    ...filteredOrganizations.map(org => ({
      kind: 'organization' as const,
      id: org.id,
      created_at: org.created_at,
      updated_at: org.updated_at,
      org,
    })),
    ...filteredRequests.map(req => ({
      kind: 'request' as const,
      id: req.id,
      created_at: req.created_at,
      req,
    })),
  ]);
  const filteredUnified = unified.filter(item => {
    if (entityFilter === 'requests') return item.kind === 'request';
    if (entityFilter === 'organizations') return item.kind === 'organization';
    return true;
  });

  const columns = [
    { id: 'pending', title: 'Pendientes', items: pending },
    { id: 'contacted', title: 'Contactadas', items: contacted },
    { id: 'activated', title: 'Activadas', items: activated },
    { id: 'organizations', title: 'Organizaciones', items: filteredOrganizations },
    { id: 'archive', title: 'Archivo y spam', items: archived },
  ] as const;

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Cargando organizaciones...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Organizaciones"
          description="Una sola lista con vistas de lista, tarjetas y kanban. El alta se hace desde el boton de la derecha."
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Organizaciones' }]}
          actions={
            <Button onClick={() => setCreateOpen(true)} className="ledger-primary-button border-0">
              <Plus className="mr-2 h-4 w-4" />
              Nueva organizacion
            </Button>
          }
        />

        {error && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

        <section className="rounded-[28px] bg-[#f3f4f5] p-4 md:p-5">
          <PageToolbar
            searchValue={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por nombre, email, empresa, tenant o plan..."
            className="border-white/60 bg-white/75 shadow-[0_12px_32px_rgba(25,28,29,0.06)]"
            filterOptions={
              <div className="flex flex-wrap items-center gap-2">
                <FilterButton
                  label="Todo"
                  active={entityFilter === 'all'}
                  onClick={() => setEntityFilter('all')}
                />
                <FilterButton
                  label="Solicitudes"
                  active={entityFilter === 'requests'}
                  onClick={() => setEntityFilter('requests')}
                />
                <FilterButton
                  label="Organizaciones"
                  active={entityFilter === 'organizations'}
                  onClick={() => setEntityFilter('organizations')}
                />
                <div className="mx-1 hidden h-7 w-px bg-slate-200 md:block" />
                <ViewButton icon={Rows3} label="Lista" active={viewMode === 'list'} onClick={() => setViewMode('list')} />
                <ViewButton icon={LayoutGrid} label="Tarjetas" active={viewMode === 'cards'} onClick={() => setViewMode('cards')} />
                <ViewButton icon={KanbanSquare} label="Kanban" active={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} />
              </div>
            }
          />

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <MetricCard label="Organizaciones" value={String(filteredOrganizations.length)} />
            <MetricCard label="Solicitudes" value={String(filteredRequests.length)} />
            <MetricCard label="Pendientes" value={String(pending.length)} />
            <MetricCard label="Activadas" value={String(activated.length)} />
          </div>

          <div className="mt-5">
            {viewMode === 'list' && (
              <ListTable
                data={filteredUnified}
                keyExtractor={item => `${item.kind}-${item.id}`}
                columns={[
                  { header: 'Tipo', cell: item => <Badge variant="secondary">{item.kind === 'organization' ? 'Organizacion' : 'Solicitud'}</Badge> },
                  { header: 'Principal', cell: item => item.kind === 'organization' ? <div><p className="font-medium text-slate-800">{item.org.name}</p><p className="text-xs text-slate-500">{item.org.id}</p></div> : <div><p className="font-medium text-slate-800">{item.req.name}</p><p className="text-xs text-slate-500">{item.req.email}</p></div> },
                  { header: 'Contexto', cell: item => item.kind === 'organization' ? <span className="text-sm text-slate-600">{item.org.plan} · {item.org.tenant_type || item.org.tenantType || 'sin definir'}</span> : <span className="text-sm text-slate-600">{item.req.company || 'Sin empresa'} · {item.req.employees || 'Sin dato'} empleados</span> },
                  { header: 'Estado', cell: item => item.kind === 'organization' ? <Badge className={item.org.crm?.installed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>CRM {item.org.crm?.installed ? 'instalado' : 'pendiente'}</Badge> : <div className="flex flex-wrap gap-2"><Badge variant="secondary">{item.req.status}</Badge>{item.req.isLikelySpam && <Badge className="bg-rose-100 text-rose-700">Spam</Badge>}</div> },
                  {
                    header: 'Fecha',
                    cell: item => (
                      <span className="text-sm text-slate-500">
                        {fromNow(
                          item.kind === 'organization'
                            ? item.updated_at ?? item.created_at
                            : item.created_at
                        )}
                      </span>
                    ),
                  },
                ]}
                emptyState={<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No hay elementos con los filtros actuales.</div>}
              />
            )}

            {viewMode === 'cards' && (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredUnified.map(item =>
                  item.kind === 'organization' ? (
                    <OrganizationCard key={item.id} org={item.org} onOpen={() => router.push(`/super-admin/organizaciones/${item.org.id}`)} />
                  ) : (
                    <RequestCard key={item.id} req={item.req} activatingId={activatingId} onActivate={activateRequest} onStatusChange={updateRequestStatus} />
                  )
                )}
              </div>
            )}

            {viewMode === 'kanban' && (
              <div className="overflow-x-auto pb-2">
                <div className="grid min-w-[1480px] grid-cols-5 gap-4 xl:min-w-0">
                  {columns.map(column => (
                    <div key={column.id} className="flex min-h-[620px] flex-col gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div><p className="text-sm font-semibold text-slate-900">{column.title}</p><p className="text-xs text-slate-500">Vista operativa</p></div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{column.items.length}</span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-3">
                        {column.id === 'organizations'
                          ? column.items.map(item => <OrganizationCard key={(item as Organization).id} org={item as Organization} onOpen={() => router.push(`/super-admin/organizaciones/${(item as Organization).id}`)} />)
                          : column.items.map(item => <RequestCard key={(item as DemoRequest).id} req={item as DemoRequest} activatingId={activatingId} onActivate={activateRequest} onStatusChange={updateRequestStatus} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <CreateOrganizationDialog open={showCreateDialog} onOpenChange={setCreateOpen} onCreated={loadData} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/85 p-4 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ViewButton({ icon: Icon, label, active, onClick }: { icon: typeof Rows3; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant={active ? 'default' : 'outline'} className={active ? 'ledger-primary-button border-0' : ''} onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      className={
        active
          ? 'border border-slate-200 bg-white text-slate-900 shadow-sm'
          : 'text-slate-600'
      }
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function OrganizationCard({ org, onOpen }: { org: Organization; onOpen: () => void }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-sm font-semibold text-white">{org.name.charAt(0).toUpperCase()}</div>
            <div><h3 className="font-semibold text-slate-900">{org.name}</h3><p className="text-xs text-slate-500">{org.id}</p></div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700">{org.plan}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{org.tenant_type || org.tenantType || 'sin definir'}</Badge>
          <Badge variant="secondary">{org.features.max_users} usuarios max</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{fromNow(org.created_at)}</span>
          <Button size="sm" variant="ghost" onClick={onOpen}>Abrir<ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCard({ req, activatingId, onActivate, onStatusChange }: { req: DemoRequest; activatingId: string | null; onActivate: (req: DemoRequest) => Promise<void>; onStatusChange: (id: string, status: RequestStatus) => Promise<void> }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">{req.name}</h3><p className="text-xs text-slate-500">{req.email}</p></div>
          <div className="flex flex-wrap gap-2">{req.isLikelySpam && <Badge className="bg-rose-100 text-rose-700">Spam {req.spamScore || 0}</Badge>}</div>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /><span>{req.company || 'Sin empresa'}</span></div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><span>{req.employees || 'Sin dato'} empleados</span></div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /><a href={`https://wa.me/${req.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:text-emerald-700">{req.whatsapp}</a></div>
          {req.message && <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600"><div className="mb-1 flex items-center gap-2 text-slate-500"><MessageSquare className="h-4 w-4" />Mensaje</div><p>{req.message}</p></div>}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500"><span>{fromNow(req.created_at)}</span><span className="uppercase tracking-wide">{req.status}</span></div>
        <div className="flex flex-wrap gap-2">
          {req.status === 'pending' && <><Button size="sm" onClick={() => void onActivate(req)} disabled={activatingId === req.id} className="bg-violet-600 hover:bg-violet-700">{activatingId === req.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}Activar</Button><Button size="sm" variant="outline" onClick={() => void onStatusChange(req.id, 'contacted')}><CheckCircle2 className="mr-1 h-4 w-4" />Contactada</Button></>}
          {req.status === 'contacted' && <><Button size="sm" onClick={() => void onActivate(req)} disabled={activatingId === req.id} className="bg-violet-600 hover:bg-violet-700">{activatingId === req.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}Activar ahora</Button><Button size="sm" variant="outline" onClick={() => void onStatusChange(req.id, 'closed')}><XCircle className="mr-1 h-4 w-4" />Cerrar</Button></>}
        </div>
      </CardContent>
    </Card>
  );
}
