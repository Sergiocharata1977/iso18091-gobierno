/**
 * Seed Agro Bicufa — PARTE 2: Personal
 *
 * 20 empleados simulados distribuidos en los 8 departamentos de Agro Bicufa SRL.
 * Referencia los IDs de departamentos y puestos creados en la Parte 1.
 *
 * Uso:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-agrobiciufa-parte2-personal.ts
 *
 * REQUISITO: Ejecutar primero seed-agrobiciufa-parte1-rrhh.ts
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

function ts(date: Date) {
  return Timestamp.fromDate(date);
}
function now() {
  return Timestamp.now();
}

// ─── Personal ─────────────────────────────────────────────────────────────────
// Nombres típicos de la región de Rafaela / Santa Fe (origen italiano/español)
const PERSONAL = [
  // ── Dirección General ──
  {
    id: 'per_agro_001',
    nombres: 'Héctor Domingo',
    apellidos: 'Bicicchi',
    email: 'hector.bicicchi@agrobiciufa.com.ar',
    telefono: '+543492415001',
    documento_identidad: '14500123',
    fecha_nacimiento: ts(new Date('1968-04-10')),
    nacionalidad: 'Argentina',
    direccion: 'Sargento Cabral 345, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2005-03-01')),
    numero_legajo: 'AB-001',
    estado: 'Activo',
    tipo_personal: 'gerencial',
    puesto_id: 'puesto_agro_gerente_general',
    departamento_id: 'dept_agro_direccion',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: null,
  },
  // ── Ventas ──
  {
    id: 'per_agro_002',
    nombres: 'Gustavo Andrés',
    apellidos: 'Maiocchi',
    email: 'gustavo.maiocchi@agrobiciufa.com.ar',
    telefono: '+543492415002',
    documento_identidad: '20881344',
    fecha_nacimiento: ts(new Date('1978-09-22')),
    nacionalidad: 'Argentina',
    direccion: 'Av. Italia 1200, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2011-01-15')),
    numero_legajo: 'AB-002',
    estado: 'Activo',
    tipo_personal: 'gerencial',
    puesto_id: 'puesto_agro_gerente_ventas',
    departamento_id: 'dept_agro_ventas',
    meta_mensual: 3000000,
    comision_porcentaje: 1.5,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
  {
    id: 'per_agro_003',
    nombres: 'Marcelo Fabián',
    apellidos: 'Bertolini',
    email: 'marcelo.bertolini@agrobiciufa.com.ar',
    telefono: '+543492415003',
    documento_identidad: '24112567',
    fecha_nacimiento: ts(new Date('1982-03-15')),
    nacionalidad: 'Argentina',
    direccion: 'Bv. Lehmann 890, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2013-06-01')),
    numero_legajo: 'AB-003',
    estado: 'Activo',
    tipo_personal: 'ventas',
    puesto_id: 'puesto_agro_asesor_comercial_sr',
    departamento_id: 'dept_agro_ventas',
    meta_mensual: 2500000,
    comision_porcentaje: 2,
    tiene_acceso_sistema: true,
    zona_venta: 'Zona Norte — Sunchales / Gálvez',
    supervisor_id: 'per_agro_002',
  },
  {
    id: 'per_agro_004',
    nombres: 'Nicolás Ezequiel',
    apellidos: 'Ravenna',
    email: 'nicolas.ravenna@agrobiciufa.com.ar',
    telefono: '+543492415004',
    documento_identidad: '32540089',
    fecha_nacimiento: ts(new Date('1991-11-28')),
    nacionalidad: 'Argentina',
    direccion: 'Pellegrini 230, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2018-08-01')),
    numero_legajo: 'AB-004',
    estado: 'Activo',
    tipo_personal: 'ventas',
    puesto_id: 'puesto_agro_asesor_comercial',
    departamento_id: 'dept_agro_ventas',
    meta_mensual: 1500000,
    comision_porcentaje: 1.8,
    tiene_acceso_sistema: true,
    zona_venta: 'Zona Sur — Esperanza / San Justo',
    supervisor_id: 'per_agro_002',
  },
  {
    id: 'per_agro_005',
    nombres: 'Florencia Belén',
    apellidos: 'Garello',
    email: 'florencia.garello@agrobiciufa.com.ar',
    telefono: '+543492415005',
    documento_identidad: '34890112',
    fecha_nacimiento: ts(new Date('1993-07-04')),
    nacionalidad: 'Argentina',
    direccion: 'Roque Sáenz Peña 780, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2020-03-01')),
    numero_legajo: 'AB-005',
    estado: 'Activo',
    tipo_personal: 'ventas',
    puesto_id: 'puesto_agro_asesor_comercial',
    departamento_id: 'dept_agro_ventas',
    meta_mensual: 1500000,
    comision_porcentaje: 1.8,
    tiene_acceso_sistema: true,
    zona_venta: 'Zona Central — Rafaela',
    supervisor_id: 'per_agro_002',
  },
  {
    id: 'per_agro_006',
    nombres: 'Valeria Gisela',
    apellidos: 'Cantù',
    email: 'valeria.cantu@agrobiciufa.com.ar',
    telefono: '+543492415006',
    documento_identidad: '30120456',
    fecha_nacimiento: ts(new Date('1988-02-18')),
    nacionalidad: 'Argentina',
    direccion: 'Moreno 455, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2016-05-01')),
    numero_legajo: 'AB-006',
    estado: 'Activo',
    tipo_personal: 'administrativo',
    puesto_id: 'puesto_agro_coordinador_postventa',
    departamento_id: 'dept_agro_ventas',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_002',
  },
  // ── Repuestos ──
  {
    id: 'per_agro_007',
    nombres: 'Roberto Oscar',
    apellidos: 'Faraldo',
    email: 'roberto.faraldo@agrobiciufa.com.ar',
    telefono: '+543492415007',
    documento_identidad: '18770234',
    fecha_nacimiento: ts(new Date('1972-06-30')),
    nacionalidad: 'Argentina',
    direccion: 'Chacabuco 1100, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2008-09-01')),
    numero_legajo: 'AB-007',
    estado: 'Activo',
    tipo_personal: 'gerencial',
    puesto_id: 'puesto_agro_gerente_repuestos',
    departamento_id: 'dept_agro_repuestos',
    meta_mensual: 800000,
    comision_porcentaje: 1,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
  {
    id: 'per_agro_008',
    nombres: 'Diego Ariel',
    apellidos: 'Ghezzi',
    email: 'diego.ghezzi@agrobiciufa.com.ar',
    telefono: '+543492415008',
    documento_identidad: '28330567',
    fecha_nacimiento: ts(new Date('1986-12-05')),
    nacionalidad: 'Argentina',
    direccion: 'España 990, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2014-02-01')),
    numero_legajo: 'AB-008',
    estado: 'Activo',
    tipo_personal: 'ventas',
    puesto_id: 'puesto_agro_vendedor_repuestos',
    departamento_id: 'dept_agro_repuestos',
    meta_mensual: 400000,
    comision_porcentaje: 0.8,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_007',
  },
  {
    id: 'per_agro_009',
    nombres: 'Lautaro Sebastián',
    apellidos: 'Porrini',
    email: 'lautaro.porrini@agrobiciufa.com.ar',
    telefono: '+543492415009',
    documento_identidad: '40220789',
    fecha_nacimiento: ts(new Date('1998-05-12')),
    nacionalidad: 'Argentina',
    direccion: 'San Lorenzo 340, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2022-04-01')),
    numero_legajo: 'AB-009',
    estado: 'Activo',
    tipo_personal: 'operativo' as any,
    puesto_id: 'puesto_agro_repositor_repuestos',
    departamento_id: 'dept_agro_repuestos',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: false,
    zona_venta: null,
    supervisor_id: 'per_agro_007',
  },
  // ── Servicios Técnicos ──
  {
    id: 'per_agro_010',
    nombres: 'Jorge Alfredo',
    apellidos: 'Zanetta',
    email: 'jorge.zanetta@agrobiciufa.com.ar',
    telefono: '+543492415010',
    documento_identidad: '16990344',
    fecha_nacimiento: ts(new Date('1970-01-20')),
    nacionalidad: 'Argentina',
    direccion: 'Lavalle 670, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2007-07-01')),
    numero_legajo: 'AB-010',
    estado: 'Activo',
    tipo_personal: 'gerencial',
    puesto_id: 'puesto_agro_gerente_servicios',
    departamento_id: 'dept_agro_servicios',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
  {
    id: 'per_agro_011',
    nombres: 'Pablo Daniel',
    apellidos: 'Taselli',
    email: 'pablo.taselli@agrobiciufa.com.ar',
    telefono: '+543492415011',
    documento_identidad: '22440678',
    fecha_nacimiento: ts(new Date('1980-08-14')),
    nacionalidad: 'Argentina',
    direccion: 'San Martín 1230, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2010-03-01')),
    numero_legajo: 'AB-011',
    estado: 'Activo',
    tipo_personal: 'tecnico' as any,
    puesto_id: 'puesto_agro_jefe_taller',
    departamento_id: 'dept_agro_servicios',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_010',
  },
  {
    id: 'per_agro_012',
    nombres: 'Fernando Luis',
    apellidos: 'Bonansea',
    email: 'fernando.bonansea@agrobiciufa.com.ar',
    telefono: '+543492415012',
    documento_identidad: '25660901',
    fecha_nacimiento: ts(new Date('1984-04-25')),
    nacionalidad: 'Argentina',
    direccion: 'Colón 450, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2012-01-01')),
    numero_legajo: 'AB-012',
    estado: 'Activo',
    tipo_personal: 'técnico',
    puesto_id: 'puesto_agro_tecnico_especialista',
    departamento_id: 'dept_agro_servicios',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_011',
  },
  {
    id: 'per_agro_013',
    nombres: 'Mauro Ezequiel',
    apellidos: 'Rosciani',
    email: 'mauro.rosciani@agrobiciufa.com.ar',
    telefono: '+543492415013',
    documento_identidad: '35110234',
    fecha_nacimiento: ts(new Date('1994-10-09')),
    nacionalidad: 'Argentina',
    direccion: 'Mitre 780, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2019-01-15')),
    numero_legajo: 'AB-013',
    estado: 'Activo',
    tipo_personal: 'técnico',
    puesto_id: 'puesto_agro_tecnico_mecanico',
    departamento_id: 'dept_agro_servicios',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: false,
    zona_venta: null,
    supervisor_id: 'per_agro_011',
  },
  {
    id: 'per_agro_014',
    nombres: 'Brenda Soledad',
    apellidos: 'Parisi',
    email: 'brenda.parisi@agrobiciufa.com.ar',
    telefono: '+543492415014',
    documento_identidad: '38990567',
    fecha_nacimiento: ts(new Date('1997-03-30')),
    nacionalidad: 'Argentina',
    direccion: 'Córdoba 310, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2021-09-01')),
    numero_legajo: 'AB-014',
    estado: 'Activo',
    tipo_personal: 'administrativo',
    puesto_id: 'puesto_agro_recepcionista_ot',
    departamento_id: 'dept_agro_servicios',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_011',
  },
  // ── Calidad ──
  {
    id: 'per_agro_015',
    nombres: 'Claudia Beatriz',
    apellidos: 'Volpato',
    email: 'claudia.volpato@agrobiciufa.com.ar',
    telefono: '+543492415015',
    documento_identidad: '22100890',
    fecha_nacimiento: ts(new Date('1980-11-15')),
    nacionalidad: 'Argentina',
    direccion: 'Bv. Santa Fe 1560, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2015-03-01')),
    numero_legajo: 'AB-015',
    estado: 'Activo',
    tipo_personal: 'técnico',
    puesto_id: 'puesto_agro_responsable_calidad',
    departamento_id: 'dept_agro_calidad',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
  // ── Compras ──
  {
    id: 'per_agro_016',
    nombres: 'Ariel Marcelo',
    apellidos: 'Pagliaro',
    email: 'ariel.pagliaro@agrobiciufa.com.ar',
    telefono: '+543492415016',
    documento_identidad: '21880123',
    fecha_nacimiento: ts(new Date('1979-07-22')),
    nacionalidad: 'Argentina',
    direccion: 'Sarmiento 900, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2009-05-01')),
    numero_legajo: 'AB-016',
    estado: 'Activo',
    tipo_personal: 'técnico',
    puesto_id: 'puesto_agro_jefe_compras',
    departamento_id: 'dept_agro_compras',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
  {
    id: 'per_agro_017',
    nombres: 'Jimena Rocío',
    apellidos: 'Ferrero',
    email: 'jimena.ferrero@agrobiciufa.com.ar',
    telefono: '+543492415017',
    documento_identidad: '36550456',
    fecha_nacimiento: ts(new Date('1995-09-08')),
    nacionalidad: 'Argentina',
    direccion: 'Independencia 550, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2021-04-01')),
    numero_legajo: 'AB-017',
    estado: 'Activo',
    tipo_personal: 'administrativo',
    puesto_id: 'puesto_agro_comprador',
    departamento_id: 'dept_agro_compras',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_016',
  },
  // ── Almacenes ──
  {
    id: 'per_agro_018',
    nombres: 'Luis Alberto',
    apellidos: 'Tosello',
    email: 'luis.tosello@agrobiciufa.com.ar',
    telefono: '+543492415018',
    documento_identidad: '19770789',
    fecha_nacimiento: ts(new Date('1974-12-03')),
    nacionalidad: 'Argentina',
    direccion: 'Av. 9 de Julio 1800, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2010-08-01')),
    numero_legajo: 'AB-018',
    estado: 'Activo',
    tipo_personal: 'técnico',
    puesto_id: 'puesto_agro_jefe_almacen',
    departamento_id: 'dept_agro_almacenes',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_016',
  },
  {
    id: 'per_agro_019',
    nombres: 'Agustín Leandro',
    apellidos: 'Pistarino',
    email: 'agustin.pistarino@agrobiciufa.com.ar',
    telefono: '+543492415019',
    documento_identidad: '42110012',
    fecha_nacimiento: ts(new Date('2000-02-17')),
    nacionalidad: 'Argentina',
    direccion: 'Tucumán 660, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2023-03-01')),
    numero_legajo: 'AB-019',
    estado: 'Activo',
    tipo_personal: 'operativo' as any,
    puesto_id: 'puesto_agro_operario_deposito',
    departamento_id: 'dept_agro_almacenes',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: false,
    zona_venta: null,
    supervisor_id: 'per_agro_018',
  },
  // ── Administración y Finanzas ──
  {
    id: 'per_agro_020',
    nombres: 'María Cristina',
    apellidos: 'Bellora',
    email: 'cristina.bellora@agrobiciufa.com.ar',
    telefono: '+543492415020',
    documento_identidad: '17440345',
    fecha_nacimiento: ts(new Date('1971-05-25')),
    nacionalidad: 'Argentina',
    direccion: 'Alberdi 1340, Rafaela, Santa Fe',
    fecha_contratacion: ts(new Date('2006-02-01')),
    numero_legajo: 'AB-020',
    estado: 'Activo',
    tipo_personal: 'gerencial',
    puesto_id: 'puesto_agro_administrador',
    departamento_id: 'dept_agro_admin',
    meta_mensual: 0,
    comision_porcentaje: 0,
    tiene_acceso_sistema: true,
    zona_venta: null,
    supervisor_id: 'per_agro_001',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedPersonal(db: ReturnType<typeof getFirestore>) {
  console.log('\n👥 Insertando personal...');
  const col = db.collection('organizations').doc(ORG_ID).collection('personnel');

  // Usamos batches de 10 (límite de Firestore es 500 ops pero mejor dividir)
  const BATCH_SIZE = 10;
  for (let i = 0; i < PERSONAL.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = PERSONAL.slice(i, i + BATCH_SIZE);
    for (const persona of chunk) {
      const ref = col.doc(persona.id);
      batch.set(ref, {
        ...persona,
        organization_id: ORG_ID,
        created_at: now(),
        updated_at: now(),
      }, { merge: true });
      console.log(`  → [${persona.numero_legajo}] ${persona.nombres} ${persona.apellidos} — ${persona.puesto_id.replace('puesto_agro_', '')}`);
    }
    await batch.commit();
  }
  console.log(`✅ ${PERSONAL.length} empleados creados`);
}

async function main() {
  console.log('\n🚀 Seed Agro Bicufa — PARTE 2: Personal\n');
  console.log(`   Organización: ${ORG_ID}`);
  initAdmin();
  const db = getFirestore();

  await seedPersonal(db);

  console.log('\n🎉 Parte 2 completada!');
  console.log('\n   Distribución por departamento:');
  const depts: Record<string, number> = {};
  PERSONAL.forEach(p => {
    const dept = p.departamento_id.replace('dept_agro_', '');
    depts[dept] = (depts[dept] || 0) + 1;
  });
  Object.entries(depts).forEach(([d, n]) => console.log(`   • ${d}: ${n} personas`));
  console.log(`\n   Total: ${PERSONAL.length} empleados`);
  console.log(`   Colección: organizations/${ORG_ID}/personnel`);
  console.log('\n   Siguiente paso: ejecutar seed-agrobiciufa-parte3-procesos.ts\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
