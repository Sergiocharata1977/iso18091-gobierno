import { AuditService } from '@/services/audits/AuditService';
import { UserService } from '@/services/auth/UserService';
import { FindingService } from '@/services/findings/FindingService';
import type { Audit } from '@/types/audits';
import type { Finding } from '@/types/findings';

export interface ProactiveSuggestion {
  id: string;
  type: 'audit' | 'finding' | 'action' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionButtons?: {
    label: string;
    command: string;
  }[];
  relatedItems?: {
    id: string;
    type: string;
    title: string;
  }[];
}

export class ProactiveAssistantService {
  /**
   * Generar sugerencias proactivas basadas en el contexto del usuario
   */
  static async generateSuggestions(
    userId: string,
    userContext?: any
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    try {
      const user = await UserService.getById(userId);
      const organizationId = user?.organization_id;

      if (!organizationId) {
        console.warn('[ProactiveAssistant] User has no organization ID');
        return [];
      }

      // 1. Auditorías pendientes
      const auditSuggestions = await this.checkPendingAudits(
        userId,
        organizationId
      );
      suggestions.push(...auditSuggestions);

      // 2. Hallazgos sin asignar
      const findingSuggestions = await this.checkUnassignedFindings(
        userId,
        organizationId
      );
      suggestions.push(...findingSuggestions);

      // 3. Gaps de cumplimiento normativo
      const complianceSuggestions = await this.checkComplianceGaps(userId);
      suggestions.push(...complianceSuggestions);

      // 4. Sugerencias contextuales por módulo
      if (userContext?.modulo) {
        const contextualSuggestions = this.getContextualSuggestions(
          userContext.modulo
        );
        suggestions.push(...contextualSuggestions);
      }

      // Ordenar por prioridad y limitar a 3
      return this.prioritizeSuggestions(suggestions).slice(0, 3);
    } catch (error) {
      console.error(
        '[ProactiveAssistant] Error generating suggestions:',
        error
      );
      return [];
    }
  }

  /**
   * Verificar auditorías pendientes
   */
  private static async checkPendingAudits(
    userId: string,
    organizationId: string
  ): Promise<ProactiveSuggestion[]> {
    try {
      const audits = await AuditService.getByStatus(organizationId, 'planned');

      if (!audits || audits.length === 0) return [];

      // Filtrar auditorías de esta semana
      const thisWeek = audits.filter((audit: Audit) => {
        if (!audit.plannedDate) return false;

        const dueDate =
          audit.plannedDate instanceof Date
            ? audit.plannedDate
            : audit.plannedDate.toDate();

        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        return dueDate >= today && dueDate <= weekFromNow;
      });

      if (thisWeek.length === 0) return [];

      // Crear lista de auditorías
      const auditList = thisWeek
        .slice(0, 3)
        .map((a: Audit) => {
          const dueDate =
            a.plannedDate instanceof Date
              ? a.plannedDate
              : a.plannedDate.toDate();
          const daysUntil = this.getDaysUntil(dueDate);

          return `- ${a.auditNumber}: ${a.title} (${a.scope}) - Vence en ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`;
        })
        .join('\n');

      return [
        {
          id: 'pending-audits',
          type: 'audit',
          priority: 'high',
          title: `${thisWeek.length} auditoría${thisWeek.length !== 1 ? 's' : ''} pendiente${thisWeek.length !== 1 ? 's' : ''} esta semana`,
          message: `Tienes ${thisWeek.length} auditoría${thisWeek.length !== 1 ? 's' : ''} programada${thisWeek.length !== 1 ? 's' : ''} para esta semana:\n\n${auditList}\n\n¿Necesitas ayuda para revisarlas?`,
          relatedItems: thisWeek.map((a: Audit) => ({
            id: a.id,
            type: 'audit',
            title: a.title,
          })),
        },
      ];
    } catch (error) {
      console.error('[ProactiveAssistant] Error checking audits:', error);
      return [];
    }
  }

  /**
   * Verificar hallazgos sin asignar
   */
  private static async checkUnassignedFindings(
    userId: string,
    organizationId: string
  ): Promise<ProactiveSuggestion[]> {
    try {
      const findings = await FindingService.getUnassigned(organizationId);

      if (!findings || findings.length === 0) return [];

      // Crear lista de hallazgos
      const findingList = findings
        .slice(0, 3)
        .map((f: Finding) => `- ${f.findingNumber}: ${f.registration.name}`)
        .join('\n');

      return [
        {
          id: 'unassigned-findings',
          type: 'finding',
          priority: 'medium',
          title: `${findings.length} hallazgo${findings.length !== 1 ? 's' : ''} sin asignar`,
          message: `Hay ${findings.length} hallazgo${findings.length !== 1 ? 's' : ''} que aún no ha${findings.length !== 1 ? 'n' : ''} sido asignado${findings.length !== 1 ? 's' : ''}:\n\n${findingList}\n\n¿Quieres asignarlos ahora?`,
          relatedItems: findings.map((f: Finding) => ({
            id: f.id,
            type: 'finding',
            title: f.registration.name,
          })),
        },
      ];
    } catch (error) {
      console.error('[ProactiveAssistant] Error checking findings:', error);
      return [];
    }
  }

  /**
   * Obtener sugerencias contextuales según el módulo actual
   */
  private static getContextualSuggestions(
    modulo: string
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    switch (modulo) {
      case 'auditorias':
        suggestions.push({
          id: 'contextual-audit',
          type: 'general',
          priority: 'low',
          title: 'Ayuda con auditorías',
          message:
            'Estás en el módulo de Auditorías. ¿Necesitas ayuda para programar una nueva auditoría?',
          actionButtons: [
            {
              label: 'Crear auditoría',
              command: '/form auditoria',
            },
          ],
        });
        break;

      case 'hallazgos':
        suggestions.push({
          id: 'contextual-finding',
          type: 'general',
          priority: 'low',
          title: 'Ayuda con hallazgos',
          message:
            'Estás en el módulo de Hallazgos. ¿Necesitas reportar una no conformidad?',
          actionButtons: [
            {
              label: 'Reportar hallazgo',
              command: '/form no-conformidad',
            },
          ],
        });
        break;

      case 'acciones':
        suggestions.push({
          id: 'contextual-action',
          type: 'general',
          priority: 'low',
          title: 'Ayuda con acciones',
          message:
            'Estás en el módulo de Acciones. ¿Necesitas ayuda para gestionar tus acciones correctivas?',
        });
        break;
    }

    return suggestions;
  }

  /**
   * Priorizar sugerencias
   */
  private static prioritizeSuggestions(
    suggestions: ProactiveSuggestion[]
  ): ProactiveSuggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return suggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Formatear sugerencias como mensaje de chat
   */
  static formatSuggestionsAsMessage(
    suggestions: ProactiveSuggestion[]
  ): string {
    if (suggestions.length === 0) {
      return '¡Hola! Soy Don Cándido, tu asistente ISO 9001. ¿En qué puedo ayudarte hoy?';
    }

    let message =
      '¡Hola! Soy Don Cándido. 👷‍♂️\n\nTengo algunas sugerencias para ti:\n\n';

    suggestions.forEach((s, i) => {
      const emoji =
        s.priority === 'high' ? '⚠️' : s.priority === 'medium' ? '📋' : '💡';
      message += `${emoji} **${s.title}**\n${s.message}\n\n`;
    });

    message += '¿En qué más te puedo ayudar?';

    return message;
  }

  /**
   * Verificar gaps de cumplimiento normativo
   */
  private static async checkComplianceGaps(
    userId: string
  ): Promise<ProactiveSuggestion[]> {
    try {
      const { NormPointRelationService } = await import(
        '@/services/normPoints/NormPointRelationService'
      );
      const { NormPointService } = await import(
        '@/services/normPoints/NormPointService'
      );

      const stats = await NormPointRelationService.getComplianceStats();

      // Requisitos obligatorios pendientes
      if (stats.mandatory_pending > 0) {
        const pendingRelations =
          await NormPointRelationService.getByStatus('pendiente');
        const allNormPoints = await NormPointService.getAll();
        const mandatoryPoints = allNormPoints.filter(p => p.is_mandatory);

        const mandatoryPending = pendingRelations.filter(rel =>
          mandatoryPoints.some(p => p.id === rel.norm_point_id)
        );

        const topGaps = await Promise.all(
          mandatoryPending.slice(0, 3).map(async rel => {
            const np = await NormPointService.getById(rel.norm_point_id);
            return `- ${np?.code}: ${np?.title}`;
          })
        );

        return [
          {
            id: 'compliance-mandatory-gaps',
            type: 'general',
            priority: 'high',
            title: `${stats.mandatory_pending} requisito(s) obligatorio(s) pendiente(s)`,
            message: `Detecté requisitos normativos obligatorios que aún no están implementados:\n\n${topGaps.join('\n')}\n\n¿Quieres que te ayude a implementarlos?`,
            actionButtons: [
              {
                label: 'Ver dashboard de cumplimiento',
                command: '/ir puntos-norma',
              },
            ],
          },
        ];
      }

      // Requisitos de alta prioridad
      if (stats.high_priority_pending > 0) {
        return [
          {
            id: 'compliance-high-priority',
            type: 'general',
            priority: 'medium',
            title: `${stats.high_priority_pending} requisito(s) de alta prioridad pendiente(s)`,
            message: `Hay requisitos normativos de alta prioridad que requieren atención. ¿Quieres revisarlos?`,
            actionButtons: [
              {
                label: 'Ver análisis de gaps',
                command: '/ir puntos-norma?tab=gaps',
              },
            ],
          },
        ];
      }

      return [];
    } catch (error) {
      console.error(
        '[ProactiveAssistant] Error checking compliance gaps:',
        error
      );
      return [];
    }
  }

  /**
   * Calcular días hasta una fecha
   */
  private static getDaysUntil(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
