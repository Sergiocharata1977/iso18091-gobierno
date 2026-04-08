/**
 * Script de inicialización del CRM
 * Crea estados Kanban predeterminados y clientes de ejemplo
 */

import { initializeApp } from 'firebase/app';
import { addDoc, collection, getDocs, getFirestore } from 'firebase/firestore';

// Configuración de Firebase (usar las mismas credenciales del proyecto)
const firebaseConfig = {
  // TODO: Copiar configuración de firebase/config.ts
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estados Kanban predeterminados
const ESTADOS_DEFAULT = [
  {
    nombre: 'Prospecto',
    color: '#94a3b8',
    orden: 1,
    descripcion: 'Lead generado, primer contacto pendiente',
    es_estado_final: false,
    permite_edicion: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    nombre: 'Contactado',
    color: '#60a5fa',
    orden: 2,
    descripcion: 'Primer contacto realizado, en proceso de calificación',
    es_estado_final: false,
    permite_edicion: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    nombre: 'En Evaluación',
    color: '#fbbf24',
    orden: 3,
    descripcion: 'Análisis de scoring crediticio en proceso',
    es_estado_final: false,
    permite_edicion: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    nombre: 'Aprobado',
    color: '#34d399',
    orden: 4,
    descripcion: 'Crédito aprobado, listo para primera compra',
    es_estado_final: false,
    permite_edicion: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    nombre: 'Cliente Activo',
    color: '#10b981',
    orden: 5,
    descripcion: 'Cliente con compras activas',
    es_estado_final: true,
    permite_edicion: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function inicializarEstadosKanban() {
  console.log('🔄 Verificando estados Kanban...');

  const estadosRef = collection(db, 'kanban_estados');
  const snapshot = await getDocs(estadosRef);

  if (!snapshot.empty) {
    console.log('✅ Estados Kanban ya existen');
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  console.log('📝 Creando estados Kanban predeterminados...');
  const estadosCreados = [];

  for (const estado of ESTADOS_DEFAULT) {
    const docRef = await addDoc(estadosRef, estado);
    estadosCreados.push({ id: docRef.id, ...estado });
    console.log(`  ✓ ${estado.nombre}`);
  }

  return estadosCreados;
}

async function crearClientesEjemplo(estados: any[]) {
  console.log('\n🔄 Verificando clientes de ejemplo...');

  const clientesRef = collection(db, 'clientes_crm');
  const snapshot = await getDocs(clientesRef);

  if (!snapshot.empty) {
    console.log('✅ Ya existen clientes en el sistema');
    return;
  }

  console.log('📝 Creando clientes de ejemplo...');

  const now = new Date().toISOString();
  const estadoProspecto = estados.find(e => e.nombre === 'Prospecto');
  const estadoContactado = estados.find(e => e.nombre === 'Contactado');
  const estadoEvaluacion = estados.find(e => e.nombre === 'En Evaluación');

  const clientesEjemplo = [
    {
      razon_social: 'Agropecuaria San Martín S.A.',
      nombre_comercial: 'San Martín Agro',
      cuit_cuil: '30-12345678-9',
      tipo_cliente: 'posible_cliente',
      estado_kanban_id: estadoProspecto.id,
      estado_kanban_nombre: estadoProspecto.nombre,
      historial_estados: [],
      email: 'contacto@sanmartin.com',
      telefono: '+54 9 11 1234-5678',
      direccion: 'Ruta 5 Km 120',
      localidad: 'San Martín',
      provincia: 'Buenos Aires',
      responsable_id: 'user-1',
      responsable_nombre: 'Juan Pérez',
      monto_estimado_compra: 500000,
      probabilidad_conversion: 60,
      total_compras_12m: 0,
      cantidad_compras_12m: 0,
      monto_total_compras_historico: 0,
      ultima_interaccion: now,
      notas: 'Interesado en semillas de soja',
      created_at: now,
      updated_at: now,
      created_by: 'system',
      isActive: true,
    },
    {
      razon_social: 'Estancia La Pampa',
      cuit_cuil: '20-98765432-1',
      tipo_cliente: 'posible_cliente',
      estado_kanban_id: estadoContactado.id,
      estado_kanban_nombre: estadoContactado.nombre,
      historial_estados: [],
      email: 'info@lapampa.com.ar',
      telefono: '+54 9 11 9876-5432',
      direccion: 'Camino Rural 234',
      localidad: 'General Pico',
      provincia: 'La Pampa',
      responsable_id: 'user-1',
      responsable_nombre: 'Juan Pérez',
      monto_estimado_compra: 750000,
      probabilidad_conversion: 40,
      total_compras_12m: 0,
      cantidad_compras_12m: 0,
      monto_total_compras_historico: 0,
      ultima_interaccion: now,
      notas: 'Primer contacto realizado, solicita cotización',
      created_at: now,
      updated_at: now,
      created_by: 'system',
      isActive: true,
    },
    {
      razon_social: 'Campos del Sur S.R.L.',
      nombre_comercial: 'Campos del Sur',
      cuit_cuil: '30-55555555-5',
      tipo_cliente: 'posible_cliente',
      estado_kanban_id: estadoEvaluacion.id,
      estado_kanban_nombre: estadoEvaluacion.nombre,
      historial_estados: [],
      email: 'ventas@camposdelsur.com',
      telefono: '+54 9 11 5555-5555',
      direccion: 'Av. Principal 456',
      localidad: 'Rosario',
      provincia: 'Santa Fe',
      responsable_id: 'user-2',
      responsable_nombre: 'María González',
      monto_estimado_compra: 1200000,
      probabilidad_conversion: 75,
      categoria_riesgo: 'B',
      limite_credito_actual: 1000000,
      total_compras_12m: 0,
      cantidad_compras_12m: 0,
      monto_total_compras_historico: 0,
      ultima_interaccion: now,
      notas: 'En proceso de evaluación crediticia',
      created_at: now,
      updated_at: now,
      created_by: 'system',
      isActive: true,
    },
  ];

  for (const cliente of clientesEjemplo) {
    await addDoc(clientesRef, cliente);
    console.log(`  ✓ ${cliente.razon_social}`);
  }
}

async function main() {
  console.log('🚀 Inicializando CRM...\n');

  try {
    // 1. Crear estados Kanban
    const estados = await inicializarEstadosKanban();

    // 2. Crear clientes de ejemplo
    await crearClientesEjemplo(estados);

    console.log('\n✅ ¡Inicialización completada!');
    console.log('\n📊 Resumen:');
    console.log(`  - Estados Kanban: ${estados.length}`);
    console.log('  - Clientes de ejemplo: 3');
    console.log(
      '\n🎯 Ahora puedes acceder a /crm para ver el sistema funcionando'
    );
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    process.exit(1);
  }
}

main();
