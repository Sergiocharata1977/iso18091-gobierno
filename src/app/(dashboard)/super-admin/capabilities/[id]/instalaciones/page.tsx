'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

type Installation = {
  org_id: string | null;
  status: string | null;
  enabled: boolean;
  version_installed: string | null;
  installed_by: string | null;
  installed_at: string | null;
};

type InstallationsResponse =
  | {
      success: true;
      data: Installation[];
    }
  | {
      success?: false;
      error?: string;
      message?: string;
    };

type CapabilityNameResponse =
  | {
      success: true;
      data: {
        id: string;
        name: string;
      };
    }
  | {
      success?: false;
      error?: string;
      message?: string;
    };

function formatInstallDate(installedAt: string | null): string {
  if (!installedAt) {
    return '-';
  }

  return new Date(installedAt).toLocaleDateString('es-AR');
}

export default function InstalacionesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = params.id;

  const [installations, setInstallations] = useState<Installation[]>([]);
  const [capName, setCapName] = useState<string>(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.rol !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.rol !== 'super_admin') return;
    void fetchData();
  }, [id, user]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      const [installationsRes, capabilityRes] = await Promise.all([
        fetch(`/api/super-admin/capabilities/${id}/installations`, {
          cache: 'no-store',
        }),
        fetch(`/api/super-admin/capabilities/${id}`, {
          cache: 'no-store',
        }),
      ]);

      const installationsJson =
        (await installationsRes.json()) as InstallationsResponse;

      if (!installationsRes.ok) {
        const message =
          ('error' in installationsJson &&
            (installationsJson.error || installationsJson.message)) ||
          'No se pudieron cargar las instalaciones.';
        setError(message);
        return;
      }

      if ('data' in installationsJson) {
        setInstallations(installationsJson.data);
      }

      if (capabilityRes.ok) {
        const capabilityJson =
          (await capabilityRes.json()) as CapabilityNameResponse;
        if ('data' in capabilityJson) {
          setCapName(capabilityJson.data.name || id);
        }
      }
    } catch (fetchError) {
      console.error('Error al cargar instalaciones:', fetchError);
      setError('Error de conexion al cargar las instalaciones.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Cargando instalaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/super-admin/capabilities"
            className="transition-colors hover:text-foreground"
          >
            Volver al catalogo
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/super-admin/capabilities"
          className="transition-colors hover:text-foreground"
        >
          Volver al catalogo
        </Link>
      </div>

      <PageHeader
        title={`Instalaciones de: ${capName}`}
        description={`${installations.length} organizacion${installations.length === 1 ? '' : 'es'} tienen este Power instalado`}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Org ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Version
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Instalado por
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Fecha instalacion
                </th>
              </tr>
            </thead>
            <tbody>
              {installations.map(inst => (
                <tr
                  key={`${inst.org_id ?? 'sin-org'}-${inst.installed_at ?? 'sin-fecha'}`}
                  className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {inst.org_id ?? '-'}
                    </code>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        inst.enabled
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                      }
                    >
                      {inst.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {inst.version_installed || '-'}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {inst.installed_by || '-'}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatInstallDate(inst.installed_at)}
                  </td>
                </tr>
              ))}

              {installations.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Este Power no esta instalado en ninguna organizacion todavia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
