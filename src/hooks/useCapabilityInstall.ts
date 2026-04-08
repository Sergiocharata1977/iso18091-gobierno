'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

type MutationResponse = {
  success: boolean;
  error?: string;
};

interface UseCapabilityInstallOptions {
  onSuccess?: () => void;
}

const SYSTEM_ID = 'iso9001';

export function useCapabilityInstall(
  options: UseCapabilityInstallOptions = {}
) {
  const { onSuccess } = options;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMutation = async (
    input: RequestInfo | URL,
    init: RequestInit,
    messages: {
      successTitle: string;
      successDescription: string;
      fallbackError: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(input, init);
      const data = (await response.json()) as MutationResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || messages.fallbackError);
      }

      toast({
        title: messages.successTitle,
        description: messages.successDescription,
      });
      onSuccess?.();
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : messages.fallbackError;

      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const install = async (capabilityId: string): Promise<void> => {
    await runMutation(
      '/api/capabilities/install',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability_id: capabilityId,
          system_id: SYSTEM_ID,
        }),
      },
      {
        successTitle: 'Power instalado',
        successDescription: 'El Power quedo disponible en tu sistema.',
        fallbackError: 'No se pudo instalar el Power',
      }
    );
  };

  const uninstall = async (installedId: string): Promise<void> => {
    await runMutation(
      `/api/capabilities/${installedId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        successTitle: 'Power desinstalado',
        successDescription: 'El Power fue removido del sistema.',
        fallbackError: 'No se pudo desinstalar el Power',
      }
    );
  };

  const toggle = async (
    installedId: string,
    currentEnabled: boolean
  ): Promise<void> => {
    await runMutation(
      `/api/capabilities/${installedId}/toggle`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !currentEnabled,
        }),
      },
      {
        successTitle: currentEnabled ? 'Power desactivado' : 'Power activado',
        successDescription: currentEnabled
          ? 'El Power quedo instalado pero fuera de operacion.'
          : 'El Power vuelve a estar operativo.',
        fallbackError: 'No se pudo actualizar el Power',
      }
    );
  };

  return {
    install,
    uninstall,
    toggle,
    loading,
    error,
  };
}
