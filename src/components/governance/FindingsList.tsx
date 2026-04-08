'use client';

import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseButton } from '@/components/design-system/primitives/BaseButtonPrimitive';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Finding {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  evidence: string;
  daysOpen: number;
}

interface FindingsListProps {
  findings: Finding[];
  onFix: (id: string) => void;
}

export function FindingsList({ findings, onFix }: FindingsListProps) {
  const getSeverityColor = (s: Severity) => {
    switch (s) {
      case 'CRITICAL':
        return 'text-rose-700 bg-rose-100';
      case 'HIGH':
        return 'text-orange-700 bg-orange-100';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-100';
      case 'LOW':
        return 'text-blue-700 bg-blue-100';
    }
  };

  const getBadgeVariant = (s: Severity) => {
    switch (s) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-3">
      {findings.map((finding, index) => (
        <motion.div
          key={finding.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <BaseCard
            padding="sm"
            className="hover:border-cyan-200 transition-colors group bg-white border-slate-200"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Icon & Title */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`p-2 rounded-lg ${getSeverityColor(finding.severity)}`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {finding.code}
                    </span>
                    <BaseBadge
                      variant={getBadgeVariant(finding.severity)}
                      className="text-[10px] uppercase h-5 px-1.5"
                    >
                      {finding.severity}
                    </BaseBadge>
                  </div>
                  <h4 className="font-medium text-slate-900 group-hover:text-cyan-700 transition-colors">
                    {finding.title}
                  </h4>
                </div>
              </div>

              {/* Evidence */}
              <div className="hidden md:block flex-1 sm:border-l border-slate-200 sm:pl-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                  Evidence
                </p>
                <p className="text-sm text-slate-700 font-mono truncate">
                  {finding.evidence}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                <div className="bg-cyan-50 text-cyan-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {finding.daysOpen}d
                </div>
                <BaseButton
                  size="sm"
                  variant="default"
                  onClick={() => onFix(finding.id)}
                >
                  Fix Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </motion.div>
      ))}
    </div>
  );
}
