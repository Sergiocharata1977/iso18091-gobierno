import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  writeBatch,
  doc,
} from 'firebase/firestore';

// POST - Poblar colecciones con datos masivos
async function postInternal(request: NextRequest) {
  try {
    console.log('?? Iniciando seeding masivo de colecciones de Procesos...');

    // Limpiar colecciones existentes
    await clearCollections();

    // Crear definiciones de procesos
    const definitionsRefs = await seedProcessDefinitions();

    // Crear registros de procesos
    const recordsRefs = await seedProcessRecords(definitionsRefs);

    // Crear tableros Kanban
    await seedKanbanBoards(recordsRefs);

    return NextResponse.json({
      success: true,
      message: 'Seeding masivo completado exitosamente',
      data: {
        definitionsCreated: definitionsRefs.length,
        recordsCreated: recordsRefs.length,
        kanbanBoardsCreated: recordsRefs.length,
      },
    });
  } catch (error) {
    console.error('Error in massive seed process:', error);
    return NextResponse.json(
      { success: false, error: 'Error en el proceso de seeding masivo' },
      { status: 500 }
    );
  }
}

// Funci?n para limpiar colecciones
async function clearCollections() {
  console.log('?? Limpiando colecciones existentes...');

  try {
    // Limpiar definiciones de procesos
    const definitionsSnapshot = await getDocs(
      collection(db, 'processDefinitions')
    );
    const definitionsBatch = writeBatch(db);
    definitionsSnapshot.docs.forEach(docSnapshot => {
      definitionsBatch.delete(doc(db, 'processDefinitions', docSnapshot.id));
    });
    await definitionsBatch.commit();

    // Limpiar registros de procesos
    const recordsSnapshot = await getDocs(collection(db, 'processRecords'));
    const recordsBatch = writeBatch(db);
    recordsSnapshot.docs.forEach(docSnapshot => {
      recordsBatch.delete(doc(db, 'processRecords', docSnapshot.id));
    });
    await recordsBatch.commit();

    console.log('? Colecciones limpiadas exitosamente');
  } catch (error) {
    console.error('Error clearing collections:', error);
    throw error;
  }
}

// Funci?n para crear definiciones de procesos
async function seedProcessDefinitions() {
  console.log('?? Creando definiciones de procesos...');

  const definitionsData = [
    {
      name: 'Gesti?n de Calidad',
      description: 'Proceso para gestionar la calidad del sistema ISO 9001',
      category: 'calidad',
      responsible: 'admin@empresa.com',
      department: 'Calidad',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Auditor?as Internas',
      description: 'Proceso para realizar auditor?as internas del sistema',
      category: 'auditoria',
      responsible: 'auditor@empresa.com',
      department: 'Auditor?a',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Mejora Continua',
      description: 'Proceso para implementar mejoras continuas',
      category: 'mejora',
      responsible: 'mejora@empresa.com',
      department: 'Mejora',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Gesti?n de Documentos',
      description: 'Proceso para gestionar la documentaci?n del sistema',
      category: 'documentos',
      responsible: 'documentos@empresa.com',
      department: 'Documentaci?n',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Control de No Conformidades',
      description:
        'Proceso para gestionar no conformidades y acciones correctivas',
      category: 'no-conformidades',
      responsible: 'calidad@empresa.com',
      department: 'Calidad',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Gesti?n de Riesgos',
      description: 'Proceso para identificar, evaluar y gestionar riesgos',
      category: 'riesgos',
      responsible: 'riesgos@empresa.com',
      department: 'Gesti?n de Riesgos',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Capacitaci?n y Competencias',
      description:
        'Proceso para gestionar capacitaciones y competencias del personal',
      category: 'rrhh',
      responsible: 'rrhh@empresa.com',
      department: 'Recursos Humanos',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Gesti?n de Proveedores',
      description: 'Proceso para evaluar y gestionar proveedores',
      category: 'compras',
      responsible: 'compras@empresa.com',
      department: 'Compras',
      version: '1.0',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
  ];

  const definitionsRefs = [];
  for (const definition of definitionsData) {
    const docRef = await addDoc(
      collection(db, 'processDefinitions'),
      definition
    );
    definitionsRefs.push({ id: docRef.id, ...definition });
  }

  console.log(`? ${definitionsRefs.length} definiciones creadas`);
  return definitionsRefs;
}

// Funci?n para crear registros de procesos
async function seedProcessRecords(definitionsRefs: any[]) {
  console.log('?? Creando registros de procesos...');

  const recordsData = [
    {
      name: 'Implementaci?n ISO 9001 Q3',
      description:
        'Registro de proceso para implementaci?n de ISO 9001 en el tercer trimestre',
      processDefinitionId: definitionsRefs[0].id,
      processDefinitionName: 'Gesti?n de Calidad',
      status: 'activo',
      createdBy: 'admin@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 12,
        pendingCards: 3,
        inProgressCards: 5,
        completedCards: 4,
      },
      isActive: true,
    },
    {
      name: 'Auditor?a Interna 2024',
      description: 'Proceso de auditor?a interna del sistema de gesti?n',
      processDefinitionId: definitionsRefs[1].id,
      processDefinitionName: 'Auditor?as Internas',
      status: 'pausado',
      createdBy: 'auditor@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 8,
        pendingCards: 2,
        inProgressCards: 3,
        completedCards: 3,
      },
      isActive: true,
    },
    {
      name: 'Mejora Continua Sistema',
      description: 'Proceso de mejora continua del sistema',
      processDefinitionId: definitionsRefs[2].id,
      processDefinitionName: 'Mejora Continua',
      status: 'completado',
      createdBy: 'mejora@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 15,
        pendingCards: 0,
        inProgressCards: 0,
        completedCards: 15,
      },
      isActive: true,
    },
    {
      name: 'Actualizaci?n Documental 2024',
      description: 'Proceso de actualizaci?n de documentaci?n del sistema',
      processDefinitionId: definitionsRefs[3].id,
      processDefinitionName: 'Gesti?n de Documentos',
      status: 'activo',
      createdBy: 'documentos@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 6,
        pendingCards: 2,
        inProgressCards: 2,
        completedCards: 2,
      },
      isActive: true,
    },
    {
      name: 'Control No Conformidades Q4',
      description:
        'Proceso de control de no conformidades del cuarto trimestre',
      processDefinitionId: definitionsRefs[4].id,
      processDefinitionName: 'Control de No Conformidades',
      status: 'activo',
      createdBy: 'calidad@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 9,
        pendingCards: 4,
        inProgressCards: 3,
        completedCards: 2,
      },
      isActive: true,
    },
    {
      name: 'Evaluaci?n de Riesgos 2024',
      description: 'Proceso de evaluaci?n de riesgos anual',
      processDefinitionId: definitionsRefs[5].id,
      processDefinitionName: 'Gesti?n de Riesgos',
      status: 'activo',
      createdBy: 'riesgos@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 7,
        pendingCards: 1,
        inProgressCards: 4,
        completedCards: 2,
      },
      isActive: true,
    },
    {
      name: 'Capacitaci?n Personal Q3',
      description: 'Proceso de capacitaci?n del personal tercer trimestre',
      processDefinitionId: definitionsRefs[6].id,
      processDefinitionName: 'Capacitaci?n y Competencias',
      status: 'pausado',
      createdBy: 'rrhh@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 11,
        pendingCards: 5,
        inProgressCards: 4,
        completedCards: 2,
      },
      isActive: true,
    },
    {
      name: 'Evaluaci?n Proveedores 2024',
      description: 'Proceso de evaluaci?n de proveedores anual',
      processDefinitionId: definitionsRefs[7].id,
      processDefinitionName: 'Gesti?n de Proveedores',
      status: 'activo',
      createdBy: 'compras@empresa.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanbanStats: {
        totalCards: 5,
        pendingCards: 1,
        inProgressCards: 2,
        completedCards: 2,
      },
      isActive: true,
    },
  ];

  const recordsRefs = [];
  for (const record of recordsData) {
    const docRef = await addDoc(collection(db, 'processRecords'), record);
    recordsRefs.push({ id: docRef.id, ...record });
  }

  console.log(`? ${recordsRefs.length} registros creados`);
  return recordsRefs;
}

// Funci?n para crear tableros Kanban
async function seedKanbanBoards(recordsRefs: any[]) {
  console.log('?? Creando tableros Kanban...');

  for (const record of recordsRefs) {
    console.log(`?? Creando tablero para: ${record.name}`);

    // Crear listas Kanban
    const listsData = [
      {
        title: 'Pendiente',
        description: 'Tareas pendientes de realizar',
        color: 'bg-gray-100',
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'En Progreso',
        description: 'Tareas en proceso de ejecuci?n',
        color: 'bg-blue-100',
        position: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Completado',
        description: 'Tareas completadas',
        color: 'bg-green-100',
        position: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const listRefs = [];
    for (const list of listsData) {
      const listRef = await addDoc(
        collection(db, 'processRecords', record.id, 'kanbanLists'),
        list
      );
      listRefs.push({ id: listRef.id, ...list });
    }

    // Crear tarjetas de ejemplo para cada lista
    const cardsData = [
      // Tarjetas para "Pendiente"
      {
        title: 'Revisar documentaci?n',
        description: 'Revisar toda la documentaci?n existente',
        listId: listRefs[0].id,
        assignedTo: 'Juan P?rez',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        tags: ['documentaci?n', 'revisi?n'],
        status: 'pending',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Capacitaci?n del equipo',
        description: 'Organizar capacitaci?n sobre nuevos procedimientos',
        listId: listRefs[0].id,
        assignedTo: 'Mar?a Garc?a',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        tags: ['capacitaci?n', 'equipo'],
        status: 'pending',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // Tarjetas para "En Progreso"
      {
        title: 'Implementar procedimientos',
        description: 'Implementar nuevos procedimientos',
        listId: listRefs[1].id,
        assignedTo: 'Carlos L?pez',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        tags: ['implementaci?n', 'procedimientos'],
        status: 'in-progress',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Auditor?a interna',
        description: 'Realizar auditor?a interna del sistema',
        listId: listRefs[1].id,
        assignedTo: 'Ana Mart?nez',
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        tags: ['auditor?a', 'interna'],
        status: 'in-progress',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // Tarjetas para "Completado"
      {
        title: 'An?lisis de riesgos',
        description: 'Completar an?lisis de riesgos del proceso',
        listId: listRefs[2].id,
        assignedTo: 'Laura S?nchez',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        tags: ['an?lisis', 'riesgos'],
        status: 'completed',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Reuni?n de kick-off',
        description: 'Realizar reuni?n de inicio del proyecto',
        listId: listRefs[2].id,
        assignedTo: 'Roberto D?az',
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        tags: ['reuni?n', 'kick-off'],
        status: 'completed',
        createdBy: 'admin@empresa.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const card of cardsData) {
      await addDoc(
        collection(
          db,
          'processRecords',
          record.id,
          'kanbanLists',
          card.listId,
          'cards'
        ),
        card
      );
    }

    console.log(`? Tablero Kanban creado para: ${record.name}`);
  }

  console.log(`? ${recordsRefs.length} tableros Kanban creados`);
}

export const POST = withAuth(
  async (request, _context, auth) => {
    if (isSeedExecutionBlockedInProduction()) {
      await logSeedExecution({
        request,
        auth,
        route: '/api/processes/seed-massive',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { success: false, error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/processes/seed-massive',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal(request);

    await logSeedExecution({
      request,
      auth,
      route: '/api/processes/seed-massive',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
