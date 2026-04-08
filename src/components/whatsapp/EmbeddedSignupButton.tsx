'use client';

import { Button } from '@/components/ui/button';
import type { EmbeddedSignupResult } from '@/types/whatsapp';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmbeddedSignupButtonProps {
  onSuccess: (result: EmbeddedSignupResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface FacebookBusiness {
  id?: string;
}

interface FacebookBusinessesResponse {
  data?: FacebookBusiness[];
  error?: {
    message?: string;
  };
}

function isFacebookBusinessesResponse(
  value: unknown
): value is FacebookBusinessesResponse {
  return typeof value === 'object' && value !== null;
}

const FACEBOOK_SDK_ID = 'facebook-jssdk';
const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const META_APP_ID = '1321768119829541';

export function EmbeddedSignupButton({
  onSuccess,
  onError,
  disabled = false,
}: EmbeddedSignupButtonProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initializeSdk = () => {
      if (!window.FB) {
        return;
      }

      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v22.0',
      });
    };

    if (window.FB) {
      initializeSdk();
      return;
    }

    const existingScript = document.getElementById(
      FACEBOOK_SDK_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', initializeSdk);
      return () => {
        existingScript.removeEventListener('load', initializeSdk);
      };
    }

    const script = document.createElement('script');
    script.id = FACEBOOK_SDK_ID;
    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onload = initializeSdk;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const handleClick = () => {
    if (typeof window === 'undefined' || !window.FB) {
      onError?.('SDK de Facebook no disponible. Recarga la pagina.');
      return;
    }

    const fb = window.FB;
    setLoading(true);

    fb.login(
      response => {
        if (!response.authResponse) {
          onError?.('El usuario cancelo el inicio de sesion.');
          setLoading(false);
          return;
        }

        const token = response.authResponse.accessToken;

        fb.api(
          '/me/businesses',
          { access_token: token },
          (apiResponse: unknown) => {
            if (!isFacebookBusinessesResponse(apiResponse)) {
              onError?.('Respuesta invalida al consultar la cuenta de negocio.');
              setLoading(false);
              return;
            }

            const businessResponse = apiResponse;

            if (businessResponse.error) {
              onError?.(
                businessResponse.error.message ||
                  'No se pudo obtener la cuenta de negocio.'
              );
              setLoading(false);
              return;
            }

            onSuccess({
              phone_number_id: '',
              waba_id: businessResponse.data?.[0]?.id ?? '',
              access_token: token,
              token_type: 'bearer',
            });
            setLoading(false);
          }
        );
      },
      {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        return_scopes: true,
      }
    );
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="bg-[#25D366] text-white shadow-sm hover:bg-[#1fba57] focus-visible:ring-[#25D366]"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <span className="mr-2 text-base leading-none" aria-hidden="true">
            💬
          </span>
          Conectar WhatsApp Business
        </>
      )}
    </Button>
  );
}

export default EmbeddedSignupButton;

declare global {
  interface Window {
    FB?: {
      init: (config: object) => void;
      login: (
        callback: (response: FBAuthResponse) => void,
        options: object
      ) => void;
      api: (
        path: string,
        params: object,
        callback: (response: unknown) => void
      ) => void;
    };
  }
}

interface FBAuthResponse {
  authResponse: {
    accessToken: string;
    userID: string;
    expiresIn: number;
    signedRequest: string;
  } | null;
  status: string;
}
