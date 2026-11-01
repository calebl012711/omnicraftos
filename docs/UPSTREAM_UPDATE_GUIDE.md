# Mosaic Forge — Upstream Tracking, Update & Rollback Guide

## 1. Repository Pinning Architecture

Mosaic Forge separates the **Mosaic Forge React shell & adapter layer** from the **22 upstream open-source repositories** so you can pull upstream improvements from `storytold/*` and `tangency-labs/*` without manually rebuilding your product from scratch.

- **`upstream/manifest.json`**: Single machine-readable source of truth listing all 24 discovered repositories (14 integrated web apps, 1 source-only app `fieldcraft`, 7 shared libraries/ecosystem repos, and 2 blocked repos `pcbcraft` and `anicraft`), their exact 40-character pinned commit SHAs, release tags, selected licenses, local checkout paths (`upstream/<id>`), and web bundle paths (`public/editors/<id>`).
- **`upstream/<id>/`**: Clean, unmodified shallow Git checkouts pinned at the exact commit SHA recorded in `upstream/manifest.json`.
- **`public/editors/<id>/`**: Extracted WebAssembly bundles bridged via `public/editors/mosaic-forge-bridge.js`.
- **`scripts/upstream-manager.mjs`**: Zero-dependency Node CLI for read-only upstream comparison, local status checks, and license verification.

---

## 2. Checking for Upstream Updates (100% Read-Only)

To check all 22 upstream repositories against GitHub without modifying any local files:

```bash
npm run upstream:check
```

Or to check a single repository (for example, `solidcraft` or `filmcraft`):

```bash
node scripts/upstream-manager.mjs check --app solidcraft
```

### What `upstream:check` Does
1. Reads the pinned commit SHA and branch from `upstream/manifest.json`.
2. Queries the remote GitHub HEAD via `git ls-remote` (or `git fetch --dry-run`) and the GitHub Releases API.
3. Lists any new upstream commits (`git log <pinned>..<remote_head> --oneline`) and the latest release notes.
4. Writes a machine-readable report to `public/upstream-report.json` (which is also displayed inside the **Upstream, Licenses & Config** tab of the Mosaic Forge web UI).
5. **Never** mutates `upstream/<id>` or `public/editors/<id>`.

---

## 3. Verifying Local Checkouts & Licenses

To verify that all 22 local checkouts in `upstream/<id>` match `upstream/manifest.json` with a clean working tree:

```bash
npm run upstream:status
```

To verify that every non-blocked repository contains its required MIT/Apache-2.0/OFL license file on disk:

```bash
npm run upstream:licenses
```

---

## 4. How to Upgrade an Individual Workspace Safely

When `npm run upstream:check` reports that an upstream repository (e.g., `solidcraft` or `filmcraft`) has new commits or a new release tag:

### Step 1: Fetch and Inspect the Upstream Diff
```bash
cd upstream/solidcraft
git fetch origin main --depth 20
git log HEAD..origin/main --oneline
```

### Step 2: Update the Pinned Checkout & Web Bundle
- **Option A (Use Official Upstream Web Release Artifact — Fast)**:
  Download the new `*-web.tar.gz` release archive from the upstream GitHub Release, extract it to `public/editors/<appId>/`, and ensure `<script src="../mosaic-forge-bridge.js?app=<appId>"></script>` is present before `</body>` in `public/editors/<appId>/index.html`.
- **Option B (Compile from Rust Source with Trunk)**:
  ```bash
  export PATH="$HOME/.cargo/bin:$PATH"
  cd upstream/<appId>
  git checkout <new-commit-sha>
  trunk build --release
  cp -R dist/* ../../public/editors/<appId>/
  ```

### Step 3: Run End-to-End Verification Before Committing
```bash
npm run build
npm test
node scripts/verify-e2e-workflows.mjs
```

### Step 4: Record the New Commit SHA in `upstream/manifest.json`
Update `pinnedCommit` and `pinnedTag` in `upstream/manifest.json` (and copy to `public/upstream-manifest.json`).

---

## 5. How to Roll Back a Broken Upstream Update

If an upstream update introduces a regression in a specific workspace (for example, a shader bug on Intel UHD Graphics 617 or a changed command parameter):

1. Look up the last known-good `pinnedCommit` and `pinnedTag` in `upstream/manifest.json` (or `git diff upstream/manifest.json`).
2. Check out the previous commit in `upstream/<appId>`:
   ```bash
   git -C upstream/<appId> checkout <previous-pinned-sha>
   ```
3. Restore `public/editors/<appId>/` from git (`git checkout -- public/editors/<appId>/`) or re-extract the pinned release tarball.
4. Re-run `node scripts/verify-e2e-workflows.mjs` to confirm the rollback is healthy. Because each editor is isolated in its own directory (`public/editors/<appId>/`), rolling back one editor never affects the other 13 workspaces.
