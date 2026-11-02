# Browser and desktop paths

The browser app uses React/TypeScript/Vite. Capture, Model and Music also have direct routes: `/?tool=recorder`, `/?tool=model`, `/?tool=music`. Heavy WASM editors load only when opened.

Tauri v2 uses the system webview instead of bundling Chromium. A real macOS debug `.app` now builds, is ad-hoc signed, passes `codesign --verify --deep --strict`, and launches from its bundle on macOS 14.8.9, Intel MacBookAir8,1, 16 GB RAM. The tested bundle is approximately 328 MiB, including the integrated editors. It is local, unnotarized and has not been installed into `/Applications` or published.

```sh
npm ci
npm run assets:prepare
npm run dev -- --host 127.0.0.1
# Separate terminal, using the running Vite server:
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:dev
# Build the local standalone bundle with an isolated verification identity:
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:build -- --config verification/desktop/bundle-config.json
open "src-tauri/target/debug/bundle/macos/OmniCraft OS.app"
npm run desktop:info
```

Development uses Vite; the bundled `.app` loads embedded assets at `tauri://localhost`. Its home and Capture interface/capability checks passed. This does not establish offline operation of every editor. The bundled test reports `document.visibilityState === 'hidden'`; visible-window verification failed, and the CAD frame loop could not be verified. CLI-launched views also remained hidden despite show/focus requests. The user has been asked to wake/unlock the Mac and keep the verification window visible. Native rendering/capture checks must be repeated when the view is actually visible.

The native view is WebKit. Capture APIs and an MP4 encoder are reported, but physical screen/camera/mic recording, native download/picker behavior, CAD save/export and project persistence across app restarts remain unverified. A wrapper alone does not supply native capture or system audio. Unsupported capture shows an error; use the separately tested browser path for accepted recording workflows.

Browser and Tauri storage are distinct. Transfer projects using exported files/backups; do not assume a shared database. macOS camera/microphone permission descriptions are supplied. No native shell/filesystem plugins are exposed. A debug-only opt-in probe writes to a fixed report path only when configured through `OMNICRAFT_DESKTOP_PROBE_DIR`; it is omitted from release builds and requests no device permissions. The verification bundle uses `studio.omnicraft.os.verification` so it does not share the regular app identity.

Build evidence is in `verification/desktop/bundle-build.json`, with the exact command and bundle path. Runtime evidence is separate in `verification/desktop/bundled/report.json`. Older failed probes remain historical. Browser checks cannot substitute for native acceptance. CSP hardening, notarization, offline testing, Windows and Linux remain pending.
