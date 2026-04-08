import { Building2, ShieldCheck } from 'lucide-react';

import { getTenantConfigBySlug } from '@/lib/portal/tenantConfig';

import { ProveedorForm } from './_components/ProveedorForm';

type PageProps = {
  params: {
    slug: string;
  };
};

export const revalidate = 300;

export default async function ProveedorPortalPage({ params }: PageProps) {
  const tenantConfig = await getTenantConfigBySlug(params.slug);

  if (!tenantConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffdf8_0%,#f8fafc_100%)] px-4 py-12">
        <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Building2 className="h-8 w-8" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Portal no disponible
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            No encontramos esta organizacion
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Verifique el enlace recibido. Si el problema persiste, solicite un nuevo
            acceso al equipo que le compartio el portal.
          </p>
        </section>
      </main>
    );
  }

  const { landingConfig, publicApiKey } = tenantConfig;
  const accentSoft = `${landingConfig.primaryColor}14`;
  const accentBorder = `${landingConfig.primaryColor}33`;

  return (
    <main
      className="min-h-screen px-4 py-10 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(180deg, ${accentSoft} 0%, #f8fafc 24%, #ffffff 100%)`,
      }}
    >
      <div className="mx-auto flex max-w-5xl justify-center">
        <section className="w-full max-w-[640px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
            <header className="border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                {landingConfig.logoUrl ? (
                  <img
                    src={landingConfig.logoUrl}
                    alt={landingConfig.orgName}
                    className="h-14 w-auto max-w-[180px] object-contain"
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: landingConfig.primaryColor }}
                  >
                    <Building2 className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">Portal publico</p>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Registro de Proveedores - {landingConfig.orgName}
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Complete el formulario para registrarse como proveedor homologado
              </p>

              <div
                className="mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: accentBorder,
                  backgroundColor: accentSoft,
                }}
              >
                <ShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: landingConfig.primaryColor }}
                />
                <p className="text-sm leading-6 text-slate-700">
                  Sus datos seran evaluados por el equipo de {landingConfig.orgName} para
                  iniciar el proceso de homologacion.
                </p>
              </div>
            </header>

            <div className="pt-6">
              <ProveedorForm
                primaryColor={landingConfig.primaryColor}
                publicApiKey={publicApiKey}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
