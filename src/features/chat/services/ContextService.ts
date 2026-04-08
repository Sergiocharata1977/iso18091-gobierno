// ============================================
// SERVICIO DE CONTEXTO - GENERA CONTEXTO PARA IA
// ============================================
// Carga información del usuario y organización para alimentar al modelo de IA

import { getAdminFirestore } from '@/lib/firebase/admin';
import { ContextBuilder } from '@/ai/services/ContextBuilder';
import type { AIContextProfile, UnifiedAIContext } from '@/ai/types/context';
import { buildAccountingContext } from '@/services/ai-core/accountingContextBuilder';
import { UserContextService } from '@/services/context/UserContextService';
import {
  AssignmentsContext,
  ChatContext,
  OrganizationContext,
  PersonnelContextInfo,
} from '../types';
import { KnowledgeBaseService } from './KnowledgeBaseService';

export class ContextService {
  /**
   * Obtener contexto completo para la IA
   * @param organizationId ID de la organización
   * @param userId ID del usuario
   * @returns Contexto para la IA
   */
  static async getContext(
    organizationId: string,
    userId: string
  ): Promise<ChatContext> {
    const unified = await this.getUnifiedContext(
      organizationId,
      userId,
      'chat'
    );
    const context = ContextBuilder.toLegacyChatContext(unified);
    const fullContext = await UserContextService.getUserFullContext(userId);
    context.installedCapabilities = fullContext.installedCapabilities;
    context.workItems = (fullContext.processRecords || [])
      .slice(0, 10)
      .map(record => ({
        id: record.id,
        title: record.titulo || 'Registro de proceso',
        status: record.estado,
        dueDate:
          record.fecha_vencimiento instanceof Date
            ? record.fecha_vencimiento
            : undefined,
        processName:
          fullContext.procesos.find(process => process.id === record.processId)
            ?.nombre || record.processId,
      }));
    return context;
  }

  /**
   * Obtener contexto unificado reutilizable para IA (bridge de migracion)
   */
  static async getUnifiedContext(
    organizationId: string,
    userId: string,
    profile: AIContextProfile = 'chat'
  ): Promise<UnifiedAIContext> {
    const db = getAdminFirestore();
    const [userContext, orgConfig, accounting] = await Promise.all([
      UserContextService.getUserFullContext(userId),
      this.loadOrganizationConfig(db, organizationId),
      buildAccountingContext(organizationId),
    ]);

    const user = userContext.user;
    if (!user) {
      throw new Error('User not found');
    }
    if (user.organization_id !== organizationId) {
      throw new Error('User does not belong to this organization');
    }

    const personnel = userContext.personnel
      ? ({
          id: userContext.personnel.id,
          fullName: [
            userContext.personnel.nombres,
            userContext.personnel.apellidos,
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          position:
            userContext.position?.nombre || userContext.personnel.puesto || '',
          department:
            userContext.department?.nombre ||
            userContext.personnel.departamento ||
            '',
          supervisorName:
            [userContext.supervisor?.nombres, userContext.supervisor?.apellidos]
              .filter(Boolean)
              .join(' ')
              .trim() || userContext.personnel.supervisor_nombre,
        } satisfies PersonnelContextInfo)
      : undefined;

    const assignments =
      userContext.procesos.length > 0 ||
      userContext.objetivos.length > 0 ||
      userContext.indicadores.length > 0
        ? ({
            processes: userContext.procesos.map(process => ({
              id: process.id,
              name: process.nombre || process.codigo || process.id,
            })),
            objectives: userContext.objetivos.map(objective => ({
              id: objective.id,
              name:
                objective.title ||
                objective.description ||
                objective.code ||
                objective.id,
            })),
            indicators: userContext.indicadores.map(indicator => ({
              id: indicator.id,
              name: indicator.name || indicator.code || indicator.id,
            })),
          } satisfies AssignmentsContext)
        : undefined;

    const compliance = userContext.complianceData
      ? {
          organizationId,
          globalPercentage: userContext.complianceData.global_percentage,
          mandatoryPending: userContext.complianceData.mandatory_pending,
          highPriorityPending: userContext.complianceData.high_priority_pending,
        }
      : await this.loadComplianceData(db, organizationId);

    return ContextBuilder.build({
      organizationId,
      profile,
      sources: {
        organization: orgConfig || {
          id: organizationId,
          name: 'Organizacion',
        },
        user: {
          id: user.id,
          email: user.email,
          displayName:
            [userContext.personnel?.nombres, userContext.personnel?.apellidos]
              .filter(Boolean)
              .join(' ')
              .trim() || user.email,
          role: user.rol,
          organizationId: user.organization_id || organizationId,
        },
        personnel,
        assignments,
        compliance: compliance
          ? {
              organizationId,
              globalPercentage: compliance.globalPercentage,
              mandatoryPending: compliance.mandatoryPending,
              highPriorityPending: compliance.highPriorityPending,
            }
          : undefined,
        accounting: accounting
          ? {
              ...accounting,
            }
          : undefined,
      },
    });
  }

  static async getExternalChannelContext(params: {
    organizationId: string;
    externalUserId: string;
    displayName?: string;
    role?: string;
    profile?: AIContextProfile;
  }): Promise<UnifiedAIContext> {
    const db = getAdminFirestore();
    const [orgConfig, compliance, accounting] = await Promise.all([
      this.loadOrganizationConfig(db, params.organizationId),
      this.loadComplianceData(db, params.organizationId),
      buildAccountingContext(params.organizationId),
    ]);

    return ContextBuilder.build({
      organizationId: params.organizationId,
      profile: params.profile || 'chat',
      sources: {
        organization: orgConfig || {
          id: params.organizationId,
          name: 'Organizacion',
        },
        user: {
          id: params.externalUserId,
          email: '',
          displayName: params.displayName || 'Cliente de WhatsApp',
          role: params.role || 'operario',
          organizationId: params.organizationId,
        },
        compliance: compliance
          ? {
              organizationId: params.organizationId,
              globalPercentage: compliance.globalPercentage,
              mandatoryPending: compliance.mandatoryPending,
              highPriorityPending: compliance.highPriorityPending,
            }
          : undefined,
        accounting: accounting
          ? {
              ...accounting,
            }
          : undefined,
      },
    });
  }

  /**
   * Generar prompt de sistema basado en el contexto
   * @param context Contexto del chat
   * @param module Módulo específico (opcional)
   * @returns Prompt de sistema
   */
  static generateSystemPrompt(context: ChatContext, module?: string): string {
    const parts: string[] = [];

    // ============================================
    // IDENTIDAD Y ALCANCE
    // ============================================
    parts.push(
      `# DON CÁNDIDO - Asistente de ISO 9001 y Sistema de Gestión de Calidad`
    );
    parts.push('');
    parts.push(`## Tu Identidad`);
    parts.push(
      `Eres DON CÁNDIDO, un asesor experto y amigable especializado en:`
    );
    parts.push(
      `1. **Implementación de ISO 9001:2015** - Guías paso a paso para certificación`
    );
    parts.push(
      `2. **Uso del sistema 9001 App** - Cómo utilizar cada módulo de la plataforma`
    );
    parts.push(
      `3. **Otras normas ISO** - ISO 14001, ISO 45001, ISO 27001 (conocimiento general)`
    );
    parts.push('');

    // ============================================
    // ALCANCE ESTRICTO
    // ============================================
    parts.push(`## ALCANCE - LO QUE PUEDES RESPONDER`);
    parts.push(`✅ Preguntas sobre implementación de ISO 9001:2015`);
    parts.push(
      `✅ Cómo usar los módulos del sistema (Documentos, Auditorías, Procesos, etc.)`
    );
    parts.push(`✅ Buenas prácticas de gestión de calidad`);
    parts.push(`✅ Requisitos de la norma ISO 9001 y sus cláusulas`);
    parts.push(`✅ Guiar al usuario en su proceso de certificación`);
    parts.push('');
    parts.push(`## LO QUE NO DEBES RESPONDER`);
    parts.push(
      `❌ Preguntas técnicas de programación o desarrollo de software`
    );
    parts.push(
      `❌ Temas no relacionados con calidad, ISO o gestión empresarial`
    );
    parts.push(
      `❌ Si te preguntan algo fuera de alcance, responde amablemente:`
    );
    parts.push(
      `   "Soy especialista en ISO 9001 y uso del sistema. Para otras consultas, contacta a soporte."`
    );
    parts.push('');

    // ============================================
    // USO DE HERRAMIENTAS (TOOLS)
    // ============================================
    parts.push(`## USO DE HERRAMIENTAS (MUY IMPORTANTE)`);
    parts.push(
      `SOLO usa herramientas (tools) cuando el usuario EXPLÍCITAMENTE pide ejecutar una acción como:`
    );
    parts.push(`- "Crea un hallazgo..."`);
    parts.push(`- "Registra una no conformidad..."`);
    parts.push(`- "Quiero reportar un problema..."`);
    parts.push('');
    parts.push(
      `Si el usuario hace una PREGUNTA (¿qué es?, ¿cómo funciona?, ¿qué hace?), RESPONDE con texto.`
    );
    parts.push(
      `NO ejecutes ninguna herramienta para responder preguntas. Solo responde conversacionalmente.`
    );
    parts.push('');
    parts.push(`## QUÉ ES ESTE SISTEMA`);
    parts.push(
      `Este es **9001 App**, un software para gestionar Sistemas de Gestión de Calidad ISO 9001.`
    );
    parts.push(
      `Permite: gestionar documentos, auditorías, hallazgos, acciones correctivas, procesos, RRHH y más.`
    );
    parts.push('');

    if (
      context.installedCapabilities &&
      context.installedCapabilities.length > 0
    ) {
      parts.push(`## Modulos activos de esta organizacion`);
      parts.push(`Esta organizacion tiene habilitados los siguientes modulos:`);
      context.installedCapabilities.forEach(capability => {
        parts.push(`- ${capability.name}`);
      });
      parts.push('');
      parts.push(
        `Usa esta informacion para orientar al usuario: si pregunta por un modulo, confirma si esta disponible.`
      );
      parts.push(
        `Si pregunta por algo que NO esta en esta lista, indica que ese modulo no esta activado y que contacte al administrador del sistema.`
      );
      parts.push('');
    }

    if (context.accounting?.currentPeriod) {
      parts.push(`## Contexto contable activo`);
      parts.push(
        `- **Período actual:** ${context.accounting.currentPeriod.code} (${context.accounting.currentPeriod.status})`
      );
      parts.push(
        `- **Asientos contabilizados:** ${context.accounting.currentPeriod.totalEntries}`
      );
      parts.push(
        `- **Debe/Haber del período:** ${context.accounting.currentPeriod.totalDebe} / ${context.accounting.currentPeriod.totalHaber}`
      );
      parts.push(
        `- **Balance del período:** ${context.accounting.currentPeriod.balanceMatches ? 'Cuadra' : 'No cuadra'}`
      );
      if (typeof context.accounting.currentPeriod.cashBalance === 'number') {
        parts.push(
          `- **Saldo de caja y bancos:** ${context.accounting.currentPeriod.cashBalance}`
        );
      }
      if (
        typeof context.accounting.currentPeriod.billedThisMonth === 'number'
      ) {
        parts.push(
          `- **Facturación/ingresos del período:** ${context.accounting.currentPeriod.billedThisMonth}`
        );
      }
      if (context.accounting.keyBalances?.length) {
        parts.push(`- **Saldos clave:**`);
        context.accounting.keyBalances.forEach(balance => {
          parts.push(
            `  - ${balance.code} ${balance.name}: ${balance.balance} (${balance.nature})`
          );
        });
      }
      if (context.accounting.recentEntries?.length) {
        parts.push(`- **Últimos asientos:**`);
        context.accounting.recentEntries.forEach(entry => {
          parts.push(
            `  - ${entry.fecha} | ${entry.descripcion} | ${entry.status} | ${entry.totalDebe}/${entry.totalHaber} | ${entry.documentoTipo || 'documento'} ${entry.documentoId}`
          );
        });
      }
      parts.push('');
      parts.push(
        `Si el usuario pregunta por saldos, facturación del mes, últimos asientos o si el balance cuadra, responde con este contexto contable del tenant.`
      );
      parts.push(
        `Si un dato puntual no aparece aquí, dilo explícitamente y deriva al módulo Contabilidad para validar el detalle.`
      );
      parts.push('');
    }

    // ============================================
    // KNOWLEDGE BASE DEL SISTEMA
    // ============================================
    parts.push(KnowledgeBaseService.getKnowledgeContext());

    // ============================================
    // CONTEXTO DE LA ORGANIZACIÓN
    // ============================================
    parts.push(`## Contexto de la Organización Actual`);
    parts.push(`- **Organización:** ${context.organization.name}`);
    if (context.organization.mission) {
      parts.push(`- **Misión:** ${context.organization.mission}`);
    }
    if (context.organization.vision) {
      parts.push(`- **Visión:** ${context.organization.vision}`);
    }
    if (context.organization.scope) {
      parts.push(`- **Alcance del SGC:** ${context.organization.scope}`);
    }
    parts.push('');

    // ============================================
    // CONTEXTO DEL USUARIO
    // ============================================
    parts.push(`## Usuario Actual`);
    parts.push(
      `- **Nombre:** ${context.user.displayName || context.user.email}`
    );
    parts.push(`- **Rol:** ${context.user.role}`);

    if (context.personnel) {
      parts.push(
        `- **Puesto:** ${context.personnel.position || 'No especificado'}`
      );
      parts.push(
        `- **Departamento:** ${context.personnel.department || 'No especificado'}`
      );
      if (context.personnel.supervisorName) {
        parts.push(`- **Supervisor:** ${context.personnel.supervisorName}`);
      }
    }
    parts.push('');

    // Asignaciones
    if (context.assignments) {
      parts.push(`## Asignaciones del Usuario`);
      if (context.assignments.processes.length > 0) {
        parts.push(
          `- **Procesos:** ${context.assignments.processes.map(p => p.name).join(', ')}`
        );
      }
      if (context.assignments.objectives.length > 0) {
        parts.push(
          `- **Objetivos:** ${context.assignments.objectives.map(o => o.name).join(', ')}`
        );
      }
      if (context.assignments.indicators.length > 0) {
        parts.push(
          `- **Indicadores:** ${context.assignments.indicators.map(i => i.name).join(', ')}`
        );
      }
      parts.push('');
    }

    if (context.workItems && context.workItems.length > 0) {
      parts.push('## Tareas y registros operativos visibles en Mi Panel');
      context.workItems.slice(0, 8).forEach(item => {
        parts.push(
          `- ${item.title}${item.processName ? ` (${item.processName})` : ''} · Estado: ${item.status || 'N/D'}${item.dueDate ? ` · Vence: ${item.dueDate.toISOString().slice(0, 10)}` : ''}`
        );
      });
      parts.push('');
    }

    // Cumplimiento
    if (context.compliance) {
      parts.push(`## Estado del SGC`);
      parts.push(
        `- Cumplimiento global: ${context.compliance.globalPercentage}%`
      );
      parts.push(
        `- Requisitos obligatorios pendientes: ${context.compliance.mandatoryPending}`
      );
      parts.push(
        `- Alta prioridad pendiente: ${context.compliance.highPriorityPending}`
      );
      parts.push('');
    }

    // ============================================
    // MÓDULO ESPECÍFICO
    // ============================================
    if (module) {
      parts.push(`## Módulo Activo: ${module}`);
      const moduloInfo = KnowledgeBaseService.getModuloInfo(
        module.toLowerCase()
      );
      if (moduloInfo) {
        parts.push(moduloInfo);
      } else {
        parts.push(`El usuario está trabajando en el módulo: ${module}`);
        parts.push(`Enfoca tus respuestas en este contexto específico.`);
      }
      parts.push('');
    }

    // ============================================
    // INSTRUCCIONES DE COMPORTAMIENTO
    // ============================================
    parts.push(`## Instrucciones de Respuesta`);
    parts.push(
      `1. **Responde en español** de manera profesional pero accesible`
    );
    parts.push(
      `2. **Sé conciso y orientado a la acción** - el usuario busca resolver problemas`
    );
    parts.push(
      `3. **Usa la información del Knowledge Base** para guiar sobre el uso del sistema`
    );
    parts.push(
      `4. **Ofrece ejemplos prácticos** cuando expliques conceptos de ISO 9001`
    );
    parts.push(
      `5. **Sugiere el siguiente paso** cuando el usuario complete una tarea`
    );
    parts.push(
      `6. **Referencia los módulos correctos** cuando el usuario pregunte cómo hacer algo`
    );
    parts.push(
      `7. **Si no conoces algo específico**, indica que consulte el Manual de Usuario en docs.doncandidoia.com`
    );

    return parts.join('\n');
  }

  // ============================================
  // MÉTODOS PRIVADOS DE CARGA
  // ============================================

  private static async loadUser(
    db: FirebaseFirestore.Firestore,
    userId: string
  ): Promise<{
    id: string;
    email: string;
    organizationId: string;
    personnelId?: string;
    displayName?: string;
    role: string;
  } | null> {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data?.email || '',
      organizationId: data?.organization_id || '',
      personnelId: data?.personnel_id || undefined,
      displayName: undefined, // Se puede enriquecer con datos de personnel
      role: data?.rol || 'operario',
    };
  }

  private static async loadOrganizationConfig(
    db: FirebaseFirestore.Firestore,
    organizationId: string
  ): Promise<OrganizationContext | null> {
    try {
      // Intentar cargar de la colección de organizaciones
      const orgDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .get();

      if (orgDoc.exists) {
        const data = orgDoc.data();
        return {
          id: organizationId,
          name: data?.name || 'Organización',
          mission: data?.mission,
          vision: data?.vision,
          scope: data?.scope,
        };
      }

      // Fallback: intentar cargar de planificacion_revision_direccion
      const revisionSnapshot = await db
        .collection('planificacion_revision_direccion')
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (!revisionSnapshot.empty) {
        const data = revisionSnapshot.docs[0].data();
        return {
          id: organizationId,
          name:
            data?.IdentidadOrganizacional?.NOMBRE_ORGANIZACION ||
            'Organización',
          mission: data?.IdentidadOrganizacional?.MISION,
          vision: data?.IdentidadOrganizacional?.VISION,
          scope: data?.AlcanceSGC?.DESCRIPCION,
        };
      }

      return {
        id: organizationId,
        name: 'Organización',
      };
    } catch (error) {
      console.warn('[ContextService] Error loading org config:', error);
      return {
        id: organizationId,
        name: 'Organización',
      };
    }
  }

  private static async loadPersonnel(
    db: FirebaseFirestore.Firestore,
    personnelId: string
  ): Promise<{
    info: PersonnelContextInfo;
    assignments: AssignmentsContext;
  } | null> {
    try {
      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();

      if (!personnelDoc.exists) {
        return null;
      }

      const data = personnelDoc.data();
      if (!data) {
        return null;
      }

      // Cargar datos relacionados
      const [position, department, supervisor] = await Promise.all([
        data.puesto ? this.loadPosition(db, data.puesto) : null,
        data.departamento ? this.loadDepartment(db, data.departamento) : null,
        data.supervisor_id
          ? this.loadPersonnelName(db, data.supervisor_id)
          : null,
      ]);

      // Cargar asignaciones
      const assignments = await this.loadAssignments(
        db,
        data.procesos_asignados || [],
        data.objetivos_asignados || [],
        data.indicadores_asignados || []
      );

      return {
        info: {
          id: personnelId,
          fullName: `${data.nombres || ''} ${data.apellidos || ''}`.trim(),
          position: position?.nombre,
          department: department?.nombre,
          supervisorName: supervisor || undefined,
        },
        assignments,
      };
    } catch (error) {
      console.warn('[ContextService] Error loading personnel:', error);
      return null;
    }
  }

  private static async loadPosition(
    db: FirebaseFirestore.Firestore,
    positionId: string
  ): Promise<{ nombre: string } | null> {
    try {
      const doc = await db.collection('positions').doc(positionId).get();
      return doc.exists ? { nombre: doc.data()?.nombre || '' } : null;
    } catch {
      return null;
    }
  }

  private static async loadDepartment(
    db: FirebaseFirestore.Firestore,
    departmentId: string
  ): Promise<{ nombre: string } | null> {
    try {
      const doc = await db.collection('departments').doc(departmentId).get();
      return doc.exists ? { nombre: doc.data()?.nombre || '' } : null;
    } catch {
      return null;
    }
  }

  private static async loadPersonnelName(
    db: FirebaseFirestore.Firestore,
    personnelId: string
  ): Promise<string | null> {
    try {
      const doc = await db.collection('personnel').doc(personnelId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return `${data?.nombres || ''} ${data?.apellidos || ''}`.trim() || null;
    } catch {
      return null;
    }
  }

  private static async loadAssignments(
    db: FirebaseFirestore.Firestore,
    processIds: string[],
    objectiveIds: string[],
    indicatorIds: string[]
  ): Promise<AssignmentsContext> {
    const loadNames = async (collection: string, ids: string[]) => {
      if (ids.length === 0) return [];

      const results: Array<{ id: string; name: string }> = [];

      for (const id of ids.slice(0, 5)) {
        // Limitar a 5 para performance
        try {
          const doc = await db.collection(collection).doc(id).get();
          if (doc.exists) {
            results.push({
              id,
              name: doc.data()?.nombre || doc.data()?.name || id,
            });
          }
        } catch {
          // Ignorar errores individuales
        }
      }

      return results;
    };

    const [processes, objectives, indicators] = await Promise.all([
      loadNames('process_definitions', processIds),
      loadNames('quality_objectives', objectiveIds),
      loadNames('quality_indicators', indicatorIds),
    ]);

    return { processes, objectives, indicators };
  }

  private static async loadComplianceData(
    db: FirebaseFirestore.Firestore,
    organizationId: string
  ): Promise<ChatContext['compliance'] | undefined> {
    try {
      // Intentar cargar estadísticas de cumplimiento
      // Por ahora retornamos undefined, se puede implementar después
      return undefined;
    } catch {
      return undefined;
    }
  }
}
