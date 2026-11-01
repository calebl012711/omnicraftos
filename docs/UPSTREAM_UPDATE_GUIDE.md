# OmniCraft OS — Upstream Tracking, Update & Overlay Guide

## 1. Upstream & Overlay Architecture

OmniCraft OS (and Mosaic Forge) isolates the **OmniCraft OS React shell, postMessage bridges, and Bento design system** from the **22 upstream open-source repositories** (`storytold/*` and `tangency-labs/*` / `tangency-llc/*`). This ensures you can seamlessly receive upstream commits, releases, and branch updates without risk of overwriting or conflicting with OmniCraft OS customizations.

```
                                  [ Upstream Repositories ]
                          (storytold/*, tangency-labs/*, tangency-llc/*)
                                            │
                                            ▼  (git pull / sync)
                              [ upstream/<id>/ Git Clones ]
                                  (100% clean upstream code)
                                            │
                                            ▼  (WASM compile / extract)
                                [ public/editors/<id>/ ]
                             (compiled WebAssembly & assets)
                                            │
   [ upstream/overlays/ ]  ─────────────────┴──► [ Applied OmniCraft OS Overlays ]
   ├── shared/                                   ├── bento-theme-bridge.js
   │   ├── omnicraft-bridge.js                   ├── mosaic-forge-bridge.js
   │   ├── bento-theme-bridge.js                 ├── bento-theme-overlay.css
   │   └── bento-theme-overlay.css               ├── OmniCraft OS Title & Metadata
   └── config.json                               └── Bento Badges & Loading Marks
```

### Key Components

- **`upstream/manifest.json`**: Single machine-readable source of truth listing all 24 discovered repositories (14 integrated web apps, 1 source-only app `fieldcraft`, 7 shared libraries/ecosystem repos, and 2 blocked repos `pcbcraft` and `anicraft`), their exact 40-character pinned commit SHAs, release tags, selected licenses, local checkout paths (`upstream/<id>`), and web bundle paths (`public/editors/<id>`).
- **`upstream/<id>/`**: Clean, unmodified Git checkouts pinned at the exact commit SHA recorded in `upstream/manifest.json`. Upstream pulls in this directory **never** conflict because OmniCraft OS wrapper code is isolated outside.
- **`upstream/overlays/`**: Dedicated overlay layer storing canonical postMessage bridges (`omnicraft-bridge.js`, `bento-theme-bridge.js`), Bento theme stylesheets (`bento-theme-overlay.css`), and workspace configuration (`config.json`).
- **`public/editors/<id>/`**: Extracted WebAssembly bundles and entry points bridged via `bento-theme-bridge.js` and `mosaic-forge-bridge.js`.
- **`scripts/upstream-manager.mjs`**: Zero-dependency Node CLI managing remote checks, local status audits, license audits, overlay injection, automated sync, and rollbacks.

---

## 2. CLI Commands Reference

### 2.1 Remote Upstream Check (`check`)
Compares pinned commits against remote GitHub HEADs and latest releases (100% read-only). Automatically handles upstream organization redirects (`tangency-labs` <-> `tangency-llc` and `storytold`).

```bash
# Check all 22 upstream repositories against GitHub:
npm run upstream:check
# Or:
node scripts/upstream-manager.mjs check --output public/upstream-report.json

# Check a single repository (e.g., solidcraft or filmcraft):
node scripts/upstream-manager.mjs check --app solidcraft
```

### 2.2 Local Checkout Status (`status`)
Verifies local checkouts on disk (offline-safe, fast). Confirms directory existence, `.git` integrity, pinned commit match, clean working trees, and editor bundle availability.

```bash
# Verify all local checkouts:
npm run upstream:status
# Or:
node scripts/upstream-manager.mjs status

# Filter for a single workspace:
node scripts/upstream-manager.mjs status --app filmcraft
```

### 2.3 License Compliance Audit (`licenses`)
Audits license compliance across all workspaces:
- Scans `upstream/<id>` on disk for actual license files (`LICENSE`, `LICENSE-MIT`, `LICENSE-APACHE`, `OFL.txt`, `NOTICE`, `ATTRIBUTION.md`).
- Confirms permissive license selection (MIT, Apache-2.0, OFL-1.1).
- Confirms copyleft isolation: `pcbcraft` (`GPL-3.0`) is strictly blocked from checkouts and builds.
- Confirms stub isolation: `anicraft` (unlicensed empty stub) is excluded.
- Confirms trademark isolation per `docs/brand/LICENSE-brand.txt`: proprietary upstream trademarks are removed.

```bash
# Audit license compliance:
npm run upstream:licenses
# Or:
node scripts/upstream-manager.mjs licenses
```

### 2.4 Apply & Verify Overlays (`apply-overlays` / `verify-overlays`)
Ensures custom OmniCraft OS wrappers, postMessage bridges, and Bento branding overrides are injected into `public/editors/<id>/index.html`.

```bash
# Verify that all 14 integrated workspaces have bridges and Bento styling intact:
npm run upstream:overlays
# Or:
node scripts/upstream-manager.mjs verify-overlays

# Reapply overlays across all editor bundles:
npm run upstream:apply-overlays
# Or:
node scripts/upstream-manager.mjs apply-overlays [--app <id>]
```

### 2.5 Automated Upstream Sync (`sync`)
Fetches upstream commits from remote, checks out the ref in `upstream/<appId>`, updates `upstream/manifest.json`, and automatically reapplies overlays so customizations are preserved.

```bash
# Sync an app to latest main:
node scripts/upstream-manager.mjs sync solidcraft

# Sync to a specific tag or commit:
node scripts/upstream-manager.mjs sync filmcraft --ref v0.15.1
```

### 2.6 Isolated Test Updates & Rollback (`test-update` / `rollback`)
Test an upstream commit on an isolated branch without modifying `upstream/manifest.json`:

```bash
# Checkout an isolated test branch:
node scripts/upstream-manager.mjs test-update solidcraft --target origin/main

# Roll back to the pinned commit:
node scripts/upstream-manager.mjs rollback solidcraft
```

---

## 3. How Upstream Pulls Preserve OmniCraft OS Customizations

1. **Clean Upstream Clones**: `upstream/<id>/` contains zero modified files. Running `git fetch` or `git pull` pulls upstream commits cleanly.
2. **Decoupled Overlays**: Custom postMessage bridges (`mosaic-forge-bridge.js`, `bento-theme-bridge.js`), Bento themes, and brand configurations are maintained in `upstream/overlays/` and `src/`.
3. **Automated Reapplication**: Whenever an upstream bundle is recompiled or extracted into `public/editors/<id>/`, running `node scripts/upstream-manager.mjs apply-overlays` (or running `sync`) automatically:
   - Injects `<script src="../mosaic-forge-bridge.js?app=<id>"></script>` before `</body>`.
   - Injects `<script src="../bento-theme-bridge.js?app=<id>"></script>` before `</body>`.
   - Replaces document title with OmniCraft OS branding (`OmniCraft OS — <Workspace Title>`).
   - Injects `<meta name="application-name" content="OmniCraft OS">`.
   - Replaces upstream loading graphics with OmniCraft OS / Bento geometric marks.

---

## 4. End-to-End Upgrade Workflow

When `npm run upstream:check` reports updates available:

1. **Inspect diff**:
   ```bash
   cd upstream/<appId>
   git fetch origin main --depth 20
   git log HEAD..origin/main --oneline
   ```
2. **Synchronize checkout & apply overlays**:
   ```bash
   node scripts/upstream-manager.mjs sync <appId>
   ```
3. **Rebuild web bundle (if compiling from source)**:
   ```bash
   cd upstream/<appId>
   trunk build --release
   cp -R dist/* ../../public/editors/<appId>/
   node scripts/upstream-manager.mjs apply-overlays --app <appId>
   ```
4. **Verify tests & overlays**:
   ```bash
   npm run upstream:overlays
   npm test
   ```
5. **Commit updated manifest**:
   `git commit -m "chore(upstream): update <appId> to <sha>"`
