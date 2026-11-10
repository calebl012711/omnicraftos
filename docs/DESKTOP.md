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

## Manual build away from the laptop

`.github/workflows/desktop-intel.yml` prepares an Intel package on GitHub's standard `macos-15-intel` runner. It has only a manual trigger, read-only repository permissions, pinned action commits, Node 26.3.0 and Rust 1.99.1. It does not open the app, create releases or deploy the website. It is prepared but has not yet completed a hosted build; YAML validation is not proof of a successful package.

The workflow installs locked dependencies, regenerates and verifies the desktop notices, runs serial unit checks, and builds a debug `.app`. `scripts/finalize-desktop-package.mjs` then verifies Intel architecture, copies accessible license texts into `Contents/Resources/ThirdPartyNotices`, verifies those copies and checks the renewed ad-hoc signature. It records the binary hash, workspace revision at inspection, frontend workspace hashes and explicit native-testing limits in `verification/desktop-package/report.json`. The build job and compiler logs establish the compiled revision; static inspection alone does not extract or prove the identity of embedded frontend assets. The finalizer accepts only a staging bundle, preserving the older app.

To use it after the workflow is available on GitHub, select **Actions → Build Intel Mac package → Run workflow**. Leave `upload_bundle` false for a build-only check. Enable it to retain a downloadable ZIP for one day, capped at 400 MB. Artifact storage counts against the account quota; no paid runner or persistent build cache is selected. Standard public-repository runner compute is covered by [GitHub's hosted-runner policy](https://docs.github.com/en/actions/reference/runners/github-hosted-runners); [artifact storage has separate limits](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

Hosted construction and signature checks do not verify native recording, CAD rendering/export, installation, offline operation or persistence. Those checks remain deferred under the user's instruction to keep the Mac app closed. The current laptop build was stopped; no updated bundle is claimed from it.

The local build wrapper now forwards cancellation to its own process group and terminates remaining build descendants before exiting. `node scripts/verify-build-cancellation.mjs` checks this with sleeping fixture processes, including a descendant that ignores `SIGTERM`; it launches no compiler or app.
