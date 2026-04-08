'use client';

import {
  ModulePageShell,
  ModuleStatePanel,
  PageHeader,
} from '@/components/design-system';
import { ProcessRecordFormDialog } from '@/components/processRecords/ProcessRecordFormDialog';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Loader2, Plus, Search, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Tipos para los registros de procesos
interface ProcessRecord {
  id: string;
  nombre: string;
  descripcion: string;
  process_definition_id: string;
  process_definition_nombre?: string;
  status: 'activo' | 'pausado' | 'completado';
  created_at: string;
  updated_at: string;
  created_by: string;
  kanbanStats?: {
    totalCards: number;
    pendingCards: number;
    inProgressCards: number;
    completedCards: number;
  };
}

export default function ProcessRecordsPage() {
  const [processRecords, setProcessRecords] = useState<ProcessRecord[]>([]);
  const [processDefinitions, setProcessDefinitions] = useState<
    {
      id: string;
      nombre: string;
      etapas_default: string[];
      tipo_registros?: 'vincular' | 'crear' | 'ambos';
      modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'activo' | 'pausado' | 'completado'
  >('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [currentUser] = useState({ id: 'user-1', nombre: 'Usuario Actual' });
  const [assistantGuide, setAssistantGuide] = useState('');

  // Funciones para manejar datos de prueba
  const _handleSeedData = async () => {
    try {
      const response = await fetch('/api/processes/seed-massive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Datos de procesos sembrados exitosamente:', result);
        // Recargar datos después del seed
        setProcessRecords(result.data || []);
        alert(
          `Datos de procesos agregados exitosamente:\n\n- ${result.data.definitionsCreated} definiciones\n- ${result.data.recordsCreated} registros\n- ${result.data.kanbanBoardsCreated} tableros Kanban`
        );
      } else {
        const error = await response.json();
        console.error('Error al sembrar datos:', error);
        alert('Error al agregar datos de prueba');
      }
    } catch (error) {
      console.error('Error al sembrar datos:', error);
      alert('Error al agregar datos de prueba');
    }
  };

  const handleCheckData = async () => {
    try {
      const response = await fetch('/api/processes/check', {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Datos en Firebase:', result);
        alert(
          `Datos encontrados:\n- Definiciones: ${result.data.processDefinitions.count}\n- Registros: ${result.data.processRecords.count}\n- Listas Kanban: ${result.data.kanbanLists.count}\n- Tarjetas: ${result.data.kanbanCards.count}`
        );
      } else {
        const error = await response.json();
        console.error('Error al verificar datos:', error);
        alert('Error al verificar datos');
      }
    } catch (error) {
      console.error('Error al verificar datos:', error);
      alert('Error al verificar datos');
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        '¿Estás seguro de que quieres eliminar todos los datos de procesos?'
      )
    ) {
      try {
        const response = await fetch('/api/processes/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'clear' }),
        });

        if (response.ok) {
          console.log('Datos eliminados exitosamente');
          setProcessRecords([]);
          alert('Datos eliminados exitosamente');
        } else {
          const error = await response.json();
          console.error('Error al eliminar datos:', error);
          alert('Error al eliminar datos');
        }
      } catch (error) {
        console.error('Error al eliminar datos:', error);
        alert('Error al eliminar datos');
      }
    }
  };

  // Load real data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, defsRes] = await Promise.all([
        fetch('/api/process-records'),
        fetch('/api/process-definitions'),
      ]);

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setProcessRecords(recordsData);
      }

      if (defsRes.ok) {
        const defsData = await defsRes.json();
        setProcessDefinitions(defsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefinitions = async () => {
    try {
      const response = await fetch('/api/process-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });

      if (response.ok) {
        alert('Definiciones de procesos creadas');
        loadData();
      }
    } catch (error) {
      console.error('Error seeding definitions:', error);
    }
  };

  // Mock data for demo
  const _mockData: ProcessRecord[] = [
    {
      id: '1',
      nombre: 'Implementación ISO 9001 Q3',
      descripcion:
        'Registro de proceso para implementación de ISO 9001 en el tercer trimestre',
      process_definition_id: 'proc-1',
      process_definition_nombre: 'Gestión de Calidad',
      status: 'activo',
      created_at: '2024-01-15',
      updated_at: '2024-01-20',
      created_by: 'admin@empresa.com',
      kanbanStats: {
        totalCards: 12,
        pendingCards: 3,
        inProgressCards: 5,
        completedCards: 4,
      },
    },
    {
      id: '2',
      nombre: 'Auditoría Interna 2024',
      descripcion: 'Proceso de auditoría interna del sistema de gestión',
      process_definition_id: 'proc-2',
      process_definition_nombre: 'Auditorías',
      status: 'pausado',
      created_at: '2024-01-10',
      updated_at: '2024-01-18',
      created_by: 'auditor@empresa.com',
      kanbanStats: {
        totalCards: 8,
        pendingCards: 2,
        inProgressCards: 3,
        completedCards: 3,
      },
    },
    {
      id: '3',
      nombre: 'Mejora Continua',
      descripcion: 'Proceso de mejora continua del sistema',
      process_definition_id: 'proc-3',
      process_definition_nombre: 'Mejora Continua',
      status: 'completado',
      created_at: '2024-01-05',
      updated_at: '2024-01-25',
      created_by: 'mejora@empresa.com',
      kanbanStats: {
        totalCards: 15,
        pendingCards: 0,
        inProgressCards: 0,
        completedCards: 15,
      },
    },
  ];

  // Filtrar registros
  const filteredRecords = processRecords.filter((record: ProcessRecord) => {
    const matchesSearch =
      (record.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.descripcion || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800';
      case 'completado':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'activo':
        return 'Activo';
      case 'pausado':
        return 'Pausado';
      case 'completado':
        return 'Completado';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <ModulePageShell maxWidthClassName="max-w-6xl">
        <ModuleStatePanel
          icon={<Loader2 className="h-10 w-10 animate-spin text-emerald-600" />}
          title="Cargando registros de procesos"
          description="Estamos preparando los tableros, estadisticas y flujos operativos."
        />
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Procesos"
          title="Registros de Procesos"
          description="Gestiona registros, seguimiento operativo y tableros Kanban asociados."
          breadcrumbs={[
            { label: 'Procesos', href: '/procesos' },
            { label: 'Registros' },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
            <AIAssistButton
              context={{
                modulo: 'procesos',
                tipo: 'proceso',
                campo: 'guia_registros',
                datos: {
                  pantalla: 'procesos/registros',
                  objetivo:
                    'explicar que hacer en esta pantalla y los siguientes pasos',
                  regla_registros:
                    'procesos con tipo vincular usan modulo exclusivo; crear/ambos pueden usar ABM de registros',
                },
              }}
              onGenerate={texto => setAssistantGuide(texto)}
              label="Que hago aca?"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            />
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={() => setShowFormDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Registro
            </Button>
            </div>
          }
        />

        {assistantGuide && (
          <Card className="border border-emerald-200 bg-emerald-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-emerald-800">
                Guia IA contextual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {assistantGuide}
              </p>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssistantGuide('')}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  Cerrar guia
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros y Búsqueda */}
        <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 border-0 bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={e =>
                    setFilterStatus(
                      e.target.value as
                        | 'all'
                        | 'activo'
                        | 'pausado'
                        | 'completado'
                    )
                  }
                  className="px-3 py-2 bg-white border-0 shadow-sm ring-1 ring-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista de Tabs */}
        <Tabs
          value={viewMode}
          onValueChange={value => setViewMode(value as 'cards' | 'list')}
          className="space-y-6"
        >
          <TabsList className="bg-white/50 border border-slate-200 p-1 rounded-lg">
            <TabsTrigger
              value="cards"
              className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              Vista de Tarjetas
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              Vista de Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-0">
            {filteredRecords.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="h-12 w-12 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No hay registros de procesos
                  </h3>
                  <p className="text-slate-500 mb-6">
                    Crea tu primer registro de proceso para comenzar a gestionar
                    con Kanban
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      onClick={() => setShowFormDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Registro
                    </Button>
                    <Button
                      onClick={handleSeedDefinitions}
                      variant="outline"
                      className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Definiciones
                    </Button>
                    <Button
                      onClick={handleCheckData}
                      variant="outline"
                      className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Verificar Datos
                    </Button>
                    <Button
                      onClick={handleClearData}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar Datos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecords.map(record => (
                  <Card
                    key={record.id}
                    className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group bg-white hover:-translate-y-1"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {record.nombre}
                        </CardTitle>
                        <Badge
                          className={`${getStatusColor(record.status)} border-0 px-2 py-1`}
                        >
                          {getStatusText(record.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {record.descripcion}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
                          <Users className="h-4 w-4 mr-2" />
                          {record.process_definition_nombre || 'Sin definición'}
                        </div>

                        {record.kanbanStats && (
                          <>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-slate-50 rounded-lg p-2 group-hover:bg-slate-100 transition-colors">
                                <div className="text-lg font-semibold text-slate-900">
                                  {record.kanbanStats.pendingCards}
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                  Pendientes
                                </div>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-2 group-hover:bg-blue-100 transition-colors">
                                <div className="text-lg font-semibold text-blue-600">
                                  {record.kanbanStats.inProgressCards}
                                </div>
                                <div className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                                  En Progreso
                                </div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-2 group-hover:bg-green-100 transition-colors">
                                <div className="text-lg font-semibold text-green-600">
                                  {record.kanbanStats.completedCards}
                                </div>
                                <div className="text-[10px] font-medium text-green-600 uppercase tracking-wide">
                                  Listas
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>
                                {new Date(
                                  record.created_at
                                ).toLocaleDateString()}
                              </span>
                              <span>
                                Total: {record.kanbanStats.totalCards}
                              </span>
                            </div>
                          </>
                        )}

                        <Link
                          href={`/procesos/registros/${record.id}`}
                          className="block"
                        >
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                            Abrir Tablero Kanban
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Registro
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Proceso
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Progreso
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Creado
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {filteredRecords.map(record => (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {record.nombre}
                              </div>
                              <div className="text-sm text-slate-500 mt-0.5">
                                {record.descripcion}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {record.process_definition_nombre ||
                              'Sin definición'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={`${getStatusColor(record.status)} border-0`}
                            >
                              {getStatusText(record.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.kanbanStats ? (
                              <div className="flex items-center">
                                <div className="w-16 bg-slate-100 rounded-full h-1.5 mr-2">
                                  <div
                                    className="bg-emerald-500 h-1.5 rounded-full"
                                    style={{
                                      width: `${record.kanbanStats.totalCards > 0 ? (record.kanbanStats.completedCards / record.kanbanStats.totalCards) * 100 : 0}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {record.kanbanStats.completedCards}/
                                  {record.kanbanStats.totalCards}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(record.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link href={`/procesos/registros/${record.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                Abrir Kanban
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <ProcessRecordFormDialog
        open={showFormDialog}
        onClose={() => setShowFormDialog(false)}
        onSuccess={loadData}
        processDefinitions={processDefinitions}
        currentUser={currentUser}
      />
    </ModulePageShell>
  );
}
