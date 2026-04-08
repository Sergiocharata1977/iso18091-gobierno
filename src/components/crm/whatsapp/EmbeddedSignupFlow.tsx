'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, LogIn, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type FlowStep = 'intro' | 'oauth' | 'processing' | 'success' | 'error';

interface ConnectResponseData {
  waba_id: string;
  phone_number_id?: string;
  display_phone_number?: string;
}

interface EmbeddedSignupFlowProps {
  organizationId: string;
  getAuthToken: () => Promise<string>;
  onConnected?: (data: ConnectResponseData) => void;
}

interface FBLoginResponse {
  authResponse?: {
    code?: string;
  } | null;
}

interface FacebookSDK {
  init: (config: { appId: string; version: string }) => void;
  login: (
    callback: (response: FBLoginResponse) => void,
    options: Record<string, unknown>
  ) => void;
}

interface MetaConnectResponse {
  success: boolean;
  data?: ConnectResponseData;
  error?: string;
}

const FACEBOOK_SDK_ID = 'facebook-jssdk-embedded-signup';
const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/es_LA/sdk.js';

export function EmbeddedSignupFlow({
  organizationId,
  getAuthToken,
  onConnected,
}: EmbeddedSignupFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('intro');
  const [sdkReady, setSdkReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<ConnectResponseData | null>(null);

  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const metaConfigId =
    process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID ??
    process.env.NEXT_PUBLIC_META_CONFIG_ID;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fbWindow = window as Window & {
      fbAsyncInit?: () => void;
      FB?: FacebookSDK;
    };

    const initSdk = () => {
      if (!fbWindow.FB || !metaAppId) return;
      fbWindow.FB.init({
        appId: metaAppId,
        version: 'v19.0',
      });
      setSdkReady(true);
    };

    if (!metaAppId) {
      setErrorMessage('Falta NEXT_PUBLIC_META_APP_ID en variables de entorno.');
      return;
    }

    if (fbWindow.FB) {
      initSdk();
      return;
    }

    fbWindow.fbAsyncInit = initSdk;

    const existingScript = document.getElementById(
      FACEBOOK_SDK_ID
    ) as HTMLScriptElement | null;
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = FACEBOOK_SDK_ID;
    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [metaAppId]);

  const stepNumber = useMemo(() => {
    if (step === 'intro') return 1;
    if (step === 'oauth') return 2;
    if (step === 'processing') return 3;
    return 4;
  }, [step]);

  const handleStart = () => {
    setErrorMessage(null);
    setStep('oauth');
  };

  const handleConnect = () => {
    const fbWindow = window as Window & { FB?: FacebookSDK };
    if (!fbWindow.FB) {
      setErrorMessage('SDK de Meta no disponible. Recarga la pagina.');
      return;
    }
    if (!metaConfigId) {
      setErrorMessage(
        'Falta NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID para iniciar el flujo.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    fbWindow.FB.login(
      async (response: FBLoginResponse) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setErrorMessage('No se recibio el codigo OAuth de Meta.');
          setStep('error');
          setIsSubmitting(false);
          return;
        }

        setStep('processing');
        try {
          const token = await getAuthToken();
          const res = await fetch(
            `/api/whatsapp/connect?organization_id=${encodeURIComponent(organizationId)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ code }),
            }
          );

          const payload = (await res.json()) as MetaConnectResponse;
          if (!res.ok || !payload.success || !payload.data) {
            throw new Error(payload.error ?? 'No se pudo conectar WhatsApp.');
          }

          setSuccessData(payload.data);
          onConnected?.(payload.data);
          setStep('success');
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Error inesperado en la conexion.'
          );
          setStep('error');
        } finally {
          setIsSubmitting(false);
        }
      },
      {
        config_id: metaConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureName: 'whatsapp_embedded_signup',
          sessionInfoVersion: 3,
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Conecta tu numero WhatsApp Business</CardTitle>
          <Badge variant="outline">Paso {stepNumber} de 4</Badge>
        </div>
        <CardDescription>
          Embedded Signup de Meta para conectar la cuenta por organizacion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de conexion</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {step === 'intro' ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Necesitas una cuenta activa de Meta Business Manager.
            </p>
            <Button onClick={handleStart} className="w-full sm:w-auto">
              <Phone className="mr-2 h-4 w-4" />
              Comenzar
            </Button>
          </div>
        ) : null}

        {step === 'oauth' ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Inicia sesion con Meta para autorizar acceso a tu WhatsApp Business
              Account.
            </p>
            <Button
              onClick={handleConnect}
              disabled={!sdkReady || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Iniciar sesion con Meta
            </Button>
          </div>
        ) : null}

        {step === 'processing' ? (
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Conectando tu numero...</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando permisos y configurando datos.
            </p>
          </div>
        ) : null}

        {step === 'success' ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Numero conectado exitosamente
            </p>
            <p className="text-sm text-emerald-700">
              {successData?.display_phone_number ?? 'Numero'} listo para recibir
              mensajes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push('/crm/whatsapp')}>Ir al Inbox</Button>
              <Button variant="outline" onClick={() => router.refresh()}>
                Actualizar estado
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'error' ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('oauth')}>
              Reintentar
            </Button>
            <Button variant="ghost" onClick={() => setStep('intro')}>
              Volver al inicio
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default EmbeddedSignupFlow;
