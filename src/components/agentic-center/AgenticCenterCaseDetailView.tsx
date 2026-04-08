'use client';

import AgenticCaseDetailPanel from '@/components/agentic-center/AgenticCaseDetailPanel';
import {
  buildCaseViewModel,
  type AgenticCaseViewModel,
} from '@/components/agentic-center/agenticCenterPresentation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AgenticCenterCase } from '@/types/agentic-center';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CasesResponse {
  success: boolean;
  error?: string;
  data?: {
    organizationId: string;
    generatedAt: string;
    casos: AgenticCenterCase[];
  };
}

interface AgenticCenterCaseDetailViewProps {
  caseId: string;
}

export default function AgenticCenterCaseDetailView({
  caseId,
}: AgenticCenterCaseDetailViewProps) {
  const [cases, setCases] = useState<AgenticCenterCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCase() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/agentic-center/cases', { cache: 'no-store' });
        const json = (await response.json()) as CasesResponse;

        if (!json.success) {
          throw new Error(json.error ?? 'No se pudo cargar el detalle del caso.');
        }

        setCases(json.data?.casos ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Ocurrio un error inesperado al cargar el detalle del caso.'
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCase();
  }, []);

  const selectedCase: AgenticCaseViewModel | null = useMemo(() => {
    const caseItem = cases.find(item => item.id === caseId);
    return caseItem ? buildCaseViewModel(caseItem) : null;
  }, [caseId, cases]);

  if (loading) {
    return (
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
        <div className="flex w-full flex-col gap-5 px-4 py-6 md:px-6 lg:py-8">
          <Skeleton className="h-11 w-52 rounded-2xl" />
          <Skeleton className="h-[840px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="flex w-full flex-col gap-5 px-4 py-6 md:px-6 lg:py-8">
        <div className="flex items-center">
          <Button asChild type="button" variant="outline" className="rounded-2xl">
            <Link href="/centro-agentico">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al tablero
            </Link>
          </Button>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!error && !selectedCase ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              El caso solicitado no existe o ya no esta visible en el tablero.
            </AlertDescription>
          </Alert>
        ) : null}

        {selectedCase ? <AgenticCaseDetailPanel item={selectedCase} /> : null}
      </div>
    </div>
  );
}
