'use client';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { app } from '@/firebase/config';
import { BOOTSTRAP_ROUTE } from '@/lib/auth/onboardingAccess';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SelfRegisterResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  customToken?: string;
  organizationId?: string;
  trialEndsAt?: string;
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/self-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          companyName: formData.companyName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = (await response.json()) as SelfRegisterResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setError('Este email ya tiene una cuenta. Inicia sesion.');
          return;
        }

        if (response.status === 400) {
          setError(data.error || 'Revisa los datos del formulario.');
          return;
        }

        setError(data.error || 'No pudimos crear tu cuenta. Intenta nuevamente.');
        return;
      }

      if (!data.customToken) {
        setError('No se pudo iniciar sesion automaticamente.');
        return;
      }

      await signInWithCustomToken(getAuth(app), data.customToken);
      setSuccess(true);

      await new Promise(resolve => setTimeout(resolve, 800));
      router.replace(BOOTSTRAP_ROUTE);
    } catch (requestError) {
      console.error('Error during self registration:', requestError);
      setError('Ocurrio un problema de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      panelEyebrow="Registro gratuito"
      panelTitle="Empieza tu prueba de 15 dias"
      panelDescription="Crea tu cuenta y tu organizacion. Sin tarjeta de credito."
      heroTitle="Quince dias para evaluar una operacion de calidad con IA y trazabilidad real."
      heroDescription="Activa tu entorno en minutos y comienza a trabajar con los flujos de ISO 9001 desde el primer dia."
      heroFeatures={[
        {
          icon: Zap,
          title: 'Acceso inmediato',
          description:
            'Tu cuenta queda activa al instante y se redirige al onboarding sin friccion.',
          tone: 'success',
        },
        {
          icon: ShieldCheck,
          title: 'Cobertura funcional completa',
          description:
            'Procesos, auditorias, hallazgos, documentos e IA incluidos durante toda la prueba.',
          tone: 'default',
        },
        {
          icon: Users,
          title: 'Inicio colaborativo',
          description:
            'Invita usuarios y organiza responsabilidades desde el primer dia del trial.',
          tone: 'default',
        },
      ]}
      footer={
        <p className="text-center">
          Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
            Iniciar sesion
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Nombre y apellido"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={Boolean(error)}
              className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium text-foreground">
              Empresa u organizacion
            </label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              required
              autoComplete="organization"
              placeholder="Nombre de tu empresa"
              value={formData.companyName}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={Boolean(error)}
              className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email corporativo
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@empresa.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={Boolean(error)}
              className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contrasena
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                aria-invalid={Boolean(error)}
                className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirmar contrasena
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repite la contrasena"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                aria-invalid={Boolean(error)}
                className="h-12 rounded-[var(--radius-lg)] border-border bg-background px-4 text-base shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/80 focus-visible:border-primary/70 focus-visible:ring-primary/25"
              />
            </div>
          </div>
        </div>

        {error && !success ? (
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
            Tu cuenta se crea con el plan trial y acceso inmediato al onboarding asistido.
          </div>
        )}

        {success ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-primary/20 bg-primary-soft px-4 py-3 text-xs text-success-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span>Listo. Estamos iniciando tu entorno...</span>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-lg)] text-sm font-semibold shadow-[var(--shadow-sm)]"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Creando tu empresa...
            </>
          ) : (
            <>
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

