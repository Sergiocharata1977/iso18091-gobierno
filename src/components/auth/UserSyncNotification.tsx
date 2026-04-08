'use client';

import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserSyncNotificationProps {
  show: boolean;
  onComplete: () => void;
}

export function UserSyncNotification({
  show,
  onComplete,
}: UserSyncNotificationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!show) return;

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
            window.location.reload();
          }, 500);
          return 100;
        }
        return prev + 20;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center space-y-4">
          {progress < 100 ? (
            <>
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-emerald-600">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="space-y-2 w-full">
                <h3 className="text-xl font-semibold text-gray-900">
                  Sincronizando usuario
                </h3>
                <p className="text-sm text-gray-600">
                  Configurando tu cuenta en el sistema...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">¡Listo!</h3>
                <p className="text-sm text-gray-600">
                  Tu cuenta ha sido configurada correctamente
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
