// API endpoint para insertar datos de contexto agrícola
import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/firebase/config';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

async function postInternal(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }

    console.log('🌱 Iniciando seed de datos agrícolas para userId:', userId);

    // 1. CREAR DEPARTAMENTO
    const deptRef = await addDoc(collection(db, 'departments'), {
      name: 'Calidad y Aseguramiento',
      description:
        'Departamento responsable del SGC ISO 9001, control de calidad de productos y tratamiento de semillas',
      responsible_user_id: userId,
      is_active: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const departmentId = deptRef.id;

    // 2. CREAR PUESTO
    const positionRef = await addDoc(collection(db, 'positions'), {
      nombre: 'Asistente de Calidad',
      descripcion_responsabilidades: `- Asistir en la implementación y mantenimiento del SGC ISO 9001
- Controlar calidad de semillas y productos agrícolas
- Gestionar documentación del sistema de calidad
- Realizar inspecciones de tratamiento de semillas
- Registrar no conformidades y acciones correctivas
- Apoyar en auditorías internas
- Mantener registros de trazabilidad de productos`,
      requisitos_experiencia:
        '1-2 años en sistemas de calidad o sector agrícola',
      requisitos_formacion:
        'Técnico o estudiante de Ingeniería Agronómica, Química o Industrial',
      departamento_id: departmentId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const positionId = positionRef.id;

    // 3. CREAR PROCESOS
    const processIds: string[] = [];
    const processes = [
      {
        codigo: 'CAL-001',
        nombre: 'Control de Calidad de Semillas',
        objetivo:
          'Asegurar que las semillas cumplan con estándares de germinación, pureza y sanidad',
        alcance: 'Aplica a todas las semillas recibidas y tratadas en planta',
        tipo: 'operativo',
        responsable: 'Asistente de Calidad',
      },
      {
        codigo: 'TRA-001',
        nombre: 'Tratamiento de Semillas',
        objetivo:
          'Aplicar tratamientos fitosanitarios y bioestimulantes a semillas según especificaciones',
        alcance:
          'Todas las semillas que requieran tratamiento químico o biológico',
        tipo: 'operativo',
        responsable: 'Jefe de Producción',
      },
      {
        codigo: 'AUD-001',
        nombre: 'Auditorías Internas ISO 9001',
        objetivo:
          'Verificar el cumplimiento del SGC con requisitos ISO 9001 y detectar oportunidades de mejora',
        alcance: 'Todos los procesos del SGC',
        tipo: 'gestion',
        responsable: 'Responsable de Calidad',
      },
      {
        codigo: 'DOC-001',
        nombre: 'Control de Documentos y Registros',
        objetivo:
          'Asegurar que la documentación del SGC esté actualizada, controlada y disponible',
        alcance: 'Todos los documentos y registros del SGC',
        tipo: 'gestion',
        responsable: 'Asistente de Calidad',
      },
      {
        codigo: 'NC-001',
        nombre: 'Gestión de No Conformidades',
        objetivo:
          'Identificar, registrar y resolver no conformidades para prevenir su recurrencia',
        alcance:
          'Todas las no conformidades detectadas en procesos, productos o servicios',
        tipo: 'gestion',
        responsable: 'Responsable de Calidad',
      },
      {
        codigo: 'TRZ-001',
        nombre: 'Trazabilidad de Productos',
        objetivo:
          'Mantener trazabilidad completa desde recepción de semillas hasta entrega al cliente',
        alcance: 'Todos los lotes de semillas e insumos comercializados',
        tipo: 'operativo',
        responsable: 'Asistente de Calidad',
      },
    ];

    for (const process of processes) {
      const processRef = await addDoc(collection(db, 'processDefinitions'), {
        ...process,
        estado: 'activo',
        version: '1.0',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      processIds.push(processRef.id);
    }

    // 4. CREAR OBJETIVOS
    const objectiveIds: string[] = [];
    const objectives = [
      {
        title: 'Reducir No Conformidades en Tratamiento',
        description:
          'Disminuir el número de lotes con NC en proceso de tratamiento de semillas',
        target_value: 5,
        current_value: 12,
        unit: 'NC/mes',
        measurement_frequency: 'mensual',
        responsible: 'Jefe de Producción',
        status: 'en_progreso',
        progress_percentage: 35,
        category: 'calidad',
      },
      {
        title: 'Mejorar Índice de Germinación Promedio',
        description:
          'Aumentar el porcentaje promedio de germinación de semillas tratadas',
        target_value: 95,
        current_value: 88,
        unit: '%',
        measurement_frequency: 'mensual',
        responsible: 'Responsable de Calidad',
        status: 'en_progreso',
        progress_percentage: 45,
        category: 'calidad',
      },
      {
        title: 'Completar Auditorías Internas a Tiempo',
        description:
          'Ejecutar el 100% del programa anual de auditorías en las fechas planificadas',
        target_value: 100,
        current_value: 75,
        unit: '%',
        measurement_frequency: 'trimestral',
        responsible: 'Responsable de Calidad',
        status: 'en_progreso',
        progress_percentage: 75,
        category: 'gestion',
      },
      {
        title: 'Mantener Trazabilidad al 100%',
        description:
          'Garantizar trazabilidad completa de todos los lotes comercializados',
        target_value: 100,
        current_value: 98,
        unit: '%',
        measurement_frequency: 'mensual',
        responsible: 'Asistente de Calidad',
        status: 'en_progreso',
        progress_percentage: 98,
        category: 'operacional',
      },
    ];

    for (const objective of objectives) {
      const objRef = await addDoc(collection(db, 'qualityObjectives'), {
        ...objective,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      objectiveIds.push(objRef.id);
    }

    // 5. CREAR INDICADORES
    const indicatorIds: string[] = [];
    const indicators = [
      {
        name: '% de Lotes con NC en Tratamiento',
        description:
          'Porcentaje de lotes que presentan no conformidades durante el tratamiento',
        formula: '(Lotes con NC / Total lotes tratados) × 100',
        unit: '%',
        target_min: 0,
        target_max: 5,
        current_value: 8.5,
        measurement_frequency: 'mensual',
        responsible: 'Asistente de Calidad',
        category: 'calidad',
        status: 'activo',
      },
      {
        name: 'Índice de Germinación Promedio',
        description:
          'Porcentaje promedio de germinación de semillas analizadas',
        formula: 'Promedio de % germinación de todos los lotes del mes',
        unit: '%',
        target_min: 90,
        target_max: 100,
        current_value: 88,
        measurement_frequency: 'mensual',
        responsible: 'Asistente de Calidad',
        category: 'calidad',
        status: 'activo',
      },
      {
        name: '% de Auditorías Completadas a Tiempo',
        description: 'Porcentaje de auditorías ejecutadas según cronograma',
        formula:
          '(Auditorías realizadas a tiempo / Auditorías programadas) × 100',
        unit: '%',
        target_min: 90,
        target_max: 100,
        current_value: 75,
        measurement_frequency: 'trimestral',
        responsible: 'Responsable de Calidad',
        category: 'gestion',
        status: 'activo',
      },
      {
        name: 'Tiempo Promedio de Cierre de NC',
        description:
          'Días promedio desde detección hasta cierre de no conformidades',
        formula: 'Promedio de días de cierre de NC del mes',
        unit: 'días',
        target_min: 0,
        target_max: 15,
        current_value: 22,
        measurement_frequency: 'mensual',
        responsible: 'Responsable de Calidad',
        category: 'gestion',
        status: 'activo',
      },
      {
        name: '% de Trazabilidad Efectiva',
        description: 'Porcentaje de lotes con trazabilidad completa verificada',
        formula: '(Lotes con trazabilidad completa / Total lotes) × 100',
        unit: '%',
        target_min: 98,
        target_max: 100,
        current_value: 98,
        measurement_frequency: 'mensual',
        responsible: 'Asistente de Calidad',
        category: 'operacional',
        status: 'activo',
      },
      {
        name: 'Documentos Actualizados',
        description:
          'Porcentaje de documentos del SGC actualizados según cronograma',
        formula: '(Documentos actualizados / Total documentos) × 100',
        unit: '%',
        target_min: 95,
        target_max: 100,
        current_value: 92,
        measurement_frequency: 'trimestral',
        responsible: 'Asistente de Calidad',
        category: 'gestion',
        status: 'activo',
      },
    ];

    for (const indicator of indicators) {
      const indRef = await addDoc(collection(db, 'qualityIndicators'), {
        ...indicator,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      indicatorIds.push(indRef.id);
    }

    // 6. BUSCAR Y ACTUALIZAR PERSONNEL
    const personnelQuery = query(
      collection(db, 'personnel'),
      where('email', '==', 'mariaelena@agrosemillas.com')
    );
    const personnelSnapshot = await getDocs(personnelQuery);

    let personnelId = null;
    if (!personnelSnapshot.empty) {
      personnelId = personnelSnapshot.docs[0].id;
      const personnelRef = doc(db, 'personnel', personnelId);

      await updateDoc(personnelRef, {
        puesto: positionId,
        departamento: departmentId,
        procesos_asignados: [
          processIds[0], // Control de Calidad
          processIds[3], // Control de Documentos
          processIds[4], // Gestión de NC
          processIds[5], // Trazabilidad
        ],
        objetivos_asignados: objectiveIds,
        indicadores_asignados: indicatorIds,
        updated_at: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Datos de contexto agrícola creados exitosamente',
      data: {
        departmentId,
        positionId,
        personnelId,
        processCount: processIds.length,
        objectiveCount: objectiveIds.length,
        indicatorCount: indicatorIds.length,
      },
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
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
        route: '/api/seed/agro-context',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/agro-context',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal(request);

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/agro-context',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
