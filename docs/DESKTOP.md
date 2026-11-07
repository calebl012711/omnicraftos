# Browser and desktop paths

The browser app uses React/TypeScript/Vite. Capture, Model and Music also have direct routes: `/?tool=recorder`, `/?tool=model`, `/?tool=music`. Heavy WASM editors load only when opened.

Tauri v2 uses the system webview instead of bundling Chromium. A real macOS debug `.app` now builds, is ad-hoc signed, passes `codesign --verify --deep --strict`, and launches from its bundle on macOS 14.8.9, Intel MacBookAir8,1, 16 GB RAM. The tested bundle is approximately 328 MiB, including the integrated editors. It is local, unnotarized and has not been installed into `/Applications` or published.

```sh
npm ci
npm run assets:prepare
npm run dev -- --host 127.0.0.1
# Separate terminal, using the running Vite server:
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:dev
# Optional: build only, with one Cargo worker and low CPU priority.
# This preserves the previous app and never launches a window.
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:build -- --config verification/desktop/bundle-config.json
# Output: staging/desktop-low-impact-target/debug/bundle/macos/OmniCraft OS.app
npm run desktop:info
```

Development uses Vite; the bundled `.app` loads embedded assets at `tauri://localhost`. Its earlier home and Capture interface/capability checks passed. This does not establish offline operation of every editor. That bundled test reported `document.visibilityState === 'hidden'`; visible-window verification failed, and the CAD frame loop could not be verified. Native verification is now deferred at the user's request. Do not launch the app automatically for tests.

The native view is WebKit. Capture APIs and an MP4 encoder are reported, but physical screen/camera/mic recording, native download/picker behavior, CAD save/export and project persistence across app restarts remain unverified. A wrapper alone does not supply native capture or system audio. Unsupported capture shows an error; use the separately tested browser path for accepted recording workflows.

Browser and Tauri storage are distinct. Transfer projects using exported files/backups; do not assume a shared database. macOS camera/microphone permission descriptions are supplied. No native shell/filesystem plugins are exposed. A debug-only opt-in probe writes to a fixed report path only when configured through `OMNICRAFT_DESKTOP_PROBE_DIR`; it is omitted from release builds and requests no device permissions. The verification bundle uses `studio.omnicraft.os.verification` so it does not share the regular app identity.

Build evidence is in `verification/desktop/bundle-build.json`, with the exact command and bundle path. Runtime evidence is separate in `verification/desktop/bundled/report.json`. Older failed probes remain historical. Browser checks cannot substitute for native acceptance. CSP hardening, notarization, offline testing, Windows and Linux remain pending.

## Current frontend changes

The Tauri frontend now opens a compact project launcher instead of the browser hero page. Recent projects are ordered by modification date. Open model accepts an existing native SC project or supported STEP/STL file; New project opens the actual project dialog. Capture and Model remain direct shortcuts. Other workspaces display their verification limits.

Model requests SolidCraft's own full interface in Tauri, including its original ribbon and modeling controls. Suite navigation, Quick part and Save to Projects sit below the viewport. The browser retains its guided controls with a Full CAD workspace switch; either interface can switch back. Switching serializes and reopens the native design, preserving geometry and parameters. It starts a new undo history; save a named project or export a backup for durable use.

These frontend changes have headless browser checks, separate from native acceptance. The previously built `.app` does not include them until a new desktop build completes. A compiler cache or a copied old bundle is not evidence of an updated app. No Rust/WASM rebuild or native app launch is needed for routine frontend changes; use `npm run build` and the short checks first:

```sh
npm run preview -- --host 127.0.0.1
# In another terminal, serially:
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:desktop-home
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:capture-library
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:model
```
