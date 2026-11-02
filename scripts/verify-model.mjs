import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve(process.env.MODEL_OUTPUT || 'verification/model'); await fs.mkdir(out, { recursive: true });
const base = process.env.OMNICRAFT_URL || 'http://127.0.0.1:5173';
const report = { at: new Date().toISOString(), engine: 'Actual SolidCraft WASM', tests: {} };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const timeout = setTimeout(() => browser.close(), 360000);
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(120000);page.on('dialog',dialog=>dialog.accept());
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/?tool=model', { waitUntil: 'commit' });console.log('Model page committed');
  await page.getByRole('button', { name: 'New part', exact: true }).waitFor();
  await page.getByRole('button', { name: 'New part', exact: true }).click();console.log('Engine ready; new-part dialog opened');
  await page.getByLabel('New part name', { exact: true }).fill('Verified mounting plate');
  await page.getByRole('button', { name: 'Create solid part', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Model geometry engine"]');
  await page.getByRole('status').filter({hasText:'Part created.'}).waitFor();await page.getByLabel('Model dimension part_width', { exact: true }).waitFor();console.log('Real parametric plate created');
  const measure = () => frame.locator('body').evaluate(() => window.solidcraft.execute('inspect.measure', {}));
  const initial = await measure();
  const expectedInitial = (80 * 60 - Math.PI * (11 * 11 + 4 * 2.5 * 2.5)) * 8;
  assert.ok(Math.abs(initial.total.volume_mm3 - expectedInitial) / expectedInitial < .0001);
  await page.getByLabel('Model dimension part_width', { exact: true }).fill('100');
  await page.getByLabel('Model dimension part_thickness', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Update dimensions', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Dimensions rebuilt' }).waitFor();
  const resized = await measure();
  const expected = (100 * 60 - Math.PI * (11 * 11 + 4 * 2.5 * 2.5)) * 10;
  assert.ok(Math.abs(resized.total.volume_mm3 - expected) / expected < .0001);
  await page.getByRole('button', { name: 'Undo model edit', exact: true }).click();
  assert.ok(Math.abs((await measure()).total.volume_mm3 - expectedInitial) / expectedInitial < .0001);
  await page.getByRole('button', { name: 'Redo model edit', exact: true }).click();
  assert.ok(Math.abs((await measure()).total.volume_mm3 - expected) / expected < .0001);
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Project saved' }).waitFor();
  await page.locator('.model-export-menu').evaluate(element => element.open = true);
  async function download(label, filename) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
    const file = path.join(out, filename); await download.saveAs(file); return file;
  }
  const sc = await download('Native project (.sc)', 'plate.sc');
  const stl = await download('STL · print mesh', 'plate.stl');
  const step = await download('STEP · editable solid', 'plate.step');
  const mesh = await fs.readFile(stl); const triangles = mesh.readUInt32LE(80);
  assert.equal(mesh.length, 84 + triangles * 50); assert.ok(triangles > 100);
  let volume = 0; const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < triangles; i++) {
    const vertices = [];
    for (let j = 0; j < 3; j++) { const point = []; for (let k = 0; k < 3; k++) { const value = mesh.readFloatLE(84 + i * 50 + 12 + j * 12 + k * 4); point.push(value); min[k] = Math.min(min[k], value); max[k] = Math.max(max[k], value); } vertices.push(point); }
    const [a,b,c] = vertices; volume += (a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  assert.deepEqual(min, [-50,-30,0]); assert.deepEqual(max, [50,30,10]);
  assert.ok(Math.abs(Math.abs(volume)-expected)/expected < .002);
  const stepText = await fs.readFile(step, 'utf8'); assert.match(stepText, /MANIFOLD_SOLID_BREP/); assert.match(stepText, /CYLINDRICAL_SURFACE/);
  await page.screenshot({ path: path.join(out, 'model-desktop.png'), fullPage: true });
  await page.reload();
  await page.locator('.model-property-section').filter({ hasText: 'Recent projects' }).evaluate(element => element.open = true);
  await page.getByRole('button', { name: 'Verified mounting plate', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Project reopened' }).waitFor();
  assert.ok(Math.abs((await measure()).total.volume_mm3 - expected)/expected < .0001);
  await page.getByLabel('Open model file', { exact: true }).setInputFiles(sc);
  await page.getByRole('status').filter({ hasText: 'Opened plate.sc' }).waitFor();
  assert.ok(Math.abs((await measure()).total.volume_mm3 - expected)/expected < .0001);
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  await page.getByLabel('Search modeling tools', { exact: true }).fill('fillet');
  assert.ok(await page.locator('.model-command-list button').count() > 0);
  await page.keyboard.press('Escape');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  report.tests.part = { passed: true, uiCreated: true, parameterRebuild: true, undoRedo: true, savedReopened: true, nativeFileOpened: true, expectedVolumeMm3: expected, measured: resized, mesh: { triangles, volumeMm3: Math.abs(volume), min, max }, files: { sc, stl, step } };
  report.passed = true;
} catch (error) { report.passed = false; report.error = error.stack; try { report.body=(await page.locator('body').innerText()).slice(0,5000);await page.screenshot({path:path.join(out,'failure.png'),timeout:10000}); }catch{} console.error(error); process.exitCode = 1; }
finally { clearTimeout(timeout); await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
