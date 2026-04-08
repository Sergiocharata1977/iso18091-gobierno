/**
 * Dashboard principal del módulo Mejoras
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface MejorasStats {
  auditorias_pendientes: number;
  auditorias_completadas: number;
  hallazgos_abiertos: number;
  hallazgos_cerrados: number;
  acciones_pendientes: number;
  acciones_completadas: number;
  encuestas_activas: number;
}

export default function MejorasDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<MejorasStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    // Por ahora usamos datos de ejemplo
    setStats({
      auditorias_pendientes: 3,
      auditorias_completadas: 12,
      hallazgos_abiertos: 8,
      hallazgos_cerrados: 24,
      acciones_pendientes: 5,
      acciones_completadas: 18,
      encuestas_activas: 2,
    });
    setLoading(false);
  }, [authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Auditorías',
      href: '/mejoras/auditorias',
      icon: ClipboardCheck,
      color: 'bg-blue-500',
      stats: [
        { label: 'Pendientes', value: stats?.auditorias_pendientes || 0 },
        { label: 'Completadas', value: stats?.auditorias_completadas || 0 },
      ],
    },
    {
      title: 'Hallazgos',
      href: '/mejoras/hallazgos',
      icon: AlertTriangle,
      color: 'bg-orange-500',
      stats: [
        { label: 'Abiertos', value: stats?.hallazgos_abiertos || 0 },
        { label: 'Cerrados', value: stats?.hallazgos_cerrados || 0 },
      ],
    },
    {
      title: 'Acciones',
      href: '/mejoras/acciones',
      icon: CheckCircle,
      color: 'bg-green-500',
      stats: [
        { label: 'Pendientes', value: stats?.acciones_pendientes || 0 },
        { label: 'Completadas', value: stats?.acciones_completadas || 0 },
      ],
    },
    {
      title: 'Encuestas',
      href: '/mejoras/encuestas',
      icon: MessageSquare,
      color: 'bg-purple-500',
      stats: [{ label: 'Activas', value: stats?.encuestas_activas || 0 }],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-600" />
            Mejora Continua
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de auditorías, hallazgos y acciones correctivas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={`p-2 rounded-lg ${card.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {card.stats.map(stat => (
                      <div key={stat.label}>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/mejoras/auditorias">
              <Button variant="outline">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Nueva Auditoría
              </Button>
            </Link>
            <Link href="/mejoras/hallazgos">
              <Button variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrar Hallazgo
              </Button>
            </Link>
            <Link href="/mejoras/acciones">
              <Button variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Nueva Acción
              </Button>
            </Link>
            <Link href="/mejoras/declaraciones">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Declaraciones
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
