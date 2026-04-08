'use client';

import { AuditStatusBadge } from '@/components/audits/AuditStatusBadge';
import type { Audit } from '@/types/audits';
import { Calendar, ChevronRight, FileText, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuditListProps {
  audits: Audit[];
}

export function AuditList({ audits }: AuditListProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-6">
      {audits.map(audit => (
        <div
          key={audit.id}
          onClick={() => router.push(`/mejoras/auditorias/${audit.id}`)}
          className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {audit.title}
                  </h3>
                  <AuditStatusBadge status={audit.status} />
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {audit.auditNumber}
                </p>
                <p className="text-gray-700 line-clamp-2">{audit.scope}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha Planificada</p>
                  <p className="text-sm font-medium text-gray-900">
                    {audit.plannedDate?.toDate
                      ? audit.plannedDate.toDate().toLocaleDateString('es-ES')
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Auditor Líder</p>
                  <p className="text-sm font-medium text-gray-900">
                    {audit.leadAuditor}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="text-sm font-medium text-gray-900">
                    {audit.auditType === 'complete' ? 'Completa' : 'Parcial'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar (if in progress or completed) */}
            {(audit.status === 'in_progress' ||
              audit.status === 'completed') && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">
                    Progreso de Evaluación
                  </span>
                  <span className="font-semibold text-gray-900">
                    {audit.normPointsVerification?.filter(
                      v => v.conformityStatus !== null
                    ).length || 0}{' '}
                    / {audit.normPointsVerification?.length || 0} puntos
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        audit.normPointsVerification?.length
                          ? (
                              ((audit.normPointsVerification.filter(
                                v => v.conformityStatus !== null
                              ).length || 0) /
                                audit.normPointsVerification.length) *
                              100
                            ).toFixed(0)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
