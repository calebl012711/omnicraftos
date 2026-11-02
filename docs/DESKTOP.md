# Browser and desktop paths

The browser app uses React/TypeScript/Vite. Capture, Model and Music also have direct routes: `/?tool=recorder`, `/?tool=model`, `/?tool=music`. Heavy WASM editors load only when opened.

Tauri v2 is the desktop development approach: it uses the system webview instead of bundling Chromium. The actual debug app compiled and launched on macOS 14.8.9, Intel MacBookAir8,1, 16 GB RAM. In an isolated WebKit test, the home and Capture interface/capability checks passed, but the subsequent CAD phase did not complete successfully. This is **not a passing desktop workflow or an installable release**.

```sh
npm ci
npm run dev -- --host 127.0.0.1
# Separate terminal, using the running Vite server:
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:dev
# Build a separate local, ad-hoc signed .app; not yet workflow-verified:
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:build
npm run desktop:info
```

Development uses the Vite server. It is not an offline installed app. If a bundle build succeeds, its path is `src-tauri/target/debug/bundle/macos/OmniCraft OS.app`. These commands do not install into `/Applications`, notarize, submit to a store or publish anything.

The native view is WebKit. API and MP4 capability detection passed in the development probe, but physical screen/camera/mic capture, native download/picker behavior, CAD save/export, offline assets and installed-origin storage were not verified. A wrapper alone does not supply native capture or system audio. Unsupported capture shows an error; use the separately tested browser path until a native workflow passes.

Browser and Tauri storage are distinct. Transfer projects using actual native files/backups; do not assume a shared database. macOS camera/microphone permission descriptions are supplied. No native shell/filesystem plugins are exposed. A debug-only opt-in probe command writes to a fixed test report path only when explicitly configured through `OMNICRAFT_DESKTOP_PROBE_DIR`; it is omitted from release builds. It requests no device permissions.

CSP hardening remains pending because inherited editors use inline boot scripts. Windows and Linux are untested. Browser reports cannot be used as desktop acceptance evidence. The failed overall native probe is retained separately at `verification/desktop/development/report.json`.
