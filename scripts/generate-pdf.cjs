/**
 * Genera PDFs de los documentos de proceso usando Chrome headless
 * Uso: node scripts/generate-pdf.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../reports/pdf');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── CSS compartido ──────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
  }

  body {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 10pt;
    color: #1e293b;
    line-height: 1.6;
    background: white;
  }

  /* ─── PORTADA ─── */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 40mm 0 20mm;
    page-break-after: always;
  }
  .cover .org-name {
    font-size: 11pt;
    font-weight: 600;
    color: #c8102e;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12pt;
  }
  .cover h1 {
    font-size: 28pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 6pt;
  }
  .cover .subtitle {
    font-size: 13pt;
    color: #475569;
    margin-bottom: 24pt;
  }
  .cover .meta-grid {
    display: grid;
    grid-template-columns: 140pt auto;
    gap: 6pt 16pt;
    margin-top: 16pt;
    background: #f8fafc;
    border: 1pt solid #e2e8f0;
    border-radius: 6pt;
    padding: 14pt 18pt;
  }
  .cover .meta-label {
    font-size: 8pt;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cover .meta-value {
    font-size: 9pt;
    color: #0f172a;
    font-weight: 500;
  }
  .cover .iso-badge {
    margin-top: 20pt;
    display: inline-block;
    background: #fff0f0;
    border: 1pt solid #f5a0a8;
    color: #7f0516;
    padding: 4pt 12pt;
    border-radius: 20pt;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .cover .footer-line {
    margin-top: auto;
    padding-top: 20pt;
    border-top: 1pt solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    width: 100%;
  }

  /* ─── CONTENIDO ─── */
  h1, h2, h3 { color: #0f172a; font-weight: 600; }

  h1 {
    font-size: 16pt;
    margin-bottom: 12pt;
    padding-bottom: 6pt;
    border-bottom: 2pt solid #c8102e;
  }
  h2 {
    font-size: 12pt;
    margin-top: 20pt;
    margin-bottom: 8pt;
    padding: 5pt 10pt;
    background: #f1f5f9;
    border-left: 3pt solid #c8102e;
    border-radius: 0 4pt 4pt 0;
  }
  h3 {
    font-size: 10pt;
    margin-top: 14pt;
    margin-bottom: 6pt;
    color: #334155;
  }

  p { margin-bottom: 6pt; }

  /* ─── TABLAS ─── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 12pt;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  thead tr { background: #c8102e; }
  thead th {
    color: white;
    padding: 5pt 8pt;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    letter-spacing: 0.03em;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #fff0f0; }
  tbody td {
    padding: 5pt 8pt;
    border-bottom: 0.5pt solid #e2e8f0;
    vertical-align: top;
    color: #334155;
  }

  /* ─── CÓDIGO / DIAGRAMA ─── */
  pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8pt;
  }
  pre {
    background: #f8fafc;
    border: 0.5pt solid #cbd5e1;
    border-radius: 4pt;
    padding: 10pt 12pt;
    white-space: pre;
    overflow: visible;
    margin: 8pt 0;
    page-break-inside: avoid;
  }

  /* ─── LISTAS ─── */
  ul, ol { padding-left: 16pt; margin: 6pt 0; }
  li { margin-bottom: 3pt; }

  /* ─── HR ─── */
  hr {
    border: none;
    border-top: 0.5pt solid #e2e8f0;
    margin: 14pt 0;
  }

  /* ─── STRONG ─── */
  strong { color: #0f172a; font-weight: 600; }

  /* ─── SALTO DE PÁGINA ─── */
  .page-break { page-break-after: always; }

  /* ─── FOOTER DE PÁGINA ─── */
  @page { @bottom-right { content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; } }
`;

// ─── Convierte Markdown a HTML básico ──────────────────────────
function mdToHtml(md) {
  return md
    // Encabezados
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Negrita e itálica
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bloques de código
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre>$1</pre>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Tablas
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
      const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map(row => {
        const tds = row.split('|').filter(c => c.trim() !== '' && c !== row).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Listas
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    // Párrafos (líneas que no son tags HTML)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Limpiar párrafos vacíos
    .replace(/<p>\s*<\/p>/g, '');
}

// ─── Genera HTML completo con portada ─────────────────────────
function buildHtml(title, subtitle, code, clauses, mdContent) {
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const body = mdToHtml(mdContent);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <div class="org-name">Agro Bicufa SRL</div>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  <div class="meta-grid">
    <span class="meta-label">Código</span><span class="meta-value">${code}</span>
    <span class="meta-label">Versión</span><span class="meta-value">1.0</span>
    <span class="meta-label">Fecha de emisión</span><span class="meta-value">${today}</span>
    <span class="meta-label">Estado</span><span class="meta-value">Vigente</span>
    <span class="meta-label">Cláusulas ISO</span><span class="meta-value">${clauses}</span>
    <span class="meta-label">Sistema</span><span class="meta-value">Don Cándido IA Platform</span>
  </div>
  <span class="iso-badge">ISO 9001:2015 — Sistema de Gestión de la Calidad</span>
  <div class="footer-line">Documento controlado — Para uso interno de Agro Bicufa SRL</div>
</div>

<!-- CONTENIDO -->
${body}

</body>
</html>`;
}

// ─── Procesar archivos ────────────────────────────────────────
const files = [
  {
    md: path.resolve(__dirname, '../reports/41_PD-COM-001_PROCESO_VENTAS.md'),
    pdf: path.join(OUT_DIR, 'PD-COM-001_Proceso_Ventas_AgroBicufa.pdf'),
    title: 'Proceso de Ventas',
    subtitle: 'Gestión del ciclo comercial desde lead hasta cierre',
    code: 'PD-COM-001',
    clauses: 'ISO 9001:2015 — 8.2.1 / 8.2.2 / 8.2.3 / 8.2.4',
  },
  {
    md: path.resolve(__dirname, '../reports/42_PD-CRE-001_PROCESO_EVALUACION_RIESGO_CREDITO.md'),
    pdf: path.join(OUT_DIR, 'PD-CRE-001_Proceso_Evaluacion_Riesgo_Crediticio_AgroBicufa.pdf'),
    title: 'Proceso de Evaluación de Riesgo Crediticio',
    subtitle: 'Scoring ponderado, tier crediticio y gestión de workflows de crédito',
    code: 'PD-CRE-001',
    clauses: 'ISO 9001:2015 — 6.1 / 7.1.6 / 8.2.2 / 8.4.1 / 9.1.3',
  },
];

for (const f of files) {
  const md = fs.readFileSync(f.md, 'utf8');
  const html = buildHtml(f.title, f.subtitle, f.code, f.clauses, md);

  // Escribir HTML temporal
  const htmlPath = path.join(OUT_DIR, path.basename(f.pdf, '.pdf') + '.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  // Convertir con Chrome headless
  console.log(`Generando: ${path.basename(f.pdf)}...`);
  try {
    execSync(
      `"${CHROME}" --headless=new --disable-gpu --no-sandbox --print-to-pdf="${f.pdf}" --print-to-pdf-no-header "file:///${htmlPath.replace(/\\/g, '/')}"`,
      { stdio: 'inherit', timeout: 30000 }
    );
    console.log(`  ✅ ${f.pdf}`);
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
  }
}

console.log('\nPDFs generados en:', OUT_DIR);
