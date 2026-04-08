const admin = require('firebase-admin')
const path = require('path')
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(path.join(__dirname, '..', 'service-account.json')) })
const db = admin.firestore()

const ORG = 'org_agrobiciufa'
const REAL_UID = 'CH2cZHccVVR39MQGlXpaw8S3yNG2'

async function main() {
  // Personnel in org_agrobiciufa for Cristian
  const inOrg = await db.collection('personnel')
    .where('organization_id', '==', ORG)
    .where('user_id', '==', REAL_UID)
    .limit(3).get()
  console.log('Personnel in org_agrobiciufa for Cristian:', inOrg.size)
  inOrg.docs.forEach(d => console.log(' -', d.id, JSON.stringify(d.data())))

  // All processes for org_agrobiciufa
  const procs = await db.collection('processDefinitions').where('organization_id', '==', ORG).get()
  console.log('\nAll processes for org_agrobiciufa:', procs.size)
  procs.docs.forEach(d => console.log(' -', d.id, d.data().codigo, '|', d.data().nombre))

  // Check the 3 processes assigned to the existing personnel
  const assignedIds = ['ttGiOZlRJzCrQUAyEuy4', 'nDwDNUAgIJOKpZDbCxFf', 'sEgYVQ5OyjMnGjQeMJlb']
  console.log('\nChecking assigned process IDs:')
  for (const id of assignedIds) {
    const doc = await db.collection('processDefinitions').doc(id).get()
    console.log(' -', id, doc.exists ? ('exists org:' + doc.data().organization_id) : 'NOT FOUND')
  }

  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
