/**
 * Agent Metrics Service
 * Agregador de estadisticas para el Dashboard de Agentes MCP.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  AgentGlobalStats,
  AgentJob,
  AgentRecentActivity,
  JobStatus,
} from '@/types/agents';
import { Timestamp } from 'firebase-admin/firestore';

const JOBS_COLLECTION = 'agent_jobs';
const MAX_SCAN_JOBS = 1000;

export interface AgentStatsDetailed {
  stats: AgentGlobalStats;
  windows: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  trend7d: Array<{
    day: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  recentFailedJobs: AgentJob[];
}

export interface RecentActivityOptions {
  status?: JobStatus;
  intent?: string;
  limit?: number;
  offset?: number;
}

export class AgentMetricsService {
  private static normalizeDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (value instanceof Timestamp) return value.toDate();

    if (
      typeof value === 'object' &&
      value !== null &&
      'seconds' in value &&
      typeof (value as { seconds?: unknown }).seconds === 'number'
    ) {
      return new Date((value as { seconds: number }).seconds * 1000);
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private static async getOrganizationJobs(
    organizationId: string,
    limit: number = MAX_SCAN_JOBS
  ): Promise<AgentJob[]> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(JOBS_COLLECTION)
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as AgentJob
    );
  }

  private static buildGlobalStats(jobs: AgentJob[]): AgentGlobalStats {
    const stats: AgentGlobalStats = {
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      queuedJobs: 0,
      runningJobs: 0,
      successRate: 0,
      avgExecutionTimeMs: 0,
    };

    let totalExecutionTime = 0;
    let executionCount = 0;

    for (const job of jobs) {
      if (job.status === 'completed') stats.completedJobs++;
      else if (job.status === 'failed') stats.failedJobs++;
      else if (job.status === 'queued') stats.queuedJobs++;
      else if (job.status === 'running') stats.runningJobs++;

      if (job.status === 'completed' && job.started_at && job.completed_at) {
        const start = this.normalizeDate(job.started_at);
        const end = this.normalizeDate(job.completed_at);

        if (start && end && end.getTime() >= start.getTime()) {
          totalExecutionTime += end.getTime() - start.getTime();
          executionCount++;
        }
      }
    }

    if (executionCount > 0) {
      stats.avgExecutionTimeMs = Math.round(
        totalExecutionTime / executionCount
      );
    }

    if (stats.completedJobs + stats.failedJobs > 0) {
      stats.successRate = Math.round(
        (stats.completedJobs / (stats.completedJobs + stats.failedJobs)) * 100
      );
    }

    return stats;
  }

  /**
   * Obtiene estadisticas globales de los agentes para una organizacion.
   */
  static async getGlobalStats(
    organizationId: string
  ): Promise<AgentGlobalStats> {
    const jobs = await this.getOrganizationJobs(organizationId);
    return this.buildGlobalStats(jobs);
  }

  /**
   * Obtiene metricas extendidas para dashboard (ventanas, tendencia 7 dias y ultimos errores).
   */
  static async getGlobalStatsDetailed(
    organizationId: string
  ): Promise<AgentStatsDetailed> {
    const jobs = await this.getOrganizationJobs(organizationId);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const trendMap = new Map<
      string,
      { total: number; completed: number; failed: number }
    >();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * oneDayMs);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, { total: 0, completed: 0, failed: 0 });
    }

    let last24h = 0;
    let last7d = 0;
    let last30d = 0;

    for (const job of jobs) {
      const created = this.normalizeDate(job.created_at);
      if (!created) continue;

      const ageMs = now - created.getTime();
      if (ageMs <= oneDayMs) last24h++;
      if (ageMs <= oneDayMs * 7) last7d++;
      if (ageMs <= oneDayMs * 30) last30d++;

      const key = created.toISOString().slice(0, 10);
      const day = trendMap.get(key);
      if (day) {
        day.total += 1;
        if (job.status === 'completed') day.completed += 1;
        if (job.status === 'failed') day.failed += 1;
      }
    }

    const recentFailedJobs = jobs
      .filter(job => job.status === 'failed')
      .slice(0, 5)
      .map(job => JSON.parse(JSON.stringify(job)) as AgentJob);

    return {
      stats: this.buildGlobalStats(jobs),
      windows: { last24h, last7d, last30d },
      trend7d: Array.from(trendMap.entries()).map(([day, values]) => ({
        day,
        ...values,
      })),
      recentFailedJobs,
    };
  }

  /**
   * Obtiene la actividad reciente (ultimos N jobs) con filtros y paginacion basica.
   */
  static async getRecentActivity(
    organizationId: string,
    optionsOrLimit: RecentActivityOptions | number = 20
  ): Promise<
    AgentRecentActivity & {
      total: number;
      limit: number;
      offset: number;
      availableIntents: string[];
      filters: {
        status: JobStatus | null;
        intent: string | null;
      };
    }
  > {
    const options =
      typeof optionsOrLimit === 'number'
        ? { limit: optionsOrLimit }
        : optionsOrLimit;

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);
    const status = options.status || null;
    const intent = options.intent?.trim() ? options.intent.trim() : null;

    const db = getAdminFirestore();

    // Source snapshot for metadata + fallback filtering (stable, index-safe path)
    const baseSnapshot = await db
      .collection(JOBS_COLLECTION)
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc')
      .limit(MAX_SCAN_JOBS)
      .get();

    const baseJobs = baseSnapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as AgentJob
    );

    const availableIntents = Array.from(
      new Set(baseJobs.map(job => job.intent).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const filteredBaseJobs = baseJobs.filter(job => {
      if (status && job.status !== status) return false;
      if (intent && job.intent !== intent) return false;
      return true;
    });

    const total = filteredBaseJobs.length;

    // Try query-level filters first; fallback to filtered cache when indexes are missing.
    let jobsForPage: AgentJob[] = [];
    try {
      let query: FirebaseFirestore.Query = db
        .collection(JOBS_COLLECTION)
        .where('organization_id', '==', organizationId);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (intent) {
        query = query.where('intent', '==', intent);
      }

      const pageSnapshot = await query
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      jobsForPage = pageSnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as AgentJob
      );
    } catch (error) {
      console.warn(
        '[AgentMetricsService] Falling back to in-memory filtering for recent activity:',
        error
      );
      jobsForPage = filteredBaseJobs.slice(offset, offset + limit);
    }

    const serializedJobs = JSON.parse(JSON.stringify(jobsForPage));

    return {
      jobs: serializedJobs,
      lastUpdated: new Date(),
      total,
      limit,
      offset,
      availableIntents,
      filters: {
        status,
        intent,
      },
    };
  }
}
