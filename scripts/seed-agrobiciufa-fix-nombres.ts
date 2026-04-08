import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs'; import * as path from 'path';

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
}

// Mapa id → nombre de puesto y departamento (strings que espera el componente)
const FIXES: Record<string, { puesto: string; departamento: string }> = {
  per_agro_001: { puesto: 'Gerente General',                    departamento: 'Dirección General' },
  per_agro_002: { puesto: 'Gerente de Ventas',                  departamento: 'Ventas y Comercial' },
  per_agro_003: { puesto: 'Asesor Comercial Senior',            departamento: 'Ventas y Comercial' },
  per_agro_004: { puesto: 'Asesor Comercial',                   departamento: 'Ventas y Comercial' },
  per_agro_005: { puesto: 'Asesor Comercial',                   departamento: 'Ventas y Comercial' },
  per_agro_006: { puesto: 'Coordinador de Postventa',           departamento: 'Ventas y Comercial' },
  per_agro_007: { puesto: 'Gerente de Repuestos',               departamento: 'Repuestos' },
  per_agro_008: { puesto: 'Vendedor de Repuestos (Mostrador)',   departamento: 'Repuestos' },
  per_agro_009: { puesto: 'Repositor de Repuestos',             departamento: 'Repuestos' },
  per_agro_010: { puesto: 'Gerente de Servicios',               departamento: 'Servicios Técnicos' },
  per_agro_011: { puesto: 'Jefe de Taller',                     departamento: 'Servicios Técnicos' },
  per_agro_012: { puesto: 'Técnico Especialista CASE',          departamento: 'Servicios Técnicos' },
  per_agro_013: { puesto: 'Técnico Mecánico',                   departamento: 'Servicios Técnicos' },
  per_agro_014: { puesto: 'Recepcionista de Órdenes de Trabajo', departamento: 'Servicios Técnicos' },
  per_agro_015: { puesto: 'Responsable de Calidad (ISO 9001)',  departamento: 'Calidad' },
  per_agro_016: { puesto: 'Jefe de Compras',                    departamento: 'Compras y Abastecimiento' },
  per_agro_017: { puesto: 'Comprador',                          departamento: 'Compras y Abastecimiento' },
  per_agro_018: { puesto: 'Jefe de Almacén',                    departamento: 'Almacenes e Inventario' },
  per_agro_019: { puesto: 'Operario de Depósito',               departamento: 'Almacenes e Inventario' },
  per_agro_020: { puesto: 'Administrador General',              departamento: 'Administración y Finanzas' },
};

async function main() {
  console.log('\n🔧 Fix personal — agregando campos "puesto" y "departamento" (texto)\n');
  initAdmin();
  const db = getFirestore();
  const batch = db.batch();
  const now = Timestamp.now();
  for (const [id, data] of Object.entries(FIXES)) {
    batch.update(db.collection('personnel').doc(id), {
      puesto: data.puesto,
      departamento: data.departamento,
      updated_at: now,
    });
    console.log(`  ✓ [${id}] ${data.puesto} — ${data.departamento}`);
  }
  await batch.commit();
  console.log(`\n✅ ${Object.keys(FIXES).length} empleados actualizados con puesto y departamento\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e); process.exit(1); });
