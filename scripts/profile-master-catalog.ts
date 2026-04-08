import { adminDb } from '../src/firebase/admin';
import * as fs from 'fs';

function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

async function countCollection(name: string): Promise<number> {
  try {
    const snap = await adminDb.collection(name).count().get();
    return snap.data().count || 0;
  } catch {
    return -1;
  }
}

async function sampleFieldStats(collection: string, limit = 200) {
  try {
    const snap = await adminDb.collection(collection).limit(limit).get();
    let orgSnake = 0;
    let orgCamel = 0;
    let missingOrg = 0;

    snap.docs.forEach(doc => {
      const d = doc.data() as Record<string, unknown>;
      const hasSnake =
        typeof d.organization_id === 'string' && !!d.organization_id;
      const hasCamel =
        typeof d.organizationId === 'string' && !!d.organizationId;
      if (hasSnake) orgSnake++;
      if (hasCamel) orgCamel++;
      if (!hasSnake && !hasCamel) missingOrg++;
    });

    return {
      sampleSize: snap.size,
      orgSnake,
      orgCamel,
      missingOrg,
    };
  } catch {
    return null;
  }
}

async function run() {
  const now = new Date().toISOString();

  const collections = [
    'organizations',
    'users',
    'products',
    'terceros',
    'cost_centers',
    'journal_entries',
    'events',
  ];

  const counts: Record<string, number> = {};
  for (const c of collections) {
    counts[c] = await countCollection(c);
  }

  const usersStats = await sampleFieldStats('users', 300);
  const journalStats = await sampleFieldStats('journal_entries', 300);
  const eventsStats = await sampleFieldStats('events', 300);

  const lines: string[] = [];
  lines.push('# Perfil Real Catalogo Maestro - 2026-02-17');
  lines.push('');
  lines.push(`Fecha de corrida: ${now}`);
  lines.push(
    'Fuente: Firebase Admin SDK sobre proyecto configurado localmente.'
  );
  lines.push('');
  lines.push('## Conteos de colecciones (top-level)');
  lines.push('');
  lines.push('| Coleccion | Conteo | Estado |');
  lines.push('|---|---:|---|');
  for (const c of collections) {
    const v = counts[c];
    lines.push(
      `| ${c} | ${v >= 0 ? v : 'N/A'} | ${v >= 0 ? 'VERIFICADO' : 'NO VERIFICADO'} |`
    );
  }

  lines.push('');
  lines.push('## Calidad de campos de organizacion (muestras)');
  lines.push('');

  function addStats(title: string, stats: any) {
    if (!stats) {
      lines.push(
        `- ${title}: NO VERIFICADO (sin acceso o coleccion inexistente).`
      );
      return;
    }
    lines.push(`- ${title}: muestra ${stats.sampleSize} docs`);
    lines.push(
      `  - organization_id: ${stats.orgSnake} (${pct(stats.orgSnake, stats.sampleSize)})`
    );
    lines.push(
      `  - organizationId: ${stats.orgCamel} (${pct(stats.orgCamel, stats.sampleSize)})`
    );
    lines.push(
      `  - sin campo de org: ${stats.missingOrg} (${pct(stats.missingOrg, stats.sampleSize)})`
    );
  }

  addStats('users', usersStats);
  addStats('journal_entries', journalStats);
  addStats('events', eventsStats);

  lines.push('');
  lines.push('## Conclusiones');
  lines.push(
    '1. Este perfil baja incertidumbre de catalogo con datos reales del proyecto actual.'
  );
  lines.push(
    '2. Si hay mezcla `organization_id` / `organizationId`, mantener plan de convergencia de P02/P12.'
  );
  lines.push(
    '3. Confirmacion cross-repo (sig-agro y don-candido-finanzas) sigue NO VERIFICADO desde este repo.'
  );

  const out = 'reports/CATALOGO_MAESTRO_PERFIL_REAL_2026-02-17.md';
  fs.writeFileSync(out, lines.join('\n'));
  console.log(`OK: ${out}`);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
