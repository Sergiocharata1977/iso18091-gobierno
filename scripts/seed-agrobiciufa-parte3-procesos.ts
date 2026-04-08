/**
 * Seed Agro Bicufa — PARTE 3: Procesos ISO 9001
 *
 * Mapa de procesos de un concesionario CASE IH según norma ISO 9001:2015.
 * Se insertan como ProcessDefinition en la colección "processes" de la organización.
 *
 * Procesos incluidos:
 *   PRO-VEN-001  Venta de Maquinaria Nueva y Usada
 *   PRO-REP-001  Gestión y Venta de Repuestos
 *   PRO-SER-001  Servicio Técnico y Reparaciones
 *   PRO-GAR-001  Gestión de Garantías CASE IH
 *   PRO-COM-001  Gestión de Compras y Proveedores
 *   PRO-ALM-001  Control de Almacenes e Inventario
 *   PRO-CAL-001  Auditoría Interna ISO 9001
 *   PRO-POS-001  Postventa y Satisfacción del Cliente
 *
 * Uso:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-agrobiciufa-parte3-procesos.ts
 *
 * REQUISITO: Ejecutar primero Parte 1 y Parte 2.
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'org_agrobiciufa';

function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ No se encontró service-account.json en la raíz del proyecto');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  console.log(`📦 Firebase Admin inicializado — proyecto: ${serviceAccount.project_id}`);
}

function now() { return Timestamp.now(); }

// ─── Procesos ISO 9001 ────────────────────────────────────────────────────────
const PROCESOS = [
  {
    id: 'pro_agro_ven_001',
    codigo: 'PRO-VEN-001',
    nombre: 'Venta de Maquinaria Nueva y Usada',
    objetivo:
      'Gestionar el ciclo completo de venta de maquinaria agrícola CASE IH (nueva y usada), asegurando la satisfacción del cliente, el cumplimiento de los objetivos comerciales y el correcto registro en el sistema.',
    alcance:
      'Abarca desde la prospección o contacto inicial del cliente hasta la entrega de la unidad y la generación del expediente de venta. Incluye maquinaria nueva proveniente de CNH Argentina y unidades usadas recibidas en parte de pago.',
    responsable: 'Gerente de Ventas',
    departamento_responsable_id: 'dept_agro_ventas',
    departamento_responsable_nombre: 'Ventas y Comercial',
    entradas: [
      'Consulta de cliente (presencial, telefónica, web)',
      'Catálogo y lista de precios CASE IH vigente',
      'Stock de unidades disponibles (nuevas y usadas)',
      'Condiciones de financiación (CNH Financial / bancos)',
    ],
    salidas: [
      'Propuesta comercial / cotización firmada',
      'Contrato de compraventa o pedido de unidad',
      'Remito de entrega y factura',
      'Expediente de venta completo en sistema',
      'Registro en CRM (cliente, oportunidad, venta cerrada)',
    ],
    controles: [
      'Verificación de identidad y datos fiscales del cliente',
      'Aprobación de descuentos por Gerente de Ventas',
      'Revisión de unidades usadas por Servicios antes de aceptar como parte de pago',
      'Registro de cada etapa en el CRM',
    ],
    indicadores: [
      'Unidades vendidas por período (nuevas / usadas)',
      'Facturación mensual del área',
      'Tiempo promedio de ciclo de venta (días)',
      'Tasa de conversión de consultas a ventas (%)',
      'Satisfacción del cliente post-entrega (encuesta NPS)',
    ],
    documentos: [
      'DOC-VEN-01: Formulario de cotización',
      'DOC-VEN-02: Contrato de compraventa',
      'DOC-VEN-03: Protocolo de entrega de unidad',
      'DOC-VEN-04: Política de toma de usados',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_rep_001',
    codigo: 'PRO-REP-001',
    nombre: 'Gestión y Venta de Repuestos',
    objetivo:
      'Garantizar la disponibilidad de repuestos originales CASE IH para clientes y taller, optimizando el stock, minimizando los tiempos de espera y maximizando la facturación del área.',
    alcance:
      'Incluye la atención en mostrador a clientes externos y al taller interno, la identificación de repuestos en catálogos CNH, cotización, pedido al distribuidor, recepción y entrega. Excluye repuestos de otras marcas.',
    responsable: 'Gerente de Repuestos',
    departamento_responsable_id: 'dept_agro_repuestos',
    departamento_responsable_nombre: 'Repuestos',
    entradas: [
      'Solicitud de cliente (mostrador o telefónica)',
      'Pedido interno de taller (OT activa)',
      'Catálogo de repuestos CASE IH (sistema CNH)',
      'Stock disponible en almacén',
    ],
    salidas: [
      'Repuesto entregado al cliente o al taller con remito',
      'Factura de venta',
      'Pedido de reposición al distribuidor (cuando aplica)',
      'Actualización de inventario en sistema',
    ],
    controles: [
      'Verificación de número de parte antes de confirmar disponibilidad',
      'Control de precios contra lista vigente CNH',
      'Autorización para descuentos según política del área',
      'Registro de movimientos de stock en sistema',
    ],
    indicadores: [
      'Facturación mensual de repuestos',
      'Fill rate (% de pedidos atendidos desde stock)',
      'Tiempo de atención en mostrador (minutos)',
      'Rotación de inventario de repuestos',
      'Pedidos pendientes de CNH (backorders)',
    ],
    documentos: [
      'DOC-REP-01: Procedimiento de identificación de repuestos',
      'DOC-REP-02: Política de pedidos a distribuidor',
      'DOC-REP-03: Procedimiento de devoluciones de repuestos',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_ser_001',
    codigo: 'PRO-SER-001',
    nombre: 'Servicio Técnico y Reparaciones',
    objetivo:
      'Brindar servicio de mantenimiento y reparación de maquinaria agrícola CASE IH con calidad, eficiencia y seguridad, garantizando la satisfacción del cliente y el cumplimiento de los estándares técnicos del fabricante.',
    alcance:
      'Aplica a todas las órdenes de trabajo (OT) gestionadas en el taller de Agro Bicufa, tanto de clientes externos como de trabajos internos (preparación de usados, entrega de unidades nuevas). Incluye servicios en campo.',
    responsable: 'Gerente de Servicios',
    departamento_responsable_id: 'dept_agro_servicios',
    departamento_responsable_nombre: 'Servicios Técnicos',
    entradas: [
      'Solicitud de servicio del cliente (presencial, teléfono, app)',
      'Unidad ingresada al taller con descripción de falla',
      'Historial de servicio de la unidad (sistema CNH)',
      'Repuestos disponibles en almacén',
    ],
    salidas: [
      'Orden de Trabajo (OT) completa con diagnóstico y trabajos realizados',
      'Maquinaria entregada reparada y probada',
      'Factura de mano de obra y repuestos utilizados',
      'Informe de diagnóstico al cliente',
    ],
    controles: [
      'Diagnóstico previo obligatorio antes de presupuestar al cliente',
      'Aprobación del presupuesto por el cliente antes de iniciar',
      'Prueba funcional de la unidad antes de entrega',
      'Revisión de calidad por Jefe de Taller en trabajos mayores',
      'Registro de tiempos por técnico en el sistema',
    ],
    indicadores: [
      'Órdenes de trabajo completadas por mes',
      'Tiempo promedio de reparación por tipo de trabajo (horas)',
      'Facturación de mano de obra mensual',
      'Índice de retrabajo (OT que vuelven por la misma falla)',
      'Satisfacción del cliente post-servicio (encuesta)',
      'Ocupación del taller (%)',
    ],
    documentos: [
      'DOC-SER-01: Formulario de recepción de unidad',
      'DOC-SER-02: Procedimiento de apertura y cierre de OT',
      'DOC-SER-03: Protocolo de prueba funcional pre-entrega',
      'DOC-SER-04: Política de trabajos en campo',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_gar_001',
    codigo: 'PRO-GAR-001',
    nombre: 'Gestión de Garantías CASE IH',
    objetivo:
      'Gestionar eficientemente las reclamaciones de garantía de maquinaria CASE IH, asegurando el cumplimiento de los procedimientos CNH Industrial, la recuperación del costo por el fabricante y la satisfacción del cliente.',
    alcance:
      'Aplica a toda unidad CASE IH en período de garantía según condiciones del fabricante. Incluye diagnóstico, apertura del reclamo en el sistema CNH, ejecución de la reparación y cierre de la garantía.',
    responsable: 'Gerente de Servicios',
    departamento_responsable_id: 'dept_agro_servicios',
    departamento_responsable_nombre: 'Servicios Técnicos',
    entradas: [
      'Reclamo de garantía del cliente',
      'Manual de garantías CASE IH vigente',
      'Sistema de garantías CNH (portal web)',
      'Historial de la unidad y documentación de compra',
    ],
    salidas: [
      'Garantía aprobada o rechazada por CNH con fundamento',
      'Reparación ejecutada y documentada',
      'Recupero de costos acreditado por CNH',
      'Cliente notificado y unidad devuelta',
    ],
    controles: [
      'Verificación de vigencia de garantía antes de abrir reclamo',
      'Fotografías y evidencia requeridas por CNH documentadas',
      'Aprobación de CNH obligatoria antes de iniciar reparación en garantía',
      'Seguimiento del estado del reclamo en el portal CNH',
    ],
    indicadores: [
      'Garantías procesadas por mes',
      'Tasa de aprobación de garantías por CNH (%)',
      'Tiempo promedio de resolución de garantía (días)',
      'Monto recuperado por garantías ($/mes)',
    ],
    documentos: [
      'DOC-GAR-01: Procedimiento de apertura de garantía CNH',
      'DOC-GAR-02: Lista de verificación de documentación requerida',
      'DOC-GAR-03: Política de comunicación al cliente en garantías',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_com_001',
    codigo: 'PRO-COM-001',
    nombre: 'Gestión de Compras y Proveedores',
    objetivo:
      'Asegurar el abastecimiento oportuno de repuestos, insumos y servicios necesarios para las operaciones de Agro Bicufa, a través de un proceso de compras eficiente y con proveedores evaluados y homologados.',
    alcance:
      'Aplica a todas las compras realizadas por la empresa, excepto las inversiones en activos fijos que son aprobadas directamente por Dirección. Incluye la evaluación y re-evaluación periódica de proveedores.',
    responsable: 'Jefe de Compras',
    departamento_responsable_id: 'dept_agro_compras',
    departamento_responsable_nombre: 'Compras y Abastecimiento',
    entradas: [
      'Solicitud de compra interna (repuestos, insumos, servicios)',
      'Stock mínimo alertado por Almacenes',
      'Lista de proveedores homologados',
      'Presupuestos de proveedores',
    ],
    salidas: [
      'Orden de Compra emitida y firmada',
      'Mercadería recibida y conforme',
      'Proveedor evaluado (nueva evaluación o re-evaluación)',
      'Registro de compra en sistema contable',
    ],
    controles: [
      'Mínimo 2 presupuestos para compras superiores a $500.000',
      'Aprobación de Gerencia para compras superiores a $2.000.000',
      'Solo comprar a proveedores del registro de homologados',
      'Control de calidad de mercadería en recepción por Almacenes',
    ],
    indicadores: [
      'Tiempo promedio de proceso de compra (días)',
      'Cumplimiento de plazos de entrega de proveedores (%)',
      'Ahorro obtenido por negociación ($/mes)',
      'Proveedores evaluados / total proveedores activos (%)',
    ],
    documentos: [
      'DOC-COM-01: Procedimiento de solicitud y aprobación de compras',
      'DOC-COM-02: Formulario de evaluación de proveedores',
      'DOC-COM-03: Registro de proveedores homologados',
      'DOC-COM-04: Procedimiento de recepción de mercadería',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_alm_001',
    codigo: 'PRO-ALM-001',
    nombre: 'Control de Almacenes e Inventario',
    objetivo:
      'Mantener un registro preciso y actualizado del inventario de repuestos y bienes de la empresa, asegurando la disponibilidad de los materiales necesarios y minimizando las pérdidas por obsolescencia o faltantes.',
    alcance:
      'Aplica al depósito de repuestos y al área de maquinaria (unidades nuevas y usadas en stock). Incluye ingresos, egresos, inventarios cíclicos mensuales e inventario general anual.',
    responsable: 'Jefe de Almacén',
    departamento_responsable_id: 'dept_agro_almacenes',
    departamento_responsable_nombre: 'Almacenes e Inventario',
    entradas: [
      'Mercadería recibida de compras (con remito y OC)',
      'Devoluciones de taller o mostrador',
      'Solicitudes de retiro de repuestos (taller / mostrador)',
    ],
    salidas: [
      'Mercadería entregada con remito interno',
      'Inventario actualizado en sistema',
      'Informe de inventario cíclico mensual',
      'Alerta de stock mínimo para re-abastecimiento',
    ],
    controles: [
      'Toda entrada y salida debe registrarse en el sistema el mismo día',
      'Inventario cíclico mensual: rotación por zona del depósito',
      'Inventario general anual: conteo total vs sistema',
      'Productos sin movimiento >12 meses identificados como obsoletos',
    ],
    indicadores: [
      'Exactitud del inventario (% coincidencia sistema vs físico)',
      'Diferencias detectadas en inventario cíclico ($)',
      'Rotación de inventario de repuestos (veces/año)',
      'Artículos en stock mínimo / total artículos (%)',
      'Valor total del inventario de repuestos ($)',
    ],
    documentos: [
      'DOC-ALM-01: Procedimiento de recepción y ubicación de mercadería',
      'DOC-ALM-02: Procedimiento de retiro de mercadería',
      'DOC-ALM-03: Instructivo de inventario cíclico',
      'DOC-ALM-04: Clasificación de productos obsoletos',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_cal_001',
    codigo: 'PRO-CAL-001',
    nombre: 'Auditoría Interna ISO 9001',
    objetivo:
      'Verificar periódicamente que el Sistema de Gestión de Calidad de Agro Bicufa cumple con los requisitos de la norma ISO 9001:2015, los propios de la empresa y se implementa y mantiene eficazmente.',
    alcance:
      'Aplica a todos los procesos del SGC de Agro Bicufa. Se realizan auditorías internas planificadas al menos una vez por año y auditorías no planificadas ante no conformidades graves o cambios significativos.',
    responsable: 'Responsable de Calidad (ISO 9001)',
    departamento_responsable_id: 'dept_agro_calidad',
    departamento_responsable_nombre: 'Calidad',
    entradas: [
      'Programa anual de auditorías internas',
      'Norma ISO 9001:2015',
      'Documentación del SGC (procedimientos, registros)',
      'Resultados de auditorías anteriores y acciones correctivas abiertas',
    ],
    salidas: [
      'Informe de auditoría interna con hallazgos',
      'No Conformidades (NC) y Observaciones documentadas',
      'Plan de acciones correctivas acordado con los responsables',
      'Registro de auditoría para revisión por la dirección',
    ],
    controles: [
      'Auditores internos calificados (no pueden auditar su propia área)',
      'Comunicación del programa de auditoría con 15 días de anticipación',
      'Seguimiento de cierre de NC dentro del plazo acordado',
      'Revisión de efectividad de acciones correctivas',
    ],
    indicadores: [
      'Auditorías realizadas vs programadas (%)',
      'No conformidades detectadas por auditoría',
      '% de NC cerradas en plazo',
      'Tiempo promedio de cierre de NC (días)',
      'Observaciones recurrentes en procesos críticos',
    ],
    documentos: [
      'DOC-CAL-01: Programa anual de auditorías internas',
      'DOC-CAL-02: Plan de auditoría (por auditoría)',
      'DOC-CAL-03: Lista de verificación por proceso',
      'DOC-CAL-04: Informe de auditoría interna',
      'DOC-CAL-05: Formulario de no conformidad y acción correctiva',
    ],
    estado: 'activo',
  },
  {
    id: 'pro_agro_pos_001',
    codigo: 'PRO-POS-001',
    nombre: 'Postventa y Satisfacción del Cliente',
    objetivo:
      'Medir y mejorar continuamente la satisfacción de los clientes de Agro Bicufa mediante el seguimiento post-venta y post-servicio, la gestión de reclamos y la implementación de mejoras basadas en el feedback recibido.',
    alcance:
      'Aplica a todos los clientes que realizaron una compra de maquinaria o recibieron un servicio técnico en los últimos 90 días. Incluye el canal de reclamos y la encuesta NPS.',
    responsable: 'Coordinador de Postventa',
    departamento_responsable_id: 'dept_agro_ventas',
    departamento_responsable_nombre: 'Ventas y Comercial',
    entradas: [
      'Listado de entregas y servicios completados (últimos 90 días)',
      'Reclamos recibidos por cualquier canal',
      'Resultados de encuestas NPS anteriores',
    ],
    salidas: [
      'Encuesta de satisfacción NPS enviada y resultado registrado',
      'Reclamo gestionado y resuelto con cliente notificado',
      'Informe mensual de satisfacción para Dirección',
      'Acciones de mejora identificadas y asignadas',
    ],
    controles: [
      'Encuesta NPS enviada dentro de las 72hs de entrega/servicio',
      'Reclamos respondidos al cliente en máximo 24hs hábiles',
      'Revisión mensual de resultados NPS por Gerencia',
      'Escalado a Gerente General para NPS < 6 (Detractores)',
    ],
    indicadores: [
      'NPS mensual (Net Promoter Score)',
      'Tasa de respuesta a encuestas NPS (%)',
      'Tiempo promedio de resolución de reclamos (horas)',
      'Reclamos recibidos por categoría (producto / servicio / administración)',
      '% de clientes que vuelven a comprar o contratar servicio (retención)',
    ],
    documentos: [
      'DOC-POS-01: Procedimiento de encuesta NPS post-entrega',
      'DOC-POS-02: Procedimiento de gestión de reclamos',
      'DOC-POS-03: Informe mensual de satisfacción (plantilla)',
    ],
    estado: 'activo',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedProcesos(db: ReturnType<typeof getFirestore>) {
  console.log('\n⚙️  Insertando procesos ISO 9001...');
  const col = db.collection('organizations').doc(ORG_ID).collection('processes');
  const batch = db.batch();

  for (const proceso of PROCESOS) {
    const ref = col.doc(proceso.id);
    batch.set(ref, {
      ...proceso,
      organization_id: ORG_ID,
      createdAt: now(),
      updatedAt: now(),
    }, { merge: true });
    console.log(`  → [${proceso.codigo}] ${proceso.nombre}`);
  }

  await batch.commit();
  console.log(`✅ ${PROCESOS.length} procesos creados`);
}

async function main() {
  console.log('\n🚀 Seed Agro Bicufa — PARTE 3: Procesos ISO 9001\n');
  console.log(`   Organización: ${ORG_ID}`);
  initAdmin();
  const db = getFirestore();

  await seedProcesos(db);

  console.log('\n🎉 Parte 3 completada!');
  console.log('\n   Procesos insertados:');
  PROCESOS.forEach(p => console.log(`   [${p.codigo}] ${p.nombre}`));
  console.log(`\n   Colección: organizations/${ORG_ID}/processes`);
  console.log('\n   ✅ SEED COMPLETO — Agro Bicufa lista para usar en el sistema!\n');
  console.log('   Para verificar: ir al panel → RRHH → Departamentos / Puestos / Personal');
  console.log('                   ir al panel → Procesos\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
