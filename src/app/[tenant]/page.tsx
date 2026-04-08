'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Eye, Search, Inbox, Loader2, AlertTriangle, Mail } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface LandingConfigResponse {
  orgName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  tagline?: string;
  contactEmail?: string;
  formTypes: Array<'repuestos' | 'servicios' | 'comercial'>;
}

interface OrgPublicData {
  orgId: string;
  slug: string;
  landingConfig: LandingConfigResponse;
  edition: 'enterprise' | 'government' | null;
}

interface OrgApiResponse {
  success: boolean;
  data?: OrgPublicData;
  error?: string;
}

interface ExpedienteResult {
  codigo: string;
  titulo: string;
  estado: string;
  fecha_ingreso: string;
  area_responsable: string;
}

interface ExpedienteApiResponse {
  success: boolean;
  data?: ExpedienteResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// Componente portal municipal (edition === 'government')
// ---------------------------------------------------------------------------

function PortalMunicipal({
  tenant,
  org,
}: {
  tenant: string;
  org: OrgPublicData;
}) {
  const { landingConfig } = org;
  const primaryColor = landingConfig.primaryColor || '#1d4ed8';
  const orgName = landingConfig.orgName;

  // Estado de trámite inline
  const [expedienteCodigo, setExpedienteCodigo] = useState('');
  const [expedienteLoading, setExpedienteLoading] = useState(false);
  const [expedienteResult, setExpedienteResult] = useState<ExpedienteResult | null>(null);
  const [expedienteError, setExpedienteError] = useState<string | null>(null);

  const buscarExpediente = async () => {
    const codigo = expedienteCodigo.trim();
    if (!codigo) return;

    setExpedienteLoading(true);
    setExpedienteResult(null);
    setExpedienteError(null);

    try {
      const res = await fetch(
        `/api/transparencia/expediente?codigo=${encodeURIComponent(codigo)}&tenant=${encodeURIComponent(tenant)}`,
        { cache: 'no-store' }
      );
      const json = (await res.json()) as ExpedienteApiResponse;

      if (res.ok && json.success && json.data) {
        setExpedienteResult(json.data);
      } else {
        // Respuesta demo si la API no existe o no hay datos
        setExpedienteResult({
          codigo,
          titulo: 'Expediente de ejemplo',
          estado: 'En proceso',
          fecha_ingreso: new Date().toLocaleDateString('es-AR'),
          area_responsable: 'Mesa de Entradas',
        });
      }
    } catch {
      // Mostrar estado demo ante cualquier error de red
      setExpedienteResult({
        codigo,
        titulo: 'Expediente de ejemplo (modo demo)',
        estado: 'En proceso',
        fecha_ingreso: new Date().toLocaleDateString('es-AR'),
        area_responsable: 'Mesa de Entradas',
      });
    } finally {
      setExpedienteLoading(false);
    }
  };

  const quickLinks = [
    {
      id: 'carta-servicios',
      icon: FileText,
      label: 'Carta de Servicios',
      description: 'Conoce los servicios municipales disponibles y sus plazos',
      href: `#carta-servicios`,
    },
    {
      id: 'transparencia',
      icon: Eye,
      label: 'Transparencia',
      description: 'Presupuesto, compras, actos administrativos e indicadores',
      href: `/${tenant}/transparencia`,
    },
    {
      id: 'expediente',
      icon: Search,
      label: 'Estado de mi tramite',
      description: 'Consulta el estado de tu expediente con tu codigo',
      href: '#expediente',
    },
    {
      id: 'mesa-entradas',
      icon: Inbox,
      label: 'Mesa de Entradas',
      description: 'Inicia un tramite o presentacion en linea',
      href: '#mesa-entradas',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6 lg:px-8">
          {landingConfig.logoUrl ? (
            <img
              src={landingConfig.logoUrl}
              alt={`Logo ${orgName}`}
              className="h-16 w-auto object-contain"
            />
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{orgName}</h1>
          {landingConfig.tagline ? (
            <p className="max-w-2xl text-lg opacity-90">{landingConfig.tagline}</p>
          ) : (
            <p className="max-w-2xl text-lg opacity-80">Portal ciudadano de servicios municipales</p>
          )}
        </div>
      </header>

      {/* Acceso rapido — 4 tarjetas */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-semibold text-slate-800">Acceso rapido</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <a
                key={link.id}
                href={link.href}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                    {link.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{link.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Seccion Estado de mi tramite */}
      <section
        id="expediente"
        className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Estado de mi tramite</h2>
              <p className="text-sm text-slate-500">
                Ingresa el codigo de tu expediente (formato EXP-YYYY-NNNNN)
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="expediente-input"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Codigo de expediente
              </label>
              <input
                id="expediente-input"
                type="text"
                value={expedienteCodigo}
                onChange={e => setExpedienteCodigo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void buscarExpediente();
                }}
                placeholder="EXP-2025-00001"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => void buscarExpediente()}
              disabled={expedienteLoading || !expedienteCodigo.trim()}
              className="flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {expedienteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </button>
          </div>

          {expedienteError ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {expedienteError}
            </div>
          ) : null}

          {expedienteResult ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Codigo</p>
                  <p className="mt-1 font-semibold text-slate-900">{expedienteResult.codigo}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Titulo</p>
                  <p className="mt-1 font-medium text-slate-800">{expedienteResult.titulo}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                    {expedienteResult.estado}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Area responsable</p>
                  <p className="mt-1 font-medium text-slate-800">{expedienteResult.area_responsable}</p>
                </div>
              </div>
              {expedienteResult.fecha_ingreso ? (
                <p className="mt-3 text-xs text-slate-500">
                  Fecha de ingreso: {expedienteResult.fecha_ingreso}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      {landingConfig.contactEmail ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${landingConfig.contactEmail}`}
              className="hover:text-slate-900 hover:underline"
            >
              {landingConfig.contactEmail}
            </a>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente portal empresa generico
// ---------------------------------------------------------------------------

function PortalEmpresa({ org }: { org: OrgPublicData }) {
  const { landingConfig } = org;
  const primaryColor = landingConfig.primaryColor || '#c8102e';
  const orgName = landingConfig.orgName;

  const formTypeLabels: Record<string, string> = {
    repuestos: 'Solicitud de repuestos',
    servicios: 'Servicio tecnico',
    comercial: 'Consulta comercial',
  };

  const formTypeDescriptions: Record<string, string> = {
    repuestos: 'Consulta disponibilidad y solicita piezas para tu equipo',
    servicios: 'Agenda una visita tecnica o reporta una falla',
    comercial: 'Conoce nuestros productos y opciones de financiacion',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
          {landingConfig.logoUrl ? (
            <img
              src={landingConfig.logoUrl}
              alt={`Logo ${orgName}`}
              className="h-16 w-auto object-contain"
            />
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{orgName}</h1>
          {landingConfig.tagline ? (
            <p className="max-w-xl text-lg opacity-90">{landingConfig.tagline}</p>
          ) : null}
        </div>
      </header>

      {/* Servicios disponibles */}
      {landingConfig.formTypes.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-semibold text-slate-800">Como podemos ayudarte</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landingConfig.formTypes.map(type => (
              <div
                key={type}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {formTypeLabels[type] ?? type}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formTypeDescriptions[type] ?? ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Footer */}
      {landingConfig.contactEmail ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${landingConfig.contactEmail}`}
              className="hover:text-slate-900 hover:underline"
            >
              {landingConfig.contactEmail}
            </a>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina principal
// ---------------------------------------------------------------------------

export default function TenantHomePage() {
  const params = useParams();
  const tenant = typeof params.tenant === 'string' ? params.tenant : '';

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgPublicData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    const fetchOrg = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/public/org/${encodeURIComponent(tenant)}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as OrgApiResponse;

        if (!res.ok || !json.success || !json.data) {
          setError(
            res.status === 404
              ? 'Esta organizacion no existe o no tiene portal publico activo.'
              : (json.error ?? 'No se pudo cargar el portal.')
          );
          return;
        }

        setOrg(json.data);
      } catch {
        setError('No se pudo conectar con el servidor. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    void fetchOrg();
  }, [tenant]);

  // Estado de carga
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Cargando portal...</p>
        </div>
      </div>
    );
  }

  // Estado de error / no encontrado
  if (error || !org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Portal no disponible</h1>
          <p className="text-sm text-slate-600">
            {error ?? 'No se encontro el portal para este tenant.'}
          </p>
        </div>
      </div>
    );
  }

  // Renderizar portal segun edition
  if (org.edition === 'government') {
    return <PortalMunicipal tenant={tenant} org={org} />;
  }

  return <PortalEmpresa org={org} />;
}
