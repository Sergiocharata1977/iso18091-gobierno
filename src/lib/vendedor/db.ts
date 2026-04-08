// src/lib/vendedor/db.ts
// Base de datos local con Dexie.js para almacenamiento offline

import type {
  AccionLocal,
  AudioLocal,
  ChecklistTemplate,
  ClienteLocal,
  FotoLocal,
  SolicitudMobile,
  SyncQueueItem,
  VendedorConfig,
  VisitaLocal,
} from '@/types/vendedor';
import Dexie, { Table } from 'dexie';

/**
 * Base de datos local para la App Vendedor
 * Usa IndexedDB a través de Dexie.js
 */
export class VendedorDatabase extends Dexie {
  // Tablas
  clientes!: Table<ClienteLocal, string>;
  visitas!: Table<VisitaLocal, string>;
  acciones!: Table<AccionLocal, string>; // Added
  solicitudes!: Table<SolicitudMobile, string>;
  fotos!: Table<FotoLocal, string>;
  audios!: Table<AudioLocal, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  config!: Table<VendedorConfig, string>;
  checklistTemplates!: Table<ChecklistTemplate, string>;

  // Almacenamiento de blobs
  fotoBlobs!: Table<{ id: string; blob: Blob; thumbnail: Blob }, string>;
  audioBlobs!: Table<{ id: string; blob: Blob }, string>;

  constructor() {
    super('VendedorDB');

    this.version(1).stores({
      // Clientes indexados por org, vendedor y estado
      clientes:
        'id, organizationId, vendedorId, estado, [organizationId+vendedorId], lastSyncAt',

      // Visitas indexadas por cliente, fecha y estado de sync
      visitas:
        'id, organizationId, clienteId, vendedorId, fecha, syncStatus, [organizationId+vendedorId], [clienteId+fecha]',

      // Fotos indexadas por visita y estado de sync
      fotos:
        'id, organizationId, visitaId, clienteId, syncStatus, [visitaId+timestamp]',

      // Audios indexados por visita y estado de sync
      audios:
        'id, organizationId, visitaId, clienteId, syncStatus, [visitaId+timestamp]',

      // Cola de sincronización ordenada por prioridad
      syncQueue:
        'id, organizationId, tipo, entityId, prioridad, [prioridad+createdAt]',

      // Configuración por vendedor
      config: 'id, organizationId, userId',

      // Templates de checklist por organización
      checklistTemplates: 'id, organizationId, activo',

      // Blobs de fotos
      fotoBlobs: 'id',

      // Blobs de audio
      audioBlobs: 'id',
    });

    // Upgrade schema for actions support
    this.version(2).stores({
      acciones:
        'id, organizationId, clienteId, vendedorId, syncStatus, [organizationId+vendedorId], [clienteId+fechaRealizada]',
    });

    this.version(3).stores({
      solicitudes:
        'id, organizationId, tipo, estado, createdAt, [organizationId+tipo], [organizationId+estado]',
    });
  }

  /**
   * Obtiene clientes del vendedor actual
   */
  async getClientesVendedor(
    organizationId: string,
    vendedorId: string
  ): Promise<ClienteLocal[]> {
    return this.clientes
      .where('[organizationId+vendedorId]')
      .equals([organizationId, vendedorId])
      .toArray();
  }

  /**
   * Obtiene visitas pendientes de sincronizar
   */
  async getVisitasPendientes(organizationId: string): Promise<VisitaLocal[]> {
    return this.visitas
      .where('organizationId')
      .equals(organizationId)
      .and(v => v.syncStatus === 'pending' || v.syncStatus === 'error')
      .toArray();
  }

  /**
   * Obtiene items en cola de sincronización ordenados por prioridad
   */
  async getSyncQueue(organizationId: string): Promise<SyncQueueItem[]> {
    return this.syncQueue
      .where('organizationId')
      .equals(organizationId)
      .sortBy('prioridad');
  }

  /**
   * Agrega item a la cola de sincronización
   */
  async addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'createdAt'>
  ): Promise<string> {
    const id = crypto.randomUUID();
    await this.syncQueue.add({
      ...item,
      id,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Guarda foto con su blob
   */
  async saveFotoWithBlob(
    foto: Omit<FotoLocal, 'blobUrl' | 'thumbnailUrl'>,
    blob: Blob,
    thumbnail: Blob
  ): Promise<string> {
    const id = foto.id || crypto.randomUUID();

    // Guardar blobs
    await this.fotoBlobs.put({ id, blob, thumbnail });

    // Guardar metadata con URLs de blob
    const blobUrl = URL.createObjectURL(blob);
    const thumbnailUrl = URL.createObjectURL(thumbnail);

    await this.fotos.put({
      ...foto,
      id,
      blobUrl,
      thumbnailUrl,
    });

    // Agregar a cola de sync
    await this.addToSyncQueue({
      organizationId: foto.organizationId,
      tipo: 'foto',
      entityId: id,
      prioridad: 3,
      intentos: 0,
      maxIntentos: 5,
    });

    return id;
  }

  /**
   * Guarda audio con su blob
   */
  async saveAudioWithBlob(
    audio: Omit<AudioLocal, 'blobUrl'>,
    blob: Blob
  ): Promise<string> {
    const id = audio.id || crypto.randomUUID();

    // Guardar blob
    await this.audioBlobs.put({ id, blob });

    // Guardar metadata
    const blobUrl = URL.createObjectURL(blob);

    await this.audios.put({
      ...audio,
      id,
      blobUrl,
    });

    // Agregar a cola de sync
    await this.addToSyncQueue({
      organizationId: audio.organizationId,
      tipo: 'audio',
      entityId: id,
      prioridad: 3,
      intentos: 0,
      maxIntentos: 5,
    });

    return id;
  }

  /**
   * Crea nueva visita
   */
  async createVisita(
    visita: Omit<VisitaLocal, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.visitas.add({
      ...visita,
      id,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Agregar a cola de sync con alta prioridad
    await this.addToSyncQueue({
      organizationId: visita.organizationId,
      tipo: 'visita',
      entityId: id,
      prioridad: 1,
      intentos: 0,
      maxIntentos: 5,
    });

    return id;
  }

  /**
   * Crea nueva acción
   */
  async createAccion(
    accion: Omit<AccionLocal, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.acciones.add({
      ...accion,
      id,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Agregar a cola de sync
    await this.addToSyncQueue({
      organizationId: accion.organizationId,
      tipo: 'accion',
      entityId: id,
      prioridad: 1,
      intentos: 0,
      maxIntentos: 5,
    });

    return id;
  }

  /**
   * Obtiene estadísticas del vendedor
   */
  async getStats(organizationId: string, vendedorId: string) {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const inicioMes = new Date();
    inicioMes.setDate(1);

    const [
      visitasHoy,
      visitasSemana,
      visitasMes,
      clientesAsignados,
      pendientesSync,
    ] = await Promise.all([
      this.visitas
        .where('[organizationId+vendedorId]')
        .equals([organizationId, vendedorId])
        .and(v => v.fecha === hoy)
        .count(),
      this.visitas
        .where('[organizationId+vendedorId]')
        .equals([organizationId, vendedorId])
        .and(v => v.fecha >= inicioSemana.toISOString().split('T')[0])
        .count(),
      this.visitas
        .where('[organizationId+vendedorId]')
        .equals([organizationId, vendedorId])
        .and(v => v.fecha >= inicioMes.toISOString().split('T')[0])
        .count(),
      this.clientes
        .where('[organizationId+vendedorId]')
        .equals([organizationId, vendedorId])
        .count(),
      this.syncQueue.where('organizationId').equals(organizationId).count(),
    ]);

    return {
      visitasHoy,
      visitasSemana,
      visitasMes,
      clientesAsignados,
      pendientesSync,
    };
  }

  /**
   * Limpia datos sincronizados antiguos para liberar espacio
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString();

    // Obtener visitas antiguas sincronizadas
    const oldVisitas = await this.visitas
      .where('syncedAt')
      .below(cutoff)
      .and(v => v.syncStatus === 'synced')
      .toArray();

    // Eliminar fotos y audios asociados
    for (const visita of oldVisitas) {
      await this.fotos.where('visitaId').equals(visita.id).delete();
      await this.audios.where('visitaId').equals(visita.id).delete();
      await this.fotoBlobs.where('id').anyOf(visita.fotosIds).delete();
      await this.audios.where('id').anyOf(visita.audiosIds).delete();
    }

    // Eliminar visitas
    await this.visitas.bulkDelete(oldVisitas.map(v => v.id));
  }

  async upsertSolicitud(s: SolicitudMobile): Promise<void> {
    await this.solicitudes.put(s);
  }

  async getSolicitudesByOrg(organizationId: string): Promise<SolicitudMobile[]> {
    return this.solicitudes
      .where('organizationId')
      .equals(organizationId)
      .reverse()
      .sortBy('createdAt');
  }
}

// Instancia singleton
export const db = new VendedorDatabase();
