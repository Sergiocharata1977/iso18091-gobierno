import { withAuth } from '@/lib/api/withAuth';
import {
  CRITERIOS_DEFAULT,
  createCriterio,
} from '@/services/crm/CriteriosClasificacionService';
import { ESTADOS_KANBAN_DEFAULT } from '@/data/crm/scoring-config';
import { db } from '@/firebase/config';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, _context, auth) => {
    try {
      const organizationId = auth.organizationId;
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const estadosRef = collection(db, 'kanban_estados');
      const estadosSnapshot = await getDocs(
        query(estadosRef, where('organization_id', '==', organizationId))
      );

      let estados: any[] = [];
      if (estadosSnapshot.empty) {
        const now = new Date().toISOString();
        for (const estadoDefault of ESTADOS_KANBAN_DEFAULT) {
          const estadoData = {
            ...estadoDefault,
            organization_id: organizationId,
            created_at: now,
            updated_at: now,
          };
          const docRef = await addDoc(estadosRef, estadoData);
          estados.push({ id: docRef.id, ...estadoData });
        }
      } else {
        estados = estadosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      const clientesRef = collection(db, 'clientes_crm');
      const clientesSnapshot = await getDocs(
        query(clientesRef, where('organization_id', '==', organizationId))
      );
      let clientesCreados = 0;
      let criteriosCreados = 0;

      if (clientesSnapshot.empty) {
        const now = new Date().toISOString();
        const estadoProspecto = estados.find(e => e.nombre === 'Prospecto');
        const estadoContactado = estados.find(e => e.nombre === 'Contactado');
        const estadoEvaluacion = estados.find(
          e =>
            e.requires_credit_workflow === true &&
            e.credit_workflow_trigger === 'entry'
        ) || estados.find(
          e =>
            e.nombre === 'Gestión Crediticia' || e.nombre === 'En Evaluacion'
        );

        const clientesEjemplo = [
          {
            razon_social: 'Agropecuaria San Martin S.A.',
            nombre_comercial: 'San Martin Agro',
            cuit_cuil: '30-12345678-9',
            tipo_cliente: 'posible_cliente',
            estado_kanban_id: estadoProspecto?.id || estados[0].id,
            estado_kanban_nombre: estadoProspecto?.nombre || estados[0].nombre,
            historial_estados: [],
            email: 'contacto@sanmartin.com',
            telefono: '+54 9 11 1234-5678',
            direccion: 'Ruta 5 Km 120',
            localidad: 'San Martin',
            provincia: 'Buenos Aires',
            responsable_id: auth.uid,
            responsable_nombre: auth.email || 'Sistema',
            monto_estimado_compra: 500000,
            probabilidad_conversion: 60,
            total_compras_12m: 0,
            cantidad_compras_12m: 0,
            monto_total_compras_historico: 0,
            ultima_interaccion: now,
            notas: 'Interesado en semillas de soja',
            created_at: now,
            updated_at: now,
            created_by: auth.uid,
            isActive: true,
            organization_id: organizationId,
          },
          {
            razon_social: 'Estancia La Pampa',
            cuit_cuil: '20-98765432-1',
            tipo_cliente: 'posible_cliente',
            estado_kanban_id: estadoContactado?.id || estados[1].id,
            estado_kanban_nombre: estadoContactado?.nombre || estados[1].nombre,
            historial_estados: [],
            email: 'info@lapampa.com.ar',
            telefono: '+54 9 11 9876-5432',
            direccion: 'Camino Rural 234',
            localidad: 'General Pico',
            provincia: 'La Pampa',
            responsable_id: auth.uid,
            responsable_nombre: auth.email || 'Sistema',
            monto_estimado_compra: 750000,
            probabilidad_conversion: 40,
            total_compras_12m: 0,
            cantidad_compras_12m: 0,
            monto_total_compras_historico: 0,
            ultima_interaccion: now,
            notas: 'Primer contacto realizado, solicita cotizacion',
            created_at: now,
            updated_at: now,
            created_by: auth.uid,
            isActive: true,
            organization_id: organizationId,
          },
          {
            razon_social: 'Campos del Sur S.R.L.',
            nombre_comercial: 'Campos del Sur',
            cuit_cuil: '30-55555555-5',
            tipo_cliente: 'posible_cliente',
            estado_kanban_id: estadoEvaluacion?.id || estados[2].id,
            estado_kanban_nombre: estadoEvaluacion?.nombre || estados[2].nombre,
            historial_estados: [],
            email: 'ventas@camposdelsur.com',
            telefono: '+54 9 11 5555-5555',
            direccion: 'Av. Principal 456',
            localidad: 'Rosario',
            provincia: 'Santa Fe',
            responsable_id: auth.uid,
            responsable_nombre: auth.email || 'Sistema',
            monto_estimado_compra: 1200000,
            probabilidad_conversion: 75,
            categoria_riesgo: 'B',
            limite_credito_actual: 1000000,
            total_compras_12m: 0,
            cantidad_compras_12m: 0,
            monto_total_compras_historico: 0,
            ultima_interaccion: now,
            notas: 'En proceso de evaluacion crediticia',
            created_at: now,
            updated_at: now,
            created_by: auth.uid,
            isActive: true,
            organization_id: organizationId,
          },
        ];

        for (const cliente of clientesEjemplo) {
          await addDoc(clientesRef, cliente);
          clientesCreados++;
        }
      }

      const criteriosRef = collection(db, 'crm_clasificacion_criterios');
      const criteriosSnapshot = await getDocs(
        query(criteriosRef, where('organization_id', '==', organizationId))
      );

      if (criteriosSnapshot.empty) {
        for (const criterio of CRITERIOS_DEFAULT) {
          await createCriterio(organizationId, criterio, auth.uid);
          criteriosCreados++;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'CRM inicializado correctamente',
        data: {
          estados_creados: estadosSnapshot.empty ? estados.length : 0,
          clientes_creados: clientesCreados,
          criterios_clasificacion_creados: criteriosCreados,
          total_estados: estados.length,
          total_clientes: clientesSnapshot.size + clientesCreados,
          total_criterios_clasificacion:
            criteriosSnapshot.size + criteriosCreados,
        },
      });
    } catch (error: any) {
      console.error('Error inicializando CRM:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to initialize CRM' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'super_admin'] }
);
