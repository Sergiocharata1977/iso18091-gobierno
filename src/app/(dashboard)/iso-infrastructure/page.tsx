'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  INFRA_ASSET_STATUSES,
  INFRA_ASSET_TYPES,
  MAINTENANCE_TYPES,
} from '@/lib/iso/infrastructure';
import type { InfraAsset, MaintenanceRecord } from '@/types/iso-infrastructure';
import {
  Building2,
  ClipboardList,
  Loader2,
  Plus,
  Settings,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type PersonnelOption = {
  id: string;
  nombre_completo: string;
  puesto?: string | null;
};

type AssetFormState = {
  name: string;
  type: InfraAsset['type'];
  location: string;
  responsibleId: string;
  status: InfraAsset['status'];
  acquisitionDate: string;
  nextMaintenanceDate: string;
};

type MaintenanceFormState = {
  date: string;
  type: MaintenanceRecord['type'];
  description: string;
  performedBy: string;
  cost: string;
  nextMaintenanceDate: string;
  status: InfraAsset['status'];
};

const INITIAL_ASSET_FORM: AssetFormState = {
  name: '',
  type: 'equipment',
  location: '',
  responsibleId: '',
  status: 'active',
  acquisitionDate: new Date().toISOString().slice(0, 10),
  nextMaintenanceDate: '',
};

const INITIAL_MAINTENANCE_FORM: MaintenanceFormState = {
  date: new Date().toISOString().slice(0, 10),
  type: 'preventive',
  description: '',
  performedBy: '',
  cost: '',
  nextMaintenanceDate: '',
  status: 'active',
};

const TYPE_LABELS: Record<InfraAsset['type'], string> = {
  building: 'Edificio',
  equipment: 'Equipo',
  software: 'Software',
  transport: 'Transporte',
  other: 'Otro',
};

const STATUS_LABELS: Record<InfraAsset['status'], string> = {
  active: 'Activo',
  maintenance: 'En mantenimiento',
  inactive: 'Inactivo',
  disposed: 'Baja',
};

const MAINTENANCE_LABELS: Record<MaintenanceRecord['type'], string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
};

function badgeClass(status: InfraAsset['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'maintenance':
      return 'bg-amber-100 text-amber-800';
    case 'inactive':
      return 'bg-slate-100 text-slate-700';
    case 'disposed':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function IsoInfrastructurePage() {
  const { user, loading: authLoading } = useAuth();
  const organizationId = user?.organization_id || '';

  const [assets, setAssets] = useState<InfraAsset[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | InfraAsset['type']>(
    'all'
  );
  const [filterStatus, setFilterStatus] = useState<
    'all' | InfraAsset['status']
  >('all');
  const [assetForm, setAssetForm] =
    useState<AssetFormState>(INITIAL_ASSET_FORM);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>(
    INITIAL_MAINTENANCE_FORM
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    void Promise.all([loadAssets(filterType, filterStatus), loadPersonnel()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, filterType, filterStatus]);

  const loadAssets = async (
    nextType: 'all' | InfraAsset['type'],
    nextStatus: 'all' | InfraAsset['status']
  ) => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ organizationId });
      if (nextType !== 'all') params.set('type', nextType);
      if (nextStatus !== 'all') params.set('status', nextStatus);

      const response = await fetch(
        `/api/iso-infrastructure?${params.toString()}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo cargar infraestructura');
      }

      setAssets(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Error loading infrastructure:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnel = async () => {
    if (!organizationId) return;

    try {
      const response = await fetch(
        `/api/personnel-list?organization_id=${organizationId}`
      );
      const result = await response.json();
      setPersonnel(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error loading personnel:', error);
      setPersonnel([]);
    }
  };

  const getResponsibleName = (responsibleId: string) => {
    return (
      personnel.find(person => person.id === responsibleId)?.nombre_completo ||
      'Sin responsable asignado'
    );
  };

  const resetMaintenanceForm = (status: InfraAsset['status'] = 'active') => {
    setMaintenanceForm({
      ...INITIAL_MAINTENANCE_FORM,
      status,
      performedBy: user?.email || '',
    });
  };

  const handleCreateAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organizationId) return;

    try {
      setSaving(true);
      const response = await fetch('/api/iso-infrastructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...assetForm,
          nextMaintenanceDate: assetForm.nextMaintenanceDate || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo crear el activo');
      }

      setAssetForm(INITIAL_ASSET_FORM);
      await loadAssets(filterType, filterStatus);
    } catch (error) {
      console.error('Error creating asset:', error);
      window.alert(
        error instanceof Error ? error.message : 'No se pudo crear el activo'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (asset: InfraAsset) => {
    const confirmed = window.confirm(
      `Se eliminara el activo "${asset.name}". Esta accion no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/iso-infrastructure/${asset.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo eliminar el activo');
      }

      if (selectedAssetId === asset.id) {
        setSelectedAssetId(null);
      }

      await loadAssets(filterType, filterStatus);
    } catch (error) {
      console.error('Error deleting asset:', error);
      window.alert(
        error instanceof Error ? error.message : 'No se pudo eliminar el activo'
      );
    }
  };

  const openMaintenanceForm = (asset: InfraAsset) => {
    setSelectedAssetId(asset.id);
    setMaintenanceForm({
      ...INITIAL_MAINTENANCE_FORM,
      status: asset.status === 'disposed' ? 'inactive' : asset.status,
      performedBy: user?.email || '',
      nextMaintenanceDate: asset.nextMaintenanceDate || '',
    });
  };

  const handleAddMaintenance = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedAssetId) return;

    try {
      setMaintenanceSaving(true);
      const response = await fetch(
        `/api/iso-infrastructure/${selectedAssetId}/maintenance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maintenance: {
              date: maintenanceForm.date,
              type: maintenanceForm.type,
              description: maintenanceForm.description,
              performedBy: maintenanceForm.performedBy,
              cost: maintenanceForm.cost
                ? Number(maintenanceForm.cost)
                : undefined,
            },
            nextMaintenanceDate:
              maintenanceForm.nextMaintenanceDate || undefined,
            status: maintenanceForm.status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo registrar mantenimiento');
      }

      setSelectedAssetId(null);
      resetMaintenanceForm();
      await loadAssets(filterType, filterStatus);
    } catch (error) {
      console.error('Error adding maintenance:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el mantenimiento'
      );
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const totalAssets = assets.length;
  const activeAssets = assets.filter(asset => asset.status === 'active').length;
  const inMaintenance = assets.filter(
    asset => asset.status === 'maintenance'
  ).length;
  const dueSoon = assets.filter(asset => {
    if (!asset.nextMaintenanceDate) return false;
    const nextDate = new Date(asset.nextMaintenanceDate);
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + 30);
    return nextDate >= now && nextDate <= limit;
  }).length;

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          La sesion no tiene una organizacion asociada. No es posible operar el
          modulo de infraestructura.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
              ISO 7.1.3
            </p>
            <h1 className="text-3xl font-semibold">Infraestructura</h1>
            <p className="max-w-3xl text-sm text-slate-200">
              Inventario de activos fisicos y digitales, responsables y
              mantenimientos con trazabilidad por organizacion.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalAssets}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">
                Activos
              </p>
              <p className="mt-2 text-2xl font-semibold">{activeAssets}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">
                Mantenimiento
              </p>
              <p className="mt-2 text-2xl font-semibold">{inMaintenance}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">
                Proximos 30d
              </p>
              <p className="mt-2 text-2xl font-semibold">{dueSoon}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          onSubmit={handleCreateAsset}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Nuevo activo
              </h2>
              <p className="text-sm text-slate-500">
                Alta inicial del inventario y asignacion de responsable.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                value={assetForm.name}
                onChange={event =>
                  setAssetForm(current => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                placeholder="Servidor ERP, Autoelevador, Planta Norte..."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Tipo
                <select
                  value={assetForm.type}
                  onChange={event =>
                    setAssetForm(current => ({
                      ...current,
                      type: event.target.value as InfraAsset['type'],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                >
                  {INFRA_ASSET_TYPES.map(type => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select
                  value={assetForm.status}
                  onChange={event =>
                    setAssetForm(current => ({
                      ...current,
                      status: event.target.value as InfraAsset['status'],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                >
                  {INFRA_ASSET_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Ubicacion
              <input
                value={assetForm.location}
                onChange={event =>
                  setAssetForm(current => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                placeholder="Planta 1, Deposito, Nube AWS..."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Responsable
              <select
                value={assetForm.responsibleId}
                onChange={event =>
                  setAssetForm(current => ({
                    ...current,
                    responsibleId: event.target.value,
                  }))
                }
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
              >
                <option value="">Seleccionar responsable</option>
                {personnel.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.nombre_completo}
                    {person.puesto ? ` - ${person.puesto}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Fecha de adquisicion
                <input
                  type="date"
                  value={assetForm.acquisitionDate}
                  onChange={event =>
                    setAssetForm(current => ({
                      ...current,
                      acquisitionDate: event.target.value,
                    }))
                  }
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Proximo mantenimiento
                <input
                  type="date"
                  value={assetForm.nextMaintenanceDate}
                  onChange={event =>
                    setAssetForm(current => ({
                      ...current,
                      nextMaintenanceDate: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Registrar activo
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Inventario de activos
                </h2>
                <p className="text-sm text-slate-500">
                  Filtra por tipo y estado para revisar disponibilidad,
                  responsables y proximo mantenimiento.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={filterType}
                  onChange={event =>
                    setFilterType(
                      event.target.value as 'all' | InfraAsset['type']
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                >
                  <option value="all">Todos los tipos</option>
                  {INFRA_ASSET_TYPES.map(type => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={event =>
                    setFilterStatus(
                      event.target.value as 'all' | InfraAsset['status']
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
                >
                  <option value="all">Todos los estados</option>
                  {INFRA_ASSET_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <Building2 className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No hay activos registrados
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Carga el primer activo para comenzar a gestionar
                infraestructura, responsables y mantenimientos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assets.map(asset => {
                const latestMaintenance =
                  asset.maintenanceHistory[asset.maintenanceHistory.length - 1];
                const maintenanceOpen = selectedAssetId === asset.id;

                return (
                  <article
                    key={asset.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {asset.name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass(asset.status)}`}
                          >
                            {STATUS_LABELS[asset.status]}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {TYPE_LABELS[asset.type]}
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Ubicacion
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {asset.location}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Responsable
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {getResponsibleName(asset.responsibleId)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Alta
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {asset.acquisitionDate}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Proximo mantenimiento
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {asset.nextMaintenanceDate || 'No definido'}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <ClipboardList className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Historial
                              </span>
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                              {asset.maintenanceHistory.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Wrench className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Ultimo trabajo
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {latestMaintenance
                                ? `${latestMaintenance.date} - ${MAINTENANCE_LABELS[latestMaintenance.type]}`
                                : 'Sin registros'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Settings className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Ejecutado por
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {latestMaintenance?.performedBy ||
                                'Sin registros'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 lg:w-[220px] lg:flex-col">
                        <button
                          type="button"
                          onClick={() => {
                            if (maintenanceOpen) {
                              setSelectedAssetId(null);
                              resetMaintenanceForm();
                              return;
                            }
                            openMaintenanceForm(asset);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
                        >
                          <Wrench className="h-4 w-4" />
                          {maintenanceOpen
                            ? 'Cerrar formulario'
                            : 'Registrar mantenimiento'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {asset.maintenanceHistory.length > 0 && (
                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-900">
                          Historial reciente
                        </h4>
                        <div className="mt-3 grid gap-3">
                          {asset.maintenanceHistory
                            .slice(-3)
                            .reverse()
                            .map((maintenance, index) => (
                              <div
                                key={`${asset.id}-${maintenance.date}-${index}`}
                                className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-900">
                                    {maintenance.date}
                                  </span>
                                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                                    {MAINTENANCE_LABELS[maintenance.type]}
                                  </span>
                                </div>
                                <p className="mt-2">
                                  {maintenance.description}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Ejecutado por {maintenance.performedBy}
                                  {maintenance.cost !== undefined
                                    ? ` | Costo ${maintenance.cost}`
                                    : ''}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {maintenanceOpen && (
                      <form
                        onSubmit={handleAddMaintenance}
                        className="mt-5 grid gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 md:grid-cols-2"
                      >
                        <label className="block text-sm font-medium text-slate-700">
                          Fecha
                          <input
                            type="date"
                            value={maintenanceForm.date}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                date: event.target.value,
                              }))
                            }
                            required
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          Tipo
                          <select
                            value={maintenanceForm.type}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                type: event.target
                                  .value as MaintenanceRecord['type'],
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          >
                            {MAINTENANCE_TYPES.map(type => (
                              <option key={type} value={type}>
                                {MAINTENANCE_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          Ejecutado por
                          <input
                            value={maintenanceForm.performedBy}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                performedBy: event.target.value,
                              }))
                            }
                            required
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          Estado resultante
                          <select
                            value={maintenanceForm.status}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                status: event.target
                                  .value as InfraAsset['status'],
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          >
                            {INFRA_ASSET_STATUSES.filter(
                              status => status !== 'disposed'
                            ).map(status => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                          Descripcion
                          <textarea
                            value={maintenanceForm.description}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            required
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                            placeholder="Trabajo realizado, repuestos, hallazgos o ajustes..."
                          />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          Costo
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={maintenanceForm.cost}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                cost: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                          Proximo mantenimiento
                          <input
                            type="date"
                            value={maintenanceForm.nextMaintenanceDate}
                            onChange={event =>
                              setMaintenanceForm(current => ({
                                ...current,
                                nextMaintenanceDate: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                          />
                        </label>

                        <div className="flex flex-wrap gap-3 md:col-span-2">
                          <button
                            type="submit"
                            disabled={maintenanceSaving}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {maintenanceSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wrench className="h-4 w-4" />
                            )}
                            Guardar mantenimiento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(null);
                              resetMaintenanceForm();
                            }}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
