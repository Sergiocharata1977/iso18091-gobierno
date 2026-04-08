/**
 * Seed Agro Bicufa — PARTE 1: Departamentos y Puestos
 *
 * Estructura real de un concesionario CASE IH (maquinaria agrícola):
 *   - Dirección General
 *   - Ventas y Comercial
 *   - Repuestos
 *   - Servicios Técnicos
 *   - Calidad (ISO 9001)
 *   - Compras y Abastecimiento
 *   - Almacenes e Inventario
 *   - Administración y Finanzas
 *
 * Uso:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-agrobiciufa-parte1-rrhh.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'org_agrobiciufa';

// ─── Init Firebase Admin ─────────────────────────────────────────────────────
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

// ─── Departamentos ────────────────────────────────────────────────────────────
const DEPARTAMENTOS = [
  {
    id: 'dept_agro_direccion',
    nombre: 'Dirección General',
    descripcion: 'Conducción estratégica de la empresa, toma de decisiones de alto nivel y representación institucional ante CNH/CASE IH.',
    is_active: true,
  },
  {
    id: 'dept_agro_ventas',
    nombre: 'Ventas y Comercial',
    descripcion: 'Venta de maquinaria agrícola nueva y usada (tractores, cosechadoras, sembradoras, pulverizadoras CASE IH). Atención a clientes, seguimiento de oportunidades y financiación.',
    is_active: true,
  },
  {
    id: 'dept_agro_repuestos',
    nombre: 'Repuestos',
    descripcion: 'Venta y gestión de repuestos originales CASE IH. Mostrador, cotizaciones, pedidos al distribuidor y control de stock de repuestos.',
    is_active: true,
  },
  {
    id: 'dept_agro_servicios',
    nombre: 'Servicios Técnicos',
    descripcion: 'Taller de reparación y mantenimiento de maquinaria agrícola CASE IH. Gestión de órdenes de trabajo, garantías y servicio en campo.',
    is_active: true,
  },
  {
    id: 'dept_agro_calidad',
    nombre: 'Calidad',
    descripcion: 'Sistema de Gestión de Calidad ISO 9001. Auditorías internas, control de documentos, gestión de no conformidades y mejora continua.',
    is_active: true,
  },
  {
    id: 'dept_agro_compras',
    nombre: 'Compras y Abastecimiento',
    descripcion: 'Gestión de compras de repuestos, insumos y servicios. Evaluación y homologación de proveedores. Negociación con CNH y distribuidores.',
    is_active: true,
  },
  {
    id: 'dept_agro_almacenes',
    nombre: 'Almacenes e Inventario',
    descripcion: 'Control de stock de repuestos y maquinaria. Ingreso y egreso de mercadería. Inventarios periódicos y gestión del depósito.',
    is_active: true,
  },
  {
    id: 'dept_agro_admin',
    nombre: 'Administración y Finanzas',
    descripcion: 'Contabilidad, tesorería, facturación, cuentas a pagar y cobrar. Liquidación de sueldos y cumplimiento impositivo.',
    is_active: true,
  },
];

// ─── Puestos ──────────────────────────────────────────────────────────────────
// Nota: departamento_id referencia los IDs de DEPARTAMENTOS definidos arriba
const PUESTOS = [
  // ── Dirección ──
  {
    id: 'puesto_agro_gerente_general',
    nombre: 'Gerente General',
    descripcion_responsabilidades:
      'Conducción integral de la empresa. Define objetivos estratégicos, reporta a los accionistas y es interlocutor principal con CNH Industrial Argentina.',
    requisitos_experiencia: '10+ años en concesionarios o industria agropecuaria',
    requisitos_formacion: 'Licenciatura en Administración, Ingeniería Agronómica o MBA',
    departamento_id: 'dept_agro_direccion',
    nivel: 'gerencial',
    is_active: true,
  },
  // ── Ventas ──
  {
    id: 'puesto_agro_gerente_ventas',
    nombre: 'Gerente de Ventas',
    descripcion_responsabilidades:
      'Liderazgo del equipo comercial. Define cuotas, estrategias de venta, manejo de la relación con clientes clave y coordinación con CASE IH para asignación de unidades.',
    requisitos_experiencia: '5+ años en ventas de maquinaria agrícola o equipos industriales',
    requisitos_formacion: 'Licenciatura en Administración, Agronomía o Ingeniería',
    departamento_id: 'dept_agro_ventas',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'gerencial',
    is_active: true,
  },
  {
    id: 'puesto_agro_asesor_comercial_sr',
    nombre: 'Asesor Comercial Senior',
    descripcion_responsabilidades:
      'Gestión de cuentas clave: grandes productores, contratistas y cooperativas. Venta de maquinaria nueva y usada, armado de propuestas con financiación.',
    requisitos_experiencia: '4-6 años en venta de maquinaria o agro',
    requisitos_formacion: 'Técnico o Licenciatura en Agro, Adm o afín',
    departamento_id: 'dept_agro_ventas',
    reporta_a_id: 'puesto_agro_gerente_ventas',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_asesor_comercial',
    nombre: 'Asesor Comercial',
    descripcion_responsabilidades:
      'Prospección y atención de clientes, visitas a campo, cotizaciones y seguimiento de oportunidades en el CRM. Participa en exposiciones rurales.',
    requisitos_experiencia: '1-3 años en ventas. Preferible sector agro.',
    requisitos_formacion: 'Técnico en Ventas, Administración o carrera afín',
    departamento_id: 'dept_agro_ventas',
    reporta_a_id: 'puesto_agro_gerente_ventas',
    nivel: 'operativo',
    is_active: true,
  },
  {
    id: 'puesto_agro_coordinador_postventa',
    nombre: 'Coordinador de Postventa',
    descripcion_responsabilidades:
      'Seguimiento post-entrega de unidades. Encuestas de satisfacción, gestión de garantías en coordinación con Servicios, y retención de clientes.',
    requisitos_experiencia: '2-4 años en atención al cliente o postventa',
    requisitos_formacion: 'Técnico o Licenciatura en Administración',
    departamento_id: 'dept_agro_ventas',
    reporta_a_id: 'puesto_agro_gerente_ventas',
    nivel: 'operativo',
    is_active: true,
  },
  // ── Repuestos ──
  {
    id: 'puesto_agro_gerente_repuestos',
    nombre: 'Gerente de Repuestos',
    descripcion_responsabilidades:
      'Gestión del área de repuestos: stock, pedidos a CNH, precios, atención a taller y clientes. Define política de inventario y metas de venta del área.',
    requisitos_experiencia: '5+ años en repuestos de maquinaria agrícola o automotriz',
    requisitos_formacion: 'Técnico mecánico o Licenciatura en Logística/Adm',
    departamento_id: 'dept_agro_repuestos',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'gerencial',
    is_active: true,
  },
  {
    id: 'puesto_agro_vendedor_repuestos',
    nombre: 'Vendedor de Repuestos (Mostrador)',
    descripcion_responsabilidades:
      'Atención en mostrador, identificación de repuestos en catálogos CASE, cotizaciones, facturación y coordinación con almacenes para la entrega.',
    requisitos_experiencia: '1-3 años en repuestos de maquinaria o automotriz',
    requisitos_formacion: 'Secundario técnico o Técnico en Mecánica',
    departamento_id: 'dept_agro_repuestos',
    reporta_a_id: 'puesto_agro_gerente_repuestos',
    nivel: 'operativo',
    is_active: true,
  },
  {
    id: 'puesto_agro_repositor_repuestos',
    nombre: 'Repositor de Repuestos',
    descripcion_responsabilidades:
      'Ingreso y control de mercadería de repuestos, organización del depósito, preparación de pedidos para mostrador y taller.',
    requisitos_experiencia: 'Sin experiencia previa requerida',
    requisitos_formacion: 'Secundario completo',
    departamento_id: 'dept_agro_repuestos',
    reporta_a_id: 'puesto_agro_gerente_repuestos',
    nivel: 'operativo',
    is_active: true,
  },
  // ── Servicios Técnicos ──
  {
    id: 'puesto_agro_gerente_servicios',
    nombre: 'Gerente de Servicios',
    descripcion_responsabilidades:
      'Conducción del taller. Define capacidad, asigna recursos, gestiona garantías CASE, planifica capacitaciones técnicas y mide KPIs del área (OT completadas, tiempo promedio, satisfacción).',
    requisitos_experiencia: '7+ años en taller de maquinaria, preferible CASE/CNH',
    requisitos_formacion: 'Ingeniería Mecánica o Técnico Superior en Mecánica/Electrónica',
    departamento_id: 'dept_agro_servicios',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'gerencial',
    is_active: true,
  },
  {
    id: 'puesto_agro_jefe_taller',
    nombre: 'Jefe de Taller',
    descripcion_responsabilidades:
      'Supervisión diaria del taller. Apertura y seguimiento de órdenes de trabajo, asignación de técnicos, control de tiempos y calidad de las reparaciones.',
    requisitos_experiencia: '4-6 años en taller de maquinaria agrícola',
    requisitos_formacion: 'Técnico en Mecánica o Electrónica',
    departamento_id: 'dept_agro_servicios',
    reporta_a_id: 'puesto_agro_gerente_servicios',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_tecnico_especialista',
    nombre: 'Técnico Especialista CASE',
    descripcion_responsabilidades:
      'Diagnóstico y reparación de sistemas complejos (electrónica, hidráulica, AFS/Precision Farming). Realiza servicio en campo y atención de garantías.',
    requisitos_experiencia: '5+ años en maquinaria CASE IH o CNH. Certificación CNH requerida.',
    requisitos_formacion: 'Técnico en Mecánica, Electrónica o Mecatrónica',
    departamento_id: 'dept_agro_servicios',
    reporta_a_id: 'puesto_agro_jefe_taller',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_tecnico_mecanico',
    nombre: 'Técnico Mecánico',
    descripcion_responsabilidades:
      'Mantenimiento preventivo y reparaciones generales de maquinaria agrícola (motor, transmisión, sistema hidráulico). Asiste a técnico especialista en trabajos complejos.',
    requisitos_experiencia: '2-4 años en taller mecánico',
    requisitos_formacion: 'Técnico en Mecánica o Técnico Agropecuario',
    departamento_id: 'dept_agro_servicios',
    reporta_a_id: 'puesto_agro_jefe_taller',
    nivel: 'operativo',
    is_active: true,
  },
  {
    id: 'puesto_agro_recepcionista_ot',
    nombre: 'Recepcionista de Órdenes de Trabajo',
    descripcion_responsabilidades:
      'Recepción de maquinaria en taller, apertura de OT, comunicación con clientes sobre estado de los trabajos y coordinación de turnos de servicio.',
    requisitos_experiencia: '1-2 años en atención al cliente o administración',
    requisitos_formacion: 'Secundario completo. Deseable Técnico en Administración.',
    departamento_id: 'dept_agro_servicios',
    reporta_a_id: 'puesto_agro_jefe_taller',
    nivel: 'operativo',
    is_active: true,
  },
  // ── Calidad ──
  {
    id: 'puesto_agro_responsable_calidad',
    nombre: 'Responsable de Calidad (ISO 9001)',
    descripcion_responsabilidades:
      'Implementación y mantenimiento del SGC ISO 9001. Realiza auditorías internas, gestiona no conformidades, acciones correctivas y coordina la revisión por la dirección.',
    requisitos_experiencia: '4+ años en sistemas de gestión de calidad',
    requisitos_formacion: 'Licenciatura en Calidad, Ingeniería o afín. Auditor interno ISO 9001.',
    departamento_id: 'dept_agro_calidad',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'tecnico',
    is_active: true,
  },
  // ── Compras ──
  {
    id: 'puesto_agro_jefe_compras',
    nombre: 'Jefe de Compras',
    descripcion_responsabilidades:
      'Gestión de compras de repuestos, insumos y servicios. Negociación con proveedores nacionales e internacionales. Homologación de proveedores según ISO 9001.',
    requisitos_experiencia: '4+ años en compras industriales o agro',
    requisitos_formacion: 'Licenciatura en Administración, Logística o Ingeniería',
    departamento_id: 'dept_agro_compras',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_comprador',
    nombre: 'Comprador',
    descripcion_responsabilidades:
      'Emisión de órdenes de compra, seguimiento de pedidos, recepción administrativa de mercadería y actualización del sistema de stock.',
    requisitos_experiencia: '1-3 años en compras o administración',
    requisitos_formacion: 'Técnico en Administración o Logística',
    departamento_id: 'dept_agro_compras',
    reporta_a_id: 'puesto_agro_jefe_compras',
    nivel: 'operativo',
    is_active: true,
  },
  // ── Almacenes ──
  {
    id: 'puesto_agro_jefe_almacen',
    nombre: 'Jefe de Almacén',
    descripcion_responsabilidades:
      'Control integral del depósito: ingresos, egresos, inventarios cíclicos y anuales, organización del espacio y cumplimiento de procedimientos de almacenamiento.',
    requisitos_experiencia: '3-5 años en almacenes o depósitos industriales',
    requisitos_formacion: 'Técnico en Logística o Administración',
    departamento_id: 'dept_agro_almacenes',
    reporta_a_id: 'puesto_agro_jefe_compras',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_operario_deposito',
    nombre: 'Operario de Depósito',
    descripcion_responsabilidades:
      'Recepción física de mercadería, ubicación en racks, preparación de pedidos para el mostrador y el taller, y manejo de equipo de elevación (autoelevador).',
    requisitos_experiencia: 'Sin experiencia previa. Se capacita en puesto.',
    requisitos_formacion: 'Secundario completo. Licencia de conducir autoelevador (deseable).',
    departamento_id: 'dept_agro_almacenes',
    reporta_a_id: 'puesto_agro_jefe_almacen',
    nivel: 'operativo',
    is_active: true,
  },
  // ── Administración ──
  {
    id: 'puesto_agro_administrador',
    nombre: 'Administrador General',
    descripcion_responsabilidades:
      'Supervisión de contabilidad, tesorería, liquidación de sueldos y cumplimiento impositivo. Reporta resultados financieros a la Dirección.',
    requisitos_experiencia: '5+ años en administración contable-financiera',
    requisitos_formacion: 'Contador Público o Licenciatura en Administración',
    departamento_id: 'dept_agro_admin',
    reporta_a_id: 'puesto_agro_gerente_general',
    nivel: 'gerencial',
    is_active: true,
  },
  {
    id: 'puesto_agro_contador',
    nombre: 'Contador',
    descripcion_responsabilidades:
      'Registración contable, liquidación de impuestos (IVA, Ganancias, Ingresos Brutos), cuentas a pagar y cobrar, y cierre mensual.',
    requisitos_experiencia: '2-4 años en estudio contable o empresa',
    requisitos_formacion: 'Contador Público (matrícula activa)',
    departamento_id: 'dept_agro_admin',
    reporta_a_id: 'puesto_agro_administrador',
    nivel: 'tecnico',
    is_active: true,
  },
  {
    id: 'puesto_agro_cajero',
    nombre: 'Cajero / Tesorero',
    descripcion_responsabilidades:
      'Manejo de caja chica, cobranzas de mostrador, pagos a proveedores, conciliación bancaria y archivo de comprobantes.',
    requisitos_experiencia: '1-2 años en tesorería o caja',
    requisitos_formacion: 'Técnico en Administración',
    departamento_id: 'dept_agro_admin',
    reporta_a_id: 'puesto_agro_administrador',
    nivel: 'operativo',
    is_active: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return Timestamp.now();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedDepartamentos(db: ReturnType<typeof getFirestore>) {
  console.log('\n📁 Insertando departamentos...');
  const batch = db.batch();
  const col = db.collection('organizations').doc(ORG_ID).collection('departments');

  for (const dept of DEPARTAMENTOS) {
    const ref = col.doc(dept.id);
    batch.set(ref, {
      ...dept,
      organization_id: ORG_ID,
      created_at: now(),
      updated_at: now(),
    }, { merge: true });
    console.log(`  → ${dept.nombre}`);
  }

  await batch.commit();
  console.log(`✅ ${DEPARTAMENTOS.length} departamentos creados`);
}

async function seedPuestos(db: ReturnType<typeof getFirestore>) {
  console.log('\n👔 Insertando puestos...');
  const batch = db.batch();
  const col = db.collection('organizations').doc(ORG_ID).collection('positions');

  for (const puesto of PUESTOS) {
    const ref = col.doc(puesto.id);
    batch.set(ref, {
      ...puesto,
      organization_id: ORG_ID,
      created_at: now(),
      updated_at: now(),
    }, { merge: true });
    console.log(`  → ${puesto.nombre} (${puesto.departamento_id.replace('dept_agro_', '')})`);
  }

  await batch.commit();
  console.log(`✅ ${PUESTOS.length} puestos creados`);
}

async function main() {
  console.log('\n🚀 Seed Agro Bicufa — PARTE 1: Departamentos y Puestos\n');
  console.log(`   Organización: ${ORG_ID}`);
  initAdmin();
  const db = getFirestore();

  await seedDepartamentos(db);
  await seedPuestos(db);

  console.log('\n🎉 Parte 1 completada!');
  console.log(`\n   Resumen:`);
  console.log(`   • ${DEPARTAMENTOS.length} departamentos`);
  console.log(`   • ${PUESTOS.length} puestos`);
  console.log(`\n   Colecciones en Firestore:`);
  console.log(`   • organizations/${ORG_ID}/departments`);
  console.log(`   • organizations/${ORG_ID}/positions`);
  console.log(`\n   Siguiente paso: ejecutar seed-agrobiciufa-parte2-personal.ts\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
