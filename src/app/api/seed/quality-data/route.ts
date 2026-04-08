import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

async function postInternal() {
  try {
    console.log('🌱 Iniciando seed de datos de calidad...');

    // Datos de ejemplo para Objetivos de Calidad
    const objetivosEjemplo = [
      {
        code: 'OBJ-SAT-001',
        title: 'Satisfacción del Cliente',
        description:
          'Mantener la satisfacción del cliente por encima del 85% en todas las encuestas',
        type: 'estrategico',
        target_value: 85,
        current_value: 88,
        unit: '%',
        baseline_value: 75,
        start_date: '2025-01-01',
        due_date: '2025-12-31',
        completed_date: null,
        status: 'activo',
        progress_percentage: 103,
        process_definition_id: 'proc-com-001',
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        team_members: [],
        alert_threshold: 80,
        last_alert_sent: null,
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        code: 'OBJ-RES-001',
        title: 'Tiempo de Respuesta',
        description:
          'Reducir el tiempo de respuesta a consultas de clientes a menos de 24 horas',
        type: 'tactico',
        target_value: 24,
        current_value: 30,
        unit: 'horas',
        baseline_value: 48,
        start_date: '2025-01-01',
        due_date: '2025-06-30',
        completed_date: null,
        status: 'atrasado',
        progress_percentage: 80,
        process_definition_id: 'proc-atn-001',
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        team_members: [],
        alert_threshold: 85,
        last_alert_sent: null,
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        code: 'OBJ-VEN-001',
        title: 'Incremento de Ventas Online',
        description:
          'Aumentar las ventas online en un 20% respecto al año anterior',
        type: 'estrategico',
        target_value: 120,
        current_value: 125,
        unit: '%',
        baseline_value: 100,
        start_date: '2025-01-01',
        due_date: '2025-12-31',
        completed_date: null,
        status: 'activo',
        progress_percentage: 104,
        process_definition_id: 'proc-com-002',
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        team_members: [],
        alert_threshold: 90,
        last_alert_sent: null,
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
    ];

    // Datos de ejemplo para Indicadores de Calidad
    const indicadoresEjemplo = [
      {
        code: 'IND-CONV-001',
        name: 'Tasa de Conversión',
        description: 'Porcentaje de leads que se convierten en clientes',
        type: 'eficacia',
        formula: '(Clientes Nuevos / Leads Totales) * 100',
        unit: '%',
        measurement_frequency: 'mensual',
        target_min: 15,
        target_max: 100,
        current_value: 18,
        trend: 'ascendente',
        data_source: 'CRM',
        calculation_method: 'Automático desde CRM',
        process_definition_id: 'proc-com-001',
        objective_id: null,
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        status: 'activo',
        last_measurement_date: Timestamp.now().toDate().toISOString(),
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        code: 'IND-QUEJ-001',
        name: 'Quejas de Clientes',
        description: 'Número de quejas formales recibidas por mes',
        type: 'calidad',
        formula: 'Conteo de quejas formales',
        unit: 'quejas',
        measurement_frequency: 'mensual',
        target_min: 0,
        target_max: 5,
        current_value: 8,
        trend: 'descendente',
        data_source: 'Sistema de Quejas',
        calculation_method: 'Conteo manual',
        process_definition_id: 'proc-atn-001',
        objective_id: null,
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        status: 'activo',
        last_measurement_date: Timestamp.now().toDate().toISOString(),
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        code: 'IND-VENT-001',
        name: 'Ventas Online',
        description: 'Porcentaje de cumplimiento de meta de ventas online',
        type: 'productividad',
        formula: '(Ventas Actuales / Meta Ventas) * 100',
        unit: '%',
        measurement_frequency: 'mensual',
        target_min: 100,
        target_max: 150,
        current_value: 125,
        trend: 'ascendente',
        data_source: 'Sistema de Ventas',
        calculation_method: 'Automático',
        process_definition_id: 'proc-com-002',
        objective_id: null,
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        status: 'activo',
        last_measurement_date: Timestamp.now().toDate().toISOString(),
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        code: 'IND-RESP-001',
        name: 'Tiempo Promedio de Respuesta',
        description:
          'Tiempo promedio en horas para responder consultas de clientes',
        type: 'eficiencia',
        formula: 'Promedio de tiempo de respuesta',
        unit: 'horas',
        measurement_frequency: 'semanal',
        target_min: 0,
        target_max: 24,
        current_value: 30,
        trend: 'estable',
        data_source: 'Sistema de Tickets',
        calculation_method: 'Automático',
        process_definition_id: 'proc-atn-001',
        objective_id: null,
        responsible_user_id: 'user-123',
        department_id: 'dept-comercial',
        status: 'activo',
        last_measurement_date: Timestamp.now().toDate().toISOString(),
        organization_id: 'org-001',
        is_active: true,
        created_by: 'admin',
        updated_by: null,
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
    ];

    // Seed Objetivos de Calidad
    const objetivosIds: string[] = [];
    for (const objetivo of objetivosEjemplo) {
      const docRef = await addDoc(
        collection(db, 'qualityObjectives'),
        objetivo
      );
      objetivosIds.push(docRef.id);
    }

    // Seed Indicadores de Calidad
    const indicadoresIds: string[] = [];
    for (const indicador of indicadoresEjemplo) {
      const docRef = await addDoc(
        collection(db, 'qualityIndicators'),
        indicador
      );
      indicadoresIds.push(docRef.id);
    }

    // Seed Mediciones (2 ejemplos)
    const medicionesIds: string[] = [];
    const medicionesEjemplo = [
      {
        indicator_id: indicadoresIds[0],
        objective_id: objetivosIds[2],
        process_definition_id: 'proc-com-001',
        value: 18,
        measurement_date: '2025-10-01',
        measured_by: 'user-123',
        measurement_method: 'Automático desde CRM',
        data_source: 'CRM',
        notes: 'Medición mensual de octubre',
        evidence_files: [],
        validation_status: 'validado',
        validated_by: 'supervisor-001',
        validation_date: '2025-10-02',
        validation_notes: 'Datos verificados correctamente',
        organization_id: 'org-001',
        created_by: 'system',
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
      {
        indicator_id: indicadoresIds[1],
        objective_id: objetivosIds[0],
        process_definition_id: 'proc-atn-001',
        value: 8,
        measurement_date: '2025-10-01',
        measured_by: 'user-123',
        measurement_method: 'Conteo manual',
        data_source: 'Sistema de Quejas',
        notes: 'Se registraron 8 quejas formales en octubre',
        evidence_files: [],
        validation_status: 'validado',
        validated_by: 'supervisor-001',
        validation_date: '2025-10-02',
        validation_notes: 'Todas las quejas están documentadas',
        organization_id: 'org-001',
        created_by: 'user-123',
        created_at: Timestamp.now().toDate().toISOString(),
        updated_at: Timestamp.now().toDate().toISOString(),
      },
    ];

    for (const medicion of medicionesEjemplo) {
      const docRef = await addDoc(collection(db, 'measurements'), medicion);
      medicionesIds.push(docRef.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Datos de calidad creados exitosamente',
      data: {
        objetivos: {
          count: objetivosIds.length,
          ids: objetivosIds,
        },
        indicadores: {
          count: indicadoresIds.length,
          ids: indicadoresIds,
        },
        mediciones: {
          count: medicionesIds.length,
          ids: medicionesIds,
        },
      },
      instructions: {
        message:
          'Ahora debes asignar estos IDs a un usuario en la colección "personnel"',
        fields: {
          objetivos_asignados: objetivosIds,
          indicadores_asignados: indicadoresIds,
        },
      },
    });
  } catch (error) {
    console.error('Error al crear datos de seed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear datos de calidad',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(
  async (request, _context, auth) => {
    if (isSeedExecutionBlockedInProduction()) {
      await logSeedExecution({
        request,
        auth,
        route: '/api/seed/quality-data',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { success: false, error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/quality-data',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal();

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/quality-data',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
