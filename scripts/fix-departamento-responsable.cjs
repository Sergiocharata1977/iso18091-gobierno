/**
 * fix-departamento-responsable.cjs
 * Actualiza departamento_responsable_id en los procesos de org_agrobiciufa
 * para que Mi Departamento muestre los procesos correctamente.
 */
const admin = require('firebase-admin')
const path = require('path')
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(path.join(__dirname, '..', 'service-account.json')) })
}
const db = admin.firestore()

const ORG = 'org_agrobiciufa'
const DEPT_GERENCIA_ID = '8oIecR7gi3hebGQo5SHe'
const DEPT_GERENCIA_NOMBRE = 'Gerencia General'
const now = admin.firestore.FieldValue.serverTimestamp()

// Mapa: código de proceso → departamento responsable
// Si no está en el mapa → va a Gerencia General (responsabilidad transversal)
const DEPT_MAP = {
  // Gerencia General (estratégicos / transversales)
  'PRO-CAL-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-NC-001':  { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-OBJ-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-DOC-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-INF-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-RRHH-001':{ id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-FIN-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  // Operativos — también a Gerencia General por ahora
  // (cuando haya subdepartamentos se reasignan)
  'PRO-VEN-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-MKT-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-SER-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-GAR-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-REP-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-ALM-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-POS-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
  'PRO-COM-001': { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE },
}

async function main() {
  console.log('=== Fix departamento_responsable_id ===\n')

  const snap = await db.collection('processDefinitions')
    .where('organization_id', '==', ORG)
    .get()

  console.log(`Procesos encontrados: ${snap.size}`)

  const batch = db.batch()
  let updated = 0
  let skipped = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const codigo = data.codigo || data.process_code || ''

    const dept = DEPT_MAP[codigo] || { id: DEPT_GERENCIA_ID, nombre: DEPT_GERENCIA_NOMBRE }

    if (data.departamento_responsable_id === dept.id) {
      console.log(`  = Ya OK: ${codigo} → ${dept.nombre}`)
      skipped++
      continue
    }

    batch.update(doc.ref, {
      departamento_responsable_id: dept.id,
      departamento_responsable_nombre: dept.nombre,
      updatedAt: now,
    })
    console.log(`  ✓ Update: ${codigo} → ${dept.nombre}`)
    updated++
  }

  if (updated > 0) {
    await batch.commit()
    console.log(`\n✅ ${updated} procesos actualizados, ${skipped} ya estaban correctos.`)
  } else {
    console.log('\n✅ Todos los procesos ya estaban correctos.')
  }

  process.exit(0)
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
