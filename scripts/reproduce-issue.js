// Scripts to reproduce the issue
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyB80eKra_lUIjDGe-K0Hxbbq0Fabfdr03Y',
  authDomain: 'app-4b05c.firebaseapp.com',
  databaseURL: 'https://app-4b05c-default-rtdb.firebaseio.com',
  projectId: 'app-4b05c',
  storageBucket: 'app-4b05c.firebasestorage.app',
  messagingSenderId: '69562046511',
  appId: '1:69562046511:web:38b909326efd9b3fc60eda',
  measurementId: 'G-Z1RKVMSQGJ',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testPositionQuery() {
  console.log('Testing Position Query...');
  const organizationId = '8914-3babd224cbaa7a32'; // ID from user screenshot

  try {
    const q = query(
      collection(db, 'positions'),
      where('organization_id', '==', organizationId)
    );

    console.log('Executing query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query successful! Documents found: ${querySnapshot.size}`);

    querySnapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data().nombre);
    });
  } catch (error) {
    console.error('ERROR IN QUERY:', error);
  }
}

async function testDepartmentQuery() {
  console.log('\nTesting Department Query...');
  const organizationId = '8914-3babd224cbaa7a32';

  try {
    const q = query(
      collection(db, 'departments'),
      where('organization_id', '==', organizationId)
    );

    console.log('Executing query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query successful! Documents found: ${querySnapshot.size}`);
  } catch (error) {
    console.error('ERROR IN QUERY:', error);
  }
}

// Run tests
(async () => {
  await testPositionQuery();
  await testDepartmentQuery();
  // Force exit as Firebase app keeps process alive
  process.exit(0);
})();
