import type { ChatContext } from '@/features/chat/types';
import { getContextDocsForScreen } from '@/lib/docs/ai-context';
import type {
  AIContextBuildInput,
  AIContextComplianceSource,
  AIContextNamedRef,
  AIContextProfile,
  AIContextSanitizationLimits,
  AIContextSources,
  LegacyChatContext,
  UnifiedAIContext,
} from '@/ai/types/context';

const PROFILE_LIMITS: Record<AIContextProfile, AIContextSanitizationLimits> = {
  chat: {
    maxStringLength: 180,
    maxMissionLength: 300,
    maxVisionLength: 300,
    maxScopeLength: 400,
    maxAssignmentItems: 5,
    maxImplementationProcesses: 8,
    maxImplementationObjectives: 8,
    maxComplianceGaps: 5,
  },
  evaluation: {
    maxStringLength: 400,
    maxMissionLength: 700,
    maxVisionLength: 700,
    maxScopeLength: 900,
    maxAssignmentItems: 10,
    maxImplementationProcesses: 15,
    maxImplementationObjectives: 15,
    maxComplianceGaps: 10,
  },
  document: {
    maxStringLength: 800,
    maxMissionLength: 1500,
    maxVisionLength: 1500,
    maxScopeLength: 2000,
    maxAssignmentItems: 10,
    maxImplementationProcesses: 20,
    maxImplementationObjectives: 20,
    maxComplianceGaps: 10,
  },
  agent_ops: {
    maxStringLength: 600,
    maxMissionLength: 1200,
    maxVisionLength: 1200,
    maxScopeLength: 1500,
    maxAssignmentItems: 15,
    maxImplementationProcesses: 25,
    maxImplementationObjectives: 25,
    maxComplianceGaps: 15,
  },
};

interface SanitizationCounters {
  truncatedStrings: number;
  truncatedLists: number;
}

export class ContextBuilder {
  static build(input: AIContextBuildInput): UnifiedAIContext {
    const limits = this.resolveLimits(input.profile, input.limits);
    const warnings: string[] = [];
    const counters: SanitizationCounters = {
      truncatedStrings: 0,
      truncatedLists: 0,
    };

    this.validateOrgScope(input.organizationId, input.sources);

    const orgSource = input.sources.organization;
    const userSource = input.sources.user;

    const context: UnifiedAIContext = {
      meta: {
        profile: input.profile,
        orgScopeId: input.organizationId,
        builtAt: new Date(),
        warnings,
        sanitization: counters,
      },
      org: {
        id: orgSource?.id || input.organizationId,
        name:
          this.safeText(orgSource?.name, limits.maxStringLength, counters) ||
          'Organización',
        mission: this.safeText(
          orgSource?.mission,
          limits.maxMissionLength,
          counters
        ),
        vision: this.safeText(
          orgSource?.vision,
          limits.maxVisionLength,
          counters
        ),
        scope: this.safeText(orgSource?.scope, limits.maxScopeLength, counters),
        industry:
          orgSource?.rubro == null
            ? undefined
            : this.safeText(orgSource.rubro, limits.maxStringLength, counters),
        size:
          orgSource?.tamano == null
            ? undefined
            : this.safeText(orgSource.tamano, limits.maxStringLength, counters),
      },
    };

    if (userSource) {
      context.user = {
        id: userSource.id,
        email:
          this.safeText(userSource.email, limits.maxStringLength, counters) ||
          '',
        displayName: this.safeText(
          userSource.displayName,
          limits.maxStringLength,
          counters
        ),
        role:
          this.safeText(userSource.role, limits.maxStringLength, counters) ||
          'operario',
        organizationId: userSource.organizationId,
      };
    } else {
      warnings.push('Missing user source');
    }

    if (input.sources.personnel) {
      const personnel = input.sources.personnel;
      context.personnel = {
        id: personnel.id,
        fullName: this.safeText(
          personnel.fullName,
          limits.maxStringLength,
          counters
        ),
        position: personnel.position
          ? {
              name: this.safeText(
                personnel.position,
                limits.maxStringLength,
                counters
              ),
            }
          : undefined,
        department: personnel.department
          ? {
              name: this.safeText(
                personnel.department,
                limits.maxStringLength,
                counters
              ),
            }
          : undefined,
        supervisor: personnel.supervisorName
          ? {
              name: this.safeText(
                personnel.supervisorName,
                limits.maxStringLength,
                counters
              ),
            }
          : undefined,
      };
    }

    if (input.sources.assignments) {
      const assignments = input.sources.assignments;
      context.assignments = {
        processes: this.sanitizeNamedRefs(
          assignments.processes,
          limits.maxAssignmentItems,
          limits.maxStringLength,
          counters
        ),
        objectives: this.sanitizeNamedRefs(
          assignments.objectives,
          limits.maxAssignmentItems,
          limits.maxStringLength,
          counters
        ),
        indicators: this.sanitizeNamedRefs(
          assignments.indicators,
          limits.maxAssignmentItems,
          limits.maxStringLength,
          counters
        ),
        counts: {
          processes: assignments.processes.length,
          objectives: assignments.objectives.length,
          indicators: assignments.indicators.length,
        },
      };
    }

    if (input.sources.compliance) {
      context.compliance = this.sanitizeCompliance(
        input.sources.compliance,
        limits,
        counters
      );
    }

    if (input.sources.implementation) {
      const impl = input.sources.implementation;
      context.implementation = {
        stage: Math.max(0, Math.trunc(impl.implementation_stage ?? 0)),
        maturityLevel:
          impl.maturity_level == null
            ? impl.maturity_level
            : this.clampPercentish(impl.maturity_level),
        hasPolicy: Boolean(impl.has_policy),
        hasObjectives: Boolean(impl.has_objectives),
        hasProcessMap: Boolean(impl.has_process_map),
        existingProcesses: this.limitList(
          impl.existing_processes ?? [],
          limits.maxImplementationProcesses,
          counters
        ).map(item => ({
          id: item.id,
          code: this.safeText(item.codigo, limits.maxStringLength, counters),
          name:
            this.safeText(item.nombre, limits.maxStringLength, counters) ||
            item.id,
          categoryId: item.category_id,
        })),
        objectives: this.limitList(
          impl.objectives ?? [],
          limits.maxImplementationObjectives,
          counters
        )
          .map(item => this.safeText(item, limits.maxStringLength, counters))
          .filter((item): item is string => Boolean(item)),
        aiCapabilities: {
          suggestProcesses: Boolean(impl.can_suggest_processes),
          suggestAudits: Boolean(impl.can_suggest_audits),
          suggestDocuments: Boolean(impl.can_suggest_documents),
        },
        personnel: {
          hasPersonnel: Boolean(impl.has_personnel),
          count: Math.max(0, Math.trunc(impl.personnel_count ?? 0)),
        },
        maturityDimensions: impl.maturity_dimensions
          ? {
              operation: this.clampPercentish(
                impl.maturity_dimensions.operation
              ),
              support: this.clampPercentish(impl.maturity_dimensions.support),
              control: this.clampPercentish(impl.maturity_dimensions.control),
              direction: this.clampPercentish(
                impl.maturity_dimensions.direction
              ),
            }
          : undefined,
        isoStatusSummary: impl.iso_status_summary
          ? {
              planning: this.clampPercentish(impl.iso_status_summary.planning),
              hr: this.clampPercentish(impl.iso_status_summary.hr),
              processes: this.clampPercentish(
                impl.iso_status_summary.processes
              ),
              documents: this.clampPercentish(
                impl.iso_status_summary.documents
              ),
              quality: this.clampPercentish(impl.iso_status_summary.quality),
              improvements: this.clampPercentish(
                impl.iso_status_summary.improvements
              ),
              globalScore: this.clampPercentish(
                impl.iso_status_summary.global_score
              ),
              criticalGaps: this.limitList(
                impl.iso_status_summary.critical_gaps ?? [],
                limits.maxComplianceGaps,
                counters
              )
                .map(g => this.safeText(g, limits.maxStringLength, counters))
                .filter((g): g is string => Boolean(g)),
            }
          : undefined,
        lastUpdated: impl.last_updated,
      };
    }

    if (input.sources.accounting) {
      context.accounting = {
        currentPeriod: input.sources.accounting.currentPeriod
          ? {
              code:
                this.safeText(
                  input.sources.accounting.currentPeriod.code,
                  limits.maxStringLength,
                  counters
                ) || '',
              status: input.sources.accounting.currentPeriod.status,
              startDate: input.sources.accounting.currentPeriod.startDate,
              endDate: input.sources.accounting.currentPeriod.endDate,
              totalEntries: Math.max(
                0,
                Math.trunc(input.sources.accounting.currentPeriod.totalEntries)
              ),
              totalDebe: input.sources.accounting.currentPeriod.totalDebe,
              totalHaber: input.sources.accounting.currentPeriod.totalHaber,
              balanceMatches:
                input.sources.accounting.currentPeriod.balanceMatches,
              cashBalance: input.sources.accounting.currentPeriod.cashBalance,
              billedThisMonth:
                input.sources.accounting.currentPeriod.billedThisMonth,
            }
          : undefined,
        recentEntries: this.limitList(
          input.sources.accounting.recentEntries ?? [],
          5,
          counters
        ).map(entry => ({
          id: this.safeText(entry.id, limits.maxStringLength, counters) || '',
          fecha: this.safeText(entry.fecha, 20, counters) || '',
          descripcion:
            this.safeText(entry.descripcion, limits.maxStringLength, counters) ||
            '',
          status: entry.status,
          pluginId:
            this.safeText(entry.pluginId, limits.maxStringLength, counters) ||
            '',
          totalDebe: entry.totalDebe,
          totalHaber: entry.totalHaber,
          documentoTipo: this.safeText(
            entry.documentoTipo,
            limits.maxStringLength,
            counters
          ),
          documentoId:
            this.safeText(entry.documentoId, limits.maxStringLength, counters) ||
            '',
        })),
        keyBalances: this.limitList(
          input.sources.accounting.keyBalances ?? [],
          6,
          counters
        ).map(balance => ({
          code:
            this.safeText(balance.code, limits.maxStringLength, counters) || '',
          name:
            this.safeText(balance.name, limits.maxStringLength, counters) || '',
          nature: balance.nature,
          balance: balance.balance,
        })),
      };
    }

    return context;
  }

  static buildLegacyChatContext(input: AIContextBuildInput): LegacyChatContext {
    return this.toLegacyChatContext(this.build(input));
  }

  static buildDocumentationContext(
    pathname?: string | null,
    userRole?: string | null
  ): string {
    const normalizedPathname = pathname?.trim();
    if (!normalizedPathname) {
      return '';
    }

    return getContextDocsForScreen(normalizedPathname, userRole || undefined);
  }

  static toLegacyChatContext(context: UnifiedAIContext): ChatContext {
    if (!context.user) {
      throw new Error('Unified context does not include user source');
    }

    return {
      organization: {
        id: context.org.id,
        name: context.org.name,
        mission: context.org.mission,
        vision: context.org.vision,
        scope: context.org.scope,
      },
      user: {
        id: context.user.id,
        email: context.user.email,
        displayName: context.user.displayName,
        role: context.user.role,
      },
      personnel: context.personnel
        ? {
            id: context.personnel.id,
            fullName: context.personnel.fullName || '',
            position: context.personnel.position?.name,
            department: context.personnel.department?.name,
            supervisorName: context.personnel.supervisor?.name,
          }
        : undefined,
      assignments: context.assignments
        ? {
            processes: context.assignments.processes,
            objectives: context.assignments.objectives,
            indicators: context.assignments.indicators,
          }
        : undefined,
      compliance: context.compliance
        ? {
            globalPercentage: context.compliance.globalPercentage,
            mandatoryPending: context.compliance.mandatoryPending,
            highPriorityPending: context.compliance.highPriorityPending,
          }
        : undefined,
      accounting: context.accounting
        ? {
            currentPeriod: context.accounting.currentPeriod
              ? {
                  code: context.accounting.currentPeriod.code,
                  status: context.accounting.currentPeriod.status,
                  totalEntries: context.accounting.currentPeriod.totalEntries,
                  totalDebe: context.accounting.currentPeriod.totalDebe,
                  totalHaber: context.accounting.currentPeriod.totalHaber,
                  balanceMatches:
                    context.accounting.currentPeriod.balanceMatches,
                  cashBalance: context.accounting.currentPeriod.cashBalance,
                  billedThisMonth:
                    context.accounting.currentPeriod.billedThisMonth,
                }
              : undefined,
            recentEntries: context.accounting.recentEntries,
            keyBalances: context.accounting.keyBalances,
          }
        : undefined,
    };
  }

  private static validateOrgScope(
    organizationId: string,
    sources: AIContextSources
  ): void {
    const mismatches: string[] = [];

    if (
      sources.organization?.id &&
      sources.organization.id !== organizationId
    ) {
      mismatches.push('organization.id');
    }
    if (
      sources.user?.organizationId &&
      sources.user.organizationId !== organizationId
    ) {
      mismatches.push('user.organizationId');
    }
    if (
      sources.compliance?.organizationId &&
      sources.compliance.organizationId !== organizationId
    ) {
      mismatches.push('compliance.organizationId');
    }
    if (
      sources.implementation?.organization_id &&
      sources.implementation.organization_id !== organizationId
    ) {
      mismatches.push('implementation.organization_id');
    }
    if (
      sources.accounting?.organizationId &&
      sources.accounting.organizationId !== organizationId
    ) {
      mismatches.push('accounting.organizationId');
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Context org-scope mismatch for ${organizationId}: ${mismatches.join(', ')}`
      );
    }
  }

  private static sanitizeCompliance(
    compliance: AIContextComplianceSource,
    limits: AIContextSanitizationLimits,
    counters: SanitizationCounters
  ): UnifiedAIContext['compliance'] {
    const gaps = compliance.highPriorityGaps
      ? this.limitList(
          compliance.highPriorityGaps,
          limits.maxComplianceGaps,
          counters
        ).map(gap => ({
          code: this.safeText(gap.code, 30, counters) || '',
          title:
            this.safeText(gap.title, limits.maxStringLength, counters) || '',
          priority: gap.priority,
        }))
      : undefined;

    return {
      globalPercentage: this.clampPercentish(compliance.globalPercentage),
      mandatoryPending: Math.max(0, Math.trunc(compliance.mandatoryPending)),
      highPriorityPending: Math.max(
        0,
        Math.trunc(compliance.highPriorityPending)
      ),
      highPriorityGaps: gaps,
      upcomingReviews:
        compliance.upcomingReviews == null
          ? undefined
          : Math.max(0, Math.trunc(compliance.upcomingReviews)),
    };
  }

  private static sanitizeNamedRefs(
    refs: AIContextNamedRef[],
    maxItems: number,
    maxStringLength: number,
    counters: SanitizationCounters
  ): AIContextNamedRef[] {
    return this.limitList(refs, maxItems, counters).map(ref => ({
      id: this.safeText(ref.id, maxStringLength, counters) || '',
      name: this.safeText(ref.name, maxStringLength, counters) || ref.id,
    }));
  }

  private static resolveLimits(
    profile: AIContextProfile,
    overrides?: Partial<AIContextSanitizationLimits>
  ): AIContextSanitizationLimits {
    return {
      ...PROFILE_LIMITS[profile],
      ...overrides,
    };
  }

  private static safeText(
    value: string | null | undefined,
    maxLength: number,
    counters: SanitizationCounters
  ): string | undefined {
    if (value == null) {
      return undefined;
    }

    const normalized = String(value).replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return undefined;
    }

    if (normalized.length <= maxLength) {
      return normalized;
    }

    counters.truncatedStrings += 1;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
  }

  private static limitList<T>(
    items: T[],
    maxItems: number,
    counters: SanitizationCounters
  ): T[] {
    if (items.length <= maxItems) {
      return items;
    }
    counters.truncatedLists += 1;
    return items.slice(0, maxItems);
  }

  private static clampPercentish(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}

export { PROFILE_LIMITS as CONTEXT_PROFILE_LIMITS };
