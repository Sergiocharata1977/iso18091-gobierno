const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(
  path.join(__dirname, '..', 'service-account.json')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function cleanupAndFix() {
  console.log('🔧 Starting cleanup and fixes...\n');

  // 1. Fix david's personnel - add organization_id
  console.log('1. Fixing david personnel organization_id...');
  const davidPersonnelId = 'tdUwFu96nxpMUnz6LKbU';
  const davidOrgId = 'CDq6tmlZYWGG8Tc0oO4I';

  await db.collection('personnel').doc(davidPersonnelId).update({
    organization_id: davidOrgId,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('   ✅ David personnel fixed with organization_id:', davidOrgId);

  // 2. Delete all test users from Firebase Auth
  console.log('\n2. Deleting test users from Firebase Auth...');

  let deletedCount = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);

    for (const user of listResult.users) {
      if (
        user.email &&
        user.email.includes('@example.com') &&
        user.email.startsWith('test-')
      ) {
        try {
          await auth.deleteUser(user.uid);
          deletedCount++;
          if (deletedCount % 50 === 0) {
            console.log(`   Deleted ${deletedCount} test users...`);
          }
        } catch (err) {
          console.error(`   Error deleting ${user.email}:`, err.message);
        }
      }
    }

    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`   ✅ Deleted ${deletedCount} test users\n`);

  // 3. Also delete test users from Firestore if any exist
  console.log('3. Checking Firestore for test user documents...');
  const usersSnapshot = await db.collection('users').get();
  let firestoreDeleted = 0;

  for (const doc of usersSnapshot.docs) {
    const email = doc.data().email;
    if (email && email.includes('@example.com')) {
      await db.collection('users').doc(doc.id).delete();
      firestoreDeleted++;
    }
  }
  console.log(
    `   ✅ Deleted ${firestoreDeleted} test user documents from Firestore\n`
  );

  console.log('✅ Cleanup complete!');
  process.exit(0);
}

cleanupAndFix().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
