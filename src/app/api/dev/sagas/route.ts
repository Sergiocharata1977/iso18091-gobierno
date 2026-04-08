/**
 * DEV ONLY — API para crear sagas de prueba y listarlas.
 * Bypasea el supervisor agent y crea la saga directamente con pasos pre-definidos.
 */
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SagaRun, SagaStep } from '@/types/sagas';
import { Timestamp } from 'firebase-admin/firestore';
import { SagaService } from '@/services/agents/SagaService';
import { NextResponse } from 'next/server';

const SAGAS_COLLECTION = 'agent_sagas';

// Escenarios predefinidos para el playground
const SCENARIOS: Record<
  string,
  { goal: string; description: string; steps: Partial<SagaStep>[] }
> = {
  linear: {
    goal: 'Preparar auditoría interna de calidad',
    description: 'Tres pasos lineales, uno depende del anterior',
    steps: [
      {
        id: 'revisar-docs',
        intent: 'doc.review',
        compensate_intent: 'doc.review.undo',
        payload: { documentos: ['SGC-01', 'SGC-02'] },
        description: 'Revisar documentación vigente del SGC',
      },
      {
        id: 'generar-checklist',
        intent: 'audit.checklist.generate',
        compensate_intent: 'audit.checklist.delete',
        payload: { tipo_auditoria: 'interna', norma: 'ISO 9001' },
        depends_on: ['revisar-docs'],
        description: 'Generar checklist basado en documentos revisados',
      },
      {
        id: 'asignar-auditor',
        intent: 'audit.assign',
        compensate_intent: 'audit.unassign',
        payload: { perfil_requerido: 'auditor_interno' },
        depends_on: ['generar-checklist'],
        description: 'Asignar auditor responsable al checklist generado',
      },
    ],
  },
  parallel: {
    goal: 'Generar reporte ejecutivo multi-fuente',
    description: 'Pasos A y B corren en paralelo, C espera a ambos (DAG)',
    steps: [
      {
        id: 'datos-calidad',
        intent: 'metrics.quality.fetch',
        payload: { periodo: 'Q1-2026' },
        description: 'Obtener indicadores de calidad del período',
      },
      {
        id: 'datos-financieros',
        intent: 'metrics.financial.fetch',
        payload: { periodo: 'Q1-2026' },
        description: 'Obtener métricas financieras del período',
      },
      {
        id: 'generar-reporte',
        intent: 'report.executive.generate',
        compensate_intent: 'report.delete',
        payload: { formato: 'PDF' },
        depends_on: ['datos-calidad', 'datos-financieros'],
        description: 'Combinar datos y generar reporte ejecutivo',
      },
    ],
  },
  human_loop: {
    goal: 'Cerrar no conformidad crítica con aprobación gerencial',
    description: 'Paso 2 requiere aprobación humana antes de continuar',
    steps: [
      {
        id: 'analizar-nc',
        intent: 'nc.analyze',
        payload: { nc_id: 'NC-2026-042', severidad: 'alta' },
        description: 'Analizar causa raíz de la no conformidad',
      },
      {
        id: 'proponer-accion',
        intent: 'nc.action.propose',
        compensate_intent: 'nc.action.cancel',
        payload: { tipo: 'correctiva', requiere_aprobacion: true },
        depends_on: ['analizar-nc'],
        description: '⏸ REQUIERE APROBACIÓN — Proponer acción correctiva al gerente',
      },
      {
        id: 'ejecutar-accion',
        intent: 'nc.action.execute',
        payload: {},
        depends_on: ['proponer-accion'],
        description: 'Ejecutar la acción correctiva aprobada',
      },
    ],
  },
  compensation: {
    goal: 'Programar reunión de revisión de dirección',
    description: 'Si el paso 3 falla, el sistema debe deshacer pasos 1 y 2',
    steps: [
      {
        id: 'reservar-sala',
        intent: 'calendar.room.reserve',
        compensate_intent: 'calendar.room.release',
        payload: { sala: 'Sala Directorio', duracion_hs: 2 },
        description: 'Reservar sala de reuniones para la fecha acordada',
      },
      {
        id: 'notificar-directivos',
        intent: 'notification.directors.send',
        compensate_intent: 'notification.directors.cancel',
        payload: { canal: 'email', urgencia: 'alta' },
        depends_on: ['reservar-sala'],
        description: 'Enviar invitaciones a directivos con la agenda',
      },
      {
        id: 'crear-evento-calendario',
        intent: 'calendar.event.create',
        payload: { sistema_externo: 'google_calendar' },
        depends_on: ['notificar-directivos'],
        description: '💥 ESTE PASO FALLARÁ — Sincronizar con Google Calendar',
      },
    ],
  },
};

export const GET = withAuth(
  async (_req, _ctx, auth) => {
    const scope = await resolveAuthorizedOrganizationId(auth, undefined);
    if (!scope.ok || !scope.organizationId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const orgId = scope.organizationId;
    const db = getAdminFirestore();

    const snap = await db
      .collection(SAGAS_COLLECTION)
      .where('organization_id', '==', orgId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    const sagas = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<SagaRun, 'id'>),
    }));

    return NextResponse.json({ sagas, scenarios: Object.keys(SCENARIOS) });
  },
  { roles: ['admin', 'gerente'] }
);

export const POST = withAuth(
  async (req, _ctx, auth) => {
    const scope = await resolveAuthorizedOrganizationId(auth, undefined);
    if (!scope.ok || !scope.organizationId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const orgId = scope.organizationId;
    const db = getAdminFirestore();

    const body = await req.json();
    const scenarioKey = body.scenario as string | undefined;
    const customGoal = body.goal as string | undefined;
    const customSteps = body.steps as Partial<SagaStep>[] | undefined;

    let goal: string;
    let rawSteps: Partial<SagaStep>[];

    if (scenarioKey && SCENARIOS[scenarioKey]) {
      const scenario = SCENARIOS[scenarioKey];
      goal = scenario.goal;
      rawSteps = scenario.steps;
    } else if (customGoal && customSteps) {
      goal = customGoal;
      rawSteps = customSteps;
    } else {
      return NextResponse.json(
        {
          error: 'Proveer scenario (linear|parallel|human_loop|compensation) o goal+steps custom',
          available_scenarios: Object.entries(SCENARIOS).map(([key, s]) => ({
            key,
            goal: s.goal,
            description: s.description,
          })),
        },
        { status: 400 }
      );
    }

    // Normalizar pasos a estado 'pending'
    const steps: SagaStep[] = rawSteps.map(s => ({
      id: s.id!,
      intent: s.intent!,
      compensate_intent: s.compensate_intent,
      payload: s.payload ?? {},
      depends_on: s.depends_on,
      status: 'pending',
      description: s.description,
    }));

    // Insertar saga directamente como 'running' (sin pasar por saga.plan supervisor)
    const sagaData: Omit<SagaRun, 'id'> = {
      organization_id: orgId,
      user_id: auth.uid,
      goal,
      status: 'running',
      current_step_index: 0,
      steps,
      context: { _dev_playground: true, scenario: scenarioKey ?? 'custom' },
      created_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    };

    const docRef = await db.collection(SAGAS_COLLECTION).add(sagaData);
    const sagaId = docRef.id;

    // Disparar evaluación inicial para encolar los primeros pasos sin dependencias
    await SagaService.evaluateSagaProgress(sagaId);

    // Leer saga actualizada
    const sagaDoc = await db.collection(SAGAS_COLLECTION).doc(sagaId).get();
    const saga = { id: sagaId, ...(sagaDoc.data() as Omit<SagaRun, 'id'>) };

    return NextResponse.json({ sagaId, saga }, { status: 201 });
  },
  { roles: ['admin', 'gerente'] }
);
