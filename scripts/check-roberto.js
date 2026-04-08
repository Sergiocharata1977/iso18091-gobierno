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

async function checkAndCleanRoberto() {
  console.log('🔍 Checking for roberto users...\n');

  // Check Firebase Auth
  try {
    const user = await auth.getUserByEmail('roberto@empresa.com');
    console.log('Found in Auth:', user.uid, user.email);
    console.log('  - CustomClaims:', user.customClaims);
    console.log('  - Created:', user.metadata.creationTime);

    // Delete from Auth
    await auth.deleteUser(user.uid);
    console.log('  ✅ Deleted from Auth');
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log('Not found in Auth');
    } else {
      console.error('Error:', e.message);
    }
  }

  // Check Firestore users collection
  console.log('\n📁 Checking Firestore users collection...');
  const usersSnapshot = await db
    .collection('users')
    .where('email', '==', 'roberto@empresa.com')
    .get();

  if (usersSnapshot.empty) {
    console.log('No users found in Firestore');
  } else {
    for (const doc of usersSnapshot.docs) {
      console.log('Found user doc:', doc.id, doc.data());
      await doc.ref.delete();
      console.log('  ✅ Deleted user doc:', doc.id);
    }
  }

  // Check personnel collection
  console.log('\n👤 Checking Firestore personnel collection...');
  const personnelSnapshot = await db
    .collection('personnel')
    .where('email', '==', 'roberto@empresa.com')
    .get();

  if (personnelSnapshot.empty) {
    console.log('No personnel found in Firestore');
  } else {
    for (const doc of personnelSnapshot.docs) {
      console.log('Found personnel doc:', doc.id, doc.data());
      await doc.ref.delete();
      console.log('  ✅ Deleted personnel doc:', doc.id);
    }
  }

  console.log('\n✅ Cleanup complete! Try creating roberto@empresa.com again.');
  process.exit(0);
}

checkAndCleanRoberto().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
