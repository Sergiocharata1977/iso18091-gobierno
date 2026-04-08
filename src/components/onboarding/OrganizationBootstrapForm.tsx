'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ONBOARDING_ROUTE } from '@/lib/auth/onboardingAccess';
import { normalizeTenantType, TenantType } from '@/lib/onboarding/tenantTypeUtils';
import type { Edition } from '@/types/edition';
import { Building2, CheckCircle2, Mail, User2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Props = {
  initialEmail?: string;
  initialOwnerName?: string;
  initialEdition?: Edition | null;
};

type FormState = {
  organization_name: string;
  tenant_type: TenantType | '';
  owner_name: string;
  owner_email: string;
};

const TENANT_TYPE_OPTIONS: Array<{
  value: TenantType;
  label: string;
  description: string;
}> = [
  {
    value: 'iso_puro',
    label: 'ISO puro',
    description: 'Implementacion ISO 9001 estandar sin modulos comerciales.',
  },
  {
    value: 'pyme',
    label: 'ISO + comercial',
    description: 'Activa onboarding con CRM y flujos comerciales.',
  },
  {
    value: 'dealer',
    label: 'Comercial puro',
    description: 'Prioriza CRM y ventas sin despliegue ISO completo.',
  },
];

export function OrganizationBootstrapForm({
  initialEmail,
  initialOwnerName,
  initialEdition,
}: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<FormState>({
    organization_name: '',
    tenant_type: 'iso_puro',
    owner_name: initialOwnerName || '',
    owner_email: initialEmail || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizedTenantType = useMemo(
    () => normalizeTenantType(form.tenant_type) || 'iso_puro',
    [form.tenant_type]
  );
  const isGovernmentEdition = initialEdition === 'government';

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm(current => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      router.replace('/login');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/onboarding/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organization_name: form.organization_name.trim(),
          tenant_type: normalizedTenantType,
          edition: initialEdition ?? undefined,
          owner_name: form.owner_name.trim(),
          owner_email: form.owner_email.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error || 'No se pudo iniciar el onboarding comercial'
        );
      }

      const organizationId =
        payload?.data?.organization_id ||
        payload?.data?.bootstrap?.organization_id ||
        null;

      if (organizationId && typeof window !== 'undefined') {
        sessionStorage.setItem('organization_id', organizationId);
      }

      router.replace(ONBOARDING_ROUTE);
    } catch (submitError) {
      console.error('[OrganizationBootstrapForm] Error:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Error al iniciar onboarding'
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
          <p className="text-sm text-slate-600">Preparando onboarding...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-600">
            Necesitas iniciar sesion para crear tu empresa.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Ir a login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#124735_45%,#0f766e_100%)] p-8 text-white shadow-[0_24px_90px_-48px_rgba(15,23,42,0.65)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Onboarding comercial
          </p>
          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
            Crea la empresa y entra al onboarding real.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-emerald-50/90">
            Este paso reemplaza la espera en pendiente. Definimos tu empresa,
            el tipo de tenant y el owner que va a liderar la configuracion.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <Building2 className="h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-sm font-semibold">Empresa lista</p>
              <p className="mt-1 text-sm text-emerald-50/80">
                Se crea la organizacion y se enlaza al usuario actual.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <User2 className="h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-sm font-semibold">Owner asignado</p>
              <p className="mt-1 text-sm text-emerald-50/80">
                El owner queda marcado como admin para el resto del onboarding.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <CheckCircle2 className="h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-sm font-semibold">Continuidad</p>
              <p className="mt-1 text-sm text-emerald-50/80">
                Luego te enviamos al router de onboarding tecnico.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Paso 1
            </p>
            {isGovernmentEdition ? (
              <div className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Configuracion: Gobierno Local
              </div>
            ) : null}
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Datos de empresa y owner
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Usamos estos datos para crear la organizacion y definir el flujo
              inicial del onboarding.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="organization_name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nombre de empresa
              </label>
              <input
                id="organization_name"
                name="organization_name"
                type="text"
                required
                value={form.organization_name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ej. Metalurgica del Sur"
              />
            </div>

            <div>
              <label
                htmlFor="tenant_type"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tenant type
              </label>
              <select
                id="tenant_type"
                name="tenant_type"
                value={form.tenant_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {TENANT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {
                  TENANT_TYPE_OPTIONS.find(
                    option => option.value === normalizedTenantType
                  )?.description
                }
              </p>
            </div>

            <div>
              <label
                htmlFor="owner_name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nombre del owner
              </label>
              <input
                id="owner_name"
                name="owner_name"
                type="text"
                required
                value={form.owner_name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Quien lidera la implementacion"
              />
            </div>

            <div>
              <label
                htmlFor="owner_email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email visible
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="owner_email"
                  name="owner_email"
                  type="email"
                  required
                  value={form.owner_email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="owner@empresa.com"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                Proximo paso
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Al confirmar, te enviamos a <code>{ONBOARDING_ROUTE}</code> y
                desde ahi se resuelve el onboarding tecnico correcto.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creando empresa...' : 'Crear empresa y continuar'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
