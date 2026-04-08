'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FinancialSnapshot } from '@/types/crm-historico';
import {
  AlertCircle,
  Building,
  Calendar,
  Eye,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface FinancialSnapshotCardProps {
  snapshot: FinancialSnapshot;
  onClick?: () => void;
}

export function FinancialSnapshotCard({
  snapshot,
  onClick,
}: FinancialSnapshotCardProps) {
  // Configuración visual según tipo de snapshot
  const getConfig = () => {
    switch (snapshot.tipoSnapshot) {
      case 'situacion_patrimonial':
        return {
          color: 'border-l-blue-500',
          badgeColor: 'bg-blue-100 text-blue-800',
          icon: <Building className="h-4 w-4" />,
          label: 'Balance',
        };
      case 'estado_resultados':
        const esPositivo = (snapshot.estadoResultados?.gananciaBruta || 0) > 0;
        return {
          color: esPositivo ? 'border-l-green-500' : 'border-l-red-500',
          badgeColor: esPositivo
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800',
          icon: esPositivo ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          ),
          label: 'Resultados',
        };
      case 'iva_mensual':
      case 'rentas':
      case '931':
        return {
          color: 'border-l-purple-500',
          badgeColor: 'bg-purple-100 text-purple-800',
          icon: <FileText className="h-4 w-4" />,
          label: 'Impuestos',
        };
      default:
        return {
          color: 'border-l-gray-500',
          badgeColor: 'bg-gray-100 text-gray-800',
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Otro',
        };
    }
  };

  const config = getConfig();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Renderizado de métricas principales según tipo
  const renderMetrics = () => {
    if (snapshot.situacionPatrimonial) {
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Patrimonio Neto</span>
            <span className="font-semibold">
              {formatCurrency(
                snapshot.situacionPatrimonial.patrimonioNeto.total
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Activo:{' '}
              {formatCurrency(snapshot.situacionPatrimonial.totalActivo)}
            </span>
          </div>
        </div>
      );
    }

    if (snapshot.estadoResultados) {
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Ventas Netas</span>
            <span className="font-semibold">
              {formatCurrency(snapshot.estadoResultados.ventasNetas)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Resultado Bruto</span>
            <span
              className={cn(
                'font-semibold',
                (snapshot.estadoResultados.gananciaBruta || 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            >
              {formatCurrency(snapshot.estadoResultados.gananciaBruta)}
            </span>
          </div>
        </div>
      );
    }

    if (snapshot.declaracionMensual) {
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Saldo IVA</span>
            <span className="font-semibold text-purple-700">
              {formatCurrency(
                (snapshot.declaracionMensual.ivaVentas || 0) -
                  (snapshot.declaracionMensual.ivaCompras || 0)
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>
              Ventas:{' '}
              {formatCurrency(snapshot.declaracionMensual.ivaVentas || 0)}
            </span>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-gray-400">Sin datos detallados</p>;
  };

  return (
    <Card
      className={cn(
        'border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
        config.color
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <Badge
            variant="secondary"
            className={cn('flex items-center gap-1', config.badgeColor)}
          >
            {config.icon}
            {config.label}
          </Badge>
          <span className="text-xs font-medium text-gray-500 border rounded px-2 py-0.5 bg-gray-50">
            {snapshot.periodo}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">{renderMetrics()}</CardContent>

      <CardFooter className="p-4 pt-0 text-xs text-gray-400 flex justify-between items-center border-t border-gray-100 mt-2 py-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(snapshot.fechaRegistro).toLocaleDateString()}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Eye className="h-4 w-4 text-gray-400" />
        </Button>
      </CardFooter>
    </Card>
  );
}
