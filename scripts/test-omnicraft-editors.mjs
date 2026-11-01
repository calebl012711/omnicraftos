import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runTests() {
  console.log('--- Starting OmniCraft Bento & PostMessage Live Sync Tests ---');

  // Start local http server to serve public/
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(rootDir, 'public', reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const port = 8789;
  await new Promise(r => server.listen(port, r));
  console.log(`Local static server running at http://localhost:${port}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext();

  let failed = false;

  try {
    // 1. Test RiverStudio in Iframe
    console.log('\n[1/2] Testing RiverCast & OneStudio (riverstudio)...');
    const hostPage = await context.newPage();

    await hostPage.setContent(`
      <!doctype html>
      <html>
        <head><title>OmniCraft OS Test Host</title></head>
        <body style="margin:0;padding:0;">
          <iframe id="editorFrame" src="http://localhost:${port}/editors/riverstudio/index.html" style="width:1280px;height:720px;border:none;"></iframe>
        </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });

    // Hook host message listener to capture events from iframe
    await hostPage.evaluate(() => {
      window.__receivedFromEditor = [];
      window.addEventListener('message', (event) => {
        window.__receivedFromEditor.push(event.data);
      });
    });

    const iframeElement = await hostPage.waitForSelector('#editorFrame');
    const riverFrame = await iframeElement.contentFrame();
    if (!riverFrame) throw new Error('Could not get RiverStudio iframe contentFrame');
    await riverFrame.waitForLoadState('domcontentloaded');

    // Verify Bento badge
    const riverBentoBadge = await riverFrame.locator('[data-testid="bento-badge-omnicraft"]').textContent();
    console.log('✓ Found Bento badge in RiverStudio:', riverBentoBadge.trim());
    if (riverBentoBadge.trim() !== 'OMNICRAFT // BROADCAST ISO') {
      console.error('FAIL: Expected "OMNICRAFT // BROADCAST ISO", got:', riverBentoBadge);
      failed = true;
    }

    // Test theme change: light
    console.log('Testing omnicraft:theme-change -> light...');
    await hostPage.evaluate(() => {
      const frame = document.getElementById('editorFrame');
      frame.contentWindow.postMessage({ type: 'omnicraft:theme-change', theme: 'light' }, '*');
    });
    await hostPage.waitForTimeout(200);

    const riverThemeAttr = await riverFrame.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('✓ RiverStudio data-theme after light request:', riverThemeAttr);
    if (riverThemeAttr !== 'light') {
      console.error('FAIL: Expected data-theme to be "light", got:', riverThemeAttr);
      failed = true;
    }

    // Test theme change: dark
    console.log('Testing omnicraft:theme-change -> dark...');
    await hostPage.evaluate(() => {
      const frame = document.getElementById('editorFrame');
      frame.contentWindow.postMessage({ type: 'omnicraft:theme-change', theme: 'dark' }, '*');
    });
    await hostPage.waitForTimeout(200);
    const riverThemeAttrDark = await riverFrame.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('✓ RiverStudio data-theme after dark request:', riverThemeAttrDark);
    if (riverThemeAttrDark) {
      console.error('FAIL: Expected data-theme to be null/cleared, got:', riverThemeAttrDark);
      failed = true;
    }

    // Test edit-asset import
    console.log('Testing omnicraft:edit-asset import...');
    await hostPage.evaluate(() => {
      const frame = document.getElementById('editorFrame');
      frame.contentWindow.postMessage({
        type: 'omnicraft:edit-asset',
        asset: {
          name: 'bento-cad-demo.webm',
          mime: 'video/webm',
          bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]).buffer
        }
      }, '*');
    });
    await hostPage.waitForTimeout(300);

    const assetNoticeVisible = await riverFrame.evaluate(() => {
      const el = document.getElementById('importedAssetNotice');
      return el && el.style.display !== 'none';
    });
    const assetNameText = await riverFrame.evaluate(() => {
      const el = document.getElementById('importedAssetName');
      return el ? el.textContent : '';
    });
    console.log('✓ Asset notice visible:', assetNoticeVisible, '| Name:', assetNameText.trim());
    if (!assetNoticeVisible || !assetNameText.includes('bento-cad-demo.webm')) {
      console.error('FAIL: Asset was not loaded into RiverStudio UI');
      failed = true;
    }

    // Check parent received asset-loaded acknowledgment
    const riverAssetLoadedAck = await hostPage.evaluate(() => {
      return window.__receivedFromEditor.find(m => m.type === 'omnicraft:asset-loaded');
    });
    console.log('✓ Parent received omnicraft:asset-loaded:', Boolean(riverAssetLoadedAck));
    if (!riverAssetLoadedAck) {
      console.error('FAIL: Parent did not receive omnicraft:asset-loaded');
      failed = true;
    }

    // Test export-ready event
    console.log('Testing export-ready postMessage event...');
    await riverFrame.evaluate(() => {
      document.getElementById('btnDownloadAudioIso').click();
    });
    await hostPage.waitForTimeout(300);

    const riverExports = await hostPage.evaluate(() => {
      return window.__receivedFromEditor.filter(m => m.type === 'omnicraft:export-ready');
    });
    console.log('✓ RiverStudio omnicraft:export-ready count:', riverExports.length);
    if (riverExports.length === 0) {
      console.error('FAIL: omnicraft:export-ready was not posted to parent');
      failed = true;
    } else {
      console.log('  Exported file payload:', riverExports[0].file?.name, riverExports[0].file?.mime, riverExports[0].file?.size + ' bytes');
    }

    await hostPage.close();


    // 2. Test StudioCut in Iframe
    console.log('\n[2/2] Testing Studio Cut NLE (studiocut)...');
    const cutHostPage = await context.newPage();

    await cutHostPage.setContent(`
      <!doctype html>
      <html>
        <head><title>OmniCraft OS Test Host - StudioCut</title></head>
        <body style="margin:0;padding:0;">
          <iframe id="editorFrame" src="http://localhost:${port}/editors/studiocut/index.html" style="width:1280px;height:720px;border:none;"></iframe>
        </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });

    // Hook parent messages
    await cutHostPage.evaluate(() => {
      window.__receivedFromEditor = [];
      window.addEventListener('message', (event) => {
        window.__receivedFromEditor.push(event.data);
      });
    });

    const cutIframeElement = await cutHostPage.waitForSelector('#editorFrame');
    const cutFrame = await cutIframeElement.contentFrame();
    if (!cutFrame) throw new Error('Could not get StudioCut iframe contentFrame');
    await cutFrame.waitForLoadState('domcontentloaded');

    // Verify Bento badge
    const cutBentoBadge = await cutFrame.locator('[data-testid="bento-badge-omnicraft"]').textContent();
    console.log('✓ Found Bento badge in StudioCut:', cutBentoBadge.trim());
    if (cutBentoBadge.trim() !== 'OMNICRAFT // STUDIO CUT NLE') {
      console.error('FAIL: Expected "OMNICRAFT // STUDIO CUT NLE", got:', cutBentoBadge);
      failed = true;
    }

    // Test theme change
    console.log('Testing omnicraft:theme-change -> light...');
    await cutHostPage.evaluate(() => {
      const frame = document.getElementById('editorFrame');
      frame.contentWindow.postMessage({ type: 'omnicraft:theme-change', theme: 'light' }, '*');
    });
    await cutHostPage.waitForTimeout(200);

    const cutThemeAttr = await cutFrame.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('✓ StudioCut data-theme after light request:', cutThemeAttr);
    if (cutThemeAttr !== 'light') {
      console.error('FAIL: Expected data-theme to be "light", got:', cutThemeAttr);
      failed = true;
    }

    // Test edit-asset import into timeline track A1
    console.log('Testing omnicraft:edit-asset import for audio track A1...');
    await cutHostPage.evaluate(() => {
      const frame = document.getElementById('editorFrame');
      frame.contentWindow.postMessage({
        type: 'omnicraft:edit-asset',
        asset: {
          name: 'omnicraft-theme-jingle.wav',
          mime: 'audio/wav',
          bytes: new Uint8Array([82, 73, 70, 70]).buffer
        }
      }, '*');
    });
    await cutHostPage.waitForTimeout(300);

    const inspection = await cutFrame.evaluate(async () => {
      return await window.studiocut.inspect();
    });
    const a1Clips = inspection.tracks.A1;
    const importedA1 = a1Clips.find(c => c.label.includes('omnicraft-theme-jingle'));
    console.log('✓ StudioCut tracks.A1 clips:', a1Clips.length, '| Imported clip found:', Boolean(importedA1));
    if (!importedA1) {
      console.error('FAIL: Asset was not loaded into StudioCut track A1');
      failed = true;
    }

    // Check parent received asset-loaded acknowledgment
    const cutAssetLoadedAck = await cutHostPage.evaluate(() => {
      return window.__receivedFromEditor.find(m => m.type === 'omnicraft:asset-loaded');
    });
    console.log('✓ Parent received omnicraft:asset-loaded:', Boolean(cutAssetLoadedAck));
    if (!cutAssetLoadedAck) {
      console.error('FAIL: Parent did not receive omnicraft:asset-loaded');
      failed = true;
    }

    // Test export-ready event
    console.log('Testing export-ready postMessage event...');
    await cutFrame.evaluate(() => {
      document.getElementById('btnExportAudioWav').click();
    });
    await cutHostPage.waitForTimeout(300);

    const cutExports = await cutHostPage.evaluate(() => {
      return window.__receivedFromEditor.filter(m => m.type === 'omnicraft:export-ready');
    });
    console.log('✓ StudioCut omnicraft:export-ready count:', cutExports.length);
    if (cutExports.length === 0) {
      console.error('FAIL: omnicraft:export-ready was not posted to parent');
      failed = true;
    } else {
      console.log('  Exported file payload:', cutExports[0].file?.name, cutExports[0].file?.mime);
    }

    await cutHostPage.close();
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    server.close();
  }

  if (failed) {
    console.error('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL OMNICRAFT BENTO & POSTMESSAGE LIVE SYNC TESTS PASSED');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
