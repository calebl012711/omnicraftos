// Headless frontend checks only. Does not launch Tauri or load any CAD/WASM engine.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.OMNICRAFT_URL || 'http://127.0.0.1:5173';
const output = 'verification/desktop-home'; await fs.mkdir(output, { recursive: true });
const report = { at: new Date().toISOString(), scope: 'Headless frontend with Tauri runtime marker; WASM requests blocked', nativeApplicationLaunched: false, engineWorkflowsTested: false, tests: {} };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(() => { window.__TAURI_INTERNALS__ = {}; });
  await context.route('**/*.wasm*', route => route.abort());
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'commit' });
  await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
  assert.equal(await page.locator('.oc-hero').count(), 0);
  assert.equal(await page.locator('iframe').count(), 0);
  assert.ok(await page.getByTestId('desktop-open-riverstudio').isVisible());
  assert.ok(await page.getByTestId('desktop-open-solidcraft').isVisible());
  assert.ok(await page.getByRole('heading', { name: 'Recent projects', exact: true }).isVisible());
  assert.ok(await page.getByText('No saved projects yet', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByTestId('new-project-dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Find a workspace', { exact: true }).fill('Model');
  assert.ok(await page.getByTestId('desktop-open-solidcraft').isVisible());
  assert.equal(await page.getByTestId('desktop-open-riverstudio').count(), 0);
  await page.getByLabel('Find a workspace', { exact: true }).fill('nonexistent-tool');
  await page.getByText('No matching workspace.', { exact: true }).waitFor();
  await page.getByLabel('Find a workspace', { exact: true }).fill('');
  await page.screenshot({ path: `${output}/home.png` });
  report.tests.launcher = { passed: true, appHome: true, noHero: true, noStartupEditor: true, realProjectDialog: true, search: true };
  await page.getByTestId('desktop-open-solidcraft').click();
  const frame = page.locator('iframe[title="Model geometry engine"]'); await frame.waitFor();
  const src = new URL(await frame.getAttribute('src'), base);
  assert.equal(src.searchParams.has('omnicraft'), false);
  assert.equal(src.searchParams.get('webgl'), '1');
  assert.equal((await frame.boundingBox()).y, 0, 'The native CAD viewport starts at the top');
  assert.equal(await page.locator('.model-toolbar').count(), 0);
  assert.equal(await page.locator('.model-properties').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Save to Projects', exact: true }).isVisible());
  report.tests.cadChrome = { passed: true, fullUpstreamChromeRequested: true, noDuplicateHostRibbon: true, noDuplicateProperties: true, librarySaveRetained: true };
  report.passed = true;
} catch (error) { report.passed = false; report.error = String(error.stack || error); process.exitCode = 1; console.error(error); }
finally { await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close(); }
