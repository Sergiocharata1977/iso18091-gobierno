// src/services/vendedor/WorkSessionService.ts
// Servicio para gestionar sesiones de trabajo de vendedores

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { Timestamp } from 'firebase-admin/firestore';

export interface WorkSession {
  id: string;
  organization_id: string;
  vendedor_id: string;
  vendedor_nombre?: string;
  vendedor_email?: string;
  inicio: Timestamp;
  fin?: Timestamp;
  duracion_minutos?: number;
  ubicacion_inicio?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  ubicacion_fin?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  visitas_realizadas?: number;
  estado: 'activa' | 'finalizada';
  created_at: Timestamp;
}

export class WorkSessionService {
  private getCollection(organizationId: string) {
    const db = getAdminFirestore();
    return db
      .collection('organizations')
      .doc(organizationId)
      .collection('crm_sesiones_trabajo');
  }

  /**
   * Inicia una nueva sesión de trabajo
   */
  async startSession(data: {
    organization_id: string;
    vendedor_id: string;
    vendedor_nombre?: string;
    vendedor_email?: string;
    ubicacion?: { lat: number; lng: number; accuracy: number };
  }): Promise<WorkSession> {
    const { Timestamp } = await import('firebase-admin/firestore');

    const session: Omit<WorkSession, 'id'> = {
      organization_id: data.organization_id,
      vendedor_id: data.vendedor_id,
      vendedor_nombre: data.vendedor_nombre,
      vendedor_email: data.vendedor_email,
      inicio: Timestamp.now(),
      ubicacion_inicio: data.ubicacion,
      estado: 'activa',
      visitas_realizadas: 0,
      created_at: Timestamp.now(),
    };

    const docRef = await this.getCollection(data.organization_id).add(session);

    return { id: docRef.id, ...session };
  }

  /**
   * Finaliza una sesión de trabajo
   */
  async endSession(
    organizationId: string,
    sessionId: string,
    ubicacion?: { lat: number; lng: number; accuracy: number }
  ): Promise<void> {
    const { Timestamp } = await import('firebase-admin/firestore');

    const docRef = this.getCollection(organizationId).doc(sessionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Sesión no encontrada');
    }

    const session = doc.data() as WorkSession;
    const inicio = session.inicio.toDate();
    const fin = new Date();
    const duracionMs = fin.getTime() - inicio.getTime();
    const duracionMinutos = Math.round(duracionMs / 1000 / 60);

    await docRef.update({
      fin: Timestamp.now(),
      ubicacion_fin: ubicacion,
      duracion_minutos: duracionMinutos,
      estado: 'finalizada',
    });
  }

  /**
   * Obtiene la sesión activa de un vendedor
   */
  async getActiveSession(
    organizationId: string,
    vendedorId: string
  ): Promise<WorkSession | null> {
    const snapshot = await this.getCollection(organizationId)
      .where('vendedor_id', '==', vendedorId)
      .where('estado', '==', 'activa')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as WorkSession;
  }

  /**
   * Obtiene todas las sesiones activas (para supervisor)
   */
  async getActiveSessions(organizationId: string): Promise<WorkSession[]> {
    const snapshot = await this.getCollection(organizationId)
      .where('estado', '==', 'activa')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WorkSession[];
  }

  /**
   * Obtiene historial de sesiones de un vendedor
   */
  async getVendedorHistory(
    organizationId: string,
    vendedorId: string,
    limit = 30
  ): Promise<WorkSession[]> {
    const snapshot = await this.getCollection(organizationId)
      .where('vendedor_id', '==', vendedorId)
      .orderBy('inicio', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WorkSession[];
  }

  /**
   * Obtiene resumen de todos los vendedores para el supervisor
   */
  async getSupervisorSummary(organizationId: string): Promise<
    {
      vendedor_id: string;
      vendedor_nombre?: string;
      sesion_activa: boolean;
      ultima_ubicacion?: { lat: number; lng: number };
      inicio_jornada?: Date;
    }[]
  > {
    // Obtener todas las sesiones activas
    const activeSessions = await this.getActiveSessions(organizationId);

    return activeSessions.map(session => ({
      vendedor_id: session.vendedor_id,
      vendedor_nombre: session.vendedor_nombre,
      sesion_activa: true,
      ultima_ubicacion: session.ubicacion_inicio,
      inicio_jornada: session.inicio.toDate(),
    }));
  }
}

export const workSessionService = new WorkSessionService();
