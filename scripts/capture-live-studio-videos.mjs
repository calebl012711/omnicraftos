import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/caleblickteig/Documents/antigravity/joyful-pasteur';
const ARTIFACT_DIR = '/Users/caleblickteig/.gemini/antigravity/brain/a4e921f4-9a26-464a-9067-b692b630441b';
const LIVE_REC_DIR = path.join(ROOT, 'brag-output', 'work', 'live_recordings');
fs.mkdirSync(LIVE_REC_DIR, { recursive: true });

const PORT = 4188;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function injectVisualCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__mf_demo_cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = '__mf_demo_cursor';
    Object.assign(cursor.style, {
      position: 'fixed',
      top: '540px',
      left: '960px',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: 'rgba(99, 102, 241, 0.85)',
      border: '2.5px solid #ffffff',
      boxShadow: '0 0 18px rgba(99, 102, 241, 0.9), 0 4px 10px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      zIndex: '999999',
      transition: 'top 0.35s cubic-bezier(0.22, 1, 0.36, 1), left 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.14s ease',
      transform: 'translate(-50%, -50%) scale(1)'
    });
    document.body.appendChild(cursor);

    window.__moveDemoCursor = (x, y, click = false) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      if (click) {
        setTimeout(() => {
          cursor.style.transform = 'translate(-50%, -50%) scale(0.72)';
          cursor.style.background = 'rgba(244, 63, 94, 0.95)';
          setTimeout(() => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursor.style.background = 'rgba(99, 102, 241, 0.85)';
          }, 150);
        }, 280);
      }
    };
  });
}

async function moveAndClick(page, selector, waitAfterMs = 900) {
  await injectVisualCursor(page);
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  const box = await loc.boundingBox();
  if (box) {
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    await page.evaluate(({ x, y }) => window.__moveDemoCursor && window.__moveDemoCursor(x, y, true), { x: cx, y: cy });
    await sleep(360);
  }
  await loc.click();
  await sleep(waitAfterMs);
}

async function main() {
  console.log('Starting Vite preview server on port', PORT);
  const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  try {
    await waitForServer(BASE_URL);
    console.log('Server ready. Launching Chrome with 1920x1080 live video recording...');

    const browser = await chromium.launch({
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: LIVE_REC_DIR,
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(800);
    await injectVisualCursor(page);

    // 1. Standalone Home Page Launcher (Dark UI & Light UI)
    console.log('1. Capturing Standalone Home Page Launcher & filtering categories...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '21-updated-studio-home-18-studios.png') });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-studio-home-dark.png') });

    // Filter categories smoothly on Home Page
    await moveAndClick(page, 'button:has-text("Broadcast & Video")', 700);
    await moveAndClick(page, 'button:has-text("Music & Audio DAW")', 700);
    await moveAndClick(page, 'button:has-text("All Applications (18)")', 700);

    // 2. Enter RiverCast & OneStudio Separate ISO Studio (Full-Screen App Mode)
    console.log('2. Entering RiverCast & OneStudio Separate ISO Recording Studio...');
    await moveAndClick(page, '[data-testid="hero-launch-riverstudio"]', 1800);
    await moveAndClick(page, '[data-testid="run-verified-workflow-btn"]', 2400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '22-rivercast-onestudio-separate-iso.png') });

    // 3. Return to Home Page Launcher -> Enter Studio Cut NLE
    console.log('3. Returning to Home & Entering Studio Cut Multi-Track Video Editor...');
    await moveAndClick(page, '[data-testid="back-to-home-btn"]', 900);
    await moveAndClick(page, '[data-testid="hero-launch-studiocut"]', 1500);
    await moveAndClick(page, '[data-testid="run-verified-workflow-btn"]', 2600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '23-studiocut-multitrack-video-editor.png') });

    // 4. Return to Home Page Launcher -> Enter BandForge (GarageBand DAW)
    console.log('4. Returning to Home & Entering BandForge (GarageBand DAW)...');
    await moveAndClick(page, '[data-testid="back-to-home-btn"]', 900);
    await moveAndClick(page, '[data-testid="hero-launch-bandforge"]', 1500);
    await moveAndClick(page, '[data-testid="run-verified-workflow-btn"]', 1800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '24-bandforge-garageband-daw.png') });

    // Switch to Vintage '59 Tweed Guitar Amp & Stompbox Pedalboard
    const bfFrame = page.frameLocator('[data-testid="active-editor-iframe"]');
    await bfFrame.locator('[data-testid="tab-amp-rig"]').click();
    await sleep(900);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '25-bandforge-tweed-amp-pedalboard.png') });

    // 5. Return to Home Page Launcher -> Enter FruityForge 21 (FL Studio DAW)
    console.log('5. Returning to Home & Entering FruityForge 21 (FL Studio DAW)...');
    await moveAndClick(page, '[data-testid="back-to-home-btn"]', 900);
    await moveAndClick(page, '[data-testid="hero-launch-flstudio"]', 1500);
    await moveAndClick(page, '[data-testid="run-verified-workflow-btn"]', 1800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '26-fruityforge-flstudio-daw.png') });

    // Show Focused FL Studio Windows (F6 Rack, F7 Piano Roll, F9 Mixer)
    const frameFl = page.frameLocator('[data-testid="active-editor-iframe"]');
    await frameFl.locator('[data-fl-view="rack"]').click();
    await sleep(700);
    await frameFl.locator('[data-fl-view="pianoroll"]').click();
    await sleep(700);
    await frameFl.locator('[data-fl-view="mixer"]').click();
    await sleep(700);
    await frameFl.locator('[data-fl-view="all"]').click();
    await sleep(600);

    // 6. Return to Home -> Open Shared Asset Vault
    console.log('6. Returning to Home & Inspecting Shared Asset Vault...');
    await moveAndClick(page, '[data-testid="back-to-home-btn"]', 900);
    await moveAndClick(page, '[data-testid="nav-assets"]', 1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '27-shared-assets-iso-and-daw-exports.png') });

    // Return to Home for clean closing shot
    await moveAndClick(page, '[data-testid="nav-home"]', 900);

    const videoObj = page.video();
    await context.close();
    await browser.close();

    if (videoObj) {
      const recordedPath = await videoObj.path();
      const targetWebm = path.join(LIVE_REC_DIR, 'live_master_walkthrough.webm');
      fs.copyFileSync(recordedPath, targetWebm);
      console.log('Saved live browser interaction video to:', targetWebm);
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
