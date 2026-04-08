const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    try {
        console.log('Iniciando generador de PDF...');
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const basePath = path.resolve(__dirname);

        // Archivo 1
        const salesHtmlPath = `file:///${path.join(basePath, 'PD-COM-001_Proceso_Ventas_AgroBiciuffa.html').replace(/\\/g, '/')}`;
        console.log('Cargando: ', salesHtmlPath);
        await page.goto(salesHtmlPath, { waitUntil: 'networkidle0' });
        // wait extra for mermaid
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.pdf({
            path: path.join(basePath, 'PD-COM-001_Proceso_Ventas_AgroBiciuffa.pdf'),
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        console.log('Generado: PD-COM-001_Proceso_Ventas_AgroBiciuffa.pdf');

        // Archivo 2
        const creditHtmlPath = `file:///${path.join(basePath, 'PD-CRE-001_Proceso_Evaluacion_Riesgo_Crediticio_AgroBiciuffa.html').replace(/\\/g, '/')}`;
        console.log('Cargando: ', creditHtmlPath);
        await page.goto(creditHtmlPath, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.pdf({
            path: path.join(basePath, 'PD-CRE-001_Proceso_Evaluacion_Riesgo_Crediticio_AgroBiciuffa.pdf'),
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        console.log('Generado: PD-CRE-001_Proceso_Evaluacion_Riesgo_Crediticio_AgroBiciuffa.pdf');

        await browser.close();
        console.log('Completado correctamente.');
    } catch (e) {
        console.error('Error:', e);
    }
})();
