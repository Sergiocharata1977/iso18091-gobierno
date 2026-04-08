'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';

interface RelatedEntity {
  id: string;
  number: string;
  title: string;
  status?: string;
  severity?: string;
  type?: string;
}

interface RelatedEntitiesCardProps {
  title: string;
  entityType: 'audits' | 'findings' | 'actions';
  entities: RelatedEntity[];
  emptyMessage?: string;
}

export function RelatedEntitiesCard({
  title,
  entityType,
  entities,
  emptyMessage = 'No hay elementos relacionados',
}: RelatedEntitiesCardProps) {
  const getHref = (id: string) => {
    switch (entityType) {
      case 'audits':
        return `/mejoras/auditorias/${id}`;
      case 'findings':
        return `/mejoras/hallazgos/${id}`;
      case 'actions':
        return `/mejoras/acciones/${id}`;
      default:
        return '#';
    }
  };

  const getIcon = () => {
    switch (entityType) {
      case 'audits':
        return <Search className="h-5 w-5 text-blue-600" />;
      case 'findings':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'actions':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';

    const statusLower = status.toLowerCase();
    if (
      statusLower.includes('complet') ||
      statusLower.includes('cerr') ||
      statusLower === 'closed'
    ) {
      return 'success';
    }
    if (statusLower.includes('progres') || statusLower === 'in_progress') {
      return 'default';
    }
    if (
      statusLower.includes('pendiente') ||
      statusLower === 'open' ||
      statusLower === 'planned'
    ) {
      return 'secondary';
    }
    return 'default';
  };

  const getSeverityColor = (severity?: string) => {
    if (!severity) return 'default';

    const severityLower = severity.toLowerCase();
    if (severityLower === 'critical' || severityLower === 'crítica') {
      return 'destructive';
    }
    if (severityLower === 'major' || severityLower === 'mayor') {
      return 'destructive';
    }
    if (severityLower === 'minor' || severityLower === 'menor') {
      return 'secondary';
    }
    return 'default';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {getIcon()}
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline" className="ml-auto">
          {entities.length}
        </Badge>
      </div>

      {entities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {entities.map(entity => (
            <Link
              key={entity.id}
              href={getHref(entity.id)}
              className="block p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {entity.number}
                    </span>
                    {entity.severity && (
                      <Badge
                        variant={getSeverityColor(entity.severity)}
                        className="text-xs"
                      >
                        {entity.severity}
                      </Badge>
                    )}
                    {entity.type && (
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {entity.title}
                  </p>
                  {entity.status && (
                    <Badge
                      variant={getStatusColor(entity.status)}
                      className="text-xs mt-2"
                    >
                      {entity.status}
                    </Badge>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors ml-2 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
