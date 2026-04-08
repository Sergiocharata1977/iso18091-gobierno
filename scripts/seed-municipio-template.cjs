/**
 * seed-municipio-template.cjs
 *
 * Inicializa el contexto base de un municipio (edition=government):
 * crea 4 departamentos y 3 servicios en service_catalog si no existen.
 *
 * Uso:
 *   node scripts/seed-municipio-template.cjs <organization_id>
 *
 * Ejemplo:
 *   node scripts/seed-municipio-template.cjs org_municipio_test
 */

const path = require('path')

// Cargar .env.local si existe
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
} catch {
  // dotenv no instalado o .env.local ausente — continuar
}

const admin = require('firebase-admin')

function initAdmin() {
  if (admin.apps.length > 0) return

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const saPath = path.join(__dirname, '..', 'service-account.json')
  const fs = require('fs')

  if (credPath && fs.existsSync(credPath)) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  } else if (fs.existsSync(saPath)) {
    admin.initializeApp({ credential: admin.credential.cert(saPath) })
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'No se encontró credencial de Firebase. ' +
        'Proporciona service-account.json, GOOGLE_APPLICATION_CREDENTIALS, ' +
        'o las variables FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.'
      )
    }
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    })
  }
}

const DEPARTAMENTOS_BASE = [
  { nombre: 'Intendencia', codigo: 'INT', tipo: 'direccion' },
  { nombre: 'Secretaría de Hacienda', codigo: 'HAC', tipo: 'secretaria' },
  { nombre: 'Secretaría de Obras Públicas', codigo: 'OBR', tipo: 'secretaria' },
  { nombre: 'Secretaría de Servicios Urbanos', codigo: 'URB', tipo: 'secretaria' },
]

const SERVICIOS_BASE = [
  {
    nombre: 'Habilitación comercial',
    descripcion: 'Trámite de habilitación de local comercial en el municipio.',
    canal_atencion: ['presencial', 'web'],
    sla_horas: 72,
    area_responsable: 'Secretaría de Hacienda',
  },
  {
    nombre: 'Libre deuda municipal',
    descripcion: 'Certificado de libre deuda de tasas y tributos municipales.',
    canal_atencion: ['presencial', 'web', 'email'],
    sla_horas: 24,
    area_responsable: 'Secretaría de Hacienda',
  },
  {
    nombre: 'Solicitud de obra en vía pública',
    descripcion: 'Permiso y gestión de obras o intervenciones en la vía pública.',
    canal_atencion: ['presencial', 'web'],
    sla_horas: 168,
    area_responsable: 'Secretaría de Obras Públicas',
  },
]

/**
 * Inicializa el template base de un municipio.
 * @param {string} organizationId
 * @returns {Promise<{ departments: number, services: number }>}
 */
async function seedMunicipioTemplate(organizationId) {
  initAdmin()
  const db = admin.firestore()
  const now = admin.firestore.FieldValue.serverTimestamp()

  // Verificar que la org existe y tiene edition=government
  const orgDoc = await db.collection('organizations').doc(organizationId).get()
  if (!orgDoc.exists) {
    throw new Error(`Organización no encontrada: ${organizationId}`)
  }
  const orgData = orgDoc.data() || {}
  if (orgData.edition !== 'government') {
    throw new Error(
      `La organización "${organizationId}" tiene edition="${orgData.edition || '(sin valor)'}". Se requiere edition=government.`
    )
  }

  console.log(`\nOrg: ${organizationId}  edition=${orgData.edition}`)

  // ── Departamentos ─────────────────────────────────────────────────────────
  console.log('\n1. Departamentos...')
  const existingDeptsSnap = await db
    .collection('departments')
    .where('organization_id', '==', organizationId)
    .limit(1)
    .get()

  let createdDepartments = 0

  if (!existingDeptsSnap.empty) {
    console.log('  - Ya existen departamentos. Se omite la creación.')
  } else {
    for (const dept of DEPARTAMENTOS_BASE) {
      const ref = await db.collection('departments').add({
        nombre: dept.nombre,
        name: dept.nombre,
        codigo: dept.codigo,
        tipo: dept.tipo,
        organization_id: organizationId,
        activo: true,
        isActive: true,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      console.log(`  + ${ref.id} — ${dept.nombre}`)
      createdDepartments++
    }
  }

  // ── Catálogo de servicios ─────────────────────────────────────────────────
  console.log('\n2. Catálogo de servicios...')
  const existingServicesSnap = await db
    .collection('service_catalog')
    .where('organization_id', '==', organizationId)
    .limit(1)
    .get()

  let createdServices = 0

  if (!existingServicesSnap.empty) {
    console.log('  - Ya existen servicios en service_catalog. Se omite la creación.')
  } else {
    for (const svc of SERVICIOS_BASE) {
      const ref = await db.collection('service_catalog').add({
        nombre: svc.nombre,
        descripcion: svc.descripcion,
        canal_atencion: svc.canal_atencion,
        sla_horas: svc.sla_horas,
        area_responsable: svc.area_responsable,
        organization_id: organizationId,
        activo: true,
        estado: 'activo',
        createdAt: now,
        updatedAt: now,
      })
      console.log(`  + ${ref.id} — ${svc.nombre}`)
      createdServices++
    }
  }

  return { departments: createdDepartments, services: createdServices }
}

async function main() {
  const organizationId = process.argv[2]
  if (!organizationId || !organizationId.trim()) {
    console.error('Uso: node scripts/seed-municipio-template.cjs <organization_id>')
    process.exit(1)
  }

  const result = await seedMunicipioTemplate(organizationId.trim())

  console.log('\nSeed completo:')
  console.log(`  Departamentos creados: ${result.departments}`)
  console.log(`  Servicios creados:     ${result.services}`)
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})

module.exports = { seedMunicipioTemplate }
