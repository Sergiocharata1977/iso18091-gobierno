import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/firebase/config';
import { addDoc, collection } from 'firebase/firestore';
import { NextResponse } from 'next/server';

async function postInternal() {
  try {
    const now = new Date().toISOString();
    const organizationId = 'default-org';

    // 1. Crear Política de ejemplo
    const politicaRef = collection(db, 'politicas');
    const politicaId = await addDoc(politicaRef, {
      organization_id: organizationId,
      codigo: 'POL-QMS-001',
      titulo: 'Política de Calidad',
      descripcion: 'Política general del sistema de gestión de calidad',
      proposito: 'Establecer el compromiso de la organización con la calidad',
      alcance: 'Aplica a todos los procesos de la organización',
      version: 1,
      estado: 'vigente',
      procesos_relacionados: [],
      departamentos_aplicables: [],
      puntos_norma: ['4.1', '5.2'],
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    // 2. Crear Reunión de Trabajo de ejemplo
    const reunionRef = collection(db, 'reuniones_trabajo');
    const reunionId = await addDoc(reunionRef, {
      organization_id: organizationId,
      tipo: 'management_review',
      titulo: 'Revisión por la Dirección Q1 2025',
      fecha: new Date().toISOString(),
      duracion_minutos: 120,
      modalidad: 'presencial',
      organizador_id: 'system',
      participantes: [],
      agenda: [
        {
          orden: 1,
          tema: 'Revisión de objetivos de calidad',
          estado: 'planificado',
        },
      ],
      puntos_tratados: [],
      acuerdos: [],
      estado: 'planificada',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    // 3. Crear Análisis FODA de ejemplo
    const fodaRef = collection(db, 'analisis_foda');
    const fodaId = await addDoc(fodaRef, {
      organization_id: organizationId,
      codigo: 'FODA-2025-Q1',
      titulo: 'Análisis FODA Organizacional 2025',
      descripcion: 'Análisis estratégico de la organización',
      tipo_analisis: 'organizacional',
      fecha_analisis: new Date().toISOString(),
      responsable_id: 'system',
      participantes: [],
      fortalezas: [
        {
          descripcion: 'Equipo comprometido con la calidad',
          impacto: 'alto',
        },
      ],
      oportunidades: [
        {
          descripcion: 'Expansión a nuevos mercados',
          impacto: 'alto',
          probabilidad: 'media',
        },
      ],
      debilidades: [
        {
          descripcion: 'Procesos no documentados',
          impacto: 'medio',
        },
      ],
      amenazas: [
        {
          descripcion: 'Competencia creciente',
          impacto: 'medio',
          probabilidad: 'alta',
        },
      ],
      estado: 'completado',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Colecciones creadas exitosamente',
      ids: {
        politica: politicaId.id,
        reunion: reunionId.id,
        foda: fodaId.id,
      },
    });
  } catch (error) {
    console.error('Error creating collections:', error);
    return NextResponse.json(
      { error: 'Error al crear colecciones' },
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
        route: '/api/seed/quality-modules',
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
      route: '/api/seed/quality-modules',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal();

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/quality-modules',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
