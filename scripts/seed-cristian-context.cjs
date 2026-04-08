/**
 * seed-cristian-context.cjs
 * Seed processes, objectives and indicators for Cristian Stach (org.agrobiciufa)
 * Run: node scripts/seed-cristian-context.cjs
 */

const admin = require('firebase-admin')
const path = require('path')

const SA_PATH = path.join(__dirname, '..', 'service-account.json')
admin.initializeApp({ credential: admin.credential.cert(SA_PATH) })

const db = admin.firestore()

const ORG_ID = 'org.agrobiciufa'
const TARGET_UID = 'I3SGDg0nQcPf3pIC8Ha3'
const now = admin.firestore.FieldValue.serverTimestamp()

// ── Processes ────────────────────────────────────────────────────────────────
const PROCESSES = [
  {
    codigo: 'COM-001',
    nombre: 'Gestión Comercial y Ventas',
    descripcion: 'Proceso de captación de clientes, cotización y cierre de ventas de maquinaria CASE y Agrobiciufa.',
    tipo: 'estrategico',
  },
  {
    codigo: 'REP-001',
    nombre: 'Gestión de Repuestos',
    descripcion: 'Proceso de recepción, almacenamiento, picking y despacho de repuestos de equipos agrícolas.',
    tipo: 'operativo',
  },
  {
    codigo: 'SRV-001',
    nombre: 'Servicio Técnico',
    descripcion: 'Proceso de diagnóstico, reparación y mantenimiento preventivo/correctivo de maquinaria.',
    tipo: 'operativo',
  },
  {
    codigo: 'CLI-001',
    nombre: 'Atención al Cliente',
    descripcion: 'Proceso de gestión de consultas, reclamos y postventa de clientes.',
    tipo: 'apoyo',
  },
  {
    codigo: 'FIN-001',
    nombre: 'Gestión Financiera',
    descripcion: 'Proceso de facturación, cobranzas, pagos y reportes financieros del concesionario.',
    tipo: 'apoyo',
  },
  {
    codigo: 'CAL-001',
    nombre: 'Gestión de Calidad ISO 9001',
    descripcion: 'Proceso de mantenimiento del SGC: auditorías internas, no conformidades y mejora continua.',
    tipo: 'estrategico',
  },
]

// ── Objectives ───────────────────────────────────────────────────────────────
const OBJECTIVES = [
  {
    codigo: 'OBJ-001',
    nombre: 'NPS Postventa ≥ 70',
    descripcion: 'Mantener un Net Promoter Score de clientes postventa igual o superior a 70 puntos.',
    meta: 70,
    unidad: 'puntos NPS',
  },
  {
    codigo: 'OBJ-002',
    nombre: 'Tiempo de resolución de servicio técnico ≤ 48 hs',
    descripcion: 'Resolver el 80% de los pedidos de servicio técnico en menos de 48 horas hábiles.',
    meta: 48,
    unidad: 'horas',
  },
  {
    codigo: 'OBJ-003',
    nombre: 'Fill rate de repuestos ≥ 85%',
    descripcion: 'Mantener disponibilidad inmediata de repuestos solicitados por encima del 85%.',
    meta: 85,
    unidad: '%',
  },
  {
    codigo: 'OBJ-004',
    nombre: 'Auditorías internas al 100%',
    descripcion: 'Ejecutar el 100% de las auditorías internas planificadas en el año.',
    meta: 100,
    unidad: '%',
  },
]

// ── Indicators ───────────────────────────────────────────────────────────────
const INDICATORS = [
  {
    codigo: 'IND-001',
    nombre: 'NPS Postventa',
    descripcion: 'Net Promoter Score calculado sobre encuestas de satisfacción postventa.',
    formula: 'Promotores(%) - Detractores(%)',
    frecuencia: 'mensual',
    proceso_codigo: 'CLI-001',
  },
  {
    codigo: 'IND-002',
    nombre: 'Tiempo promedio de resolución de servicio',
    descripcion: 'Tiempo promedio en horas hábiles desde la apertura hasta el cierre del pedido de servicio.',
    formula: 'Σ(horas cierre - horas apertura) / N pedidos',
    frecuencia: 'mensual',
    proceso_codigo: 'SRV-001',
  },
  {
    codigo: 'IND-003',
    nombre: 'Fill Rate de Repuestos',
    descripcion: 'Porcentaje de solicitudes de repuestos atendidas desde stock en el momento de la solicitud.',
    formula: 'Solicitudes atendidas / Solicitudes totales × 100',
    frecuencia: 'mensual',
    proceso_codigo: 'REP-001',
  },
  {
    codigo: 'IND-004',
    nombre: 'Tasa de cierre de ventas',
    descripcion: 'Porcentaje de cotizaciones que culminan en venta efectiva.',
    formula: 'Ventas cerradas / Cotizaciones emitidas × 100',
    frecuencia: 'mensual',
    proceso_codigo: 'COM-001',
  },
  {
    codigo: 'IND-005',
    nombre: '% de cartera en mora',
    descripcion: 'Porcentaje del saldo de cartera con más de 30 días de atraso.',
    formula: 'Saldo mora / Saldo total × 100',
    frecuencia: 'mensual',
    proceso_codigo: 'FIN-001',
  },
  {
    codigo: 'IND-006',
    nombre: '% NC cerradas en tiempo',
    descripcion: 'Porcentaje de no conformidades cerradas dentro del plazo definido.',
    formula: 'NC cerradas en plazo / NC totales abiertas × 100',
    frecuencia: 'trimestral',
    proceso_codigo: 'CAL-001',
  },
]

async function findOrCreate(collection, queryFn, createData) {
  const snapshot = await queryFn()
  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    console.log(`  ✓ Ya existe: ${doc.id} — ${createData.nombre || createData.codigo}`)
    return doc.id
  }
  const ref = await db.collection(collection).add({ ...createData, organization_id: ORG_ID, activo: true, isActive: true, createdAt: now, updatedAt: now })
  console.log(`  + Creado: ${ref.id} — ${createData.nombre || createData.codigo}`)
  return ref.id
}

async function main() {
  console.log(`\n🌱 Seed: org=${ORG_ID}  uid=${TARGET_UID}\n`)

  // ── 1. Personnel ─────────────────────────────────────────────────────────
  console.log('1. Buscando personal de Cristian...')
  let personnelId = null
  let personnelRef = null

  const byUid = await db.collection('personnel')
    .where('organization_id', '==', ORG_ID)
    .where('user_id', '==', TARGET_UID)
    .limit(1).get()

  if (!byUid.empty) {
    personnelId = byUid.docs[0].id
    personnelRef = byUid.docs[0].ref
    console.log(`  ✓ Personnel: ${personnelId}`)
  } else {
    // Try by user_id field name variations
    const byUserId = await db.collection('personnel')
      .where('organization_id', '==', ORG_ID)
      .where('uid', '==', TARGET_UID)
      .limit(1).get()
    if (!byUserId.empty) {
      personnelId = byUserId.docs[0].id
      personnelRef = byUserId.docs[0].ref
      console.log(`  ✓ Personnel (by uid): ${personnelId}`)
    } else {
      console.log('  ✗ No se encontró registro de personal — creando...')
      const newPersonnel = await db.collection('personnel').add({
        organization_id: ORG_ID,
        user_id: TARGET_UID,
        uid: TARGET_UID,
        nombres: 'Cristian',
        apellidos: 'Stach',
        email: 'cristian@empresa.com',
        rol: 'gerente',
        activo: true,
        createdAt: now,
        updatedAt: now,
      })
      personnelId = newPersonnel.id
      personnelRef = newPersonnel
      console.log(`  + Personnel creado: ${personnelId}`)
    }
  }

  // ── 2. Department ─────────────────────────────────────────────────────────
  console.log('\n2. Buscando/creando departamento Gerencia General...')
  const deptId = await findOrCreate(
    'departments',
    () => db.collection('departments')
      .where('organization_id', '==', ORG_ID)
      .where('nombre', '==', 'Gerencia General')
      .limit(1).get(),
    {
      nombre: 'Gerencia General',
      name: 'Gerencia General',
      descripcion: 'Departamento de dirección y gerencia general de la organización.',
      description: 'Departamento de dirección y gerencia general de la organización.',
      managerId: TARGET_UID,
      deletedAt: null,
    }
  )

  // ── 3. Processes ──────────────────────────────────────────────────────────
  console.log('\n3. Procesos...')
  const processIds = []
  for (const proc of PROCESSES) {
    const id = await findOrCreate(
      'processDefinitions',
      () => db.collection('processDefinitions')
        .where('organization_id', '==', ORG_ID)
        .where('codigo', '==', proc.codigo)
        .limit(1).get(),
      {
        ...proc,
        status: 'activo',
        departamento_responsable_id: deptId,
        departamento_responsable_nombre: 'Gerencia General',
        process_owner_id: TARGET_UID,
        version: '1.0',
        created_at: now,
        updated_at: now,
      }
    )
    processIds.push(id)
  }

  // ── 4. Objectives ─────────────────────────────────────────────────────────
  console.log('\n4. Objetivos...')
  const objectiveIds = []
  for (const obj of OBJECTIVES) {
    const id = await findOrCreate(
      'qualityObjectives',
      () => db.collection('qualityObjectives')
        .where('organization_id', '==', ORG_ID)
        .where('codigo', '==', obj.codigo)
        .limit(1).get(),
      {
        ...obj,
        estado: 'activo',
        responsable_id: TARGET_UID,
        created_at: now,
        updated_at: now,
      }
    )
    objectiveIds.push(id)
  }

  // ── 5. Indicators ─────────────────────────────────────────────────────────
  console.log('\n5. Indicadores...')
  const indicatorIds = []
  for (const ind of INDICATORS) {
    const procForInd = processIds[PROCESSES.findIndex(p => p.codigo === ind.proceso_codigo)] || processIds[0]
    const { proceso_codigo, ...indData } = ind
    const id = await findOrCreate(
      'qualityIndicators',
      () => db.collection('qualityIndicators')
        .where('organization_id', '==', ORG_ID)
        .where('codigo', '==', ind.codigo)
        .limit(1).get(),
      {
        ...indData,
        proceso_id: procForInd,
        estado: 'activo',
        responsable_id: TARGET_UID,
        created_at: now,
        updated_at: now,
      }
    )
    indicatorIds.push(id)
  }

  // ── 6. Update personnel ───────────────────────────────────────────────────
  console.log('\n6. Actualizando personnel con IDs...')
  await db.collection('personnel').doc(personnelId).update({
    departamento_id: deptId,
    departamento: 'Gerencia General',
    procesos_asignados: processIds,
    objetivos_asignados: objectiveIds,
    indicadores_asignados: indicatorIds,
    updatedAt: now,
  })
  console.log('  ✓ Personnel actualizado')

  console.log('\n✅ Seed completo')
  console.log(`   Dept:        ${deptId}`)
  console.log(`   Procesos:    ${processIds.length} (${processIds.join(', ')})`)
  console.log(`   Objetivos:   ${objectiveIds.length}`)
  console.log(`   Indicadores: ${indicatorIds.length}`)

  process.exit(0)
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
