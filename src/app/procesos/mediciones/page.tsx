'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { MeasurementFormDialog } from '@/components/quality/MeasurementFormDialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Measurement } from '@/types/quality';
import { Activity, Calendar, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface IndicatorOption {
  id: string;
  code: string;
  name: string;
  unit?: string;
}

export default function MedicionesListing() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorOption[]>([]);

  useEffect(() => {
    fetchMeasurements();
    fetchIndicators();
  }, []);

  const fetchMeasurements = async () => {
    try {
      const response = await fetch('/api/quality/measurements');
      if (response.ok) {
        const data = await response.json();
        setMeasurements(data);
      }
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicators = async () => {
    try {
      const response = await fetch('/api/quality/indicators');
      if (response.ok) {
        const data = await response.json();
        setIndicators(data || []);
      }
    } catch (error) {
      console.error('Error fetching indicators:', error);
    }
  };

  const filteredMeasurements = measurements.filter(measurement => {
    const matchesSearch =
      measurement.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      measurement.observations?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesIndicator =
      indicatorFilter === 'all' || measurement.indicator_id === indicatorFilter;

    return matchesSearch && matchesIndicator;
  });

  const getIndicatorName = (indicatorId: string) => {
    const indicator = indicators.find(i => i.id === indicatorId);
    return indicator
      ? `${indicator.code} - ${indicator.name}`
      : 'Indicador desconocido';
  };

  const getIndicatorUnit = (indicatorId: string) => {
    const indicator = indicators.find(i => i.id === indicatorId);
    return indicator?.unit || '';
  };

  if (loading) {
    return (
      <ModulePageShell contentClassName="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg">Cargando mediciones...</div>
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell contentClassName="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Mediciones de Calidad"
          description="Registro y validacion de valores medidos para los indicadores."
          breadcrumbs={[
            { label: 'Procesos', href: '/procesos' },
            { label: 'Mediciones' },
          ]}
          className="p-0"
        />
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Medicion
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por codigo u observaciones..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-80">
              <Select value={indicatorFilter} onValueChange={setIndicatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por indicador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los indicadores</SelectItem>
                  {indicators.map(indicator => (
                    <SelectItem key={indicator.id} value={indicator.id}>
                      {indicator.code} - {indicator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredMeasurements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No hay mediciones</h3>
            <p className="mb-4 text-muted-foreground">
              Registra la primera medicion para comenzar el seguimiento.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Medicion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMeasurements.map(measurement => (
            <Card key={measurement.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {measurement.code || 'Sin codigo'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getIndicatorName(measurement.indicator_id)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(measurement.measurement_date).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {measurement.value} {getIndicatorUnit(measurement.indicator_id)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {measurement.observations || 'Sin observaciones'}
                    </p>
                  </div>
                  <Link href={`/procesos/mediciones/${measurement.id}`}>
                    <Button variant="outline">Ver detalle</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MeasurementFormDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={fetchMeasurements}
      />
    </ModulePageShell>
  );
}
