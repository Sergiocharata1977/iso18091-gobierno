'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

/**
 * Hook que devuelve el Set de plugin_id instalados y activos para la org.
 * `hasCapability(plugin_id)` mantiene el nombre por compatibilidad.
 */
export function useInstalledCapabilities() {
  const { user } = useAuth();
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchInstalledPlugins = async () => {
      if (!user) {
        if (!cancelled) {
          setInstalled(new Set());
          setLoading(false);
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/plugins/installed', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok || cancelled) return;

        const data = (await res.json()) as {
          data?: Array<{
            plugin_id: string;
            enabled?: boolean;
            lifecycle?: string;
          }>;
        };

        const ids = new Set(
          (Array.isArray(data.data) ? data.data : [])
            .filter(
              plugin =>
                plugin.enabled !== false && plugin.lifecycle !== 'removed'
            )
            .map(plugin => plugin.plugin_id)
        );

        if (!cancelled) {
          setInstalled(ids);
        }
      } catch {
        // Silencioso: si falla, el gating se comporta como no habilitado.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchInstalledPlugins();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasCapability = (id: string) => installed.has(id);

  return { installed, hasCapability, loading };
}
