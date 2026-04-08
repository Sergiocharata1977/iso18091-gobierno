/**
 * Servicio de Perfiles e Instancias de Agentes MCP
 * Maneja la configuración de "Agente por Puesto" y "Agente por Usuario".
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentCapability, AgentInstance, AgentProfile } from '@/types/agents';
import { Timestamp } from 'firebase-admin/firestore';

const PROFILES_COLLECTION = 'agent_profiles';
const INSTANCES_COLLECTION = 'agent_instances';

export class AgentProfileService {
  // ============================================
  // PERFILES (Plantillas por Puesto)
  // ============================================

  /**
   * Crea o actualiza un perfil de agente para un puesto
   */
  static async upsertProfile(
    profileData: Omit<AgentProfile, 'created_at' | 'updated_at'>
  ): Promise<void> {
    const db = getAdminFirestore();
    const docRef = db.collection(PROFILES_COLLECTION).doc(profileData.id);

    await docRef.set(
      {
        ...profileData,
        updated_at: Timestamp.now().toDate(),
        created_at: Timestamp.now().toDate(), // Uso Date para consistencia con tipos
      },
      { merge: true }
    );
  }

  /**
   * Obtiene el perfil de agente asociado a un puesto
   */
  static async getProfileByPosition(
    positionId: string
  ): Promise<AgentProfile | null> {
    const db = getAdminFirestore();
    // Asumimos ID del perfil = ID del puesto para simplicidad
    const doc = await db.collection(PROFILES_COLLECTION).doc(positionId).get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as AgentProfile;
  }

  // ============================================
  // INSTANCIAS (Runtime por Usuario)
  // ============================================

  /**
   * Inicializa una instancia de agente para un usuario
   */
  static async initializeInstance(
    userId: string,
    organizationId: string,
    positionId: string
  ): Promise<AgentInstance> {
    const db = getAdminFirestore();
    const docRef = db.collection(INSTANCES_COLLECTION).doc(userId);

    const newInstance: Omit<AgentInstance, 'created_at' | 'updated_at'> = {
      id: userId,
      user_id: userId,
      organization_id: organizationId,
      position_id: positionId,
      status: 'active',
      custom_capabilities: [],
      runtime_state: {
        last_active: Timestamp.now().toDate(),
        metadata: {},
      },
    };

    await docRef.set({
      ...newInstance,
      created_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    });

    return {
      ...newInstance,
      created_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    } as AgentInstance;
  }

  /**
   * Obtiene la instancia del usuario y sus capacidades efectivas
   */
  static async getInstanceWithCapabilities(userId: string): Promise<{
    instance: AgentInstance;
    profile: AgentProfile | null;
    effectiveCapabilities: AgentCapability[];
  } | null> {
    const db = getAdminFirestore();

    // 1. Obtener Instancia
    const instanceDoc = await db
      .collection(INSTANCES_COLLECTION)
      .doc(userId)
      .get();
    if (!instanceDoc.exists) return null;

    const instance = {
      id: instanceDoc.id,
      ...instanceDoc.data(),
    } as AgentInstance;

    // 2. Obtener Perfil del Puesto
    const profile = await this.getProfileByPosition(instance.position_id);

    // 3. Calcular Capacidades Efectivas (Base + Custom)
    const baseCaps = profile?.base_capabilities || [];
    const customCaps = instance.custom_capabilities || [];

    // Unir y deducplicar
    const effectiveCapabilities = Array.from(
      new Set([...baseCaps, ...customCaps])
    );

    return {
      instance,
      profile,
      effectiveCapabilities,
    };
  }

  /**
   * Actualiza el estado de una instancia
   */
  static async updateStatus(
    userId: string,
    status: AgentInstance['status']
  ): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(INSTANCES_COLLECTION).doc(userId).update({
      status,
      updated_at: Timestamp.now().toDate(),
    });
  }
}
