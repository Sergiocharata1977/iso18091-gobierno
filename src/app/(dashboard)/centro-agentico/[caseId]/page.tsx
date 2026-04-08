'use client';

import AgenticCenterCaseDetailView from '@/components/agentic-center/AgenticCenterCaseDetailView';
import { useParams } from 'next/navigation';

export default function CentroAgenticoCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = typeof params.caseId === 'string' ? params.caseId : '';

  return <AgenticCenterCaseDetailView caseId={caseId} />;
}
