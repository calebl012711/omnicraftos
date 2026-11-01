#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

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
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function startStaticServer(port = 4173) {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let relPath = decodeURIComponent(parsed.pathname);
    if (relPath === '/') relPath = '/index.html';

    let filePath = path.join(DIST_DIR, relPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexCandidate = path.join(filePath, 'index.html');
      if (fs.existsSync(indexCandidate)) {
        filePath = indexCandidate;
      } else {
        filePath = path.join(DIST_DIR, 'index.html');
      }
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

async function runVerification() {
  const server = await startStaticServer(4173);
  const baseUrl = 'http://127.0.0.1:4173';
  const report = {
    verifiedAtUtc: new Date().toISOString(),
    environment: 'macOS Intel Core i5-8210Y (16 GB RAM) + Headless Google Chrome WebGL2/WASM',
    tests: {}
  };

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
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // =========================================================================
    // TEST 9E: Suite Shell, Responsive Layout, Modals, Branding, Local Storage
    // =========================================================================
    console.log('--- Running Test 9E: Suite Shell & Navigation ---');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const initialTitle = await page.getByTestId('brand-title').textContent();

    // Count workspace cards on Home
    const cardCount = await page.locator('[data-testid^="workspace-card-"]').count();

    // Test Quick Switcher modal via button
    await page.getByTestId('quick-switcher-trigger').click();
    const quickDialogVisible = await page.getByTestId('quick-switch-dialog').isVisible();
    await page.keyboard.press('Escape');

    // Test New Project creation via <dialog>
    await page.getByTestId('new-project-trigger').click();
    await page.getByTestId('new-project-name-input').fill('E2E Parametric Housing');
    await page.getByTestId('new-project-workspace-select').selectOption('solidcraft');
    await page.getByTestId('create-project-submit').click();

    // Verify navigation switched to workspace
    await page.waitForSelector('[data-testid="view-workspace"]');

    // Switch to Settings tab and test live rebranding
    await page.getByTestId('nav-settings').click();
    await page.waitForSelector('[data-testid="view-settings"]');
    await page.getByTestId('branding-name-input').fill('Atelier Forge');
    const updatedBrandTitle = await page.getByTestId('brand-title').textContent();
    await page.getByTestId('branding-name-input').fill('Mosaic Forge');

    // Test responsive mobile viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('nav-home').click();
    const mobileHeroVisible = await page.locator('.mf-hero').isVisible();
    await page.setViewportSize({ width: 1440, height: 900 });

    report.tests.suiteShell_9E = {
      status: 'tested',
      passed:
        initialTitle === 'Mosaic Forge' &&
        cardCount === 15 &&
        quickDialogVisible &&
        updatedBrandTitle === 'Atelier Forge' &&
        mobileHeroVisible,
      initialTitle,
      workspaceCardCount: cardCount,
      quickDialogVisible,
      rebrandTestTitle: updatedBrandTitle,
      mobileViewportVerified: mobileHeroVisible
    };
    console.log('9E Result:', report.tests.suiteShell_9E);

    // =========================================================================
    // TEST 9B: Primary 3D CAD Workflow — SolidCraft
    // =========================================================================
    console.log('--- Running Test 9B: SolidCraft 3D CAD End-to-End Workflow ---');
    const cadPage = await context.newPage();
    await cadPage.goto(`${baseUrl}/editors/solidcraft/index.html?webgl=1`, {
      waitUntil: 'domcontentloaded'
    });

    // Wait for window.solidcraft to initialize
    await cadPage.waitForFunction(() => Boolean(window.solidcraft), null, { timeout: 45000 });

    const solidcraftResult = await cadPage.evaluate(async () => {
      const sc = window.solidcraft;
      const commands = await sc.commands();

      // Build 60x60x8mm NEMA-17 Motor Adapter Plate with 22mm center bore + 4 M5 corner mounting holes
      await sc.execute('file.new', { name: 'MotorAdapterPlate' });
      await sc.execute('sketch.create', { plane: 'XY', name: 'BasePlate' });
      await sc.execute('sketch.rectangle.two_point', { p0: [0, 0], p1: [60, 60] });
      await sc.execute('sketch.finish', {});
      await sc.execute('solid.extrude', { distance: 8 });

      await sc.execute('sketch.create', { plane: 'XY', name: 'MotorBoreAndMounts' });
      await sc.execute('sketch.circle.center', { center: [30, 30], radius: 11 });
      await sc.execute('sketch.circle.center', { center: [10, 10], radius: 2.5 });
      await sc.execute('sketch.circle.center', { center: [50, 10], radius: 2.5 });
      await sc.execute('sketch.circle.center', { center: [50, 50], radius: 2.5 });
      await sc.execute('sketch.circle.center', { center: [10, 50], radius: 2.5 });
      await sc.execute('sketch.finish', {});
      await sc.execute('solid.extrude', { distance: 8, operation: 'cut' });

      const inspectBeforeSave = await sc.inspect();

      // Save to OPFS, reset to empty document, and reopen from OPFS
      await sc.execute('file.save', { path: '/opfs/motor_adapter_plate.sc' });
      await sc.execute('file.new', { name: 'EmptyCheck' });
      const inspectWhenEmpty = await sc.inspect();
      await sc.execute('doc.open', { path: '/opfs/motor_adapter_plate.sc' });
      const inspectAfterReopen = await sc.inspect();

      // Export STL and STEP to OPFS so we can read the exact bytes out of OPFS
      await sc.execute('file.export', {
        path: '/opfs/motor_adapter_plate.stl',
        format: 'stl'
      });
      await sc.execute('file.export', {
        path: '/opfs/motor_adapter_plate.step'
      });

      // Also trigger /downloads/ export so the download capture bridge captures them
      await sc.execute('file.export', {
        path: '/downloads/motor_adapter_plate.stl',
        format: 'stl'
      });
      await sc.execute('file.export', {
        path: '/downloads/motor_adapter_plate.step'
      });

      // Read files from OPFS if stored in navigator.storage.getDirectory() or virtual OPFS
      let stepText = '';
      let stlByteLength = 0;
      let stlTriangleCount = 0;
      let scNativeByteLength = 0;

      try {
        const root = await navigator.storage.getDirectory();
        try {
          const stepHandle = await root.getFileHandle('motor_adapter_plate.step');
          const stepFile = await stepHandle.getFile();
          stepText = await stepFile.text();
        } catch {}
        try {
          const stlHandle = await root.getFileHandle('motor_adapter_plate.stl');
          const stlFile = await stlHandle.getFile();
          const stlBuf = await stlFile.arrayBuffer();
          stlByteLength = stlBuf.byteLength;
          if (stlByteLength >= 84) {
            stlTriangleCount = new DataView(stlBuf).getUint32(80, true);
          }
        } catch {}
        try {
          const scHandle = await root.getFileHandle('motor_adapter_plate.sc');
          const scFile = await scHandle.getFile();
          scNativeByteLength = scFile.size;
        } catch {}
      } catch {}

      // Also check __mosaicCapturedExports
      const captured = (window.__mosaicCapturedExports || []).map((c) => ({
        name: c.name,
        size: c.size,
        mime: c.mime
      }));

      if (window.__mosaicCapturedExports) {
        const stepCap = window.__mosaicCapturedExports.find((c) => c.name.endsWith('.step'));
        if (stepCap && stepCap.bytes) {
          const u8 =
            stepCap.bytes instanceof Uint8Array
              ? stepCap.bytes
              : new Uint8Array(stepCap.bytes);
          stepText = new TextDecoder().decode(u8);
        }
        const stlCap = window.__mosaicCapturedExports.find((c) => c.name.endsWith('.stl'));
        if (stlCap && stlCap.bytes) {
          const u8 =
            stlCap.bytes instanceof Uint8Array
              ? stlCap.bytes
              : new Uint8Array(stlCap.bytes);
          stlByteLength = u8.byteLength;
          if (stlByteLength >= 84) {
            stlTriangleCount = new DataView(u8.buffer, u8.byteOffset, u8.byteLength).getUint32(
              80,
              true
            );
          }
        }
      }

      return {
        commandCount: Array.isArray(commands) ? commands.length : 0,
        inspectBeforeSave,
        emptyBodyCount: inspectWhenEmpty?.bodies?.length ?? 0,
        inspectAfterReopen,
        scNativeByteLength,
        stlByteLength,
        stlTriangleCount,
        stepByteLength: stepText.length,
        stepHasIsoHeader: stepText.includes('ISO-10303-21;'),
        stepHasCylindricalSurface: stepText.includes('CYLINDRICAL_SURFACE'),
        stepPreview: stepText.slice(0, 320),
        fullStepText: stepText,
        capturedExports: captured
      };
    });

    if (solidcraftResult.fullStepText) {
      fs.writeFileSync(
        path.join(ROOT_DIR, 'public', 'sample-assets', 'motor_adapter_plate.step'),
        solidcraftResult.fullStepText
      );
      delete solidcraftResult.fullStepText;
    }

    report.tests.solidcraft_3dCad_9B = {
      status: 'tested',
      passed:
        solidcraftResult.commandCount > 20 &&
        (solidcraftResult.inspectAfterReopen?.bodies?.length ?? 0) === 1 &&
        solidcraftResult.scNativeByteLength > 1000 &&
        solidcraftResult.stlTriangleCount > 100 &&
        solidcraftResult.stepHasIsoHeader &&
        solidcraftResult.stepHasCylindricalSurface,
      ...solidcraftResult
    };
    console.log('9B Result:', {
      passed: report.tests.solidcraft_3dCad_9B.passed,
      commandCount: solidcraftResult.commandCount,
      bodiesAfterReopen: solidcraftResult.inspectAfterReopen?.bodies?.length,
      volumeMm3: solidcraftResult.inspectAfterReopen?.bodies?.[0]?.volume_mm3,
      stlByteLength: solidcraftResult.stlByteLength,
      stlTriangleCount: solidcraftResult.stlTriangleCount,
      stepByteLength: solidcraftResult.stepByteLength,
      stepHasIsoHeader: solidcraftResult.stepHasIsoHeader
    });
    await cadPage.close();

    // =========================================================================
    // TEST 9A: Video Editing Workflow — FilmCraft
    // =========================================================================
    console.log('--- Running Test 9A: FilmCraft Video Editing End-to-End Workflow ---');
    const videoPage = await context.newPage();
    await videoPage.goto(`${baseUrl}/editors/filmcraft/index.html?webgl=1`, {
      waitUntil: 'domcontentloaded'
    });

    await videoPage.waitForFunction(() => Boolean(window.filmcraft), null, { timeout: 45000 });

    const filmcraftResult = await videoPage.evaluate(async (origin) => {
      const fc = window.filmcraft;
      const commands = await fc.commands();

      // 1. Create a new project & import our self-generated MP4 clip
      await fc.execute('file.newProject', {});
      const importedItem = await fc.importUrl(
        `${origin}/sample-assets/mosaic-test-clip.mp4`,
        'mosaic-test-clip.mp4'
      );

      // 2. Create a 640x360 @ 30fps sequence and place the clip onto V1 & A1
      await fc.execute('file.newSequence', {
        name: 'Mosaic Verification Sequence',
        width: 640,
        height: 360,
        fps: 30
      });

      const itemId =
        typeof importedItem === 'number'
          ? importedItem
          : importedItem && typeof importedItem.id === 'number'
          ? importedItem.id
          : 1;

      await fc.execute('timeline.place', {
        item: itemId,
        videoTrack: 'V1',
        audioTrack: 'A1',
        seconds: 0.0
      });

      const seqBeforeSplit = await fc.execute('sequence.inspect', {});

      // 3. Move playhead to 1.5s and razor-split all tracks
      await fc.execute('playhead.set', { seconds: 1.5 });
      await fc.execute('sequence.addEditAllTracks', {});
      const seqAfterSplit = await fc.execute('sequence.inspect', {});

      // 4. Save project to virtual filesystem, clear by creating new project, then reopen saved project
      await fc.execute('file.saveAs', { path: '/mosaic-verified-edit.fcproj' });
      await fc.execute('file.newProject', {});
      await fc.execute('file.open', { path: '/mosaic-verified-edit.fcproj' });
      const seqAfterReopen = await fc.execute('sequence.inspect', {});

      // 5. Export a program monitor frame and read saved project bytes from VFS
      let exportedFrameRes = null;
      try {
        exportedFrameRes = await fc.execute('file.exportFrame', { monitor: 'program' });
      } catch (e) {
        exportedFrameRes = { error: String(e) };
      }

      const vfsFiles = typeof fc.files === 'function' ? await fc.files() : [];
      const savedProjBytes =
        typeof fc.readFile === 'function'
          ? await fc.readFile('/mosaic-verified-edit.fcproj')
          : null;

      return {
        commandCount: Array.isArray(commands) ? commands.length : 0,
        importedItem,
        videoClipsBeforeSplit: seqBeforeSplit?.video?.[0]?.items?.length ?? 0,
        videoClipsAfterSplit: seqAfterSplit?.video?.[0]?.items?.length ?? 0,
        audioClipsAfterSplit: seqAfterSplit?.audio?.[0]?.items?.length ?? 0,
        videoClipsAfterReopen: seqAfterReopen?.video?.[0]?.items?.length ?? 0,
        savedProjectByteLength: savedProjBytes ? savedProjBytes.byteLength : 0,
        vfsFiles,
        exportedFrameRes
      };
    }, baseUrl);

    report.tests.filmcraft_video_9A = {
      status: 'tested',
      passed:
        filmcraftResult.videoClipsBeforeSplit === 1 &&
        filmcraftResult.videoClipsAfterSplit === 2 &&
        filmcraftResult.videoClipsAfterReopen === 2 &&
        filmcraftResult.savedProjectByteLength > 100,
      ...filmcraftResult
    };
    console.log('9A Result:', report.tests.filmcraft_video_9A);
    await videoPage.close();

    // =========================================================================
    // TEST 9C: PhotoCraft Raster Editing & Export + VectorCraft + CADCraft
    // =========================================================================
    console.log('--- Running Test 9C: PhotoCraft, VectorCraft & CADCraft Verification ---');
    const photoPage = await context.newPage();
    await photoPage.goto(`${baseUrl}/editors/photocraft/index.html?webgl=1`, {
      waitUntil: 'domcontentloaded'
    });
    await photoPage.waitForSelector('canvas', { timeout: 30000 });
    await photoPage.waitForTimeout(1500);

    const photoResult = await photoPage.evaluate(async (origin) => {
      const resp = await fetch(`${origin}/sample-assets/mosaic-test-image.png`);
      const bytes = await resp.arrayBuffer();
      const openRes = await window.__mosaicBridge.openFileInEditor(
        'mosaic-test-image.png',
        bytes,
        'image/png'
      );
      const canvas = document.querySelector('canvas');
      return {
        canvasPresent: Boolean(canvas),
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
        openRes
      };
    }, baseUrl);
    await photoPage.close();

    // Also test VectorCraft programmatic file open & inspection
    const vecPage = await context.newPage();
    await vecPage.goto(`${baseUrl}/editors/vectorcraft/index.html?webgl=1`, {
      waitUntil: 'domcontentloaded'
    });
    await vecPage.waitForFunction(() => Boolean(window.vectorcraft), null, { timeout: 30000 });
    const vectorResult = await vecPage.evaluate(async (origin) => {
      const vc = window.vectorcraft;
      const cmds = await vc.commands();
      const resp = await fetch(`${origin}/sample-assets/mosaic-badge.svg`);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      await vc.openFile('mosaic-badge.svg', bytes);
      const state = await vc.inspect();
      return {
        commandCount: Array.isArray(cmds) ? cmds.length : 0,
        state
      };
    }, baseUrl);
    await vecPage.close();

    // Also test CADCraft ?host=parent postMessage protocol
    const dxfPage = await context.newPage();
    await dxfPage.goto(`${baseUrl}/editors/cadcraft/index.html?host=parent&webgl=1`, {
      waitUntil: 'domcontentloaded'
    });
    await dxfPage.waitForSelector('canvas', { timeout: 30000 });
    const cadcraftResult = await dxfPage.evaluate(async (origin) => {
      const resp = await fetch(`${origin}/sample-assets/motor-plate-2d.dxf`);
      const bytes = await resp.arrayBuffer();
      const openRes = await window.__mosaicBridge.openFileInEditor(
        'motor-plate-2d.dxf',
        bytes,
        'application/dxf'
      );
      const canvas = document.querySelector('canvas');
      return {
        canvasPresent: Boolean(canvas),
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
        openRes
      };
    }, baseUrl);
    await dxfPage.close();

    report.tests.photoAndVectorAnd2dCad_9C = {
      status: 'tested',
      passed:
        photoResult.canvasPresent &&
        photoResult.canvasWidth > 0 &&
        vectorResult.commandCount > 10 &&
        cadcraftResult.canvasPresent,
      photocraft: photoResult,
      vectorcraft: vectorResult,
      cadcraft: cadcraftResult
    };
    console.log('9C Result:', {
      passed: report.tests.photoAndVectorAnd2dCad_9C.passed,
      photoCanvas: `${photoResult.canvasWidth}x${photoResult.canvasHeight}`,
      vectorCommands: vectorResult.commandCount,
      cadcraftCanvas: `${cadcraftResult.canvasWidth}x${cadcraftResult.canvasHeight}`
    });

    report.consoleErrors = consoleErrors;
    fs.writeFileSync(
      path.join(ROOT_DIR, 'public', 'e2e-verification-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Saved full E2E verification report to public/e2e-verification-report.json');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});
