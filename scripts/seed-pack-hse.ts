/**
 * seed-pack-hse.ts
 *
 * Crea o reemplaza el documento PlatformCapability para `pack_hse`
 * en la colección `platform_capabilities` de Firestore.
 *
 * Uso:
 *   npx ts-node --project tsconfig.json scripts/seed-pack-hse.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

if (fs.existsSync('service-account.json')) {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = 'service-account.json';
}

import { getAdminFirestore } from '../src/lib/firebase/admin';

const CAPABILITY_ID = 'pack_hse';

async function main() {
  console.log(`[seed-pack-hse] Seeding platform_capabilities/${CAPABILITY_ID}`);

  const db = getAdminFirestore();
  const docRef = db.collection('platform_capabilities').doc(CAPABILITY_ID);

  const data = {
    id: CAPABILITY_ID,
    name: 'Pack HSE — Seguridad, Salud y Medio Ambiente',
    description:
      'ISO 14001 (Medio Ambiente) + ISO 45001 (SST) integrados en un solo pack premium. ' +
      'Aspectos ambientales, identificación de peligros, gestión de incidentes, ' +
      'control de EPP, objetivos ambientales/SST y registro de requisitos legales.',
    long_description:
      'El Pack HSE centraliza la gestión ambiental y de seguridad y salud ocupacional ' +
      'en una única plataforma integrada con el SGC. Permite identificar y evaluar ' +
      'aspectos ambientales e impactos, gestionar incidentes y accidentes con investigación ' +
      'de causa raíz, controlar el stock y vencimiento de EPP, y mantener actualizado ' +
      'el registro de requisitos legales aplicables con evaluación de cumplimiento.\n\n' +
      'Diseñado para organizaciones industriales, de servicios y manufactureras que ' +
      'buscan integrar sus sistemas de gestión ISO 9001, ISO 14001 e ISO 45001 en ' +
      'una sola herramienta sin silos de información.\n\n' +
      'Incluye alertas automáticas de incidentes graves, tablero HSE en el panel ' +
      'principal y contexto HSE para el asistente Don Cándido IA.',
    target_audience:
      'Ideal para organizaciones industriales, manufactureras o de servicios que ' +
      'operan bajo ISO 14001 y/o ISO 45001, o que buscan implementarlas junto a su SGC ISO 9001.',
    features: [
      'Registro y seguimiento de incidentes SST con investigación de causa raíz',
      'Matriz de aspectos e impactos ambientales (ISO 14001)',
      'Identificación y evaluación de peligros (ISO 45001)',
      'Control de EPP: stock, asignación y fechas de vencimiento',
      'Objetivos ambientales y de SST con seguimiento de indicadores',
      'Registro de requisitos legales con evaluación de cumplimiento',
      'Dashboard HSE integrado en Mi Panel',
      'Contexto HSE para Don Cándido IA (alertas y consultas)',
      'Hallazgos con origen HSE vinculados al módulo de mejoras',
      'Gating automático: acceso solo si pack habilitado',
    ],
    benefits: [
      'Integración real ISO 9001 + 14001 + 45001 sin duplicar registros',
      'Alertas automáticas de incidentes graves y EPP vencidos',
      'Cumplimiento documentado de requisitos legales ambientales y SST',
      'Reducción de tiempo de reporte de incidentes con formularios guiados',
      'Visibilidad ejecutiva de riesgos HSE en el panel principal',
    ],
    how_it_works:
      'Se instala desde el Marketplace. Una vez habilitado, activa el módulo /hse ' +
      'con todas sus secciones, habilita las APIs HSE con gating de capability, ' +
      'e inyecta contexto HSE en el asistente Don Cándido cuando hay incidentes ' +
      'abiertos, EPP vencidos o aspectos ambientales significativos.',
    version: '1.0.0',
    system_ids: ['iso9001', 'iso14001', 'iso45001'],
    scope: 'system',
    status: 'active',
    tier: 'premium',
    icon: 'ShieldCheck',
    color: '#059669', // emerald-600
    tags: ['hse', 'iso_14001', 'iso_45001', 'medio_ambiente', 'sst', 'incidentes', 'epp'],
    industries: [
      { type: 'industria', label: 'Industria y Manufactura' },
      { type: 'construccion', label: 'Construcción' },
      { type: 'mineria', label: 'Minería' },
      { type: 'agro', label: 'Agroindustria' },
      { type: 'servicios', label: 'Servicios con riesgo operativo' },
    ],
    industry_required: false,
    dependencies: [],
    manifest: {
      capability_id: CAPABILITY_ID,
      version: '1.0.0',
      system_id: 'iso14001',
      navigation: [
        { name: 'Dashboard HSE', href: '/hse', icon: 'ShieldCheck', feature: 'pack_hse' },
        { name: 'Incidentes SST', href: '/hse/incidentes', icon: 'AlertTriangle', feature: 'pack_hse' },
        { name: 'Peligros', href: '/hse/peligros', icon: 'Zap', feature: 'pack_hse' },
        { name: 'Aspectos Ambientales', href: '/hse/aspectos-ambientales', icon: 'Leaf', feature: 'pack_hse' },
        { name: 'Objetivos Ambientales', href: '/hse/objetivos-ambientales', icon: 'Target', feature: 'pack_hse' },
        { name: 'Requisitos Legales', href: '/hse/requisitos-legales', icon: 'Scale', feature: 'pack_hse' },
        { name: 'EPP', href: '/hse/epp', icon: 'HardHat', feature: 'pack_hse' },
      ],
      datasets: ['hse_incidentes', 'hse_peligros', 'hse_aspectos_ambientales', 'hse_epp', 'hse_requisitos_legales'],
      permissions: {
        export_roles: ['admin', 'hse_manager'],
        restore_roles: ['admin'],
      },
    },
  };

  await docRef.set(data, { merge: false });

  console.log(`[seed-pack-hse] OK — platform_capabilities/${CAPABILITY_ID} creado/actualizado.`);
  console.log('[seed-pack-hse] Datos guardados:', {
    id: data.id,
    name: data.name,
    tier: data.tier,
    status: data.status,
    version: data.version,
    nav_items: data.manifest.navigation.length,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-pack-hse] Error fatal:', err);
  process.exit(1);
});
