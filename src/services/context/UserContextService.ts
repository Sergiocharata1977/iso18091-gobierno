// Service for aggregating complete user context for IA
// Uses Admin SDK for all Firestore operations to avoid permission issues from server

import { getAdminFirestore } from '@/lib/firebase/admin';
import { User } from '@/types/auth';
import {
  UserContext,
  UserContextChatSession,
  UserContextHistoryMessage,
  UserContextLight,
} from '@/types/context';
import { ProcessDefinition, ProcessRecord } from '@/types/procesos';
import { QualityIndicator, QualityObjective } from '@/types/quality';
import { Department, Personnel, Position } from '@/types/rrhh';
import { COLLECTIONS } from '@/features/chat/types';
import { AIConversationStore } from '../ai-core/conversationStore';
import { NormPointRelationService } from '../normPoints/NormPointRelationService';
import { NormPointService } from '../normPoints/NormPointService';
// TODO: Uncomment when these services are implemented
// import { OrganizationalContextService } from '../organizational-context/OrganizationalContextService';
// import { OrganizationalStructureService } from '../organizational-structure/OrganizationalStructureService';
import { PlanificacionRevisionDireccionService } from '../planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import { ProcessRecordService } from '../procesos/ProcessRecordService';
import { ProcessService } from '../procesos/ProcessService';
import { QualityIndicatorService } from '../quality/QualityIndicatorService';
import { QualityObjectiveService } from '../quality/QualityObjectiveService';
// Note: DepartmentService, PersonnelService, PositionService are NOT imported
// because we use Admin SDK directly in fetchPersonnel, fetchPosition, fetchDepartment
// to avoid permission issues when called from API routes

// Cache for user contexts (5 minute TTL)
interface CacheEntry {
  context: UserContext;
  timestamp: number;
}

interface ChatMessageWithMetadata {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: {
    conversationId?: string;
    traceId?: string;
    [key: string]: unknown;
  } | null;
}

const contextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class UserContextService {
  /**
   * Get complete user context in one call
   * Includes user, personnel, position, department, processes, objectives, indicators
   * @param userId Firebase Auth UID
   * @returns Complete user context
   */
  static async getUserFullContext(userId: string): Promise<UserContext> {
    try {
      // Check cache first - usar clave simple inicial
      // La clave completa con organization_id se genera después de obtener el usuario
      let cacheKey = userId;

      // Buscar en cache por cualquier clave que empiece con userId
      for (const [key, entry] of contextCache.entries()) {
        if (
          key.startsWith(userId) &&
          Date.now() - entry.timestamp < CACHE_TTL_MS
        ) {
          console.log(
            '[UserContextService] Cache hit for user:',
            userId,
            'key:',
            key
          );
          return entry.context;
        }
      }

      const cached = contextCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log(
          '[UserContextService] Cache hit for user:',
          userId,
          'org:',
          cacheKey
        );
        return cached.context;
      }

      console.log(
        '[UserContextService] Fetching fresh context for user:',
        userId
      );
      const startTime = Date.now();

      // Fetch user
      const user = await this.fetchUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Log con organization_id para debugging multi-tenant
      console.log('[UserContextService] User organization:', {
        userId,
        organization_id: user.organization_id,
        email: user.email,
      });

      // Actualizar clave de cache con organization_id para aislamiento
      cacheKey = `${userId}_${user.organization_id}`;

      const installedCapabilities = user.organization_id
        ? await this.fetchInstalledCapabilities(user.organization_id)
        : [];

      // Si no tiene personnel asignado, retornar contexto básico
      if (!user.personnel_id) {
        const context: UserContext = {
          user,
          personnel: null,
          position: null,
          department: null,
          installedCapabilities,
          procesos: [],
          objetivos: [],
          indicadores: [],
          supervisor: undefined,
          processRecords: [],
          notes: {
            access: 'read_only',
            items: [],
          },
          chatHistory: {
            access: 'read_only',
            sessions: [],
          },
        };

        // Update cache con clave que incluye organization_id
        contextCache.set(cacheKey, {
          context,
          timestamp: Date.now(),
        });

        return context;
      }

      const personnel = await this.fetchPersonnel(user.personnel_id);
      if (!personnel) {
        // Si no encuentra personnel, retornar contexto básico
        const context: UserContext = {
          user,
          personnel: null,
          position: null,
          department: null,
          installedCapabilities,
          procesos: [],
          objetivos: [],
          indicadores: [],
          supervisor: undefined,
          processRecords: [],
          notes: {
            access: 'read_only',
            items: [],
          },
          chatHistory: {
            access: 'read_only',
            sessions: [],
          },
        };

        contextCache.set(cacheKey, {
          context,
          timestamp: Date.now(),
        });

        return context;
      }

      const positionId =
        ((personnel as Personnel).puesto_id as string | undefined) ||
        personnel.puesto;
      const departmentId =
        ((personnel as Personnel).departamento_id as string | undefined) ||
        personnel.departamento;
      const resolvedAssignments = await this.resolvePersonnelAssignments(
        personnel,
        positionId
      );

      // Fetch all related data in parallel
      const [
        position,
        department,
        procesos,
        objetivos,
        indicadores,
        supervisor,
        processRecords,
        unifiedConfig,
        complianceData,
        chatHistory,
        installedCapabilitiesFromOrg,
      ] = await Promise.all([
        positionId ? this.fetchPosition(positionId) : Promise.resolve(null),
        departmentId
          ? this.fetchDepartment(departmentId)
          : Promise.resolve(null),
        this.fetchProcesses(resolvedAssignments.procesos_asignados),
        this.fetchObjectives(resolvedAssignments.objetivos_asignados),
        this.fetchIndicators(resolvedAssignments.indicadores_asignados),
        personnel.supervisor_id
          ? this.fetchPersonnel(personnel.supervisor_id).then(
              p => p || undefined
            )
          : Promise.resolve(undefined),
        this.fetchProcessRecords(resolvedAssignments.procesos_asignados),
        // Fetch unified organizational configuration
        this.fetchUnifiedConfig(),
        // Nuevo: Cumplimiento normativo
        this.fetchComplianceData(),
        user.organization_id
          ? this.fetchChatHistory(user.organization_id, userId)
          : Promise.resolve([]),
        Promise.resolve(installedCapabilities),
      ]);

      const context: UserContext = {
        user,
        personnel,
        position,
        department,
        installedCapabilities: installedCapabilitiesFromOrg,
        procesos,
        objetivos,
        indicadores,
        supervisor,
        processRecords,
        // Unified organizational context
        organizationalConfig: unifiedConfig?.organizationalConfig,
        sgcScope: unifiedConfig?.sgcScope,
        organizationalContext: unifiedConfig?.organizationalContext,
        // Nuevo: Cumplimiento normativo
        complianceData: complianceData || undefined,
        notes: {
          access: 'read_only',
          items: [],
        },
        chatHistory: {
          access: 'read_only',
          sessions: chatHistory,
        },
      };

      // Update cache con organization_id
      contextCache.set(cacheKey, {
        context,
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      console.log(
        `[UserContextService] Context fetched in ${duration}ms for org: ${user.organization_id}`
      );

      if (duration > 2000) {
        console.warn(
          '[UserContextService] Context fetch took longer than 2 seconds'
        );
      }

      return context;
    } catch (error) {
      console.error('[UserContextService] Error getting full context:', error);
      throw error;
    }
  }

  /**
   * Get lightweight context (without assignments)
   * @param userId Firebase Auth UID
   * @returns Light user context
   */
  static async getUserContextLight(userId: string): Promise<UserContextLight> {
    try {
      const user = await this.fetchUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Si no tiene personnel asignado, retornar solo el usuario
      if (!user.personnel_id) {
        return {
          user,
          personnel: null,
          position: null,
          department: null,
        };
      }

      const personnel = await this.fetchPersonnel(user.personnel_id);
      if (!personnel) {
        return {
          user,
          personnel: null,
          position: null,
          department: null,
        };
      }

      const positionId =
        ((personnel as Personnel).puesto_id as string | undefined) ||
        personnel.puesto;
      const departmentId =
        ((personnel as Personnel).departamento_id as string | undefined) ||
        personnel.departamento;

      const [position, department] = await Promise.all([
        positionId ? this.fetchPosition(positionId) : Promise.resolve(null),
        departmentId
          ? this.fetchDepartment(departmentId)
          : Promise.resolve(null),
      ]);

      return {
        user,
        personnel,
        position,
        department,
      };
    } catch (error) {
      console.error('[UserContextService] Error getting light context:', error);
      throw error;
    }
  }

  /**
   * Refresh context (invalidate cache and fetch fresh)
   * @param userId Firebase Auth UID
   * @returns Fresh user context
   */
  static async refreshContext(userId: string): Promise<UserContext> {
    this.invalidateCache(userId);
    return this.getUserFullContext(userId);
  }

  /**
   * Invalidate cache for a user (all organization variants)
   * @param userId Firebase Auth UID
   */
  static invalidateCache(userId: string): void {
    // Invalidar todas las variantes de cache para este usuario
    const keysToDelete: string[] = [];
    contextCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => contextCache.delete(key));
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    contextCache.clear();
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private static async fetchUser(userId: string): Promise<User> {
    try {
      const db = getAdminFirestore();

      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new Error(`User not found: ${userId}`);
      }

      const data = userDoc.data();
      if (!data) {
        throw new Error(`User data is empty: ${userId}`);
      }

      // Validar que tenga organization_id (excepto super_admin)
      if (!data.organization_id && data.rol !== 'super_admin') {
        console.warn(
          `[UserContextService] User ${userId} has no organization_id assigned`
        );
        throw new Error(
          `User ${userId} has no organization assigned. Please assign an organization first.`
        );
      }

      return {
        id: userDoc.id,
        email: data.email,
        personnel_id: data.personnel_id || null,
        rol: data.rol,
        activo: data.activo,
        organization_id: data.organization_id || null, // null permitido para super_admin
        modulos_habilitados: data.modulos_habilitados || null,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as User;
    } catch (error) {
      console.error(
        `[UserContextService] Error fetching user ${userId}:`,
        error
      );
      throw error;
    }
  }

  private static async fetchPersonnel(
    personnelId: string
  ): Promise<Personnel | null> {
    try {
      const db = getAdminFirestore();

      const docSnap = await db.collection('personnel').doc(personnelId).get();

      if (!docSnap.exists) {
        console.warn(
          `[UserContextService] Personnel not found: ${personnelId}`
        );
        return null;
      }

      const data = docSnap.data();
      if (!data) {
        return null;
      }

      return {
        id: docSnap.id,
        ...data,
        fecha_nacimiento: data.fecha_nacimiento?.toDate(),
        fecha_contratacion: data.fecha_contratacion?.toDate(),
        fecha_inicio_ventas: data.fecha_inicio_ventas?.toDate(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as Personnel;
    } catch (error) {
      console.error(
        `[UserContextService] Error fetching personnel ${personnelId}:`,
        error
      );
      return null;
    }
  }

  private static async fetchPosition(
    positionId: string
  ): Promise<Position | null> {
    try {
      const db = getAdminFirestore();

      const docSnap = await db.collection('positions').doc(positionId).get();

      if (!docSnap.exists) {
        console.warn(`[UserContextService] Position not found: ${positionId}`);
        return null;
      }

      const data = docSnap.data();
      if (!data) {
        return null;
      }

      return {
        id: docSnap.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as Position;
    } catch (error) {
      console.error(
        `[UserContextService] Error fetching position ${positionId}:`,
        error
      );
      return null;
    }
  }

  private static async fetchDepartment(
    departmentId: string
  ): Promise<Department | null> {
    try {
      const db = getAdminFirestore();

      const docSnap = await db
        .collection('departments')
        .doc(departmentId)
        .get();

      if (!docSnap.exists) {
        console.warn(
          `[UserContextService] Department not found: ${departmentId}`
        );
        return null;
      }

      const data = docSnap.data();
      if (!data) {
        return null;
      }

      return {
        id: docSnap.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as Department;
    } catch (error) {
      console.error(
        `[UserContextService] Error fetching department ${departmentId}:`,
        error
      );
      return null;
    }
  }

  private static async fetchProcesses(
    processIds: string[]
  ): Promise<ProcessDefinition[]> {
    if (!processIds || processIds.length === 0) {
      return [];
    }

    try {
      const processes = await Promise.all(
        processIds.map(id => ProcessService.getById(id))
      );
      return processes.filter(p => p !== null) as ProcessDefinition[];
    } catch (error) {
      console.warn('[UserContextService] Error fetching processes:', error);
      return [];
    }
  }

  private static async fetchObjectives(
    objectiveIds: string[]
  ): Promise<QualityObjective[]> {
    if (!objectiveIds || objectiveIds.length === 0) {
      return [];
    }

    try {
      const objectives = await Promise.all(
        objectiveIds.map(id => QualityObjectiveService.getById(id))
      );
      return objectives.filter(o => o !== null) as QualityObjective[];
    } catch (error) {
      console.warn('[UserContextService] Error fetching objectives:', error);
      return [];
    }
  }

  private static async fetchIndicators(
    indicatorIds: string[]
  ): Promise<QualityIndicator[]> {
    if (!indicatorIds || indicatorIds.length === 0) {
      return [];
    }

    try {
      const indicators = await Promise.all(
        indicatorIds.map(id => QualityIndicatorService.getById(id))
      );
      return indicators.filter(i => i !== null) as QualityIndicator[];
    } catch (error) {
      console.warn('[UserContextService] Error fetching indicators:', error);
      return [];
    }
  }

  private static async fetchProcessRecords(
    processIds: string[]
  ): Promise<ProcessRecord[]> {
    if (!processIds || processIds.length === 0) {
      return [];
    }

    try {
      // Fetch records for all assigned processes
      const recordsArrays = await Promise.all(
        processIds.map(processId =>
          ProcessRecordService.getByProcessId(processId)
        )
      );

      // Flatten arrays and return
      return recordsArrays.flat();
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching process records:',
        error
      );
      return [];
    }
  }

  private static async resolvePersonnelAssignments(
    personnel: Personnel,
    positionId?: string
  ): Promise<{
    procesos_asignados: string[];
    objetivos_asignados: string[];
    indicadores_asignados: string[];
  }> {
    const result = {
      procesos_asignados: Array.isArray(personnel.procesos_asignados)
        ? [...personnel.procesos_asignados]
        : [],
      objetivos_asignados: Array.isArray(personnel.objetivos_asignados)
        ? [...personnel.objetivos_asignados]
        : [],
      indicadores_asignados: Array.isArray(personnel.indicadores_asignados)
        ? [...personnel.indicadores_asignados]
        : [],
    };

    try {
      const db = getAdminFirestore();

      // Source 1: granular assignments collection (newer model)
      if (result.procesos_asignados.length === 0) {
        const assignmentsSnap = await db
          .collection('personnel_process_assignments')
          .where('personnel_id', '==', personnel.id)
          .get();

        if (!assignmentsSnap.empty) {
          const activeDocs = assignmentsSnap.docs
            .map(doc => doc.data() as Record<string, unknown>)
            .filter(d => d.estado !== 'inactivo');

          const granularProcessIds = activeDocs
            .map(d => d.process_definition_id)
            .filter((id): id is string => typeof id === 'string' && !!id);

          const granularObjectiveIds = activeDocs
            .flatMap(d =>
              Array.isArray(d.objetivos_asignados)
                ? (d.objetivos_asignados as unknown[])
                : []
            )
            .filter((id): id is string => typeof id === 'string' && !!id);

          const granularIndicatorIds = activeDocs
            .flatMap(d =>
              Array.isArray(d.indicadores_asignados)
                ? (d.indicadores_asignados as unknown[])
                : []
            )
            .filter((id): id is string => typeof id === 'string' && !!id);

          result.procesos_asignados.push(...granularProcessIds);
          result.objetivos_asignados.push(...granularObjectiveIds);
          result.indicadores_asignados.push(...granularIndicatorIds);
        }
      }

      // Source 2: legacy position-level assignments (migration compatibility)
      if (result.procesos_asignados.length === 0 && positionId) {
        const positionDoc = await db
          .collection('positions')
          .doc(positionId)
          .get();
        if (positionDoc.exists) {
          const data = (positionDoc.data() || {}) as Record<string, unknown>;
          if (Array.isArray(data.procesos_asignados)) {
            result.procesos_asignados.push(
              ...(data.procesos_asignados as unknown[]).filter(
                (id): id is string => typeof id === 'string' && !!id
              )
            );
          }
          if (Array.isArray(data.objetivos_asignados)) {
            result.objetivos_asignados.push(
              ...(data.objetivos_asignados as unknown[]).filter(
                (id): id is string => typeof id === 'string' && !!id
              )
            );
          }
          if (Array.isArray(data.indicadores_asignados)) {
            result.indicadores_asignados.push(
              ...(data.indicadores_asignados as unknown[]).filter(
                (id): id is string => typeof id === 'string' && !!id
              )
            );
          }
        }
      }

      // Source 3: processes where this personnel is jefe_proceso
      // This catches the case where a user is assigned as process owner
      // via jefe_proceso_id on the process definition itself
      if (personnel.id) {
        try {
          const jefeQuery = await db
            .collection('processDefinitions')
            .where('jefe_proceso_id', '==', personnel.id)
            .get();

          if (!jefeQuery.empty) {
            const jefeProcessIds = jefeQuery.docs
              .map(d => d.id)
              .filter(id => !!id);

            if (jefeProcessIds.length > 0) {
              console.log(
                `[UserContextService] Found ${jefeProcessIds.length} processes via jefe_proceso_id for personnel ${personnel.id}`
              );
              result.procesos_asignados.push(...jefeProcessIds);
            }
          }
        } catch (jefeError) {
          console.warn(
            '[UserContextService] Error querying jefe_proceso_id fallback:',
            jefeError
          );
        }
      }
    } catch (error) {
      console.warn(
        '[UserContextService] Error resolving assignment fallbacks:',
        error
      );
    }

    // Deduplicate all arrays
    return {
      procesos_asignados: Array.from(new Set(result.procesos_asignados)),
      objetivos_asignados: Array.from(new Set(result.objetivos_asignados)),
      indicadores_asignados: Array.from(new Set(result.indicadores_asignados)),
    };
  }

  private static async fetchChatHistory(
    organizationId: string,
    userId: string,
    limit = 10
  ): Promise<UserContextChatSession[]> {
    try {
      const db = getAdminFirestore();
      let sessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
      try {
        const sessions = await db
          .collection(COLLECTIONS.SESSIONS)
          .where('organizationId', '==', organizationId)
          .where('userId', '==', userId)
          .orderBy('updatedAt', 'desc')
          .limit(limit)
          .get();
        sessionDocs = sessions.docs;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes('FAILED_PRECONDITION')
        ) {
          throw error;
        }
        const fallback = await db
          .collection(COLLECTIONS.SESSIONS)
          .where('organizationId', '==', organizationId)
          .where('userId', '==', userId)
          .get();
        sessionDocs = fallback.docs
          .sort((a, b) => {
            const aUpdated = a.data().updatedAt?.toDate?.()?.getTime?.() || 0;
            const bUpdated = b.data().updatedAt?.toDate?.()?.getTime?.() || 0;
            return bUpdated - aUpdated;
          })
          .slice(0, limit);
      }

      const built = await Promise.all(
        sessionDocs.map(async doc => {
          const data = doc.data() as Record<string, any>;
          const rawMessages = await this.fetchSessionMessages(
            doc.id,
            organizationId,
            20
          );
          const conversationId = this.extractConversationId(rawMessages);
          const unifiedMessages = conversationId
            ? await this.fetchUnifiedConversationMessages(conversationId, 20)
            : [];
          const messages = rawMessages.map(message => ({
            id: message.id,
            role: message.role,
            content: message.content || '',
            createdAt:
              message.createdAt instanceof Date
                ? message.createdAt
                : new Date(),
            source: 'chat' as const,
            traceId:
              typeof message.metadata?.traceId === 'string'
                ? message.metadata.traceId
                : undefined,
          }));

          return {
            id: doc.id,
            title:
              typeof data.title === 'string' && data.title.trim()
                ? data.title
                : 'Conversacion',
            type: (data.type || 'advisor') as UserContextChatSession['type'],
            status: (data.status ||
              'active') as UserContextChatSession['status'],
            module: typeof data.module === 'string' ? data.module : undefined,
            messageCount:
              typeof data.messageCount === 'number' ? data.messageCount : 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            lastMessageAt: data.lastMessageAt?.toDate?.() || null,
            conversationId,
            messages,
            unifiedMessages,
          } satisfies UserContextChatSession;
        })
      );

      return built;
    } catch (error) {
      console.warn('[UserContextService] Error fetching chat history:', error);
      return [];
    }
  }

  private static async fetchSessionMessages(
    sessionId: string,
    organizationId: string,
    limit = 20
  ): Promise<ChatMessageWithMetadata[]> {
    try {
      const db = getAdminFirestore();
      let docs: FirebaseFirestore.QueryDocumentSnapshot[];
      try {
        const snapshot = await db
          .collection(COLLECTIONS.MESSAGES)
          .where('sessionId', '==', sessionId)
          .where('organizationId', '==', organizationId)
          .orderBy('createdAt', 'asc')
          .limit(limit)
          .get();
        docs = snapshot.docs;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes('FAILED_PRECONDITION')
        ) {
          throw error;
        }
        const fallback = await db
          .collection(COLLECTIONS.MESSAGES)
          .where('sessionId', '==', sessionId)
          .where('organizationId', '==', organizationId)
          .get();
        docs = fallback.docs
          .sort((a, b) => {
            const aCreated = a.data().createdAt?.toDate?.()?.getTime?.() || 0;
            const bCreated = b.data().createdAt?.toDate?.()?.getTime?.() || 0;
            return aCreated - bCreated;
          })
          .slice(0, limit);
      }

      return docs.map(doc => {
        const data = doc.data() as ChatMessageWithMetadata & {
          createdAt?: { toDate?: () => Date };
        };
        const createdAtValue = data.createdAt as
          | Date
          | { toDate?: () => Date }
          | undefined;
        return {
          id: doc.id,
          role: data.role,
          content: data.content || '',
          createdAt:
            createdAtValue instanceof Date
              ? createdAtValue
              : createdAtValue?.toDate?.() || new Date(),
          metadata: data.metadata || null,
        };
      });
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching session messages:',
        error
      );
      return [];
    }
  }

  private static async fetchUnifiedConversationMessages(
    conversationId: string,
    limit = 20
  ): Promise<UserContextHistoryMessage[]> {
    try {
      const messages = await AIConversationStore.getHistory(
        conversationId,
        limit
      );
      return messages.map(message => ({
        id: message.id || `${message.traceId}-${message.role}`,
        role: message.role,
        content: message.content,
        createdAt: message.timestamp,
        source: 'ai',
        channel: message.channel,
        traceId: message.traceId,
      }));
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching unified conversation:',
        error
      );
      return [];
    }
  }

  private static extractConversationId(
    messages: ChatMessageWithMetadata[]
  ): string | null {
    for (const message of messages) {
      const conversationId = message.metadata?.conversationId;
      if (typeof conversationId === 'string' && conversationId.trim()) {
        return conversationId;
      }
    }
    return null;
  }

  private static async fetchInstalledCapabilities(
    organizationId: string
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      const db = getAdminFirestore();
      const installedSnapshot = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('installed_capabilities')
        .where('enabled', '==', true)
        .get();

      if (installedSnapshot.empty) {
        return [];
      }

      const capabilityIds: string[] = Array.from(
        new Set<string>(
          installedSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return typeof data.capability_id === 'string'
                ? data.capability_id
                : doc.id;
            })
            .filter((id): id is string => Boolean(id))
        )
      );

      const capabilities: Array<{ id: string; name: string }> =
        await Promise.all(
          capabilityIds.map(async capabilityId => {
            const capabilityDoc = await db
              .collection('platform_capabilities')
              .doc(capabilityId)
              .get();

            const capabilityData = capabilityDoc.data() as
              | { name?: unknown }
              | undefined;
            const capabilityName = capabilityData?.name;

            return {
              id: capabilityId,
              name:
                typeof capabilityName === 'string' && capabilityName.trim()
                  ? capabilityName.trim()
                  : capabilityId,
            };
          })
        );

      return capabilities.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching installed capabilities:',
        error
      );
      return [];
    }
  }

  private static async fetchComplianceData(): Promise<{
    global_percentage: number;
    mandatory_pending: number;
    high_priority_pending: number;
    high_priority_gaps: Array<{
      code: string;
      title: string;
      priority: 'alta' | 'media' | 'baja';
    }>;
    upcoming_reviews: number;
  } | null> {
    try {
      const stats = await NormPointRelationService.getComplianceStats();

      // Obtener gaps de alta prioridad
      const pendingRelations =
        await NormPointRelationService.getByStatus('pendiente');
      const allNormPoints = await NormPointService.getAll();
      const highPriorityPoints = allNormPoints.filter(
        p => p.priority === 'alta'
      );

      const high_priority_gaps = await Promise.all(
        pendingRelations
          .filter(rel =>
            highPriorityPoints.some(p => p.id === rel.norm_point_id)
          )
          .slice(0, 5)
          .map(async rel => {
            const np = await NormPointService.getById(rel.norm_point_id);
            return {
              code: np?.code || '',
              title: np?.title || '',
              priority: (np?.priority || 'media') as 'alta' | 'media' | 'baja',
            };
          })
      );

      return {
        global_percentage: stats.global_percentage,
        mandatory_pending: stats.mandatory_pending,
        high_priority_pending: stats.high_priority_pending,
        high_priority_gaps,
        upcoming_reviews: stats.upcoming_reviews.length,
      };
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching compliance data:',
        error
      );
      return null;
    }
  }
  private static async fetchUnifiedConfig() {
    try {
      const revision = await PlanificacionRevisionDireccionService.getLatest();

      if (!revision) {
        console.log('[UserContextService] No unified config revision found');
        return null;
      }

      // Map to OrganizationalConfig with defensive checks
      const organizationalConfig = {
        id: revision.id,
        organization_name:
          revision.IdentidadOrganizacional?.NOMBRE_ORGANIZACION || '',
        mission: revision.IdentidadOrganizacional?.MISION || undefined,
        vision: revision.IdentidadOrganizacional?.VISION || undefined,
        values:
          revision.Contexto?.CUESTIONES_INTERNAS?.filter(
            c => c.tipo === 'valores'
          ).map(c => c.descripcion) || [],
        policies: revision.Politicas?.map(p => p.titulo) || [],
        created_at: new Date(revision.created_at),
        updated_at: new Date(revision.updated_at),
      };

      // Map to SGCScope with defensive checks
      const sgcScope = {
        id: revision.id,
        scope_statement: revision.AlcanceSGC?.DESCRIPCION || '',
        products_services:
          revision.AlcanceSGC?.PRODUCTOS_SERVICIOS?.map(p => p.nombre) || [],
        locations: revision.AlcanceSGC?.UBICACIONES?.map(u => u.nombre) || [],
        created_at: new Date(revision.created_at),
        updated_at: new Date(revision.updated_at),
      };

      // Map to OrganizationalContext with defensive checks
      const organizationalContext = {
        id: revision.id,
        external_issues:
          revision.Contexto?.CUESTIONES_EXTERNAS?.map(c => c.descripcion) || [],
        internal_issues:
          revision.Contexto?.CUESTIONES_INTERNAS?.map(c => c.descripcion) || [],
        created_at: new Date(revision.created_at),
        updated_at: new Date(revision.updated_at),
      };

      return {
        organizationalConfig,
        sgcScope,
        organizationalContext,
      };
    } catch (error) {
      console.warn(
        '[UserContextService] Error fetching unified config:',
        error
      );
      return null;
    }
  }
}
