'use client';

import React from 'react';
import { ProcessMap } from '@/components/ui/ProcessMap';
import { ProcessNode } from '@/types/processMap';

const mockProcessData: ProcessNode[] = [
  // Nivel 1: Dirección
  { id: 'dir-1', title: 'Planificación y Dirección', level: 1, iconName: 'TrendingUp', order: 1 },
  // Nivel 2: Mejora
  { id: 'mej-1', title: 'Mejoras', level: 2, iconName: 'Star', parentId: 'dir-1', order: 1 },
  { id: 'aud-1', title: 'Auditorías', level: 2, iconName: 'Search', parentId: 'dir-1', order: 2 },
  { id: 'hall-1', title: 'Hallazgos y Acciones', level: 2, iconName: 'AlertCircle', parentId: 'dir-1', order: 3 },
  { id: 'enc-1', title: 'Encuestas', level: 2, iconName: 'Users', parentId: 'dir-1', order: 4 },
  // Nivel 3: Apoyo
  { id: 'rrhh-1', title: 'Recursos Humanos', level: 3, iconName: 'Users', parentId: 'mej-1', order: 1 },
  { id: 'doc-1', title: 'Documentación', level: 3, iconName: 'FileText', parentId: 'mej-1', order: 2 },
  { id: 'inf-1', title: 'Infraestructura', level: 3, iconName: 'Building', parentId: 'mej-1', order: 3 },
  { id: 'stck-1', title: 'Stock', level: 3, iconName: 'Package', parentId: 'mej-1', order: 4 }, // a veces en nivel 3
  // Nivel 4: Operativos
  { id: 'comp-1', title: 'Compras', level: 4, iconName: 'ShoppingCart', parentId: 'stck-1', order: 1 },
  { id: 'serv-1', title: 'Servicios de Repuestos', level: 4, iconName: 'Wrench', parentId: 'dir-1', order: 3 },
  { id: 'mant-1', title: 'Mantenimientos Maquinaria', level: 4, iconName: 'Settings', order: 4 },
  { id: 'fin-1', title: 'Financiación', level: 4, iconName: 'DollarSign', order: 5 },
  { id: 'vnt-1', title: 'Venta', level: 4, iconName: 'Tag', order: 6 },
];

export default function MapaProcesosPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Mapa de Procesos (Demo)
          </h1>
          <p className="text-slate-400 mt-2">
            Visualización dinámica basada en configuración JSON para arquitectura Multi-tenant.
          </p>
        </div>

        <ProcessMap data={mockProcessData} />
      </div>
    </div>
  );
}
