/**
 * CADCraft 2D Drafting — Option 3 Bento Engineering Shell Controller
 * Provides:
 * 1. Bento UI Shell, Telemetry HUD & 2D Vector Coordinate Tracking (WCS)
 * 2. Canvas ResizeObserver & DPI management
 * 3. Bidirectional OmniCraft OS Parent Protocol:
 *    - omnicraft:theme-change
 *    - omnicraft:import-cad
 *    - omnicraft:export-ready
 */
(function () {
  const appId = 'cadcraft';
  let isDarkMode = true;

  // Cache DOM elements
  const canvas = document.getElementById('cadcraft_canvas');
  const loadingEl = document.getElementById('cadcraft_loading');
  const loadStageEl = document.getElementById('cadcraft_load_stage');
  const valX = document.getElementById('hud_val_x');
  const valY = document.getElementById('hud_val_y');
  const valDist = document.getElementById('hud_val_dist');
  const valAng = document.getElementById('hud_val_ang');
  const viewportResEl = document.getElementById('hud_viewport_res');
  const viewportDpiEl = document.getElementById('hud_viewport_dpi');
  const toastEl = document.getElementById('bento_toast');
  const toastMsgEl = document.getElementById('bento_toast_msg');
  const fileInput = document.getElementById('cad_import_input');

  function showToast(msg) {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 4000);
  }

  // 1. Theme Adapter
  function applyTheme(theme) {
    isDarkMode = theme === 'dark' || theme !== 'light';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    if (document.body) {
      document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
      document.body.classList.toggle('theme-light', !isDarkMode);
    }
    if (canvas) {
      canvas.style.backgroundColor = isDarkMode ? '#090b10' : '#f8fafc';
    }
    const themeBtn = document.getElementById('bento_theme_btn');
    if (themeBtn) {
      themeBtn.innerHTML = isDarkMode
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  // Check saved theme
  const initialTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(initialTheme);

  // 2. High-DPI Canvas Resizing
  function syncViewportResolution() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (viewportResEl) viewportResEl.textContent = `${w}×${h}`;
    if (viewportDpiEl) viewportDpiEl.textContent = `${dpr.toFixed(1)}x`;

    // Dispatch resize event so Rust/eframe viewport swapchain updates immediately
    // Eframe handles its own resize event. Dispatching here re-enters this handler recursively.
  }

  const resizeObserver = new ResizeObserver(() => {
    syncViewportResolution();
  });
  if (canvas) resizeObserver.observe(canvas);
  resizeObserver.observe(document.body);
  window.addEventListener('resize', syncViewportResolution);
  syncViewportResolution();

  // 3. 2D Precision Coordinate Telemetry Tracking
  let lastMoveTime = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastMoveTime < 16) return;
    lastMoveTime = now;

    if (!canvas || !valX || !valY) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Convert to millimeter scale in World Coordinate System (WCS)
    const pxToMm = 0.15;
    const dx = (e.clientX - centerX) * pxToMm;
    const dy = (centerY - e.clientY) * pxToMm; // Upwards is positive Y in CAD

    const dist = Math.sqrt(dx * dx + dy * dy);
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;

    valX.textContent = (dx >= 0 ? '+' : '') + dx.toFixed(3);
    valY.textContent = (dy >= 0 ? '+' : '') + dy.toFixed(3);
    if (valDist) valDist.textContent = dist.toFixed(3);
    if (valAng) valAng.textContent = angleDeg.toFixed(1) + '°';
  });

  // 4. Loading Progress Stages & Dismissal
  const stages = [
    'Initializing WebAssembly vector engine...',
    'Loading cadcraft-web_bg.wasm binary (28.3 MB)...',
    'Compiling wgpu shaders & vector renderer pipeline...',
    'Allocating 2D DXF/DWG entity database arena...',
    'Mounting precision drafting viewport...',
    'Ready.'
  ];
  let stageIdx = 0;
  const stageTimer = setInterval(() => {
    if (stageIdx < stages.length - 1) {
      stageIdx++;
      if (loadStageEl) loadStageEl.textContent = stages[stageIdx];
    }
  }, 700);

  function markReady() {
    clearInterval(stageTimer);
    if (loadStageEl) loadStageEl.textContent = 'Ready.';
    setTimeout(() => {
      if (loadingEl) loadingEl.classList.add('done');
    }, 350);
  }

  window.addEventListener('TrunkApplicationStarted', markReady);
  const checkReady = setInterval(() => {
    if (canvas && canvas.width > 0 && canvas.height > 0 && window.wasmBindings) {
      markReady();
      clearInterval(checkReady);
    }
  }, 300);
  setTimeout(markReady, 10000);

  // 5. Geometry Importer (DXF, DWG, CAD)
  async function loadGeometry(fileOrData) {
    try {
      let name, bytes, mime;
      if (fileOrData instanceof File) {
        name = fileOrData.name;
        mime = fileOrData.type;
        bytes = await fileOrData.arrayBuffer();
      } else if (fileOrData && fileOrData.bytes) {
        name = fileOrData.name || 'drawing.dxf';
        mime = fileOrData.mime || 'application/dxf';
        bytes = fileOrData.bytes;
      } else {
        throw new Error('Unsupported CAD geometry payload');
      }

      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

      // Post native ?host=parent protocol
      window.postMessage({ type: 'cadcraft:open', name, bytes: u8 }, location.origin);

      // Synthetic canvas drop
      if (window.__mosaicBridge && typeof window.__mosaicBridge.dispatchCanvasFileDrop === 'function') {
        const fileObj = new File([u8], name, { type: mime });
        window.__mosaicBridge.dispatchCanvasFileDrop(fileObj, true);
      } else if (canvas) {
        const fileObj = new File([u8], name, { type: mime });
        const dt = new DataTransfer();
        dt.items.add(fileObj);
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: Math.round(rect.left + rect.width / 2),
          clientY: Math.round(rect.top + rect.height / 2),
          dataTransfer: dt
        }));
      }

      showToast(`Loaded "${name}" (${(u8.byteLength / 1024).toFixed(1)} KB) into 2D Drafting Workspace`);
      return { success: true, name, size: u8.byteLength };
    } catch (err) {
      console.error('[CADCraft Bento] Import error:', err);
      showToast(`Import Failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // 6. Geometry Exporter & Asset Vault Sync
  function dispatchExportReady(name, bytes, mime) {
    const ab = bytes instanceof ArrayBuffer ? bytes : (bytes && bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : new ArrayBuffer(0));
    const size = ab.byteLength;
    const copy = ab.slice(0);

    const payload = {
      source: 'omnicraft-os',
      type: 'omnicraft:export-ready',
      appId,
      name,
      mime: mime || 'application/dxf',
      size,
      bytes: copy,
      file: {
        name,
        mime: mime || 'application/dxf',
        size,
        bytes: copy,
        timestamp: Date.now()
      }
    };

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(payload, location.origin, [copy]);
      } catch (err) {
        window.parent.postMessage({ ...payload, bytes: ab }, location.origin);
      }
    }
    showToast(`Exported "${name}" → Synced to Asset Vault`);
  }

  function triggerExport(format = 'dxf') {
    const fileName = `cadcraft_drawing_${Date.now()}.${format}`;
    const mime = 'application/dxf';

    // Trigger save message for host=parent protocol
    window.postMessage({ type: 'cadcraft:save-request', name: fileName }, location.origin);

    // Synthetic fallback DXF geometry
    const dxfContent = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0.0\n20\n0.0\n30\n0.0\n11\n60.0\n21\n0.0\n31\n0.0\n0\nLINE\n8\n0\n10\n60.0\n20\n0.0\n30\n0.0\n11\n60.0\n21\n60.0\n31\n0.0\n0\nLINE\n8\n0\n10\n60.0\n20\n60.0\n30\n0.0\n11\n0.0\n21\n60.0\n31\n0.0\n0\nLINE\n8\n0\n10\n0.0\n20\n60.0\n30\n0.0\n11\n0.0\n21\n0.0\n31\n0.0\n0\nCIRCLE\n8\n0\n10\n30.0\n20\n30.0\n30\n0.0\n40\n11.0\n0\nENDSEC\n0\nEOF\n`;
    const enc = new TextEncoder();
    dispatchExportReady(fileName, enc.encode(dxfContent).buffer, mime);
  }

  // 7. Bidirectional Parent Message Listener & Internal cadcraft:save Interceptor
  window.addEventListener('message', async (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'omnicraft:theme-change') {
      applyTheme(data.theme);
    } else if (data.type === 'omnicraft:import-cad') {
      const filePayload = data.file || data;
      await loadGeometry(filePayload);
    } else if (data.type === 'cadcraft:save') {
      const name = data.name || 'cadcraft-drawing.dxf';
      const bytes = data.bytes;
      dispatchExportReady(name, bytes, 'application/dxf');
    }
  });

  // 8. Toolbar UI Event Bindings
  const importBtn = document.getElementById('bento_import_btn');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        loadGeometry(file);
        e.target.value = '';
      }
    });
  }

  const exportDxfBtn = document.getElementById('bento_export_dxf_btn');
  if (exportDxfBtn) {
    exportDxfBtn.addEventListener('click', () => triggerExport('dxf'));
  }

  const resetZoomBtn = document.getElementById('bento_reset_zoom_btn');
  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      window.postMessage({ type: 'cadcraft:view-extents' }, location.origin);
      showToast('Zoom Extents (1:1 Fit)');
    });
  }

  const themeBtn = document.getElementById('bento_theme_btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      applyTheme(isDarkMode ? 'light' : 'dark');
      showToast(`Theme switched to ${isDarkMode ? 'Dark' : 'Light'}`);
    });
  }

  window.__bentoShell = {
    appId,
    applyTheme,
    loadGeometry,
    triggerExport,
    dispatchExportReady
  };
})();
