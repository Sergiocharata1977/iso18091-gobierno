// Seed: Catálogo de maquinaria Case IH para org_los_senores_del_agro
// Uso: node scripts/seed-catalogo-caseih.js

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ORG_ID = 'org_los_senores_del_agro';

const PRODUCTOS = [
  // ── TRACTORES ──────────────────────────────────────────────────────────────
  {
    nombre: 'Case IH Puma 185 CVX',
    descripcion: 'Tractor 185 HP con transmisión CVX continuamente variable. Cabina CommandView III con clima. Ideal para siembra y labores pesadas. Motor FPT 6 cilindros Tier 4B.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Puma 185 CVX',
    precio_lista: 95000000, precio_contado: 88000000,
    imagenes: ['https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  {
    nombre: 'Case IH Puma 240 CVX',
    descripcion: 'Tractor premium 240 HP, transmisión CVX automática. AFS Pro 700 integrado, AutoGuidance GPS de alta precisión. Suspensión delantera de cabina y eje de serie.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Puma 240 CVX',
    precio_lista: 125000000, precio_contado: 115000000,
    imagenes: ['https://images.unsplash.com/photo-1605648816402-9988184e1b82?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  {
    nombre: 'Case IH Maxxum 135',
    descripcion: 'Tractor polivalente 135 HP, powershift 16 velocidades. Motor FPT NEF Tier 4B. Excelente relación potencia-peso para labores diversas en campo.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Maxxum 135',
    precio_lista: 72000000, precio_contado: 66000000,
    imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Maxxum 115',
    descripcion: 'Tractor versátil 115 HP. Transmisión Multicontroller automática. Perfecto para explotaciones medianas. Sistema de enganche rápido trasero de serie.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Maxxum 115',
    precio_lista: 60000000, precio_contado: 55500000,
    imagenes: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Farmall 90A',
    descripcion: 'Tractor compacto 90 HP con transmisión synchromesh 12 velocidades. Bajo costo operativo, ideal para pequeñas y medianas explotaciones y labores generales.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Farmall 90A',
    precio_lista: 42000000, precio_contado: 38500000,
    imagenes: ['https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Optum 270 CVX',
    descripcion: 'Tractor de alta tecnología 270 HP, transmisión CVX, suspensión delantera de serie. AFS AccuGuide automático. Motor FPT Cursor 9 Stage V. Máxima precisión en campo.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Optum 270 CVX',
    precio_lista: 148000000, precio_contado: 137000000,
    imagenes: ['https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  {
    nombre: 'Case IH Optum 300 CVX',
    descripcion: 'El tractor de labranza más potente de la gama Optum. 300 HP, transmisión CVX, eje delantero con suspensión independiente. Conectividad AFS Connect para gestión remota.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Optum 300 CVX',
    precio_lista: 168000000, precio_contado: 155000000,
    imagenes: ['https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Quadtrac 500',
    descripcion: 'Tractor de orugas cuádruples 500 HP. Máxima tracción, mínima compactación del suelo. Cuatro orugas independientes. Ideal para grandes extensiones y suelos difíciles.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Quadtrac 500',
    precio_lista: 245000000, precio_contado: 226000000,
    imagenes: ['https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Quadtrac 580',
    descripcion: 'El más potente de la línea Quadtrac. 580 HP, cuatro orugas de goma de 610 mm. Cabina suspendida. Sistema de gestión AFS Pro 700 con telemática integrada.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Quadtrac 580',
    precio_lista: 280000000, precio_contado: 260000000,
    imagenes: ['https://images.unsplash.com/photo-1605648816402-9988184e1b82?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  // ── COSECHADORAS ───────────────────────────────────────────────────────────
  {
    nombre: 'Case IH Axial-Flow 9150',
    descripcion: 'Cosechadora premium 473 HP con rotor axial único. Cabezal de hasta 40 pies. AFS Harvest Command con ajuste automático de parámetros. Referencia mundial en rendimiento de trilla.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Axial-Flow 9150',
    precio_lista: 520000000, precio_contado: 480000000,
    imagenes: ['https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  {
    nombre: 'Case IH Axial-Flow 8150',
    descripcion: 'Cosechadora de alta capacidad 425 HP. Rotor axial, sistema de zarandas de alta frecuencia. Mapa de rendimiento en tiempo real, gestión de residuos optimizada.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Axial-Flow 8150',
    precio_lista: 450000000, precio_contado: 415000000,
    imagenes: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Axial-Flow 7150',
    descripcion: 'Cosechadora 350 HP. Sistema rotativo de alta eficiencia para soja, maíz y trigo. Monitor de pérdidas en tiempo real. Excelente rendimiento costo-beneficio.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Axial-Flow 7150',
    precio_lista: 390000000, precio_contado: 360000000,
    imagenes: ['https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH Axial-Flow 6150',
    descripcion: 'Cosechadora entry-level 290 HP. Rotor simple de alto rendimiento para medianas explotaciones. Ideal para soja, maíz, girasol. Costo de mantenimiento reducido.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Axial-Flow 6150',
    precio_lista: 310000000, precio_contado: 285000000,
    imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  // ── PULVERIZADORAS ─────────────────────────────────────────────────────────
  {
    nombre: 'Case IH Patriot 4440',
    descripcion: 'Pulverizadora autopropulsada 380 HP, la más avanzada del mercado. Botalón 42 m, tanque 4500 L. AIM Command PRO por boquilla individual. GPS RTK de alta precisión.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Patriot 4440',
    precio_lista: 195000000, precio_contado: 180000000,
    imagenes: ['https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1200&auto=format&fit=crop'],
    destacado: true,
  },
  {
    nombre: 'Case IH Patriot 3340',
    descripcion: 'Pulverizadora 280 HP. Botalón 36 m, tanque 3200 L. Control de sección automático, GPS RTK. Velocidad de aplicación constante con compensación topográfica.',
    categoria: 'maquinaria', marca: 'Case IH', modelo: 'Patriot 3340',
    precio_lista: 155000000, precio_contado: 143000000,
    imagenes: ['https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  // ── SEMBRADORAS / IMPLEMENTOS ──────────────────────────────────────────────
  {
    nombre: 'Case IH Early Riser 2150',
    descripcion: 'Sembradora de precisión 16 líneas, brazo paralelo individual. Ideal para siembra directa de soja y maíz. Monitor AFS Pro 700. Dosificación neumática de alta precisión.',
    categoria: 'implemento', marca: 'Case IH', modelo: 'Early Riser 2150',
    precio_lista: 85000000, precio_contado: 78000000,
    imagenes: ['https://images.unsplash.com/photo-1605648816402-9988184e1b82?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Case IH True-Tandem 330 Turbo',
    descripcion: 'Equipo de labranza de discos dobles en tándem. 6.70 m de ancho, 44 discos de 510 mm. Alta velocidad de trabajo hasta 14 km/h. Excelente para rastrojo de maíz y girasol.',
    categoria: 'implemento', marca: 'Case IH', modelo: 'True-Tandem 330 Turbo',
    precio_lista: 38000000, precio_contado: 35000000,
    imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Cabezal Maizero Case IH 3408-30',
    descripcion: 'Cabezal maicero de 8 surcos, paso 75 cm. Compatible con Axial-Flow 7150/8150/9150. Desfoliador activo de alta eficiencia, cadena elevadora de doble paso.',
    categoria: 'implemento', marca: 'Case IH', modelo: '3408-30',
    precio_lista: 42000000, precio_contado: 38500000,
    imagenes: ['https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
  {
    nombre: 'Plataforma Draper Case IH 3050',
    descripcion: 'Plataforma flexible de corte 35 pies para cosecha de soja. Lona transportadora lateral, corte de navaja de alta velocidad. Compatible con toda la línea Axial-Flow.',
    categoria: 'implemento', marca: 'Case IH', modelo: 'Draper 3050',
    precio_lista: 55000000, precio_contado: 51000000,
    imagenes: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1200&auto=format&fit=crop'],
    destacado: false,
  },
];

async function run() {
  console.log('Cargando catálogo Case IH → org:', ORG_ID);
  const colRef = db.collection('organizations').doc(ORG_ID).collection('productos');

  // Borrar productos existentes primero (limpieza)
  const existing = await colRef.get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }
  console.log('Productos anteriores eliminados:', existing.size);

  let count = 0;
  for (const p of PRODUCTOS) {
    const now = Timestamp.now();
    const docRef = colRef.doc();
    await docRef.set({
      id: docRef.id,
      organization_id: ORG_ID,
      activo: true,
      stock: null,
      created_at: now,
      updated_at: now,
      ...p,
    });
    count++;
    process.stdout.write('.');
  }

  console.log('\nProductos creados:', count);
  console.log('Catálogo Case IH listo en org:', ORG_ID);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
