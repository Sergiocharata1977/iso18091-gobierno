/**
 * Firestore Composite Indexes Configuration
 */

interface IndexField {
  fieldPath: string;
  order: 'ASCENDING' | 'DESCENDING';
}

interface FirestoreIndex {
  collectionGroup: string;
  fields: IndexField[];
  description: string;
}

const INDEXES: FirestoreIndex[] = [
  // normPoints - mandatory points ordered by chapter
  {
    collectionGroup: 'normPoints',
    fields: [
      { fieldPath: 'deletedAt', order: 'ASCENDING' },
      { fieldPath: 'isMandatory', order: 'ASCENDING' },
      { fieldPath: 'chapter', order: 'ASCENDING' },
      { fieldPath: '__name__', order: 'ASCENDING' },
    ],
    description: 'Query mandatory norm points ordered by chapter',
  },

  // chatSessions - sessions by personnel ordered by update time
  {
    collectionGroup: 'chatSessions',
    fields: [
      { fieldPath: 'personnel_id', order: 'ASCENDING' },
      { fieldPath: 'estado', order: 'ASCENDING' },
      { fieldPath: 'updated_at', order: 'DESCENDING' },
    ],
    description: 'Query active sessions by personnel',
  },

  // chatSessions - sessions by personnel for history
  {
    collectionGroup: 'chatSessions',
    fields: [
      { fieldPath: 'personnel_id', order: 'ASCENDING' },
      { fieldPath: 'updated_at', order: 'DESCENDING' },
    ],
    description: 'Query session history by personnel',
  },

  // findings - findings by status and date
  {
    collectionGroup: 'findings',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'registration.date', order: 'DESCENDING' },
    ],
    description: 'Query findings by status ordered by date',
  },

  // audits - audits by status and planned date
  {
    collectionGroup: 'audits',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'plannedDate', order: 'ASCENDING' },
    ],
    description: 'Query audits by status ordered by planned date',
  },

  // actions - actions by status and due date
  {
    collectionGroup: 'actions',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'dueDate', order: 'ASCENDING' },
    ],
    description: 'Query actions by status ordered by due date',
  },

  // documents - documents by status and update time
  {
    collectionGroup: 'documents',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'updated_at', order: 'DESCENDING' },
    ],
    description: 'Query documents by status ordered by update time',
  },

  // calendarEvents - events by date range
  {
    collectionGroup: 'calendarEvents',
    fields: [
      { fieldPath: 'start', order: 'ASCENDING' },
      { fieldPath: 'end', order: 'ASCENDING' },
    ],
    description: 'Query calendar events by date range',
  },
];

/**
 * Generate Firestore index creation URL
 */
function generateIndexUrl(index: FirestoreIndex): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const baseUrl = `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes`;

  // Build the composite index parameter
  const fields = index.fields
    .map((field: IndexField) => {
      const order = field.order === 'ASCENDING' ? 'ASCENDING' : 'DESCENDING';
      return `${field.fieldPath}:${order}`;
    })
    .join(',');

  return `${baseUrl}?create_composite=${index.collectionGroup}:${fields}`;
}

/**
 * Main function to create indexes
 */
async function createIndexes() {
  console.log('🔍 Firestore Index Creation Script\n');
  console.log('='.repeat(60));

  console.log('\n📋 Indexes to create:\n');

  INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. ${index.description}`);
    console.log(`   Collection: ${index.collectionGroup}`);
    console.log(
      `   Fields: ${index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`
    );
    console.log('');
  });

  console.log('='.repeat(60));
  console.log(
    '\n⚠️  IMPORTANT: Firestore indexes cannot be created programmatically.'
  );
  console.log('You need to create them through the Firebase Console.\n');

  console.log('📝 Instructions:\n');
  console.log('1. Click on each URL below to create the index');
  console.log(
    '2. Firebase will open the console with pre-filled index configuration'
  );
  console.log('3. Click "Create Index" button');
  console.log('4. Wait for the index to be built (can take a few minutes)\n');

  console.log('🔗 Index Creation URLs:\n');

  INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. ${index.description}`);
    console.log(`   ${generateIndexUrl(index)}\n`);
  });

  console.log('='.repeat(60));
  console.log('\n✅ Alternative: Use Firebase CLI\n');
  console.log(
    'You can also create a firestore.indexes.json file and deploy with:'
  );
  console.log('firebase deploy --only firestore:indexes\n');

  // Generate firestore.indexes.json content
  const indexesJson = {
    indexes: INDEXES.map(index => ({
      collectionGroup: index.collectionGroup,
      queryScope: 'COLLECTION',
      fields: index.fields.map(field => ({
        fieldPath: field.fieldPath,
        order: field.order,
      })),
    })),
  };

  console.log('📄 firestore.indexes.json content:\n');
  console.log(JSON.stringify(indexesJson, null, 2));
  console.log('\n' + '='.repeat(60));
}

// Run the script
createIndexes()
  .then(() => {
    console.log('\n✅ Index information generated successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
