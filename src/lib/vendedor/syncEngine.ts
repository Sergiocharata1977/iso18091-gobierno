// src/lib/vendedor/syncEngine.ts
// Motor de sincronización para la App Vendedor

import type { SyncQueueItem } from '@/types/vendedor';
import { db } from './db';

type SyncEventType =
  | 'start'
  | 'progress'
  | 'complete'
  | 'error'
  | 'offline'
  | 'online';

interface SyncEvent {
  type: SyncEventType;
  pending?: number;
  synced?: number;
  error?: string;
}

type SyncCallback = (event: SyncEvent) => void;

/**
 * Motor de sincronización para la App Vendedor
 * Sincroniza automáticamente cuando hay conexión
 */
export class SyncEngine {
  private isOnline: boolean =
    typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private listeners: SyncCallback[] = [];
  private organizationId: string = '';
  private apiBaseUrl: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () =>
        this.handleConnectivityChange(true)
      );
      window.addEventListener('offline', () =>
        this.handleConnectivityChange(false)
      );
    }
  }

  /**
   * Inicializa el motor con el contexto del usuario
   */
  init(organizationId: string, apiBaseUrl: string = '/api/vendedor') {
    this.organizationId = organizationId;
    this.apiBaseUrl = apiBaseUrl;

    // Intentar sincronizar al iniciar si hay conexión
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Suscribirse a eventos de sincronización
   */
  subscribe(callback: SyncCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach(l => l(event));
  }

  private async handleConnectivityChange(online: boolean) {
    this.isOnline = online;
    this.emit({ type: online ? 'online' : 'offline' });

    if (online && !this.isSyncing) {
      await this.processQueue();
    }
  }

  /**
   * Procesa la cola de sincronización
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing || !this.organizationId) {
      return;
    }

    this.isSyncing = true;
    this.emit({ type: 'start' });

    try {
      const queue = await db.getSyncQueue(this.organizationId);
      let synced = 0;

      for (const item of queue) {
        if (!this.isOnline) break; // Parar si perdemos conexión

        try {
          await this.syncItem(item);
          await db.syncQueue.delete(item.id);
          synced++;

          this.emit({
            type: 'progress',
            synced,
            pending: queue.length - synced,
          });
        } catch (error) {
          await this.handleSyncError(item, error);
        }
      }

      this.emit({ type: 'complete', synced, pending: 0 });
    } catch (error) {
      this.emit({
        type: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.tipo) {
      case 'visita':
        await this.syncVisita(item.entityId);
        break;
      case 'foto':
        await this.syncFoto(item.entityId);
        break;
      case 'audio':
        await this.syncAudio(item.entityId);
        break;
      case 'accion':
        await this.syncAccion(item.entityId);
        break;
    }
  }

  private async syncVisita(visitaId: string): Promise<void> {
    const visita = await db.visitas.get(visitaId);
    if (!visita) return;

    // Marcar como sincronizando
    await db.visitas.update(visitaId, { syncStatus: 'syncing' });

    const response = await fetch(`${this.apiBaseUrl}/visitas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...visita,
        // Excluir URLs de blobs locales
        fotosIds: visita.fotosIds,
        audiosIds: visita.audiosIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al sincronizar visita: ${response.statusText}`);
    }

    const { id: remoteId } = await response.json();

    // Marcar como sincronizado
    await db.visitas.update(visitaId, {
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
    });
  }

  private async syncFoto(fotoId: string): Promise<void> {
    const foto = await db.fotos.get(fotoId);
    const fotoBlob = await db.fotoBlobs.get(fotoId);

    if (!foto || !fotoBlob) return;

    const formData = new FormData();
    formData.append('file', fotoBlob.blob, `${fotoId}.jpg`);
    formData.append(
      'metadata',
      JSON.stringify({
        id: foto.id,
        visitaId: foto.visitaId,
        clienteId: foto.clienteId,
        organizationId: foto.organizationId,
        descripcion: foto.descripcion,
        tipo: foto.tipo,
        ubicacion: foto.ubicacion,
        timestamp: foto.timestamp,
      })
    );

    const response = await fetch(`${this.apiBaseUrl}/evidencias/foto`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error al sincronizar foto: ${response.statusText}`);
    }

    const { url } = await response.json();

    // Actualizar con URL remota
    await db.fotos.update(fotoId, {
      syncStatus: 'synced',
      remoteUrl: url,
      syncedAt: new Date().toISOString(),
    });

    // Opcional: eliminar blob local para liberar espacio
    // await db.fotoBlobs.delete(fotoId);
  }

  private async syncAudio(audioId: string): Promise<void> {
    const audio = await db.audios.get(audioId);
    const audioBlob = await db.audioBlobs.get(audioId);

    if (!audio || !audioBlob) return;

    const formData = new FormData();
    formData.append('file', audioBlob.blob, `${audioId}.webm`);
    formData.append(
      'metadata',
      JSON.stringify({
        id: audio.id,
        visitaId: audio.visitaId,
        clienteId: audio.clienteId,
        organizationId: audio.organizationId,
        duracionSegundos: audio.duracionSegundos,
        transcripcion: audio.transcripcion,
        timestamp: audio.timestamp,
      })
    );

    const response = await fetch(`${this.apiBaseUrl}/evidencias/audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error al sincronizar audio: ${response.statusText}`);
    }

    const { url, transcripcion } = await response.json();

    // Actualizar con URL remota y transcripción del servidor
    await db.audios.update(audioId, {
      syncStatus: 'synced',
      remoteUrl: url,
      transcripcion: transcripcion || audio.transcripcion,
      transcripcionStatus: 'done',
      syncedAt: new Date().toISOString(),
    });
  }

  private async syncAccion(accionId: string): Promise<void> {
    const accion = await db.acciones.get(accionId);
    if (!accion) return;

    // Marcar como sincronizando
    await db.acciones.update(accionId, { syncStatus: 'syncing' });

    const response = await fetch(`${this.apiBaseUrl}/acciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...accion,
        evidenciasIds: accion.evidenciasIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al sincronizar acción: ${response.statusText}`);
    }

    const { id: remoteId } = await response.json();

    // Marcar como sincronizado
    await db.acciones.update(accionId, {
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
    });
  }

  private async handleSyncError(
    item: SyncQueueItem,
    error: unknown
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';

    if (item.intentos >= item.maxIntentos) {
      // Marcar entidad como error permanente
      switch (item.tipo) {
        case 'visita':
          await db.visitas.update(item.entityId, {
            syncStatus: 'error',
            syncError: errorMessage,
          });
          break;
        case 'foto':
          await db.fotos.update(item.entityId, { syncStatus: 'error' });
          break;
        case 'audio':
          await db.audios.update(item.entityId, { syncStatus: 'error' });
          break;
      }

      // Eliminar de la cola
      await db.syncQueue.delete(item.id);
    } else {
      // Incrementar intentos y programar retry
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, item.intentos)); // Backoff exponencial

      await db.syncQueue.update(item.id, {
        intentos: item.intentos + 1,
        ultimoError: errorMessage,
        nextRetryAt: nextRetry.toISOString(),
      });
    }
  }

  /**
   * Fuerza sincronización manual
   */
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.processQueue();
    }
  }

  /**
   * Estado actual del motor
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }
}

// Instancia singleton
export const syncEngine = new SyncEngine();
