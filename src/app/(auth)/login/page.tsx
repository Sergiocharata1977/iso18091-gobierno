'use client';

import { AuthShell, AuthStatusScreen } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from '@/firebase/auth';
import { resolveOnboardingAccess } from '@/lib/auth/onboardingAccess';
import { resolvePostLoginDestination } from '@/lib/auth/postLoginRouting';
import type { Edition } from '@/types/edition';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, organizationEdition } = useAuth();

  const returnUrl = searchParams.get('returnUrl');

  const resolveEditionAwareDestination = (
    destination: string,
    edition?: Edition | null
  ) => {
    if (
      edition === 'government' &&
      (destination === '/' ||
        destination === '/dashboard' ||
        destination === '/noticias')
    ) {
      return '/gobierno/panel';
    }

    return destination;
  };

  useEffect(() => {
    if (!authLoading && user) {
      router.push(
        resolveEditionAwareDestination(
          resolvePostLoginDestination(user, returnUrl),
          organizationEdition
        )
      );
    }
  }, [user, authLoading, router, returnUrl, organizationEdition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(email, password);

    if (result.success) {
      let landingDestination = resolvePostLoginDestination(null, returnUrl);
      let userEdition: Edition | null = null;

      try {
        const idTokenResult = await result.user?.getIdTokenResult();
        userEdition =
          idTokenResult?.claims.edition === 'government'
            ? 'government'
            : null;
      } catch (tokenError) {
        console.error(
          '[Login] Error al leer claims del token para edition:',
          tokenError
        );
      }

      try {
        const userResponse = await fetch(`/api/users/${result.user?.uid}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const access = resolveOnboardingAccess(userData);

          if (typeof window !== 'undefined') {
            if (userData.rol === 'super_admin' || !userData.organization_id) {
              sessionStorage.removeItem('organization_id');
            } else {
              sessionStorage.setItem('organization_id', userData.organization_id);
            }
          }

          landingDestination =
            access.route === '/noticias'
              ? resolvePostLoginDestination(userData, returnUrl)
              : access.route;
        }
      } catch (fetchError) {
        console.error('[Login] Error al obtener datos de usuario:', fetchError);
      }

      router.push(
        resolveEditionAwareDestination(
          landingDestination,
          userEdition ?? organizationEdition
        )
      );
      return;
    }

    setError(result.error || 'No pudimos iniciar sesion. Verifica tus datos.');
    setLoading(false);
  };

  if (authLoading) {
    return (
      <AuthStatusScreen
        title="Validando acceso"
        description="Estamos verificando tu sesion y el contexto de tu organizacion."
      />
    );
  }

  if (user) {
    return (
      <AuthStatusScreen
        title="Redirigiendo"
        description="Tu sesion esta activa. Te llevamos al modulo correspondiente."
      />
    );
  }

  return (
    <AuthShell
      panelEyebrow="Acceso a la plataforma"
      panelTitle="Iniciar sesion"
      panelDescription="Accede a tu entorno operativo, tus evidencias y el seguimiento del sistema de gestion."
      heroEyebrow="Sistema de gestion ISO 9001"
      heroTitle="Acceso profesional para un producto que soporta operaciones criticas."
      heroDescription="9001 App concentra el trabajo diario del sistema de calidad con una experiencia consistente, trazable y lista para auditoria."
      heroFeatures={[
        {
          icon: Sparkles,
          title: 'Operacion asistida por IA',
          description:
            'Don Candido acelera analisis, documentacion y seguimiento sin romper el flujo operativo.',
          tone: 'default',
        },
        {
          icon: TrendingUp,
          title: 'Visibilidad ejecutiva',
          description:
            'Indicadores, hallazgos y acciones se ordenan con una jerarquia clara para tomar decisiones.',
          tone: 'success',
        },
        {
          icon: ShieldCheck,
          title: 'Cumplimiento y trazabilidad',
          description:
            'Cada modulo mantiene contexto, evidencias y control sobre el avance del sistema ISO 9001.',
          tone: 'default',
        },
      ]}
      heroFooter="Acceso seguro para equipos internos, responsables de calidad y administradores de la organizacion."
      aside={
        <div className="rounded-[var(--radius-xl)] border border-border/80 bg-slate-950 px-5 py-4 text-sm text-slate-100 shadow-[var(--shadow-sm)]">
          <p className="font-medium">Acceso unificado</p>
          <p className="mt-1 text-slate-300">
            La misma identidad visual acompana login, registro y estados de aprobacion.
          </p>
        </div>
      }
      footer={
        <p className="text-center">
          No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold text-primary hover:text-primary-hover">
            Crear acceso
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo electronico
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@empresa.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
            className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contrasena
            </label>
            <span className="text-xs text-muted-foreground">Protegida y cifrada</span>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Ingresa tu contrasena"
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              disabled={loading}
              className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 pr-12 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              disabled={loading}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-border/80 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            Usa las credenciales de tu organizacion para continuar con el flujo de trabajo asignado.
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-lg)] text-sm font-semibold shadow-[var(--shadow-sm)]"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Ingresando...
            </>
          ) : (
            <>
              Ingresar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-primary/20 bg-primary-soft px-4 py-3 text-xs text-success-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <span>Tu acceso respeta permisos, edicion y estado de onboarding.</span>
        </div>
      </form>
    </AuthShell>
  );
}

function LoginLoading() {
  return (
    <AuthStatusScreen
      title="Cargando acceso"
      description="Preparando la pantalla de autenticacion."
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}

