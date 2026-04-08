import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/setup-usuario-contexto
 *
 * Crea y asigna procesos, objetivos e indicadores al registro de personal
 * del usuario autenticado (o al uid indicado en el body).
 *
 * - Busca o crea un departamento "Gerencia General" para la org.
 * - Busca procesos existentes para la org; si no hay, crea los del vertical Dealer/Agro.
 * - Asigna los procesos, objetivos e indicadores al registro de personnel.
 *
 * Roles: super_admin, admin
 */
export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'No se pudo resolver la organización',
        });
        return NextResponse.json(
          { error: orgError.error },
          { status: orgError.status }
        );
      }

      const db = getAdminFirestore();
      const organizationId = orgScope.organizationId;

      // target_uid opcional: si no se pasa, opera sobre el propio usuario
      let targetUid = auth.uid;
      try {
        const body = await request.json();
        if (typeof body?.target_uid === 'string' && body.target_uid.trim()) {
          targetUid = body.target_uid.trim();
        }
      } catch {
        // body vacío → usar uid propio
      }

      // ── 1. Buscar registro de personnel ───────────────────────────────
      const personnelByUserId = await db
        .collection('personnel')
        .where('organization_id', '==', organizationId)
        .where('user_id', '==', targetUid)
        .limit(1)
        .get();

      let personnelDoc =
        personnelByUserId.docs[0] ||
        (auth.user.personnel_id
          ? await db
              .collection('personnel')
              .doc(auth.user.personnel_id)
              .get()
              .then(d => (d.exists ? d : null))
          : null);

      if (!personnelDoc?.exists) {
        return NextResponse.json(
          {
            error:
              'No se encontró registro de personal para este usuario. Crealo primero en RRHH → Personal.',
          },
          { status: 404 }
        );
      }

      const personnelData = personnelDoc.data() || {};

      // ── 2. Buscar o crear departamento "Gerencia General" ─────────────
      let departmentId: string =
        typeof personnelData.departamento_id === 'string' &&
        personnelData.departamento_id.trim()
          ? personnelData.departamento_id.trim()
          : '';

      let departmentNombre = 'Gerencia General';

      if (!departmentId) {
        const deptQuery = await db
          .collection('departments')
          .where('organization_id', '==', organizationId)
          .where('deletedAt', '==', null)
          .get();

        for (const d of deptQuery.docs) {
          const data = d.data();
          const n =
            (typeof data.nombre === 'string' && data.nombre) ||
            (typeof data.name === 'string' && data.name) ||
            '';
          if (n.toLowerCase().includes('gerencia')) {
            departmentId = d.id;
            departmentNombre = n;
            break;
          }
        }

        if (!departmentId) {
          const newDept = await db.collection('departments').add({
            nombre: 'Gerencia General',
            name: 'Gerencia General',
            description:
              'Dirección y gerencia general de la organización. Responsable del SGC y la operación comercial.',
            descripcion:
              'Dirección y gerencia general de la organización. Responsable del SGC y la operación comercial.',
            organization_id: organizationId,
            managerId: targetUid,
            isActive: true,
            activo: true,
            createdBy: auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: auth.uid,
            deletedAt: null,
          });
          departmentId = newDept.id;
        }
      }

      // ── 3. Buscar procesos existentes de la org ───────────────────────
      const existingProcessesSnap = await db
        .collection('processDefinitions')
        .where('organization_id', '==', organizationId)
        .get();

      const existingProcessIds: string[] = existingProcessesSnap.docs.map(
        d => d.id
      );

      const processIds: string[] = [...existingProcessIds];

      // Si no hay procesos, crear el set completo para Dealer / Agrobiciufa
      if (existingProcessIds.length === 0) {
        const procesosBase = [
          {
            codigo: 'COM-001',
            nombre: 'Gestión Comercial y Ventas de Maquinaria',
            objetivo:
              'Gestionar el ciclo completo de ventas de maquinaria CASE IH y New Holland, desde la prospección hasta el cierre y postventa.',
            alcance:
              'Aplica a todas las oportunidades comerciales de tractores, cosechadoras, implementos y sembradores.',
            descripcion:
              'Proceso que incluye prospección, cotización, negociación, cierre de venta, financiación y seguimiento postventa. Integrado con CRM y pipeline de oportunidades.',
            tipo: 'comercial',
            responsable: 'Gerencia Comercial',
            indicadores_clave: ['Tasa de cierre', 'Ticket promedio', 'NPS'],
            estado: 'activo',
          },
          {
            codigo: 'REP-001',
            nombre: 'Gestión de Repuestos y Stock',
            objetivo:
              'Asegurar la disponibilidad de repuestos CASE genuinos y OEM, optimizando el stock y el tiempo de entrega al cliente.',
            alcance:
              'Aplica a todo el ciclo de repuestos: solicitud del cliente, verificación de stock, pedido al importador, recepción y entrega.',
            descripcion:
              'Incluye gestión de catálogo de repuestos, control de inventario, pedidos a CNH, recepción, almacenamiento y despacho. Integrado con el portal de solicitudes.',
            tipo: 'operativo',
            responsable: 'Jefatura de Repuestos',
            indicadores_clave: [
              'Fill rate',
              'Rotación de stock',
              'Tiempo de entrega',
            ],
            estado: 'activo',
          },
          {
            codigo: 'SRV-001',
            nombre: 'Servicio Técnico en Campo y Taller',
            objetivo:
              'Brindar soporte técnico de calidad a clientes, resolviendo fallas de maquinaria en tiempo y forma, en campo o en taller.',
            alcance:
              'Aplica a todas las órdenes de servicio técnico: garantías, reparaciones, mantenimientos preventivos y asistencia de emergencia.',
            descripcion:
              'Gestión de ordenes de servicio desde la solicitud del cliente hasta el cierre. Incluye diagnóstico, presupuesto, ejecución, repuestos utilizados y facturación.',
            tipo: 'operativo',
            responsable: 'Jefatura de Servicio Técnico',
            indicadores_clave: [
              'Tiempo de respuesta',
              'Tasa de reparación en primera visita',
              'NPS postventa',
            ],
            estado: 'activo',
          },
          {
            codigo: 'CLI-001',
            nombre: 'Atención al Cliente y CRM',
            objetivo:
              'Registrar, gestionar y dar seguimiento a todas las interacciones con clientes y prospectos, asegurando una experiencia de calidad.',
            alcance:
              'Aplica a todos los canales de contacto: WhatsApp, formulario web, telefónico y presencial.',
            descripcion:
              'Proceso de gestión de relaciones con clientes: alta de contactos, seguimiento de oportunidades, scoring crediticio, encuestas NPS y comunicaciones activas.',
            tipo: 'gestion',
            responsable: 'Gerencia Comercial',
            indicadores_clave: ['NPS', 'Tiempo de respuesta', 'Leads calificados'],
            estado: 'activo',
          },
          {
            codigo: 'FIN-001',
            nombre: 'Gestión Financiera y Créditos',
            objetivo:
              'Gestionar los planes de financiación para clientes, el seguimiento de cobros y la cuenta corriente del concesionario.',
            alcance:
              'Aplica a todas las operaciones de financiación de maquinaria y equipos, y a la gestión de cobranzas.',
            descripcion:
              'Incluye evaluación crediticia (scoring), gestión de planes de cuotas, seguimiento de vencimientos, cobros y liquidaciones con el importador.',
            tipo: 'gestion',
            responsable: 'Gerencia General',
            indicadores_clave: ['Mora', 'Días promedio de cobro', 'Cartera activa'],
            estado: 'activo',
          },
          {
            codigo: 'CAL-001',
            nombre: 'Gestión de Calidad ISO 9001',
            objetivo:
              'Mantener y mejorar continuamente el Sistema de Gestión de Calidad bajo norma ISO 9001:2015, asegurando el cumplimiento de requisitos y la satisfacción del cliente.',
            alcance:
              'Aplica a todos los procesos del concesionario incluidos en el alcance del SGC.',
            descripcion:
              'Proceso de gestión del SGC: planificación de auditorías internas, gestión de no conformidades, revisión por la dirección, mejora continua y mantenimiento de documentación.',
            tipo: 'gestion',
            responsable: 'Representante de la Dirección',
            indicadores_clave: [
              '% NC cerradas a tiempo',
              'Índice de satisfacción',
              '% auditorías completadas',
            ],
            estado: 'activo',
          },
        ];

        for (const proceso of procesosBase) {
          const ref = await db.collection('processDefinitions').add({
            ...proceso,
            organization_id: organizationId,
            departamento_responsable_id: departmentId,
            departamento_responsable_nombre: departmentNombre,
            version: '1.0',
            activo: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            created_by: auth.uid,
          });
          processIds.push(ref.id);
        }
      }

      // ── 4. Buscar objetivos existentes o crear ────────────────────────
      const existingObjSnap = await db
        .collection('qualityObjectives')
        .where('organization_id', '==', organizationId)
        .get();

      const objectiveIds: string[] = existingObjSnap.docs.map(d => d.id);

      if (objectiveIds.length === 0) {
        const objetivos = [
          {
            title: 'Alcanzar NPS ≥ 70 en postventa',
            description:
              'Lograr un Net Promoter Score mayor o igual a 70 en encuestas de satisfacción post-servicio técnico y post-venta.',
            target_value: 70,
            current_value: 52,
            unit: 'NPS',
            measurement_frequency: 'mensual',
            responsible: 'Gerencia Comercial',
            status: 'en_progreso',
            progress_percentage: 52,
            category: 'cliente',
          },
          {
            title: 'Cerrar el 80% de las solicitudes de servicio en ≤ 48hs',
            description:
              'Reducir el tiempo de resolución de órdenes de servicio técnico a 48 horas o menos en el 80% de los casos.',
            target_value: 80,
            current_value: 55,
            unit: '% de órdenes',
            measurement_frequency: 'mensual',
            responsible: 'Jefatura de Servicio Técnico',
            status: 'en_progreso',
            progress_percentage: 55,
            category: 'operacional',
          },
          {
            title: 'Fill rate de repuestos ≥ 85%',
            description:
              'Mantener disponibilidad inmediata de al menos el 85% de los repuestos solicitados por clientes.',
            target_value: 85,
            current_value: 72,
            unit: '%',
            measurement_frequency: 'mensual',
            responsible: 'Jefatura de Repuestos',
            status: 'en_progreso',
            progress_percentage: 72,
            category: 'operacional',
          },
          {
            title: 'Completar 100% del plan anual de auditorías ISO',
            description:
              'Ejecutar todas las auditorías internas planificadas en el año según el programa del SGC.',
            target_value: 100,
            current_value: 33,
            unit: '% del plan',
            measurement_frequency: 'trimestral',
            responsible: 'Gerencia General',
            status: 'en_progreso',
            progress_percentage: 33,
            category: 'gestion',
          },
        ];

        for (const obj of objetivos) {
          const ref = await db.collection('qualityObjectives').add({
            ...obj,
            organization_id: organizationId,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            created_by: auth.uid,
          });
          objectiveIds.push(ref.id);
        }
      }

      // ── 5. Buscar indicadores existentes o crear ──────────────────────
      const existingIndSnap = await db
        .collection('qualityIndicators')
        .where('organization_id', '==', organizationId)
        .get();

      const indicadorIds: string[] = existingIndSnap.docs.map(d => d.id);

      if (indicadorIds.length === 0) {
        const indicadores = [
          {
            name: 'NPS Postventa',
            description:
              'Nivel de recomendación del cliente después del servicio técnico o la compra de maquinaria.',
            formula: 'Promotores (%) - Detractores (%) sobre encuestas del mes',
            unit: 'NPS',
            target_min: 70,
            target_max: 100,
            current_value: 52,
            measurement_frequency: 'mensual',
            responsible: 'Gerencia Comercial',
            category: 'cliente',
            status: 'activo',
          },
          {
            name: 'Tiempo Promedio de Resolución Servicio Técnico',
            description:
              'Horas promedio desde que el cliente reporta la falla hasta que la maquinaria queda operativa.',
            formula: 'Suma de horas de resolución / cantidad de órdenes cerradas',
            unit: 'horas',
            target_min: 0,
            target_max: 48,
            current_value: 72,
            measurement_frequency: 'mensual',
            responsible: 'Jefatura de Servicio Técnico',
            category: 'operacional',
            status: 'activo',
          },
          {
            name: 'Fill Rate de Repuestos',
            description:
              'Porcentaje de solicitudes de repuestos atendidas desde stock disponible en el momento de la consulta.',
            formula: '(Solicitudes atendidas en stock / Total solicitudes) × 100',
            unit: '%',
            target_min: 85,
            target_max: 100,
            current_value: 72,
            measurement_frequency: 'mensual',
            responsible: 'Jefatura de Repuestos',
            category: 'operacional',
            status: 'activo',
          },
          {
            name: 'Tasa de Cierre de Ventas',
            description:
              'Porcentaje de oportunidades comerciales que resultan en venta efectiva.',
            formula: '(Ventas cerradas / Oportunidades abiertas del período) × 100',
            unit: '%',
            target_min: 25,
            target_max: 100,
            current_value: 18,
            measurement_frequency: 'mensual',
            responsible: 'Gerencia Comercial',
            category: 'comercial',
            status: 'activo',
          },
          {
            name: '% Cartera en Mora',
            description:
              'Porcentaje de la cartera de créditos con cuotas vencidas más de 30 días.',
            formula: '(Monto en mora >30d / Cartera total) × 100',
            unit: '%',
            target_min: 0,
            target_max: 5,
            current_value: 8,
            measurement_frequency: 'mensual',
            responsible: 'Gerencia General',
            category: 'financiero',
            status: 'activo',
          },
          {
            name: '% NC Cerradas en Tiempo',
            description:
              'Porcentaje de no conformidades del SGC cerradas dentro del plazo definido en la acción correctiva.',
            formula: '(NC cerradas a tiempo / Total NC abiertas) × 100',
            unit: '%',
            target_min: 80,
            target_max: 100,
            current_value: 60,
            measurement_frequency: 'mensual',
            responsible: 'Gerencia General',
            category: 'gestion',
            status: 'activo',
          },
        ];

        for (const ind of indicadores) {
          const ref = await db.collection('qualityIndicators').add({
            ...ind,
            organization_id: organizationId,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            created_by: auth.uid,
          });
          indicadorIds.push(ref.id);
        }
      }

      // ── 6. Asignar todo al registro de personnel ──────────────────────
      await db
        .collection('personnel')
        .doc(personnelDoc.id)
        .update({
          departamento_id: departmentId,
          departamento: departmentNombre,
          procesos_asignados: processIds,
          objetivos_asignados: objectiveIds,
          indicadores_asignados: indicadorIds,
          updatedAt: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

      return NextResponse.json({
        success: true,
        message: `Contexto operativo asignado correctamente a ${personnelData.nombres || 'el usuario'} ${personnelData.apellidos || ''}`.trim(),
        data: {
          personnel_id: personnelDoc.id,
          department: { id: departmentId, nombre: departmentNombre },
          procesos_count: processIds.length,
          objetivos_count: objectiveIds.length,
          indicadores_count: indicadorIds.length,
        },
      });
    } catch (error) {
      console.error('Error in POST /api/admin/setup-usuario-contexto:', error);
      return NextResponse.json(
        { error: 'Error al configurar el contexto del usuario' },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin', 'admin'] }
);
