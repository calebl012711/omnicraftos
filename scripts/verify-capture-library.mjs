// Short, serial checks: synthetic device boundary, real encoders and real storage.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const base = process.env.OMNICRAFT_URL || 'http://127.0.0.1:4173';
const output = process.env.CAPTURE_LIBRARY_OUTPUT || 'verification/capture-library';
await fs.mkdir(output, { recursive: true });
const report = { at: new Date().toISOString(), physicalDevicesTested: false, nativeAppLaunched: false, tests: {} };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
try {
  for (const backend of ['opfs', 'indexeddb']) {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
    try {
      await context.addInitScript(fallback => {
        if (fallback) Object.defineProperty(navigator.storage, 'getDirectory', { value: undefined });
        function video(color) {
          const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
          const draw = () => { const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = 'white'; ctx.fillText(String(performance.now()), 10, 30); };
          draw(); const timer = setInterval(draw, 67);
          addEventListener('pagehide', () => clearInterval(timer));
          return canvas.captureStream(15);
        }
        navigator.mediaDevices.getDisplayMedia = async () => video('#cc2200');
        navigator.mediaDevices.getUserMedia = async () => video('#0044cc');
      }, backend === 'indexeddb');
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      await page.goto(`${base}/?tool=recorder`);
      await page.getByRole('button', { name: 'Choose screen or window', exact: true }).click();
      await page.getByRole('button', { name: 'Connect camera & microphone', exact: true }).click();
      for (let index = 0; index < 2; index++) {
        await page.getByRole('button', { name: 'Start recording', exact: true }).click();
        await page.locator('.capture-state').filter({ hasText: /^recording$/ }).waitFor();
        await page.waitForTimeout(2500);
        await page.getByRole('button', { name: 'Stop & save', exact: true }).click();
        await page.locator('.capture-state').filter({ hasText: /^complete$/ }).waitFor();
      }
      const take = page.locator('.capture-take-card').first();
      assert.equal(await page.locator('.capture-take-card').count(), 2);
      await take.getByRole('button', { name: 'Rename take', exact: true }).click();
      await take.getByLabel('Take name', { exact: true }).fill('Camera tutorial');
      await take.getByRole('button', { name: 'Save name', exact: true }).click();
      await page.getByRole('article', { name: 'Camera tutorial', exact: true }).waitFor();
      await page.reload();
      const restored = page.getByRole('article', { name: 'Camera tutorial', exact: true }); await restored.waitFor();
      for (const kind of ['screen', 'camera']) {
        const mediaFile = restored.locator('.capture-files > div').filter({ has: page.getByRole('button', { name: `Download ${kind}`, exact: true }) });
        await mediaFile.getByRole('button', { name: 'Check playback', exact: true }).click();
        const player = mediaFile.locator('video');
        await player.evaluate(video => video.play());
        await player.evaluate(video => new Promise((resolve, reject) => { const end = setTimeout(() => reject(Error('Video did not play')), 5000); const check = () => { if (video.currentTime > 0) { clearTimeout(end); resolve(); } else requestAnimationFrame(check); }; check(); }));
        const playbackUrl = await player.getAttribute('src');
        await restored.getByRole('button', { name: 'Close playback', exact: true }).click();
        assert.equal(await restored.locator('video').count(), 0);
        assert.equal(await page.evaluate(url => fetch(url).then(() => true, () => false), playbackUrl), false);
        const [download] = await Promise.all([page.waitForEvent('download'), restored.getByRole('button', { name: `Download ${kind}`, exact: true }).click()]);
        const destination = path.join(output, `${backend}-${kind}.mp4`); await download.saveAs(destination);
        const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', destination], { encoding: 'utf8' }));
        assert.ok(probe.streams.some(stream => stream.codec_type === 'video' && stream.width === 320));
        execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', destination, '-f', 'null', '-']);
      }
      const [manifestDownload] = await Promise.all([page.waitForEvent('download'), restored.getByRole('button', { name: 'Download sync JSON', exact: true }).click()]);
      const manifestPath = path.join(output, `${backend}-sync.json`); await manifestDownload.saveAs(manifestPath);
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); assert.equal(manifest.title, 'Camera tutorial');
      page.once('dialog', dialog => dialog.dismiss());
      await restored.getByRole('button', { name: 'Delete take', exact: true }).click();
      assert.equal(await page.locator('.capture-take-card').count(), 2);
      page.once('dialog', dialog => dialog.accept());
      await restored.getByRole('button', { name: 'Delete take', exact: true }).click();
      await restored.waitFor({ state: 'detached' });
      const remainingBytes = await page.evaluate(async id => {
        if (navigator.storage.getDirectory) {
          const root = await navigator.storage.getDirectory();
          const recordings = await root.getDirectoryHandle('omnicraft-recordings');
          try { await recordings.getDirectoryHandle(id); return 'directory still exists'; }
          catch (error) { if (error.name === 'NotFoundError') return 0; throw error; }
        }
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('omnicraft-recordings', 1);
          request.onsuccess = () => { const db = request.result; const prefix = `${id}/`; const count = db.transaction('chunks').objectStore('chunks').count(IDBKeyRange.bound(prefix, `${prefix}\uffff`)); count.onsuccess = () => { db.close(); resolve(count.result); }; count.onerror = () => reject(count.error); };
          request.onerror = () => reject(request.error);
        });
      }, manifest.id);
      assert.equal(remainingBytes, 0);
      await page.reload(); await page.locator('.capture-take-card').waitFor();
      assert.equal(await page.locator('.capture-take-card').count(), 1);
      const [retainedDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download screen', exact: true }).click()]);
      await retainedDownload.saveAs(path.join(output, `${backend}-retained-screen.mp4`));
      report.tests[backend] = { passed: true, realSeparateVideosDecoded: true, nameSurvivedReload: true, playbackUrlRevoked: true, deleteCancelled: true, deletedMediaRemovedFromStorage: true, otherTakeRetained: true };
      console.log(`${backend}: separate videos, rename, reload, playback cleanup and scoped deletion passed`);
    } finally { await context.close(); }
  }
  report.passed = true;
} catch (error) { report.passed = false; report.error = String(error.stack || error); process.exitCode = 1; console.error(error); }
finally { await browser.close(); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
