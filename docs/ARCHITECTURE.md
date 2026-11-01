# Mosaic Forge — Technical Architecture & Hardware Optimization Guide

## 1. Architectural Overview

**Mosaic Forge** is a local-first, unified creative suite and parametric CAD workspace built with **React 18 + TypeScript + Vite** around 14 live **Rust + WebAssembly (`eframe` / `wgpu` / WebGL2)** applications from the open-source Craft and Tangency Labs ecosystems.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   Mosaic Forge React + TypeScript Shell                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ Studio Home  │ │   Projects   │ │Shared Assets │ │Upstream & Licenses│  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ IndexedDB (`mosaic-forge-db`) + Origin-Private File System (`/opfs`) │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │ Same-Origin Validated Bridge
                                     │ (`isSameOriginEvent` + `window.<app>`)
┌────────────────────────────────────▼───────────────────────────────────────┐
│        Single Active Embedded WASM Workspace (`/editors/<appId>/`)         │
│  • SolidCraft 3D CAD (`window.solidcraft` + `/opfs/*.sc` + STEP/STL)       │
│  • FilmCraft Video Studio (`window.filmcraft` + WebCodecs + VFS)           │
│  • PhotoCraft, VectorCraft, CADCraft (`?host=parent`), PdfCraft,           │
│    WordCraft, GridCraft, FigCraft, SoundCraft, DeckCraft, DesignCraft,     │
│    EffectCraft, LightCraft                                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Why Same-Origin Embedded Iframe Isolation Was Chosen Over Multi-SPA Rewrites

Each upstream editor (`solidcraft`, `filmcraft`, `photocraft`, `vectorcraft`, `cadcraft`, etc.) compiles a complete Rust `eframe`/`egui` application to WebAssembly (`wasm32-unknown-unknown`) that binds to a full-viewport `<canvas>`, registers global keyboard/mouse/wheel listeners on `window`, and allocates hundreds of megabytes of linear WASM memory and WebGPU/WebGL2 textures.

Mounting an upstream WASM binary inside a **same-origin lazy-loaded `<iframe>`** (`/editors/<appId>/index.html`) inside the React workspace stage gives us four major engineering advantages:

1. **Deterministic WASM & GPU Memory Reclamation**: When the user switches from `FilmCraft` to `SolidCraft`, React unmounts the previous `<iframe>`. The browser immediately destroys the previous WASM linear memory heap, Web Workers, AudioContexts, and WebGPU/WebGL2 contexts—preventing out-of-memory crashes on a 16 GB RAM laptop.
2. **Zero Global Event Listener Collisions**: Each `eframe` binary attaches `keydown`, `keyup`, `pointermove`, and `wheel` handlers to its own `window` without hijacking the React shell's navigation or modal dialogs.
3. **Direct Same-Origin Programmatic Control**: Because the iframe is served from the exact same origin as the React shell, the parent shell can both validate `postMessage` events (`Origin.from(event).isSameOrigin(Origin.from(self))`) and directly invoke `iframe.contentWindow.solidcraft`, `iframe.contentWindow.filmcraft`, `iframe.contentWindow.vectorcraft`, `iframe.contentWindow.figcraft`, and `iframe.contentWindow.effectcraft`.
4. **Zero-Rewrite Upstream Maintainability**: Upstream maintainers can ship new WASM releases or Rust commits without requiring us to rewrite their Rust UI in React.

---

## 3. Host Adapter & Bridge Protocol (`public/editors/mosaic-forge-bridge.js`)

Instead of pretending that all 14 upstream repositories share an identical API, Mosaic Forge implements a layered adapter (`public/editors/mosaic-forge-bridge.js`) that connects each editor using its real upstream interface:

| Integration Tier | Upstream Apps | Mechanism |
| :--- | :--- | :--- |
| **Tier 1: Rich JS Automation API (`window.<app>`)** | `solidcraft`, `filmcraft`, `vectorcraft`, `figcraft`, `effectcraft`, `lightcraft` | Direct async `execute(command, params)`, `inspect()`, `commands()`, `importUrl()`, `openFile()`, and OPFS/VFS inspection. |
| **Tier 2: Native `?host=parent` `postMessage` Protocol** | `cadcraft`, `wordcraft`, `gridcraft`, `pdfcraft` | Upstream Rust code checks `?host=parent`, validates `window.parent` origin, and emits `<app>:ready`, `<app>:save` (`{ name, bytes }`), `<app>:dirty`, and accepts `<app>:open` (`{ name, bytes }`). |
| **Tier 3: Synthetic Canvas Drop & Download Capture** | `photocraft`, `designcraft`, `soundcraft`, `deckcraft` (and fallback for all 14) | Dispatches a synthetic `DragEvent('drop')` with a `DataTransfer` `File` onto the `eframe` `<canvas>` to open assets, and hooks `URL.createObjectURL(blob)` + `<a download>.click()` to automatically capture saved/exported files back into Mosaic Forge's IndexedDB `files` and `assets` stores. |

---

## 4. Local-First Storage Architecture (`src/storage/db.ts`)

Mosaic Forge requires **no accounts, no cloud database, and no paid APIs**. Persistence is organized into three layers:

1. **Suite Project Store (`IndexedDB: mosaic-forge-db -> projects`)**:
   - Tracks project metadata (`id`, `name`, `workspaceId`, `createdAt`, `updatedAt`, `nativeFileName`, `storedSnapshotFileId`, `mediaReferences`, `notes`, `tags`).
   - Explicitly separates lightweight project metadata from heavy media assets and tracks `mediaReferences` so missing media files can be detected and re-linked.
2. **Captured Snapshots & Exports Store (`IndexedDB: mosaic-forge-db -> files`)**:
   - Stores binary `ArrayBuffer` snapshots (`.sc`, `.fcproj`, `.pht`, `.dxf`, `.step`, `.stl`, `.png`, `.mp4`) associated with a project.
3. **Shared Assets Handoff Hub (`IndexedDB: mosaic-forge-db -> assets`)**:
   - Stores cross-workspace assets (seeded with 5 self-generated open calibration files in `public/sample-assets/`) and maps each file extension to compatible target workspaces.
4. **Origin-Private File System (`OPFS: /opfs/`)**:
   - Used directly by `SolidCraft` (`/opfs/*.sc`, `/opfs/*.step`, `/opfs/*.stl`) and browser editors for high-speed synchronous-style virtual file access.
5. **Full JSON Backup & Restore**:
   - One-click **Backup All (JSON)** serializes all projects, snapshots, and user assets into a portable `.json` archive that survives browser cache clearing.

---

## 5. Target Hardware Profile & 20–60 Minute Video Editing Plan

### Target Hardware Profile
- **Machine**: 2018 MacBook Air (`MacBookAir8,1`)
- **CPU**: Dual-Core 1.6 GHz Intel Core i5-8210Y (2 physical cores / 4 threads, Amber Lake-Y)
- **RAM**: 16 GB LPDDR3
- **GPU**: Intel UHD Graphics 617 (shared memory)

### Practical Optimizations Implemented
1. **Single-Editor Active Mounting**: Only one WASM editor iframe is mounted at any time.
2. **Renderer Backend Selector (`Auto`, `Force WebGL2 (?webgl)`, `Force CPU (?cpu)`)**: Available directly in the top workspace bar so if a complex WebGPU shader stalls on Intel UHD Graphics 617, the user can switch to `?webgl` or `?cpu` with one click.
3. **Service Worker Gate**: Upstream `sw.js` registrations are gated behind `?sw=1` so background Service Workers do not duplicate 400+ MB of WASM binaries in cache during local studio use.

### Architectural Plan for 20–60 Minute Video Timelines on This Hardware
Because browser WebAssembly (`wasm32-unknown-unknown`) has a hard **4 GB address space ceiling** per tab and the dual-core 1.6 GHz i5-8210Y is thermally constrained:
- **Short Clips & Reels (0–5 min, 720p/1080p)**: Can be imported, cut, keyframed, and exported directly inside the browser `FilmCraft` WASM workspace using WebCodecs.
- **Long-Form Video (20–60 min)**:
  1. **Proxy Generation**: Transcode camera originals into lightweight 540p H.264 intra-frame proxies using local `ffmpeg` (`ffmpeg -i input.mp4 -vf scale=-2:540 -c:v libx264 -preset veryfast -g 15 -c:a aac proxy.mp4`).
  2. **Offline Timeline Editing**: Edit the proxy media inside `FilmCraft`, saving `.fcproj` checkpoints regularly to disk/IndexedDB.
  3. **Interchange Export (`OTIO` / `FCPXML` / `EDL`)**: Export the finished cut as OpenTimelineIO (`.otio`) or Final Cut Pro XML (`.fcpxml`) from `FilmCraft`, or open the `.fcproj` in a native desktop build of `filmcraft` (`cargo build --release` on desktop) so final full-resolution rendering streams directly from disk via native `ffmpeg` without hitting the 4 GB WASM memory ceiling.
