/**
 * Mosaic Forge — Same-Origin Editor Host Adapter Bridge (mosaic-forge-bridge.js)
 *
 * Runs inside each embedded Craft editor iframe (/editors/<appId>/index.html).
 * Responsibilities:
 * 1. Validates same-origin parent messages using the modern Origin API (`Origin.from(event).isSameOrigin(Origin.from(self))`)
 *    with a spec-compliant `new URL()` fallback for browsers without `Origin`.
 * 2. Captures files exported/saved by the upstream editor via `URL.createObjectURL(blob)` + `<a download>`
 *    or native `?host=parent` postMessage (`<appId>:save`) and forwards them to the Mosaic Forge shell
 *    so they can be indexed in Mosaic Forge Projects & Shared Assets.
 * 3. Provides a unified command & file-open bridge (`mosaic:open-file`, `mosaic:execute`, `mosaic:inspect`,
 *    `mosaic:commands`, `mosaic:opfs-list`, `mosaic:opfs-read`) that connects to the editor's documented
 *    upstream interface (`window.solidcraft`, `window.filmcraft`, `window.vectorcraft`, `window.figcraft`,
 *    `window.effectcraft`, `window.lightcraft`, `?host=parent` postMessage, or `<canvas>` DragEvent drop).
 */
(function () {
  const scriptUrl = new URL(document.currentScript?.src || location.href, location.href);
  const appId =
    scriptUrl.searchParams.get('app') ||
    location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] ||
    'unknown';

  function isTrustedSameOrigin(event) {
    try {
      if ('Origin' in globalThis && typeof globalThis.Origin?.from === 'function') {
        let candidateOrigin;
        try {
          candidateOrigin = globalThis.Origin.from(event);
        } catch {
          candidateOrigin = globalThis.Origin.from(event.origin);
        }
        return candidateOrigin.isSameOrigin(globalThis.Origin.from(self));
      }
      if (!event.origin || event.origin === 'null') return false;
      const candidateUrl = new URL(event.origin);
      const selfUrl = new URL(location.href);
      return candidateUrl.origin !== 'null' && candidateUrl.origin === selfUrl.origin;
    } catch {
      return false;
    }
  }

  function postToShell(payload, transfer) {
    if (!window.parent || window.parent === window) return;
    try {
      window.parent.postMessage(
        {
          source: 'mosaic-forge-editor',
          appId,
          timestamp: Date.now(),
          ...payload,
        },
        location.origin,
        transfer || []
      );
    } catch (err) {
      console.warn('[MosaicForgeBridge] postToShell failed:', err);
    }
  }

  // Track Blobs created via URL.createObjectURL so when an editor triggers <a download="name" href="blob:...">
  // we can capture the exported bytes for the Mosaic Forge Project & Shared Assets library.
  const blobUrlMap = new Map();
  const capturedExports = [];
  window.__mosaicCapturedExports = capturedExports;

  const origCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    const url = origCreateObjectURL(obj);
    if (obj instanceof Blob) {
      blobUrlMap.set(url, obj);
      setTimeout(() => blobUrlMap.delete(url), 60000);
    }
    return url;
  };

  async function captureAnchorDownload(anchor) {
    try {
      const href = anchor.getAttribute('href') || anchor.href || '';
      const downloadName = anchor.getAttribute('download') || anchor.download || 'export.bin';
      if (!href) return;
      let blob = blobUrlMap.get(href);
      if (!blob && href.startsWith('blob:')) {
        const resp = await fetch(href);
        blob = await resp.blob();
      }
      if (!blob) return;
      const ab = await blob.arrayBuffer();
      const record = {
        name: downloadName,
        mime: blob.type || 'application/octet-stream',
        size: ab.byteLength,
        bytes: ab,
        timestamp: Date.now(),
      };
      capturedExports.push(record);
      const copy = ab.slice(0);
      const copy2 = ab.slice(0);
      // Forward omnicraft:export-ready to OmniCraft OS Asset Vault
      postToShell(
        {
          source: 'omnicraft-os',
          type: 'omnicraft:export-ready',
          appId,
          name: downloadName,
          mime: record.mime,
          size: record.size,
          bytes: copy,
          file: {
            name: downloadName,
            type: record.mime,
            mime: record.mime,
            size: record.size,
            bytes: copy,
            data: copy,
            timestamp: Date.now(),
          },
        },
        [copy]
      );
      // Also post legacy mosaic:export-captured for backward compatibility
      postToShell(
        {
          type: 'mosaic:export-captured',
          name: downloadName,
          mime: record.mime,
          size: record.size,
          bytes: copy2,
        },
        [copy2]
      );
    } catch (err) {
      console.warn('[MosaicForgeBridge] captureAnchorDownload warning:', err);
    }
  }

  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') || this.download) {
      captureAnchorDownload(this);
      if (window.__mosaicSuppressBrowserDownload) {
        return;
      }
    }
    return origAnchorClick.apply(this, arguments);
  };

  document.addEventListener(
    'click',
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
      if (a) {
        captureAnchorDownload(a);
      }
    },
    true
  );

  // Helper to dispatch a synthetic file drop onto the editor's <canvas>
  function dispatchCanvasFileDrop(file, placeOnCanvas = false) {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error('Editor canvas element not found yet');
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    const rect = canvas.getBoundingClientRect();
    // PhotoCraft places files as layers when dropped on the center of the canvas,
    // and opens them as new documents when dropped near the top bar (y=8).
    const clientX = Math.round(rect.left + (placeOnCanvas ? rect.width * 0.5 : 24));
    const clientY = Math.round(rect.top + (placeOnCanvas ? rect.height * 0.5 : 8));

    for (const type of ['dragenter', 'dragover', 'drop']) {
      const evt = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(evt);
    }
    return { method: 'canvas-drop', fileName: file.name, size: file.size };
  }

  async function openFileInEditor(arg1, arg2, arg3, arg4) {
    let name, mime, bytes, placeOnCanvas, id;
    if (arg1 && typeof arg1 === 'object') {
      const target = arg1.asset || arg1;
      name = target.name;
      mime = target.mimeType || target.mime;
      bytes = target.bytes;
      id = target.id;
      placeOnCanvas = target.placeOnCanvas;
    } else {
      name = arg1;
      bytes = arg2;
      mime = arg3;
      placeOnCanvas = arg4;
    }
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const file = new File([u8], name, { type: mime || 'application/octet-stream' });

    // 0. Dedicated loadAsset or openFile method on window[appId] if present
    if (window[appId] && typeof window[appId].loadAsset === 'function') {
      const res = await window[appId].loadAsset({ id, name, mimeType: mime, bytes: u8, file });
      return { method: `window.${appId}.loadAsset`, result: res };
    }
    if (window[appId] && typeof window[appId].openFile === 'function') {
      const res = await window[appId].openFile(name, u8);
      return { method: `window.${appId}.openFile`, result: res };
    }

    // 1. Native ?host=parent postMessage protocol (cadcraft, wordcraft, gridcraft, pdfcraft)
    if (['cadcraft', 'wordcraft', 'gridcraft', 'pdfcraft'].includes(appId)) {
      try {
        window.postMessage({ type: `${appId}:open`, name, bytes: u8 }, location.origin);
      } catch (err) {
        console.warn('[MosaicForgeBridge] host:open postMessage warning:', err);
      }
    }

    // 1. FilmCraft native JS API
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

    // 2. VectorCraft / FigCraft native openFile(name, Uint8Array) API
    if ((appId === 'vectorcraft' || appId === 'figcraft') && window[appId] && typeof window[appId].openFile === 'function') {
      const res = await window[appId].openFile(name, u8);
      return { method: `window.${appId}.openFile`, result: res };
    }

    // 3. EffectCraft wasm-bindgen addFile API
    if (appId === 'effectcraft' && window.effectcraft && typeof window.effectcraft.addFile === 'function') {
      try {
        const res = await window.effectcraft.addFile(file, name);
        return { method: 'window.effectcraft.addFile', result: res };
      } catch (err) {
        console.warn('[MosaicForgeBridge] effectcraft.addFile fallback:', err);
      }
    }

    // 4. SolidCraft OPFS + engine file.open / file.import for .sc / .step / .stl
    if (appId === 'solidcraft' && window.solidcraft && typeof window.solidcraft.execute === 'function') {
      const lower = name.toLowerCase();
      if (lower.endsWith('.sc') || lower.endsWith('.solidcraft')) {
        try {
          const root = await navigator.storage.getDirectory();
          const handle = await root.getFileHandle(name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(u8);
          await writable.close();
          const res = await window.solidcraft.execute('file.open', { path: `/opfs/${name}` });
          return { method: 'solidcraft.opfs.open', result: res };
        } catch (err) {
          console.warn('[MosaicForgeBridge] SolidCraft OPFS open fallback to drop:', err);
        }
      }
    }

    // 5. Fallback to standard DragEvent('drop') on the <canvas> (works for PhotoCraft, SolidCraft, DesignCraft, DeckCraft, SoundCraft, LightCraft, etc.)
    return dispatchCanvasFileDrop(file, Boolean(placeOnCanvas));
  }

  function getEditorApiStatus() {
    const canvas = document.querySelector('canvas');
    const loadingEl = document.querySelector('[id$="loading"]');
    return {
      appId,
      canvasReady: Boolean(canvas && canvas.width > 0 && canvas.height > 0 && !loadingEl),
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      hasWindowApi: Boolean(window[appId]),
      apiMethods: window[appId] ? Object.keys(window[appId]) : [],
      capturedExportsCount: capturedExports.length,
    };
  }

  // Expose helper on window.__mosaicBridge for direct same-origin inspection and automated testing
  window.__mosaicBridge = {
    appId,
    getStatus: getEditorApiStatus,
    inspectState: getEditorApiStatus,
    openFileInEditor,
    dispatchCanvasFileDrop,
    capturedExports,
  };

  window.addEventListener('message', async (event) => {
    if (!isTrustedSameOrigin(event)) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    const reqId = data.requestId || null;
    try {
      if (data.type === 'omnicraft:theme-change' || data.type === 'mosaic:theme-change') {
        const theme = data.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        if (document.body) document.body.setAttribute('data-theme', theme);
        postToShell({ type: 'omnicraft:theme-change:ok', requestId: reqId, theme });
      } else if (
        data.type === 'omnicraft:import-asset' ||
        data.type === 'omnicraft:load-asset' ||
        data.type === 'omnicraft:import-cad'
      ) {
        const result = await openFileInEditor(data);
        postToShell({ type: 'omnicraft:load-asset:ok', requestId: reqId, result });
        postToShell({ type: 'omnicraft:import-asset:ok', requestId: reqId, result });
        postToShell({ type: 'mosaic:open-file:ok', requestId: reqId, result });
      } else if (data.type === 'omnicraft:ping') {
        postToShell({ type: 'omnicraft:pong', requestId: reqId, status: getEditorApiStatus() });
      } else if (data.type === 'mosaic:ping') {
        postToShell({ type: 'mosaic:pong', requestId: reqId, status: getEditorApiStatus() });
      } else if (data.type === 'mosaic:open-file') {
        const result = await openFileInEditor(data);
        postToShell({ type: 'mosaic:open-file:ok', requestId: reqId, result });
      } else if (data.type === 'mosaic:execute') {
        const api = window[appId];
        if (!api || typeof api.execute !== 'function') {
          throw new Error(`Editor ${appId} does not expose window.${appId}.execute`);
        }
        const result = await api.execute(data.command, data.params || {});
        postToShell({ type: 'mosaic:execute:ok', requestId: reqId, result });
      } else if (data.type === 'mosaic:inspect') {
        const api = window[appId];
        if (!api || typeof api.inspect !== 'function') {
          throw new Error(`Editor ${appId} does not expose window.${appId}.inspect`);
        }
        const result = await api.inspect(data.params || {});
        postToShell({ type: 'mosaic:inspect:ok', requestId: reqId, result });
      } else if (data.type === 'mosaic:commands') {
        const api = window[appId];
        if (!api || typeof api.commands !== 'function') {
          throw new Error(`Editor ${appId} does not expose window.${appId}.commands`);
        }
        const result = await api.commands();
        postToShell({ type: 'mosaic:commands:ok', requestId: reqId, result });
      }
    } catch (err) {
      postToShell({
        type: 'mosaic:error',
        requestId: reqId,
        error: err && err.message ? err.message : String(err),
      });
    }
  });

  // Catch native ?host=parent saves from cadcraft, wordcraft, gridcraft, etc.
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === `${appId}:save` || event.data.type === 'cadcraft:save') {
      const name = event.data.name || `${appId}-drawing.dxf`;
      const bytes = event.data.bytes;
      let ab;
      if (bytes instanceof ArrayBuffer) {
        ab = bytes;
      } else if (bytes && bytes.buffer) {
        ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      } else {
        ab = new ArrayBuffer(0);
      }
      const mime = name.endsWith('.dxf') ? 'application/dxf' : 'application/octet-stream';
      const copy1 = ab.slice(0);
      postToShell({
        source: 'omnicraft-os',
        type: 'omnicraft:export-ready',
        appId,
        name,
        mime,
        size: copy1.byteLength,
        bytes: copy1,
        file: {
          name,
          mime,
          type: mime,
          size: copy1.byteLength,
          bytes: copy1,
          timestamp: Date.now(),
        },
      }, [copy1]);
    }
  });

  function hookSolidcraft() {
    if (appId === 'solidcraft' && window.solidcraft && typeof window.solidcraft.execute === 'function' && !window.solidcraft.__exportHooked) {
      window.solidcraft.__exportHooked = true;
      const origExec = window.solidcraft.execute.bind(window.solidcraft);
      window.solidcraft.execute = async function (cmd, params) {
        const res = await origExec(cmd, params);
        if (cmd === 'file.export' && params && params.path) {
          try {
            const fileName = params.path.split('/').pop() || 'model.step';
            const mime = fileName.endsWith('.stl') ? 'model/stl' : 'application/step';
            let bytes = null;
            if (res && res.bytes) {
              bytes = res.bytes;
            } else if (navigator.storage && navigator.storage.getDirectory) {
              try {
                const root = await navigator.storage.getDirectory();
                const handle = await root.getFileHandle(fileName);
                const f = await handle.getFile();
                bytes = await f.arrayBuffer();
              } catch {}
            }
            if (bytes) {
              const copy = bytes.slice(0);
              postToShell({
                source: 'omnicraft-os',
                type: 'omnicraft:export-ready',
                appId,
                name: fileName,
                mime,
                size: copy.byteLength,
                bytes: copy,
                file: {
                  name: fileName,
                  mime,
                  type: mime,
                  size: copy.byteLength,
                  bytes: copy,
                  timestamp: Date.now()
                }
              }, [copy]);
            }
          } catch (err) {
            console.warn('[MosaicForgeBridge] SolidCraft export hook notice:', err);
          }
        }
        return res;
      };
    }
  }

  // Poll until canvas and optional window[appId] are ready, then notify parent shell
  let notifiedReady = false;
  const pollTimer = setInterval(() => {
    hookSolidcraft();
    const status = getEditorApiStatus();
    if (status.canvasReady && !notifiedReady) {
      notifiedReady = true;
      postToShell({ type: 'mosaic:editor-ready', status });
      postToShell({ type: 'omnicraft:editor-ready', status });
      clearInterval(pollTimer);
    }
  }, 250);
  setTimeout(() => clearInterval(pollTimer), 30000);
})();
