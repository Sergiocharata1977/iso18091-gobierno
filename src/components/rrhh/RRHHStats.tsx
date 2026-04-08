'use client';

import {
  Users,
  Building2,
  Briefcase,
  GraduationCap,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function RRHHStats() {
  const estadisticas = [
    {
      titulo: 'Total Empleados',
      valor: '24',
      cambio: '+2',
      icon: Users,
      color: 'blue',
    },
    {
      titulo: 'Departamentos',
      valor: '6',
      cambio: '0',
      icon: Building2,
      color: 'purple',
    },
    {
      titulo: 'Puestos Activos',
      valor: '12',
      cambio: '+1',
      icon: Briefcase,
      color: 'indigo',
    },
    {
      titulo: 'Capacitaciones',
      valor: '8',
      cambio: '+3',
      icon: GraduationCap,
      color: 'green',
    },
    {
      titulo: 'Evaluaciones',
      valor: '15',
      cambio: '+5',
      icon: FileText,
      color: 'emerald',
    },
    {
      titulo: 'Satisfacción',
      valor: '85%',
      cambio: '+3%',
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      green: 'bg-green-100 text-green-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      orange: 'bg-orange-100 text-orange-600',
    };
    return (
      colorMap[color as keyof typeof colorMap] || 'bg-blue-100 text-blue-600'
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {estadisticas.map((stat, index) => (
        <Card key={index} className="p-4 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{stat.titulo}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.valor}
              </p>
              <p
                className={`text-sm mt-1 ${
                  stat.cambio.startsWith('+')
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}
              >
                {stat.cambio} vs mes anterior
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-lg ${getColorClasses(stat.color)} flex items-center justify-center`}
            >
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
