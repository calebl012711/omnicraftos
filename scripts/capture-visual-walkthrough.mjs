#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ARTIFACT_DIR =
  '/Users/caleblickteig/.gemini/antigravity/brain/a4e921f4-9a26-464a-9067-b692b630441b';

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.dxf': 'application/dxf',
  '.step': 'application/step',
  '.stl': 'model/stl',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

function startStaticServer(port = 4175) {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let relPath = decodeURIComponent(parsed.pathname);
    if (relPath === '/') relPath = '/index.html';

    let filePath = path.join(DIST_DIR, relPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      // Return real 404 for missing static files (e.g. optional fonts/manifest.txt in editors)
      if (relPath.startsWith('/editors/') || path.extname(relPath) !== '') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function buildSamplePdfBytes() {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 148 >>
stream
BT
/F1 24 Tf
72 700 Td
(Mosaic Forge - PdfCraft Technical Datasheet) Tj
/F1 14 Tf
0 -36 Td
(Part: NEMA-17 Motor Adapter Plate 60x60x8mm) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
495
%%EOF
`;
  return new TextEncoder().encode(pdf);
}

async function waitForIframeCanvas(page, minWaitMs = 1500) {
  const iframeElement = await page.waitForSelector('[data-testid="active-editor-iframe"]', {
    timeout: 30000
  });
  const frame = await iframeElement.contentFrame();
  if (!frame) throw new Error('Could not resolve active editor iframe contentFrame');
  await frame.waitForSelector('canvas', { timeout: 45000 });
  // Wait for any #<app>_loading or #loading element inside the editor iframe to be removed or hidden
  try {
    await frame.waitForFunction(
      () => {
        const loader = document.querySelector('[id$="loading"]');
        if (!loader) return true;
        const style = window.getComputedStyle(loader);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      },
      null,
      { timeout: 45000 }
    );
  } catch {
    // proceed if timeout
  }
  await page.waitForTimeout(minWaitMs);
  return frame;
}

async function captureRemainingAndRefined() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const server = await startStaticServer(4175);
  const baseUrl = 'http://127.0.0.1:4175';

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: [
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    async function launchWorkspaceForScreenshot(wsId) {
      await page.getByTestId(`launch-ws-${wsId}`).click();
      await page.waitForSelector('[data-testid="view-workspace"]');
      await page.getByTestId('renderer-mode-select').selectOption('webgl');
    }

    // 7. SolidCraft 3D CAD — Build 3D Motor Adapter Plate & show 3D viewport + completed inspector + captured exports
    console.log('7/20 Capturing SolidCraft 3D CAD with active 3D viewport & completed workflow...');
    await launchWorkspaceForScreenshot('solidcraft');
    const scFrame = await waitForIframeCanvas(page, 1500);
    await scFrame.waitForFunction(() => Boolean(window.solidcraft), null, { timeout: 45000 });

    // Click "New design" on SolidCraft's initial Start screen or press Escape so the 3D viewport is visible
    await scFrame.evaluate(async () => {
      await window.solidcraft.execute('file.new', { name: 'MotorAdapterPlate' });
      // Click top-left "Design" or press Escape to exit Start overlay if open
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new MouseEvent('mousedown', { clientX: 460, clientY: 400, bubbles: true, button: 0 }));
        c.dispatchEvent(new MouseEvent('mouseup', { clientX: 460, clientY: 400, bubbles: true, button: 0 }));
      }
    });
    await page.waitForTimeout(600);

    await page.getByTestId('run-verified-workflow-btn').click();
    // Wait until workflow button finishes (not disabled)
    await page.waitForSelector('[data-testid="run-verified-workflow-btn"]:not([disabled])', {
      timeout: 30000
    });
    // Make sure Start menu is closed so 3D geometry is shown in viewport
    await scFrame.evaluate(async () => {
      const c = document.querySelector('canvas');
      if (c) {
        // Click "Back to ..." button at (235, 72) if Start screen is open, or fit view
        c.dispatchEvent(new PointerEvent('pointerdown', { clientX: 235, clientY: 72, bubbles: true, button: 0 }));
        c.dispatchEvent(new PointerEvent('pointerup', { clientX: 235, clientY: 72, bubbles: true, button: 0 }));
      }
      try {
        await window.solidcraft.execute('view.isometric', {});
      } catch {}
      try {
        await window.solidcraft.execute('view.fit', {});
      } catch {}
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '07-solidcraft-3d-cad-workflow.png')
    });

    // 8. FilmCraft Video Studio — Wait for workflow completion so sequenceAfterRazorSplit shows in drawer
    console.log('8/20 Capturing FilmCraft Video Studio with completed razor-split output...');
    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }
    await launchWorkspaceForScreenshot('filmcraft');
    const fcFrame = await waitForIframeCanvas(page, 1500);
    await fcFrame.waitForFunction(() => Boolean(window.filmcraft), null, { timeout: 45000 });
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForSelector('[data-testid="run-verified-workflow-btn"]:not([disabled])', {
      timeout: 30000
    });
    await fcFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 400, bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '08-filmcraft-video-studio-workflow.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 9. PhotoCraft Layer Lab — Wait for 2-stage boot loader (#photocraft_loading removed), then load mosaic-test-image.png
    console.log('9/20 Capturing PhotoCraft Layer Lab (after 2-stage WASM boot)...');
    await launchWorkspaceForScreenshot('photocraft');
    const pcFrame = await waitForIframeCanvas(page, 2000);
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForSelector('[data-testid="run-verified-workflow-btn"]:not([disabled])', {
      timeout: 15000
    });
    await pcFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 450, clientY: 320, bubbles: true }));
      }
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '09-photocraft-layer-lab.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 12. FigCraft UI Design (?control=1 enabled)
    console.log('12/20 Testing & Capturing FigCraft UI Design...');
    await launchWorkspaceForScreenshot('figcraft');
    const fgFrame = await waitForIframeCanvas(page, 2000);
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForSelector('[data-testid="run-verified-workflow-btn"]:not([disabled])', {
      timeout: 15000
    });
    await fgFrame.evaluate(async () => {
      if (window.figcraft && typeof window.figcraft.execute === 'function') {
        try {
          await window.figcraft.execute('shape.rectangle', { x: 80, y: 80, width: 320, height: 200 });
        } catch {}
      }
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '12-figcraft-ui-design.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 13. PdfCraft Reader & Editor
    console.log('13/20 Testing & Capturing PdfCraft Reader & Editor...');
    await launchWorkspaceForScreenshot('pdfcraft');
    const pdfFrame = await waitForIframeCanvas(page, 2000);
    const pdfBytes = Array.from(buildSamplePdfBytes());
    await pdfFrame.evaluate(async (arr) => {
      const u8 = new Uint8Array(arr);
      await window.__mosaicBridge.openFileInEditor(
        'mosaic-datasheet.pdf',
        u8.buffer,
        'application/pdf'
      );
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    }, pdfBytes);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '13-pdfcraft-reader-editor.png')
    });

    // 14. WordCraft Documents
    console.log('14/20 Testing & Capturing WordCraft Documents...');
    await launchWorkspaceForScreenshot('wordcraft');
    const wcFrame = await waitForIframeCanvas(page, 2000);
    await wcFrame.evaluate(async () => {
      const docText = `# Mosaic Forge Engineering Specification\n\n## 1. Motor Adapter Assembly\n- Material: 6061-T6 Aluminum\n- Dimensions: 60mm x 60mm x 8mm\n- Center Bore: 22mm H7 tolerance\n- Fasteners: 4x M5 socket head cap screws\n`;
      const u8 = new TextEncoder().encode(docText);
      await window.__mosaicBridge.openFileInEditor(
        'engineering-spec.md',
        u8.buffer,
        'text/markdown'
      );
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '14-wordcraft-documents.png')
    });

    // 15. GridCraft Spreadsheets
    console.log('15/20 Testing & Capturing GridCraft Spreadsheets...');
    await launchWorkspaceForScreenshot('gridcraft');
    const gcFrame = await waitForIframeCanvas(page, 2000);
    await gcFrame.evaluate(async () => {
      const csvText = `Part Number,Component,Material,Qty,Unit Cost,Extended\nMF-101,NEMA-17 Adapter Plate,6061-T6 Al,1,18.50,=D2*E2\nMF-102,M5x16 Socket Cap Screw,A2 Stainless,4,0.35,=D3*E3\nMF-103,608-2RS Ball Bearing,Chrome Steel,2,2.40,=D4*E4\n`;
      const u8 = new TextEncoder().encode(csvText);
      await window.__mosaicBridge.openFileInEditor('bom-costing.csv', u8.buffer, 'text/csv');
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 450, clientY: 300, bubbles: true }));
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '15-gridcraft-spreadsheets.png')
    });

    // 16. SoundCraft Audio Studio
    console.log('16/20 Testing & Capturing SoundCraft Audio Studio...');
    await launchWorkspaceForScreenshot('soundcraft');
    const sndFrame = await waitForIframeCanvas(page, 2000);
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForTimeout(1800);
    await sndFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '16-soundcraft-audio-studio.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 17. EffectCraft Motion & VFX
    console.log('17/20 Testing & Capturing EffectCraft Motion & VFX...');
    await launchWorkspaceForScreenshot('effectcraft');
    const ecFrame = await waitForIframeCanvas(page, 2000);
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForTimeout(1800);
    await ecFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '17-effectcraft-motion-vfx.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 18. LightCraft RAW & Photo Catalog
    console.log('18/20 Testing & Capturing LightCraft RAW & Catalog...');
    await launchWorkspaceForScreenshot('lightcraft');
    const lcFrame = await waitForIframeCanvas(page, 2000);
    await page.getByTestId('run-verified-workflow-btn').click();
    await page.waitForTimeout(1800);
    await lcFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '18-lightcraft-raw-catalog.png')
    });

    if (await page.locator('.mf-automation-drawer').isVisible()) {
      await page.getByTestId('toggle-automation-drawer-btn').click();
    }

    // 19. DesignCraft Desktop Publishing
    console.log('19/20 Testing & Capturing DesignCraft Publishing...');
    await launchWorkspaceForScreenshot('designcraft');
    const dcFrame = await waitForIframeCanvas(page, 2000);
    await dcFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '19-designcraft-publishing.png')
    });

    // 20. DeckCraft Presentations
    console.log('20/20 Testing & Capturing DeckCraft Presentations...');
    await launchWorkspaceForScreenshot('deckcraft');
    const dckFrame = await waitForIframeCanvas(page, 2000);
    await dckFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 350, bubbles: true }));
      }
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '20-deckcraft-presentations.png')
    });

    console.log('All remaining & refined screenshots captured successfully in:', ARTIFACT_DIR);
  } finally {
    await browser.close();
    server.close();
  }
}

captureRemainingAndRefined().catch((err) => {
  console.error('Visual capture failed:', err);
  process.exit(1);
});
