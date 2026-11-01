#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const EDITORS_DIR = path.join(ROOT_DIR, 'public', 'editors');

const STUDIOS = [
  'filmcraft',
  'photocraft',
  'vectorcraft',
  'figcraft',
  'wordcraft',
  'gridcraft',
  'pdfcraft',
  'lightcraft',
  'designcraft',
  'soundcraft',
  'deckcraft',
  'effectcraft'
];

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
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

function startServer(port = 4892) {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let relPath = decodeURIComponent(parsed.pathname);
    if (relPath === '/') relPath = '/index.html';

    // Serve from public/editors
    let filePath = path.join(ROOT_DIR, 'public', relPath.replace(/^\/editors\//, 'editors/'));
    if (!fs.existsSync(filePath)) {
      filePath = path.join(EDITORS_DIR, relPath);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not found: ${relPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  console.log('======================================================================');
  console.log('OmniCraft OS — WASM & Bento Theme Bridge Verification');
  console.log('Auditing 12 WebAssembly Studios');
  console.log('======================================================================\n');

  // Step 1: Disk & WASM Binary Validation
  console.log('--- Step 1: WASM Binary Integrity Audit ---');
  const wasmAudit = {};
  for (const studio of STUDIOS) {
    const studioDir = path.join(EDITORS_DIR, studio);
    const files = fs.readdirSync(studioDir);
    const wasmFiles = files.filter((f) => f.endsWith('.wasm'));

    if (wasmFiles.length === 0) {
      wasmAudit[studio] = { valid: false, error: 'No wasm file found' };
      console.error(`❌ [${studio}] No .wasm binary found in ${studioDir}`);
      continue;
    }

    const wasmFile = wasmFiles[0];
    const wasmPath = path.join(studioDir, wasmFile);
    const stat = fs.statSync(wasmPath);

    // Read first 4 bytes for magic header \0asm
    const fd = fs.openSync(wasmPath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);

    const hasMagic = header[0] === 0x00 && header[1] === 0x61 && header[2] === 0x73 && header[3] === 0x6d;
    const mb = (stat.size / (1024 * 1024)).toFixed(2);

    wasmAudit[studio] = {
      valid: hasMagic,
      file: wasmFile,
      sizeBytes: stat.size,
      sizeMb: `${mb} MB`,
      magicHeader: hasMagic ? '0x0061736D (valid \\0asm)' : 'INVALID'
    };

    if (hasMagic) {
      console.log(`✓ [${studio}] ${wasmFile} (${mb} MB) — Valid WebAssembly header`);
    } else {
      console.error(`❌ [${studio}] ${wasmFile} — INVALID WASM HEADER`);
    }
  }

  // Step 2: Live Browser PostMessage & Bento Bridge Audit
  console.log('\n--- Step 2: Playwright Live Browser PostMessage & Bridge Audit ---');
  const PORT = 4892;
  const server = await startServer(PORT);
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox']
  });

  const bridgeResults = {};

  try {
    for (const studio of STUDIOS) {
      const page = await browser.newPage();
      const studioUrl = `http://127.0.0.1:${PORT}/editors/${studio}/index.html`;

      const receivedMessages = [];
      await page.exposeFunction('__logParentMessage', (msg) => {
        receivedMessages.push(msg);
      });

      // Inject parent host simulation into page before navigation
      await page.addInitScript(() => {
        window.addEventListener('message', (event) => {
          if (event.data && typeof event.data === 'object') {
            window.__logParentMessage(event.data);
          }
        });
      });

      await page.goto(studioUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Check title
      const title = await page.title();
      const hasOmniBrandTitle = title.includes('OmniCraft OS');

      // Check Bento badge & hairline styling
      const hasBadge = (await page.$('.omnicraft-bento-badge')) !== null;
      const hasPulseDot = (await page.$('.omnicraft-pulse-dot')) !== null;
      const hasHairlineCanvas = (await page.$('canvas')) !== null;

      // Test postMessage 'omnicraft:theme-change'
      const themeResult = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type === 'omnicraft:theme-change:ok') {
              window.removeEventListener('message', onMsg);
              resolve({ ok: true, theme: e.data.theme });
            }
          };
          window.addEventListener('message', onMsg);
          window.postMessage({ type: 'omnicraft:theme-change', theme: 'light', accent: '#3b82f6' }, '*');
          setTimeout(() => resolve({ ok: false, error: 'Timeout waiting for theme-change:ok' }), 2000);
        });
      });

      // Test postMessage 'omnicraft:import-asset'
      const importResult = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type === 'omnicraft:import-asset:ok') {
              window.removeEventListener('message', onMsg);
              resolve({ ok: true, result: e.data.result });
            }
          };
          window.addEventListener('message', onMsg);
          const sampleBytes = new Uint8Array([0x4f, 0x4d, 0x4e, 0x49, 0x43, 0x52, 0x41, 0x46, 0x54]);
          window.postMessage(
            {
              type: 'omnicraft:import-asset',
              asset: {
                name: 'test-import.bin',
                mimeType: 'application/octet-stream',
                bytes: sampleBytes
              }
            },
            '*'
          );
          setTimeout(() => resolve({ ok: false, error: 'Timeout waiting for import-asset:ok' }), 2000);
        });
      });

      // Test synthetic export forwarding 'omnicraft:export-ready'
      const exportResult = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type === 'omnicraft:export-ready') {
              window.removeEventListener('message', onMsg);
              resolve({
                ok: true,
                type: e.data.type,
                name: e.data.name,
                hasBytes: Boolean(e.data.bytes || e.data.file?.data)
              });
            }
          };
          window.addEventListener('message', onMsg);

          // Trigger simulated download anchor click to test capture and forward
          const blob = new Blob(['OmniCraft Test Export Data'], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'omnicraft-export-test.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => resolve({ ok: false, error: 'Timeout waiting for export-ready' }), 2000);
        });
      });

      const studioSummary = {
        title,
        hasOmniBrandTitle,
        hasBadge,
        hasPulseDot,
        hasHairlineCanvas,
        themeSync: themeResult.ok,
        assetImport: importResult.ok,
        exportForwarding: exportResult.ok
      };

      bridgeResults[studio] = studioSummary;

      const statusIcons = [
        hasOmniBrandTitle ? '🏷️' : '❌',
        hasBadge ? '🍱' : '❌',
        themeResult.ok ? '🎨' : '❌',
        importResult.ok ? '📥' : '❌',
        exportResult.ok ? '📤' : '❌'
      ].join(' ');

      console.log(`[${studio.padEnd(12)}] ${statusIcons} Title: "${title.slice(0, 36)}..." | Theme: ${themeResult.ok ? 'OK' : 'FAIL'} | Import: ${importResult.ok ? 'OK' : 'FAIL'} | Export: ${exportResult.ok ? 'OK' : 'FAIL'}`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n======================================================================');
  console.log('AUDIT SUMMARY:');
  const allWasmValid = Object.values(wasmAudit).every((w) => w.valid);
  const allBentoValid = Object.values(bridgeResults).every(
    (b) => b.hasOmniBrandTitle && b.hasBadge && b.themeSync && b.assetImport && b.exportForwarding
  );

  console.log(`WASM Binaries Valid: ${allWasmValid ? '12/12 PASSED (100%)' : 'FAIL'}`);
  console.log(`Bento Bridge & PostMessage: ${allBentoValid ? '12/12 PASSED (100%)' : 'FAIL'}`);
  console.log('======================================================================');

  return { wasmAudit, bridgeResults, allWasmValid, allBentoValid };
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
