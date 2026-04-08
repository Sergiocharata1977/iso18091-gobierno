/**
 * fix-cristian-org.cjs
 * - Crea personnel de Cristian en org_agrobiciufa
 * - Le asigna todos los procesos de org_agrobiciufa
 * - Actualiza users doc para apuntar al nuevo personnel_id
 * - Limpia datos incorrectos creados antes (org.agrobiciufa con punto)
 */
const admin = require('firebase-admin')
const path = require('path')
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(path.join(__dirname, '..', 'service-account.json')) })
}
const db = admin.firestore()

const ORG = 'org_agrobiciufa'
const REAL_UID = 'CH2cZHccVVR39MQGlXpaw8S3yNG2'
const now = admin.firestore.FieldValue.serverTimestamp()

// IDs basura a limpiar (organización incorrecta org.agrobiciufa con punto)
const DIRTY_PERSONNEL_ID = 'tuNvfWnIPZqJSFQ3cryx'
const DIRTY_DEPT_ID = 'TeEabyXx6QDuOXhjuPS1'
const DIRTY_PROCESS_IDS = [
  'NC0T15elxNwklOk6B6vj', '4gxaSAfuoKK29lXN1AyL', 'jKUPOKklghpb8TwplVHd',
  '6TTY0OSIpyMcvIAcxgdI', 'eaKEy2oQ0NWZgG5rXDD1', 'zQpJzExlLwMoXZMhWiVH',
]
const DIRTY_OBJECTIVE_IDS = [
  'k1A0aeEJMripFdfvZPk2', 'rCZIEU1cpRbqG6PKSiSe', 'FOle7WqSoEpVlhedMUmX', 'KD3FlfG8LUHpsFztCqAV',
]
const DIRTY_INDICATOR_IDS = [
  'DENRHrQa28HsLwpMurIs', 'TzpMifCy5ldWbvoeMZfg', 'v1U1y1GSRcFKnzEkrE7K',
  'dUJZwKfB14oyzYc0rz3d', 'wIGsGjZarfZeHVwBqPuT', 'AaRQwRxIYkWgQPt8AmaQ',
]

async function main() {
  console.log('=== Fix Cristian Stach → org_agrobiciufa ===\n')

  // ── 1. Obtener todos los procesos de org_agrobiciufa ─────────────────────
  console.log('1. Cargando procesos de org_agrobiciufa...')
  const procsSnap = await db.collection('processDefinitions')
    .where('organization_id', '==', ORG)
    .get()
  const processIds = procsSnap.docs
    .filter(d => d.data().nombre && d.id !== 'k9KJ9k5dMHofLXYnN49c') // excluir QA test
    .map(d => d.id)
  console.log(`  → ${processIds.length} procesos encontrados`)
  procsSnap.docs.forEach(d => {
    if (d.id !== 'k9KJ9k5dMHofLXYnN49c') console.log(`    - ${d.data().codigo} ${d.data().nombre}`)
  })

  // ── 2. Buscar o crear departamento Gerencia General en org_agrobiciufa ───
  console.log('\n2. Departamento Gerencia General...')
  const deptSnap = await db.collection('departments')
    .where('organization_id', '==', ORG)
    .where('nombre', '==', 'Gerencia General')
    .limit(1).get()

  let deptId
  if (!deptSnap.empty) {
    deptId = deptSnap.docs[0].id
    console.log('  ✓ Ya existe:', deptId)
  } else {
    const deptRef = await db.collection('departments').add({
      nombre: 'Gerencia General',
      name: 'Gerencia General',
      descripcion: 'Departamento de dirección y gerencia general del concesionario.',
      description: 'Departamento de dirección y gerencia general del concesionario.',
      organization_id: ORG,
      managerId: REAL_UID,
      isActive: true,
      activo: true,
      createdBy: REAL_UID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    deptId = deptRef.id
    console.log('  + Creado:', deptId)
  }

  // ── 3. Crear personnel de Cristian en org_agrobiciufa ────────────────────
  console.log('\n3. Creando personnel para Cristian en org_agrobiciufa...')
  const existingPersonnel = await db.collection('personnel')
    .where('organization_id', '==', ORG)
    .where('user_id', '==', REAL_UID)
    .limit(1).get()

  let newPersonnelId
  if (!existingPersonnel.empty) {
    newPersonnelId = existingPersonnel.docs[0].id
    console.log('  ✓ Ya existe:', newPersonnelId, '— actualizando...')
    await db.collection('personnel').doc(newPersonnelId).update({
      departamento_id: deptId,
      departamento: 'Gerencia General',
      procesos_asignados: processIds,
      objetivos_asignados: [],
      indicadores_asignados: [],
      updatedAt: now,
    })
  } else {
    const personnelRef = await db.collection('personnel').add({
      organization_id: ORG,
      user_id: REAL_UID,
      uid: REAL_UID,
      nombres: 'Cristian',
      apellidos: 'Stach',
      email: 'cristian@empresa.com',
      rol: 'admin',
      puesto: 'Gerente General',
      puesto_nombre: 'Gerente General',
      departamento_id: deptId,
      departamento: 'Gerencia General',
      departamento_nombre: 'Gerencia General',
      procesos_asignados: processIds,
      objetivos_asignados: [],
      indicadores_asignados: [],
      activo: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    newPersonnelId = personnelRef.id
    console.log('  + Creado:', newPersonnelId)
  }

  // ── 4. Actualizar users document para apuntar al nuevo personnel ──────────
  console.log('\n4. Actualizando users/' + REAL_UID + '...')
  await db.collection('users').doc(REAL_UID).set({
    email: 'cristian@empresa.com',
    rol: 'admin',
    organization_id: ORG,
    personnel_id: newPersonnelId,
    activo: true,
    status: 'active',
    displayName: 'Cristian Stach',
    updatedAt: now,
  }, { merge: true })
  console.log('  ✓ users/' + REAL_UID + ' → personnel_id:', newPersonnelId)

  // ── 5. Limpiar datos incorrectos (org.agrobiciufa con punto) ─────────────
  console.log('\n5. Limpiando datos de org.agrobiciufa (con punto)...')

  const deletions = [
    db.collection('personnel').doc(DIRTY_PERSONNEL_ID).delete(),
    db.collection('departments').doc(DIRTY_DEPT_ID).delete(),
    ...DIRTY_PROCESS_IDS.map(id => db.collection('processDefinitions').doc(id).delete()),
    ...DIRTY_OBJECTIVE_IDS.map(id => db.collection('qualityObjectives').doc(id).delete()),
    ...DIRTY_INDICATOR_IDS.map(id => db.collection('qualityIndicators').doc(id).delete()),
  ]
  await Promise.all(deletions)
  console.log('  ✓', deletions.length, 'documentos eliminados')

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log('\n✅ Listo!')
  console.log('   UID:        ', REAL_UID)
  console.log('   Org:        ', ORG)
  console.log('   PersonnelId:', newPersonnelId)
  console.log('   DeptId:     ', deptId)
  console.log('   Procesos:   ', processIds.length, 'asignados')

  process.exit(0)
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
