'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Calendar,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: Date;
  location?: string;
  category?: string;
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  date: Date;
}

interface NewsRightSidebarProps {
  events?: Event[];
  alerts?: Alert[];
  onEventClick?: (eventId: string) => void;
  onAlertClick?: (alertId: string) => void;
  className?: string;
}

export function NewsRightSidebar({
  events = [],
  alerts = [],
  onEventClick,
  onAlertClick,
  className = '',
}: NewsRightSidebarProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `en ${days}d`;
    if (hours > 0) return `en ${hours}h`;
    return 'hoy';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Próximos Eventos */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Próximos Eventos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700"
            >
              Ver todo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 4).map((event, index) => (
                <motion.button
                  key={event.id}
                  onClick={() => onEventClick?.(event.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.category && (
                      <Badge
                        variant="outline"
                        className="text-xs flex-shrink-0"
                      >
                        {event.category}
                      </Badge>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay eventos próximos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avisos de Calidad */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Avisos de Calidad
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700"
            >
              Ver todo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 4).map((alert, index) => (
                <motion.button
                  key={alert.id}
                  onClick={() => onAlertClick?.(alert.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 p-2 rounded-lg ${getSeverityColor(alert.severity)}`}
                    >
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {alert.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {alert.date.toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay avisos activos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
