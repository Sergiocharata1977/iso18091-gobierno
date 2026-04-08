'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import type {
  BackupSnapshot,
  DataRestoreRun,
  ExportDatasetDescriptor,
  ExportJob,
  ExportRun,
} from '@/types/exports';
import { Download, Loader2, Play, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface JobsPayload {
  jobs: ExportJob[];
  runs: ExportRun[];
}

const DEFAULT_FILTERS = {
  from: '',
  to: '',
  estado: '',
  responsable_id: '',
  anonymize: false,
};

export default function ExportsConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [datasets, setDatasets] = useState<ExportDatasetDescriptor[]>([]);
  const [jobsPayload, setJobsPayload] = useState<JobsPayload>({
    jobs: [],
    runs: [],
  });
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [restores, setRestores] = useState<DataRestoreRun[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [format, setFormat] = useState<'csv' | 'json' | 'xlsx' | 'txt'>('csv');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [backupDatasets, setBackupDatasets] = useState<string[]>([]);
  const [backupFormat, setBackupFormat] = useState<'json' | 'xlsx'>('json');
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [restoreMode, setRestoreMode] = useState<'staging' | 'restore_missing'>(
    'restore_missing'
  );

  const selectedDatasetConfig = useMemo(
    () => datasets.find(item => item.key === selectedDataset) || null,
    [datasets, selectedDataset]
  );

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [datasetsRes, jobsRes, backupsRes, restoresRes] = await Promise.all(
        [
          fetch('/api/exports/datasets', { cache: 'no-store' }),
          fetch('/api/exports/jobs', { cache: 'no-store' }),
          fetch('/api/backups', { cache: 'no-store' }),
          fetch('/api/restores', { cache: 'no-store' }),
        ]
      );

      const [datasetsJson, jobsJson, backupsJson, restoresJson] =
        await Promise.all([
          datasetsRes.json(),
          jobsRes.json(),
          backupsRes.json(),
          restoresRes.json(),
        ]);

      if (!datasetsRes.ok || !datasetsJson.success) {
        throw new Error(datasetsJson.error || 'No se pudieron cargar datasets');
      }

      setDatasets(Array.isArray(datasetsJson.data) ? datasetsJson.data : []);
      setJobsPayload(
        jobsRes.ok && jobsJson.success ? jobsJson.data : { jobs: [], runs: [] }
      );
      setSnapshots(
        backupsRes.ok && backupsJson.success ? backupsJson.data : []
      );
      setRestores(
        restoresRes.ok && restoresJson.success ? restoresJson.data : []
      );

      if (
        !selectedDataset &&
        Array.isArray(datasetsJson.data) &&
        datasetsJson.data[0]
      ) {
        setSelectedDataset(datasetsJson.data[0].key);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la pantalla',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const handleExport = async () => {
    if (!selectedDataset) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/exports/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_key: selectedDataset,
          format,
          filters: {
            ...filters,
            anonymize: filters.anonymize,
          },
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo generar la exportacion');
      }

      toast({
        title: 'Exportacion creada',
        description:
          json.data.mode === 'sync'
            ? 'El archivo ya esta listo para descargar.'
            : 'El job quedo en cola para procesarse.',
      });
      await refreshAll();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo generar la exportacion',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/exports/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo ejecutar el runner');
      }

      toast({
        title: 'Job procesado',
        description: 'La exportacion ya se encuentra disponible.',
      });
      await refreshAll();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo ejecutar el runner',
        variant: 'destructive',
      });
    }
  };

  const handleBackup = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasets: backupDatasets,
          format: backupFormat,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear el backup');
      }

      toast({
        title: 'Backup creado',
        description: `Snapshot ${json.data.id} generado correctamente.`,
      });
      await refreshAll();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudo crear el backup',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/restores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: selectedSnapshot,
          mode: restoreMode,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo iniciar la restauracion');
      }

      toast({
        title: 'Restore completado',
        description:
          restoreMode === 'staging'
            ? 'Los registros se prepararon en staging.'
            : 'Se restauraron solamente documentos faltantes.',
      });
      await refreshAll();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudo restaurar',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-600 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando plugin de exportaciones...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Exportaciones y Backups
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Descarga datasets, crea snapshots y ejecuta restores controlados por
            organizacion.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="exportar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="restaurar">Restaurar</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="exportar">
          <Card>
            <CardHeader>
              <CardTitle>Generar exportacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Dataset</Label>
                  <Select
                    value={selectedDataset}
                    onValueChange={setSelectedDataset}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map(dataset => (
                        <SelectItem key={dataset.key} value={dataset.key}>
                          {dataset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={format}
                    onValueChange={value => setFormat(value as typeof format)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        selectedDatasetConfig?.supported_formats || [
                          'csv',
                          'json',
                          'xlsx',
                          'txt',
                        ]
                      ).map(item => (
                        <SelectItem key={item} value={item}>
                          {item.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={e =>
                      setFilters(prev => ({ ...prev, from: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={e =>
                      setFilters(prev => ({ ...prev, to: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={filters.estado}
                    onChange={e =>
                      setFilters(prev => ({ ...prev, estado: e.target.value }))
                    }
                    placeholder="Ej: activo, completado, programada"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Input
                    value={filters.responsable_id}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        responsable_id: e.target.value,
                      }))
                    }
                    placeholder="UID o personnel_id"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-8">
                  <input
                    type="checkbox"
                    checked={filters.anonymize}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        anonymize: e.target.checked,
                      }))
                    }
                  />
                  Anonimizar emails/telefonos
                </label>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  onClick={handleExport}
                  disabled={submitting || !selectedDataset}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generar exportacion
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Snapshots y retencion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Datasets a incluir</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {datasets.map(dataset => (
                    <label
                      key={dataset.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={backupDatasets.includes(dataset.key)}
                        onChange={e =>
                          setBackupDatasets(prev =>
                            e.target.checked
                              ? [...prev, dataset.key]
                              : prev.filter(item => item !== dataset.key)
                          )
                        }
                      />
                      {dataset.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-2 min-w-[180px]">
                  <Label>Formato backup</Label>
                  <Select
                    value={backupFormat}
                    onValueChange={value =>
                      setBackupFormat(value as typeof backupFormat)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleBackup} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Crear backup
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Snapshot</TableHead>
                    <TableHead>Datasets</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Archivos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map(snapshot => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium">
                        {snapshot.id}
                      </TableCell>
                      <TableCell>
                        {snapshot.included_datasets.join(', ')}
                      </TableCell>
                      <TableCell>
                        {new Date(snapshot.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {snapshot.files.map(file => (
                            <a
                              key={file.storage_path}
                              href={file.download_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline"
                            >
                              {file.dataset_key}.{file.format}
                            </a>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restaurar">
          <Card>
            <CardHeader>
              <CardTitle>Restauracion controlada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Snapshot</Label>
                  <Select
                    value={selectedSnapshot}
                    onValueChange={setSelectedSnapshot}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona snapshot" />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map(snapshot => (
                        <SelectItem key={snapshot.id} value={snapshot.id}>
                          {snapshot.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modo</Label>
                  <Select
                    value={restoreMode}
                    onValueChange={value =>
                      setRestoreMode(value as typeof restoreMode)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restore_missing">
                        Restaurar faltantes
                      </SelectItem>
                      <SelectItem value="staging">
                        Importar a staging
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                El MVP nunca pisa documentos existentes. Si detecta conflicto,
                lo registra y lo salta.
              </p>

              <div className="flex justify-end">
                <Button
                  onClick={handleRestore}
                  disabled={submitting || !selectedSnapshot}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Iniciar restore
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restore</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Creados</TableHead>
                    <TableHead>Conflictos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restores.map(restore => (
                    <TableRow key={restore.id}>
                      <TableCell className="font-medium">
                        {restore.id}
                      </TableCell>
                      <TableCell>{restore.mode}</TableCell>
                      <TableCell>{restore.created_docs_count}</TableCell>
                      <TableCell>{restore.conflicts_count}</TableCell>
                      <TableCell>{restore.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de exportaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Jobs</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Filas</TableHead>
                      <TableHead>Accion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsPayload.jobs.map(job => (
                      <TableRow key={job.id}>
                        <TableCell>{job.dataset_key}</TableCell>
                        <TableCell>{job.format}</TableCell>
                        <TableCell>{job.status}</TableCell>
                        <TableCell>{job.row_count}</TableCell>
                        <TableCell>
                          {job.status === 'pending' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleRunJob(job.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Procesar
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Runs</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Filas</TableHead>
                      <TableHead>Archivos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsPayload.runs.map(run => (
                      <TableRow key={run.id}>
                        <TableCell>{run.dataset_key}</TableCell>
                        <TableCell>{run.status}</TableCell>
                        <TableCell>{run.row_count}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {run.files.map(file => (
                              <a
                                key={file.storage_path}
                                href={file.download_url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline"
                              >
                                {file.dataset_key}.{file.format}
                              </a>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
