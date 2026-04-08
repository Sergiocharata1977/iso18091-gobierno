'use client';

import { FindingCardCompact } from '@/components/findings/FindingCardCompact';
import type { Finding } from '@/types/findings';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AuditFindingsListProps {
  auditId: string;
}

export function AuditFindingsList({ auditId }: AuditFindingsListProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFindings = async () => {
      try {
        setIsLoading(true);
        // Cargar TODOS los hallazgos y filtrar en memoria
        const response = await fetch(`/api/findings`);

        if (!response.ok) {
          throw new Error('Error al cargar hallazgos');
        }

        const data = await response.json();
        // Filtrar por sourceId en el cliente
        const filtered = (data.findings || []).filter(
          (f: Finding) => f.registration?.sourceId === auditId
        );
        setFindings(filtered);
      } catch (error) {
        console.error('Error loading findings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFindings();
  }, [auditId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay hallazgos registrados para esta auditoría</p>
        <p className="text-sm mt-1">
          Haz clic en "Nuevo Hallazgo" para crear uno
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {findings.map(finding => (
        <FindingCardCompact key={finding.id} finding={finding} />
      ))}
    </div>
  );
}
