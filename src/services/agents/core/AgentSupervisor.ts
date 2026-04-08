/**
 * Agent Supervisor (Orquestador)
 *
 * Responsable de:
 * 1. Recibir un objetivo complejo (Goal).
 * 2. Descomponerlo en sub-tareas (Saga).
 * 3. Crear los Jobs correspondientes en Firestore.
 * 4. Monitorear el progreso de la saga.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { ClaudeService } from '@/lib/claude/client';
import { GroqService } from '@/lib/groq/GroqService';
import { v4 as uuidv4 } from 'uuid';
import { AgentQueueService } from '../AgentQueueService';

export interface PlanStep {
  intent: string;
  description: string;
  payload: any;
  dependsOn?: number[]; // Índices de pasos anteriores requeridos
}

export class AgentSupervisor {
  private static readonly SUPPORTED_INTENTS = [
    'iso.consultation',
    'crm.lead.score',
    'task.assign',
    'task.reminder',
    'governance.alert.handle',
  ] as const;

  /**
   * Planifica y orquesta una meta compleja.
   *
   * @param goal Descripción del objetivo (ej: "Preparar auditoría interna para área de Ventas")
   * @param context Contexto adicional (userId, orgId)
   */
  static async decomposeAndSchedule(
    goal: string,
    context: {
      organization_id: string;
      user_id: string;
      agent_instance_id: string;
    }
  ): Promise<string> {
    // Retorna el workflow_id

    console.log(`[AgentSupervisor] Analizando meta: "${goal}"...`);

    // 1. Planner real con fallback determinístico si falla el LLM.
    const plan: PlanStep[] = await this.planWithLLMOrFallback(goal);

    const workflowId = uuidv4();
    const db = getAdminFirestore();

    // 2. Crear los Jobs en Firestore (con estado 'queued' o 'blocked' si hubiera dependencia real)
    // Por simplicidad inicial, encolamos todos. El Worker deberá revisar dependencias si implementamos bloqueo.

    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];

      await AgentQueueService.enqueueJob(
        {
          organization_id: context.organization_id,
          user_id: context.user_id,
          intent: step.intent,
          payload: {
            ...step.payload,
            _goal_description: step.description,
            _workflow_context: {
              goal,
              step_total: plan.length,
              step_current: i + 1,
            },
          },
          priority: 'normal',

          // Orquestación
          // Inyectamos los IDs para tracking correcto de la Saga
          workflow_id: workflowId,
          step_index: i,
          // parent_job_id podría venir del context si esta saga es sub-workflow de otro job
          // parent_job_id: context.parent_job_id
        },
        context.agent_instance_id
      );
    }

    console.log(
      `[AgentSupervisor] Workflow ${workflowId} iniciado con ${plan.length} pasos.`
    );
    return workflowId;
  }

  /**
   * Planner primario vía LLM con fallback local robusto.
   */
  private static async planWithLLMOrFallback(
    goal: string
  ): Promise<PlanStep[]> {
    const errors: string[] = [];

    if (process.env.GROQ_API_KEY) {
      try {
        const plan = await this.planWithGroq(goal);
        if (plan.length > 0) return plan;
      } catch (error) {
        errors.push(
          `groq=${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const plan = await this.planWithClaude(goal);
        if (plan.length > 0) return plan;
      } catch (error) {
        errors.push(
          `claude=${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.warn(
      `[AgentSupervisor] LLM planner fallback activado para goal "${goal}". Razones: ${errors.join(' | ') || 'sin credenciales LLM configuradas'}`
    );
    return this.fallbackHeuristicPlanner(goal);
  }

  private static async planWithGroq(goal: string): Promise<PlanStep[]> {
    const systemPrompt = this.buildPlannerSystemPrompt();
    const userPrompt = this.buildPlannerUserPrompt(goal);
    const message = await GroqService.enviarMensaje(
      userPrompt,
      [],
      systemPrompt
    );

    return this.normalizePlanFromLLM(message.content || '', goal);
  }

  private static async planWithClaude(goal: string): Promise<PlanStep[]> {
    const systemPrompt = this.buildPlannerSystemPrompt();
    const userPrompt = this.buildPlannerUserPrompt(goal);
    const response = await ClaudeService.enviarMensaje(
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      1200
    );

    return this.normalizePlanFromLLM(response.content || '', goal);
  }

  private static buildPlannerSystemPrompt(): string {
    return [
      'Eres un planner de orquestacion de agentes para una app ISO/CRM.',
      'Devuelve SOLO JSON valido.',
      'Formato obligatorio:',
      '{ "steps": [ { "intent": string, "description": string, "payload": object, "dependsOn": number[] } ] }',
      `Intents permitidos: ${this.SUPPORTED_INTENTS.join(', ')}`,
      'Reglas:',
      '- maximo 5 pasos',
      '- dependsOn debe referenciar solo indices anteriores',
      '- usa payloads concretos y utiles',
      '- no incluyas markdown ni explicaciones',
    ].join('\n');
  }

  private static buildPlannerUserPrompt(goal: string): string {
    return [
      `Goal: ${goal}`,
      'Genera un plan ejecutable para los intents permitidos.',
      'Prioriza que el primer paso sea de analisis/consulta y el ultimo de seguimiento o notificacion si aplica.',
    ].join('\n');
  }

  private static normalizePlanFromLLM(raw: string, goal: string): PlanStep[] {
    const parsed = this.parseJsonPayload(raw);
    const rawSteps = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.steps)
        ? parsed.steps
        : null;

    if (!rawSteps || rawSteps.length === 0) {
      throw new Error('LLM planner returned empty steps');
    }

    const normalized: PlanStep[] = [];

    for (let index = 0; index < rawSteps.length && index < 5; index++) {
      const candidate = rawSteps[index] as Record<string, any>;
      const rawIntent =
        typeof candidate.intent === 'string' ? candidate.intent.trim() : '';
      const intent = this.normalizeIntent(rawIntent, goal);

      if (!intent) {
        throw new Error(`Unsupported intent from LLM: "${rawIntent}"`);
      }

      const description =
        typeof candidate.description === 'string' &&
        candidate.description.trim().length > 0
          ? candidate.description.trim()
          : `Paso ${index + 1} para objetivo: ${goal}`;

      const payload =
        candidate.payload && typeof candidate.payload === 'object'
          ? candidate.payload
          : {};

      const dependsOn = Array.isArray(candidate.dependsOn)
        ? candidate.dependsOn
            .map((value: unknown) =>
              typeof value === 'number' ? Math.trunc(value) : NaN
            )
            .filter(dep => Number.isFinite(dep) && dep >= 0 && dep < index)
        : [];

      normalized.push({
        intent,
        description,
        payload,
        ...(dependsOn.length > 0
          ? { dependsOn: Array.from(new Set(dependsOn)) }
          : {}),
      });
    }

    if (normalized.length === 0) {
      throw new Error('LLM planner normalization produced zero steps');
    }

    return normalized;
  }

  private static parseJsonPayload(raw: string): any {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }

      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
      }

      throw new Error('Invalid JSON payload from LLM');
    }
  }

  private static normalizeIntent(
    rawIntent: string,
    goal: string
  ): (typeof AgentSupervisor.SUPPORTED_INTENTS)[number] | null {
    if (
      this.SUPPORTED_INTENTS.includes(
        rawIntent as (typeof AgentSupervisor.SUPPORTED_INTENTS)[number]
      )
    ) {
      return rawIntent as (typeof AgentSupervisor.SUPPORTED_INTENTS)[number];
    }

    const normalized = `${rawIntent} ${goal}`.toLowerCase();
    if (normalized.includes('crm') || normalized.includes('lead')) {
      return 'crm.lead.score';
    }
    if (normalized.includes('asign') || normalized.includes('assign')) {
      return 'task.assign';
    }
    if (normalized.includes('record') || normalized.includes('reminder')) {
      return 'task.reminder';
    }
    if (
      normalized.includes('govern') ||
      normalized.includes('riesgo') ||
      normalized.includes('alerta')
    ) {
      return 'governance.alert.handle';
    }

    return 'iso.consultation';
  }

  private static fallbackHeuristicPlanner(goal: string): PlanStep[] {
    const lowerGoal = goal.toLowerCase();

    if (lowerGoal.includes('crm') || lowerGoal.includes('lead')) {
      return [
        {
          intent: 'crm.lead.score',
          description: 'Evaluar y priorizar leads relacionados al objetivo.',
          payload: { reason: goal, source: 'supervisor_fallback' },
        },
        {
          intent: 'task.assign',
          description: 'Asignar seguimiento comercial al responsable.',
          payload: { task_titulo: `Seguimiento CRM: ${goal}`, tipo: 'tarea' },
          dependsOn: [0],
        },
      ];
    }

    if (lowerGoal.includes('auditoria') || lowerGoal.includes('audit')) {
      return [
        {
          intent: 'iso.consultation',
          description: 'Consultar contexto ISO y evidencias relacionadas.',
          payload: { query: goal, source: 'supervisor_fallback' },
        },
        {
          intent: 'task.reminder',
          description: 'Generar recordatorio de seguimiento de auditoria.',
          payload: { message: `Seguimiento pendiente: ${goal}` },
          dependsOn: [0],
        },
      ];
    }

    return [
      {
        intent: 'iso.consultation',
        description: `Analizar objetivo y recuperar contexto: ${goal}`,
        payload: { query: goal, source: 'supervisor_fallback' },
      },
      {
        intent: 'task.reminder',
        description: 'Programar seguimiento del objetivo.',
        payload: { message: `Seguimiento automatico para: ${goal}` },
        dependsOn: [0],
      },
    ];
  }
}
