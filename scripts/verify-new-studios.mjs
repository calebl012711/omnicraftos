import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/caleblickteig/.gemini/antigravity/brain/a4e921f4-9a26-464a-9067-b692b630441b';
const PORT = 4179;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let resolved = false;
    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (!resolved && (text.includes(String(PORT)) || text.includes('Local:'))) {
        resolved = true;
        resolve(proc);
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(proc);
      }
    }, 3000);
    proc.on('error', reject);
  });
}

async function run() {
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1520, height: 940 },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    console.log('1. Loading Studio Home with 18 Live Studios...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '21-updated-studio-home-18-studios.png') });

    // 2. Test RiverCast & OneStudio ISO Recording Studio
    console.log('2. Testing RiverCast & OneStudio ISO Recording Studio...');
    await page.click('[data-testid="launch-ws-riverstudio"]');
    await page.waitForTimeout(1800);
    await page.click('[data-testid="run-verified-workflow-btn"]');
    await page.waitForTimeout(2200);
    const riverOut = await page.textContent('[data-testid="automation-output-pre"]');
    console.log('RiverCast & OneStudio Output:', riverOut?.slice(0, 260));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '22-rivercast-onestudio-separate-iso.png') });

    // 3. Test Studio Cut Multi-Track ISO Video Editor
    console.log('3. Testing Studio Cut Multi-Track ISO Video Editor...');
    await page.click('[data-testid="launch-ws-studiocut"]');
    await page.waitForTimeout(1200);
    await page.click('[data-testid="run-verified-workflow-btn"]');
    await page.waitForTimeout(2800);
    const studioCutOut = await page.textContent('[data-testid="automation-output-pre"]');
    console.log('Studio Cut Output:', studioCutOut?.slice(0, 260));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '23-studiocut-multitrack-video-editor.png') });

    // 4. Test BandForge (GarageBand DAW)
    console.log('4. Testing BandForge (GarageBand DAW)...');
    await page.click('[data-testid="launch-ws-bandforge"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="run-verified-workflow-btn"]');
    await page.waitForTimeout(1400);
    const bandForgeOut = await page.textContent('[data-testid="automation-output-pre"]');
    console.log('BandForge Output:', bandForgeOut?.slice(0, 260));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '24-bandforge-garageband-daw.png') });

    // Also capture BandForge Guitar Amp Designer & Stompbox Pedalboard tab
    const bfFrame = page.frameLocator('[data-testid="active-editor-iframe"]');
    await bfFrame.locator('[data-testid="tab-amp-rig"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '25-bandforge-tweed-amp-pedalboard.png') });

    // 5. Test FruityForge 21 (FL Studio DAW)
    console.log('5. Testing FruityForge 21 (FL Studio DAW)...');
    await page.click('[data-testid="launch-ws-flstudio"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="run-verified-workflow-btn"]');
    await page.waitForTimeout(1500);
    const flOut = await page.textContent('[data-testid="automation-output-pre"]');
    console.log('FruityForge 21 Output:', flOut?.slice(0, 260));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '26-fruityforge-flstudio-daw.png') });

    // 6. Check Shared Assets Hub to verify all separate ISO recordings, video renders, and DAW WAV stems are captured
    console.log('6. Verifying Shared Assets Hub captures...');
    await page.click('[data-testid="nav-assets"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '27-shared-assets-iso-and-daw-exports.png') });

    console.log('All 4 new studios tested and screenshots captured!');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
