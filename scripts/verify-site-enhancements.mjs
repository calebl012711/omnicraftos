import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/caleblickteig/.gemini/antigravity/brain/a4e921f4-9a26-464a-9067-b692b630441b';
const PORT = 4178;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (d) => {
      if (String(d).includes(String(PORT))) resolve();
    });
    setTimeout(resolve, 4000);
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/caleblickteig/.cache/hyperframes/chrome/chrome-headless-shell/mac-152.0.7977.30/chrome-headless-shell-mac-x64/chrome-headless-shell'
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    // 1. Screenshot updated Home Page Launcher with Watch Launch Video (20s) + Try Demo buttons
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '21-updated-studio-home-18-studios.png') });
    console.log('✓ Captured updated Home Page Launcher -> 21-updated-studio-home-18-studios.png');

    // 2. Open HyperFrames Launch Reel Cinema Player Modal
    await page.getByTestId('watch-launch-reel-btn').click();
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '28-hyperframes-cinema-showcase-modal.png') });
    console.log('✓ Captured HyperFrames Cinema Showcase Modal -> 28-hyperframes-cinema-showcase-modal.png');

    // Close modal
    await page.getByTestId('close-showcase-dialog').click();
    await sleep(500);

    // 3. Click "Try Demo" on RiverCast & OneStudio card -> verifies auto-demo + Quick-Hop strip + Export Toast Popover!
    await page.getByTestId('card-demo-riverstudio').click();
    await sleep(3200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '22-rivercast-onestudio-separate-iso.png') });
    console.log('✓ Captured RiverCast ISO with Quick-Hop Strip & Popover Toast -> 22-rivercast-onestudio-separate-iso.png');
  } finally {
    await context.close();
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
