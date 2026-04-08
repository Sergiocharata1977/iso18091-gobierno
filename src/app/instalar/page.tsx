'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';

type DeviceType = 'android' | 'ios' | 'desktop' | 'unknown';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstalarPage() {
  const [device, setDevice] = useState<DeviceType>('unknown');
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detectar dispositivo
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDevice('ios');
    } else if (/android/.test(userAgent)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalación (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (device === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // No hay prompt disponible, mostrar instrucciones manuales
      setShowAndroidInstructions(true);
    }
  };

  const handleContinue = () => {
    window.location.href = '/app-vendedor';
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Instalación Completada
            </h1>
            <div className="text-gray-600 mb-6 space-y-4">
              <p>
                La aplicación se ha instalado correctamente en segundo plano.
              </p>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="font-medium text-green-800">
                  Para usarla, busca el icono "Don Cándido" en tu pantalla de
                  inicio o cajón de aplicaciones.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Ya puedes cerrar esta pestaña.
              </p>
            </div>
            <Button
              onClick={handleContinue}
              variant="outline"
              className="w-full text-gray-500"
              size="sm"
            >
              Continuar en versión web
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
        {/* Header con logo */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center text-white">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold">Don Cándido IA</h1>
          <p className="text-emerald-100 text-sm mt-1">
            CRM Móvil · Gestión de Oportunidades
          </p>
        </div>

        <CardContent className="p-6">
          {!showIOSInstructions && !showAndroidInstructions ? (
            <>
              {/* Beneficios */}
              <div className="space-y-4 mb-6">
                <h2 className="font-semibold text-gray-900 text-lg">
                  Gestiona tu CRM desde cualquier lugar
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">🎯</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Oportunidades de venta
                      </p>
                      <p className="text-xs text-gray-500">
                        Gestiona tu pipeline completo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">👥</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Clientes y contactos
                      </p>
                      <p className="text-xs text-gray-500">
                        Toda tu información organizada
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">📶</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Funciona sin internet
                      </p>
                      <p className="text-xs text-gray-500">
                        Trabaja offline, sincroniza después
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">📱</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Acceso rápido
                      </p>
                      <p className="text-xs text-gray-500">
                        Icono en tu pantalla de inicio
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <Button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  size="lg"
                >
                  {isInstalling ? (
                    <>
                      <svg
                        className="animate-spin w-5 h-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Instalando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {device === 'ios' ? 'Ver instrucciones' : 'Instalar App'}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleContinue}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Continuar en navegador
                </Button>
              </div>

              {/* Indicador de dispositivo */}
              <p className="text-center text-xs text-gray-400 mt-4">
                {device === 'android' && '📱 Android detectado'}
                {device === 'ios' && '🍎 iPhone/iPad detectado'}
                {device === 'desktop' && '💻 Escritorio detectado'}
              </p>
            </>
          ) : showAndroidInstructions ? (
            /* Instrucciones Android */
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg text-center">
                Cómo instalar en Android
              </h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Toca el menú ⋮ de Chrome
                    </p>
                    <p className="text-sm text-gray-500">
                      Los 3 puntos en la esquina superior derecha
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Busca "Instalar aplicación"
                    </p>
                    <p className="text-sm text-gray-500">
                      O "Añadir a pantalla de inicio"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Toca "Instalar"</p>
                    <p className="text-sm text-gray-500">
                      ¡Listo! La app aparecerá en tu pantalla de inicio
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  size="lg"
                >
                  Entendido, ir a la App
                </Button>

                <Button
                  onClick={() => setShowAndroidInstructions(false)}
                  variant="ghost"
                  className="w-full"
                >
                  ← Volver
                </Button>
              </div>
            </div>
          ) : (
            /* Instrucciones iOS */
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg text-center">
                Cómo instalar en iPhone/iPad
              </h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Toca el botón Compartir
                    </p>
                    <p className="text-sm text-gray-500">
                      Es el ícono con una flecha hacia arriba ⬆️ en la barra
                      inferior de Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Busca "Añadir a pantalla de inicio"
                    </p>
                    <p className="text-sm text-gray-500">
                      Desliza hacia abajo en el menú hasta encontrarlo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Toca "Añadir"</p>
                    <p className="text-sm text-gray-500">
                      ¡Listo! La app aparecerá en tu pantalla de inicio
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  size="lg"
                >
                  Entendido, continuar
                </Button>

                <Button
                  onClick={() => setShowIOSInstructions(false)}
                  variant="ghost"
                  className="w-full"
                >
                  ← Volver
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            🔒 App segura · No requiere tienda de apps
          </p>
        </div>
      </Card>
    </div>
  );
}
