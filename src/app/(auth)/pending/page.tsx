'use client';

import { AuthShell, AuthStatusScreen } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Clock3, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * LEGACY SCREEN: flujo de espera para cuentas creadas bajo aprobacion manual.
 * Los nuevos registros usan auto-registro y onboarding directo.
 */
export default function PendingApprovalPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showLegacyBanner =
    searchParams.get('legacy') === '1' || user?.rol === 'super_admin';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <AuthStatusScreen
        title="Validando estado"
        description="Estamos comprobando el estado de tu cuenta."
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthShell
      panelEyebrow="Estado de acceso"
      panelTitle="Cuenta en revision"
      panelDescription="Recibimos tu alta correctamente. El equipo revisa la solicitud antes de habilitar el entorno operativo."
      heroEyebrow="Proceso de aprobacion"
      heroTitle="Un estado pendiente tambien debe sentirse parte del mismo producto."
      heroDescription="Esta vista mantiene la identidad de login y registro, y explica con claridad por que el acceso aun no esta activo."
      heroFeatures={[
        {
          icon: ShieldAlert,
          title: 'Validacion manual',
          description:
            'Se comprueba la solicitud para proteger permisos, contexto organizacional y uso correcto de la plataforma.',
          tone: 'warning',
        },
        {
          icon: Clock3,
          title: 'Activacion posterior',
          description:
            'Cuando el alta se apruebe, el acceso quedara listo para continuar con onboarding y operacion diaria.',
          tone: 'default',
        },
        {
          icon: Sparkles,
          title: 'Experiencia consistente',
          description:
            'No hay quiebre visual: esta pantalla mantiene el mismo lenguaje de producto premium.',
          tone: 'success',
        },
      ]}
      heroFooter="Mientras tanto, puedes cerrar sesion y volver a ingresar mas tarde con las mismas credenciales."
    >
      <div className="space-y-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] border border-warning/25 bg-warning-soft text-warning-foreground shadow-[var(--shadow-xs)]">
          <Clock3 className="h-7 w-7" />
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border/80 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          Gracias por registrarte en <strong className="text-foreground">Don Candido IA</strong>.
          Tu solicitud fue recibida y esta siendo evaluada por el equipo de administracion.
        </div>

        <div className="rounded-[var(--radius-xl)] border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm font-semibold text-foreground">Que sigue</p>
          <p className="mt-1 text-sm leading-6 text-success-foreground">
            Recibiras una notificacion cuando la cuenta quede aprobada y el trial de 15 dias este activo.
          </p>
        </div>

        {showLegacyBanner && (
          <div className="rounded-[var(--radius-lg)] border border-warning/30 bg-warning-soft p-3 text-xs leading-5 text-warning-foreground">
            {/* LEGACY: Este flujo es para cuentas aprobadas manualmente antes del 2026-04-08.
                Los nuevos registros van directo a onboarding sin pasar por aqui.
                Esta pantalla se mantiene para compatibilidad con cuentas existentes. */}
            <p>
              Contexto legacy interno: esta pantalla corresponde al flujo de aprobacion manual previo al auto-registro.
            </p>
            {user?.rol === 'super_admin' && (
              <p className="mt-2 font-semibold">
                Flujo legacy: esta cuenta fue creada antes del sistema de auto-registro.
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleLogout}
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-[var(--radius-lg)] font-semibold"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </Button>
      </div>
    </AuthShell>
  );
}

