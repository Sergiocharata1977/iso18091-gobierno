/**
 * Hook para validar códigos de proceso únicos
 * Verifica en tiempo real si un código ya está en uso
 */

import { useCallback, useRef, useState } from 'react';

interface CodeValidationState {
  checking: boolean;
  available: boolean | null;
  existingName?: string;
}

interface UseCodeValidationOptions {
  organizationId?: string;
  currentCode?: string; // El código actual del proceso (para permitirlo)
  debounceMs?: number;
}

export function useCodeValidation({
  organizationId,
  currentCode,
  debounceMs = 500,
}: UseCodeValidationOptions) {
  const [validation, setValidation] = useState<CodeValidationState>({
    checking: false,
    available: null,
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkCode = useCallback(
    async (code: string) => {
      if (!code || code.length < 2) {
        setValidation({ checking: false, available: null });
        return;
      }

      // Si es el mismo código actual, es válido
      if (currentCode?.toUpperCase() === code.toUpperCase()) {
        setValidation({ checking: false, available: true });
        return;
      }

      setValidation({ checking: true, available: null });

      try {
        const params = new URLSearchParams({ code });
        if (organizationId) {
          params.append('orgId', organizationId);
        }

        const response = await fetch(
          `/api/process-definitions/check-code?${params.toString()}`
        );
        const data = await response.json();

        setValidation({
          checking: false,
          available: data.available,
          existingName: data.existing?.nombre,
        });
      } catch (error) {
        console.error('Error checking code:', error);
        setValidation({ checking: false, available: null });
      }
    },
    [organizationId, currentCode]
  );

  const validateWithDebounce = useCallback(
    (code: string) => {
      // Limpiar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce
      timeoutRef.current = setTimeout(() => {
        checkCode(code);
      }, debounceMs);
    },
    [checkCode, debounceMs]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setValidation({ checking: false, available: null });
  }, []);

  return {
    ...validation,
    validate: validateWithDebounce,
    reset,
  };
}
