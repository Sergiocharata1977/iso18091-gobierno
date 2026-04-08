'use client';

import { useEffect, useState } from 'react';

interface InstalledCapabilityLike {
  capability_id: string;
  enabled: boolean;
  status: string;
}

interface UseOrganizationCapabilityParams {
  organizationId?: string | null;
  capabilityId: string;
  systemId?: string;
}

interface UseOrganizationCapabilityResult {
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

export function useOrganizationCapability({
  organizationId,
  capabilityId,
  systemId = 'iso9001',
}: UseOrganizationCapabilityParams): UseOrganizationCapabilityResult {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCapability = async () => {
      if (!organizationId) {
        if (!cancelled) {
          setEnabled(false);
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const search = new URLSearchParams({
          organization_id: organizationId,
          system_id: systemId,
        });
        const response = await fetch(`/api/capabilities/installed?${search}`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error || 'No se pudo validar la capability del tenant'
          );
        }

        const installedCapability = (payload.data || []).find(
          (item: InstalledCapabilityLike) => item.capability_id === capabilityId
        );

        if (!cancelled) {
          setEnabled(
            Boolean(
              installedCapability?.enabled &&
                installedCapability?.status === 'enabled'
            )
          );
        }
      } catch (fetchError) {
        if (!cancelled) {
          setEnabled(false);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo validar la capability del tenant'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCapability();

    return () => {
      cancelled = true;
    };
  }, [organizationId, capabilityId, systemId]);

  return { enabled, loading, error };
}
