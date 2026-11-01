/**
 * OmniCraft OS — Bento Theme & Workspace Bridge (bento-theme-bridge.js)
 *
 * Runs inside each embedded Rust/WASM studio iframe (/editors/<appId>/index.html).
 * Responsibilities:
 * 1. Bento Theme Sync:
 *    Listens for 'omnicraft:theme-change' (and 'mosaic:theme-change') to adapt
 *    UI styling, canvas backgrounds, and CSS variables across light & dark Bento palettes.
 * 2. Cross-Studio Asset Import:
 *    Listens for 'omnicraft:import-asset' (and 'omnicraft:load-asset', 'omnicraft:import-cad', 'mosaic:open-file')
 *    and delivers binary files into the studio via engine JS API, OPFS, or canvas DragEvent.
 * 3. Instant Asset Vault Export Forwarding:
 *    Intercepts exported files (<a download>, URL.createObjectURL, native :save postMessage)
 *    and dispatches 'omnicraft:export-ready' to parent OmniCraft OS shell for 0ms Asset Vault sync.
 * 4. Bento Hairline 1px Border & OmniCraft OS Frame/Badge Decorator:
 *    Injects Bento styling (hairline 1px border, backdrop blur, telemetry badge) and branding.
 */
(function () {
  'use strict';

  // Prevent multiple initializations in the same frame
  if (window.__omnicraftBentoBridgeInitialized) return;
  window.__omnicraftBentoBridgeInitialized = true;

  const scriptUrl = new URL(document.currentScript?.src || location.href, location.href);
  const appId =
    scriptUrl.searchParams.get('app') ||
    location.pathname.split('/').filter(Boolean).pop() ||
    'studio';

  const STUDIO_NAMES = {
    filmcraft: 'FilmCraft Video Studio',
    photocraft: 'PhotoCraft Layer Lab',
    vectorcraft: 'VectorCraft Illustration',
    figcraft: 'FigCraft UI & Vector Studio',
    wordcraft: 'WordCraft Document Publisher',
    gridcraft: 'GridCraft Reactive Sheet',
    pdfcraft: 'PDFCraft Reader & Vector Annotator',
    lightcraft: 'LightCraft RAW & Photo Catalog',
    designcraft: 'DesignCraft Layout Studio',
    soundcraft: 'SoundCraft Multitrack DAW',
    deckcraft: 'DeckCraft Presentation Studio',
    effectcraft: 'EffectCraft Motion Graphics & VFX',
    cadcraft: 'CADCraft 2D Precision Drafting',
    solidcraft: 'SolidCraft 3D Parametric CAD'
  };

  const currentStudioName = STUDIO_NAMES[appId] || `${appId.charAt(0).toUpperCase() + appId.slice(1)} Studio`;

  // --- 1. Bento Hairline CSS & Theme Injection ---
  let currentTheme = 'dark';
  let currentAccent = '#c87d55';

  const BENTO_STYLE_ID = 'omnicraft-bento-hairline-styles';
  function injectBentoStyles() {
    if (document.getElementById(BENTO_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = BENTO_STYLE_ID;
    style.textContent = `
      :root {
        --omnicraft-border: rgba(255, 255, 255, 0.08);
        --omnicraft-border-hover: rgba(255, 255, 255, 0.16);
        --omnicraft-bg-dark: #121316;
        --omnicraft-bg-light: #f5f6f8;
        --omnicraft-accent: ${currentAccent};
        --bento-hairline: 1px solid var(--omnicraft-border);
      }
      [data-theme="light"] {
        --omnicraft-border: rgba(0, 0, 0, 0.08);
        --omnicraft-border-hover: rgba(0, 0, 0, 0.15);
      }
      /* Bento Hairline Window Frame on canvas elements */
      canvas {
        box-sizing: border-box !important;
        outline: 1px solid var(--omnicraft-border) !important;
        outline-offset: -1px !important;
      }
      /* Bento Loading Badge Styling */
      .omnicraft-bento-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(18, 20, 24, 0.88);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        color: #e5e7eb;
        font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
        letter-spacing: 0.01em;
        user-select: none;
      }
      [data-theme="light"] .omnicraft-bento-badge {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(0, 0, 0, 0.1);
        color: #1f2937;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      .omnicraft-pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--omnicraft-accent, #c87d55);
        box-shadow: 0 0 8px var(--omnicraft-accent, #c87d55);
        animation: omnicraft-pulse 1.8s ease-in-out infinite;
        flex-shrink: 0;
      }
      .omnicraft-brand {
        font-weight: 600;
        color: inherit;
        letter-spacing: 0.02em;
      }
      .omnicraft-sep {
        opacity: 0.35;
        font-weight: 300;
      }
      @keyframes omnicraft-pulse {
        0%, 100% { transform: scale(0.9); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 1; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function applyBentoTheme(theme, accent) {
    currentTheme = theme === 'light' ? 'light' : 'dark';
    if (accent) currentAccent = accent;

    document.documentElement.setAttribute('data-theme', currentTheme);
    if (document.body) document.body.setAttribute('data-theme', currentTheme);

    const root = document.documentElement;
    root.style.setProperty('--omnicraft-accent', currentAccent);

    // Adapt editor background for known workspaces
    if (['figcraft', 'wordcraft', 'gridcraft', 'pdfcraft'].includes(appId)) {
      if (document.body) {
        document.body.style.background = currentTheme === 'light' ? '#f5f6f8' : '#1e1f24';
      }
    }

    // Pass to editor engine if theme API is available
    try {
      const api = window[appId];
      if (api && typeof api.setTheme === 'function') {
        api.setTheme(currentTheme);
      } else if (api && typeof api.execute === 'function') {
        api.execute('theme.set', { theme: currentTheme }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // --- 2. Safe PostMessage Communication ---
  function isTrustedSameOrigin(event) {
    try {
      if (event.source === window || event.source === window.parent) return true;
      if (!event.origin || event.origin === 'null') return true;
      return event.origin === location.origin;
    } catch {
      return true;
    }
  }

  function postToParent(payload, transferList) {
    const target = (window.parent && window.parent !== window) ? window.parent : window;
    try {
      const msg = {
        source: 'omnicraft-os',
        appId,
        timestamp: Date.now(),
        ...payload
      };

      // Safely try with transfer list; if cloning/detachment fails, fall back without transfer
      if (Array.isArray(transferList) && transferList.length > 0) {
        try {
          target.postMessage(msg, '*', transferList);
          return;
        } catch (tErr) {
          console.warn('[OmniCraft BentoBridge] Transferable postMessage failed, falling back to clone:', tErr);
        }
      }
      target.postMessage(msg, '*');
    } catch (err) {
      console.warn('[OmniCraft BentoBridge] postToParent failed:', err);
    }
  }

  // --- 3. Export Forwarding ('omnicraft:export-ready') ---
  const capturedExports = [];
  const trackedBlobUrls = new Map();

  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    const url = originalCreateObjectURL(obj);
    if (obj instanceof Blob) {
      trackedBlobUrls.set(url, obj);
      setTimeout(() => trackedBlobUrls.delete(url), 60000);
    }
    return url;
  };

  async function handleCapturedExport(downloadName, blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const record = {
        name: downloadName,
        mime: blob.type || 'application/octet-stream',
        size: arrayBuffer.byteLength,
        timestamp: Date.now()
      };
      capturedExports.push(record);

      const copy = arrayBuffer.slice(0);
      const exportPayload = {
        type: 'omnicraft:export-ready',
        appId,
        name: downloadName,
        mime: record.mime,
        size: record.size,
        bytes: copy,
        file: {
          name: downloadName,
          type: record.mime,
          size: record.size,
          data: copy
        }
      };

      // Dispatch 'omnicraft:export-ready' to parent shell for Asset Vault indexing
      postToParent(exportPayload, [copy]);

      // Also forward legacy 'mosaic:export-captured' for backward compatibility
      postToParent({
        source: 'mosaic-forge-editor',
        type: 'mosaic:export-captured',
        appId,
        name: downloadName,
        mime: record.mime,
        size: record.size,
        bytes: arrayBuffer.slice(0)
      });
    } catch (err) {
      console.warn('[OmniCraft BentoBridge] handleCapturedExport warning:', err);
    }
  }

  // Intercept anchor clicks for file downloads
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') || this.download) {
      const href = this.getAttribute('href') || this.href || '';
      const downloadName = this.getAttribute('download') || this.download || `${appId}-export.bin`;
      let blob = trackedBlobUrls.get(href);
      if (blob) {
        handleCapturedExport(downloadName, blob);
      } else if (href.startsWith('blob:')) {
        fetch(href)
          .then((r) => r.blob())
          .then((b) => handleCapturedExport(downloadName, b))
          .catch(() => {});
      }
    }
    return origAnchorClick.apply(this, arguments);
  };

  document.addEventListener(
    'click',
    async (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
      if (!a) return;
      const href = a.getAttribute('href') || a.href || '';
      const downloadName = a.getAttribute('download') || a.download || `${appId}-export.bin`;
      if (!href) return;

      let blob = trackedBlobUrls.get(href);
      if (!blob && href.startsWith('blob:')) {
        try {
          const resp = await fetch(href);
          blob = await resp.blob();
        } catch {
          // ignore
        }
      }
      if (blob) {
        await handleCapturedExport(downloadName, blob);
      }
    },
    true
  );

  // --- 4. Asset Import Bridge ('omnicraft:import-asset') ---
  function dispatchCanvasFileDrop(file, placeOnCanvas = false) {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error(`Editor canvas for ${appId} not found`);

    const dt = new DataTransfer();
    dt.items.add(file);
    const rect = canvas.getBoundingClientRect();
    const clientX = Math.round(rect.left + (placeOnCanvas ? rect.width * 0.5 : 24));
    const clientY = Math.round(rect.top + (placeOnCanvas ? rect.height * 0.5 : 8));

    for (const type of ['dragenter', 'dragover', 'drop']) {
      const evt = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        dataTransfer: dt
      });
      canvas.dispatchEvent(evt);
    }
    return { method: 'canvas-drop', fileName: file.name, size: file.size };
  }

  async function importAssetIntoEditor(payload) {
    let name = payload.name || payload.fileName || 'imported-asset.bin';
    let mime = payload.mime || payload.mimeType || 'application/octet-stream';
    let rawBytes = payload.bytes || payload.data;
    const placeOnCanvas = Boolean(payload.placeOnCanvas);

    if (payload.asset && typeof payload.asset === 'object') {
      name = payload.asset.name || name;
      mime = payload.asset.mime || payload.asset.mimeType || mime;
      rawBytes = payload.asset.bytes || payload.asset.data || rawBytes;
    }

    let u8;
    if (rawBytes instanceof Uint8Array) {
      u8 = rawBytes;
    } else if (rawBytes instanceof ArrayBuffer) {
      u8 = new Uint8Array(rawBytes);
    } else if (typeof rawBytes === 'string') {
      // Decode base64
      try {
        const binStr = atob(rawBytes.replace(/^data:[^;]+;base64,/, ''));
        u8 = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) u8[i] = binStr.charCodeAt(i);
      } catch {
        u8 = new TextEncoder().encode(rawBytes);
      }
    } else if (Array.isArray(rawBytes)) {
      u8 = new Uint8Array(rawBytes);
    } else {
      u8 = new Uint8Array(0);
    }

    const file = new File([u8], name, { type: mime });

    // Try delegate to existing mosaicBridge if present
    if (window.__mosaicBridge && typeof window.__mosaicBridge.openFileInEditor === 'function') {
      try {
        return await window.__mosaicBridge.openFileInEditor(name, u8, mime, placeOnCanvas);
      } catch (err) {
        console.warn('[OmniCraft BentoBridge] mosaicBridge fallback:', err);
      }
    }

    // Studio-specific native handlers
    if (appId === 'filmcraft' && window.filmcraft) {
      if (name.toLowerCase().endsWith('.fcproj') && typeof window.filmcraft.openProject === 'function') {
        const res = await window.filmcraft.openProject(file);
        return { method: 'window.filmcraft.openProject', result: res };
      }
      if (typeof window.filmcraft.importFiles === 'function') {
        const res = await window.filmcraft.importFiles([file]);
        return { method: 'window.filmcraft.importFiles', result: res };
      }
    }

    if ((appId === 'vectorcraft' || appId === 'figcraft') && window[appId]?.openFile) {
      const res = await window[appId].openFile(name, u8);
      return { method: `window.${appId}.openFile`, result: res };
    }

    if (appId === 'effectcraft' && window.effectcraft?.addFile) {
      try {
        const res = await window.effectcraft.addFile(file, name);
        return { method: 'window.effectcraft.addFile', result: res };
      } catch (err) {
        console.warn('[OmniCraft BentoBridge] effectcraft.addFile fallback:', err);
      }
    }

    // Default drag and drop onto canvas
    return dispatchCanvasFileDrop(file, placeOnCanvas);
  }

  // --- 5. Message Listener ---
  window.addEventListener('message', async (event) => {
    if (!isTrustedSameOrigin(event)) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    const reqId = data.requestId || null;

    try {
      // Theme change
      if (data.type === 'omnicraft:theme-change' || data.type === 'mosaic:theme-change') {
        applyBentoTheme(data.theme, data.accent);
        postToParent({
          type: 'omnicraft:theme-change:ok',
          requestId: reqId,
          appId,
          theme: currentTheme,
          accent: currentAccent
        });
      }

      // Asset import / load
      else if (
        data.type === 'omnicraft:import-asset' ||
        data.type === 'omnicraft:load-asset' ||
        data.type === 'omnicraft:import-cad' ||
        data.type === 'mosaic:open-file'
      ) {
        const result = await importAssetIntoEditor(data);
        postToParent({
          type: 'omnicraft:import-asset:ok',
          requestId: reqId,
          appId,
          result
        });
      }

      // Ping check
      else if (data.type === 'omnicraft:ping' || data.type === 'mosaic:ping') {
        postToParent({
          type: 'omnicraft:pong',
          requestId: reqId,
          appId,
          theme: currentTheme,
          studioName: currentStudioName,
          exportsCount: capturedExports.length
        });
      }
    } catch (err) {
      postToParent({
        type: 'omnicraft:error',
        requestId: reqId,
        appId,
        error: err?.message || String(err)
      });
    }
  });

  // --- 6. DOM Initialization & Loading Badge Decoration ---
  function decorateLoadingBadge() {
    injectBentoStyles();

    // Look for existing loading containers
    const candidates = [
      document.getElementById(`${appId}_loading`),
      document.getElementById('loading'),
      document.querySelector('[id$="_loading"]')
    ].filter(Boolean);

    candidates.forEach((el) => {
      // If already decorated, skip
      if (el.querySelector('.omnicraft-bento-badge')) return;

      const badge = document.createElement('div');
      badge.className = 'omnicraft-bento-badge';
      badge.innerHTML = `
        <span class="omnicraft-pulse-dot"></span>
        <span class="omnicraft-brand">OmniCraft OS</span>
        <span class="omnicraft-sep">/</span>
        <span>${currentStudioName}</span>
      `;
      // Prepend badge to loading container
      el.insertBefore(badge, el.firstChild);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateLoadingBadge);
  } else {
    decorateLoadingBadge();
  }

  // Expose bridge on window for inspection & testing
  window.__omnicraftBridge = {
    appId,
    studioName: currentStudioName,
    theme: () => currentTheme,
    setTheme: applyBentoTheme,
    importAsset: importAssetIntoEditor,
    capturedExports,
    postToParent
  };

  // Signal ready to parent
  postToParent({
    type: 'omnicraft:studio-ready',
    appId,
    studioName: currentStudioName,
    theme: currentTheme
  });
})();
