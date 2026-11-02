# Reviewing upstream updates

The authoritative tracked inventory is `integration/upstream-lock.json`, including repository, exact checkout revision, license selection, and separately pinned npm runtime packages. Old manifests under ignored `upstream/` and historical reports are not the source of truth. Source trees stay in `upstream/<id>`; OmniCraft customizations live in the shell, recorder/music adapters and distribution HTML/bridges.

Read-only checks:

```sh
npm run upstream:status
npm run upstream:licenses
npm run upstream:check
node scripts/upstream.mjs check --app solidcraft
```

The remote check uses `git ls-remote` and GitHub release reads only. It never fetches into checkouts, merges, updates dependencies, changes pins, builds, publishes or deploys. A different remote SHA means review is required; it does not establish that an update is newer or compatible. Failed network/branch/release reads remain unknown. Use the returned comparison and release-note URLs to inspect changes, file-format migrations and license changes.

To review an update, create a new outer Git branch and an isolated checkout/worktree at the proposed revision. Keep the currently pinned checkout and bundle intact. Inspect `LICENSE*`, NOTICE, asset/font licenses and Cargo/npm lock changes first. Build in the isolated checkout using the component's documented command and locked dependencies. Keep logs and compute artifact hashes. Apply only small, explicit adapter/HTML patches; compare generated assets against their source provenance.

Run shell build/unit checks and the actual workflow/export tests for the affected tool. For CAD, measure known geometry, save/reload `.sc`, and inspect real STEP/STL files. For editors, import/edit/save/reopen/export, then independently decode the output. For audio, arrange known sources, verify mixer/persistence and inspect the rendered WAV. For capture, repeat separate-output codec/audio/sync, storage and interruption tests; recheck browser and installed-app behavior separately. Never migrate the user's only copy of a project: save test copies and keep pre-update backups.

Only after review passes, explicitly update the manifest pin, artifact hashes, preserved license notices and test evidence in one reviewable change. Public deployment remains a separate user-authorized action. The legacy `upstream-manager.mjs sync`, `test-update`, and `rollback` commands mutate checkouts and are not the update procedure for this work.

Rollback restores the previous reviewed outer commit and its matching bundle, adapter and manifest together on a separate branch/worktree. Keep current work intact; do not use `git reset --hard` over edits. A new editor may write a project format an older version cannot read, so open the backed-up pre-migration copy when rolling back. Keep recorded media outside disposable browser/test profiles.

For supported primary Rust editors, `npm run upstream:build -- solidcraft` (substitute the component ID) verifies the exact pin and clean source tree, invokes the real source build, preserves its log, and stages a complete sibling bundle with license notices and SHA-256 hashes. It does not replace the currently integrated editor. Test that staged artifact before adopting it. Repeated builds do not overwrite an existing staged revision.

## Current host overlay and build staging

`integration/patches/solidcraft-host-chrome.patch` adds the `omnicraft=1` query flag to SolidCraft's existing embedded-chrome setting. It does not replace the canvas, geometry kernel, history or file APIs. The helper's `--overlay` option verifies the pin and clean checkout, applies this exact patch temporarily and reverses it in `finally`. Do not edit that source tree during the build. Inspect the patch and license changes before reapplying it to a new revision.

The adopted Model module completed Cargo release optimization (O3 + thin LTO) and wasm-bindgen. `scripts/stage-cad-host.mjs` captured that completed output before optional Binaryen `wasm-opt -Oz` size minification. It validates the reviewed source diff and WebAssembly, refuses an existing output directory and records the exact phase, hashes and notices. This staging command neither changes source pins nor deploys. The 138,786,355-byte adopted module and adapter are declared in `integration/builds/solidcraft.json`; a later minified output is a different artifact and requires the same adoption/testing review.

SoundCraft's fresh full Trunk build is recorded separately in `integration/builds/soundcraft.json`. Its successful boot does not certify editing or export. Existing inherited Craft bundles remain clearly distinguished from these two fresh source builds.

After any bundle adoption, run `npm test`, `npm run build` and the relevant production-preview workflow tests. For Model use both `verify:model` (geometry/native/export) and `verify:model-library` (suite snapshot save/reopen/backup and other starters). Keep artifact, adapter, patch, license inventory and evidence changes together so rollback restores a matching set. Obtain review before changing pin or adopting another generated artifact; never automatically merge or deploy remote changes.

The inherited SolidCraft offline manifest referred to the replaced module, so it was removed. Its worker URL now retires its own registration on activation without deleting cached data or project storage. Model does not register an offline worker; installed/offline support requires separate verification.
