# OmniCraft OS

A local-first creative workbench built with React, TypeScript and Vite. Capture records separate screen and face-camera videos. Model hosts a real source-built SolidCraft CAD engine. Cut retains the actual FilmCraft editor, and Music provides a Waveform Playlist audio workflow. Other retained tools carry individual verification labels.

The product name stays **OmniCraft OS**. Workspace labels are simpler; upstream credits and existing project storage remain intact. The home design combines the selected generated options 1, 3 and 5.

## Run

Node.js 20+ and npm are required. Checked-in editor assets use Git LFS; a fresh clone needs `git lfs pull`. Rust is needed only for upstream rebuilds or desktop development.

```sh
npm ci
npm run assets:prepare
npm run dev -- --host 127.0.0.1
# http://127.0.0.1:5173
# Standalone workspaces: /?tool=recorder, /?tool=model, /?tool=music
npm test
npm run build
npm run preview -- --host 127.0.0.1
# http://127.0.0.1:4173
```

Capture requires localhost or HTTPS and permission. It offers MP4 only when a compatible encoder is reported, otherwise explaining the playable WebM alternative. Screen audio stays on the screen video; microphone audio goes to the camera video and a separate audio file. Chunks save incrementally to OPFS, with IndexedDB fallback and interrupted-take recovery. Download takes before clearing this origin's storage. Balanced and light presets suit slower hardware; actual resolution appears under each connected preview.

Saved takes can be named, reopened for playback, and deleted after confirmation. Closing playback releases its media URL. Deleting a take removes its local chunks and assembled files; downloaded copies are unaffected. Names persist in the sync JSON and survive reload.

Model creates editable Plate, Block and Cylinder starters using real sketches/extrusions. It supports dimension changes, upstream modeling commands, undo/redo, native `.sc` save/reopen, STEP and STL exports. In the suite, Save project stores the actual native snapshot in Projects and library backups. Other editors retain their own native save/open controls; Capture takes are downloaded separately.

Full CAD workspace opens SolidCraft's actual ribbon and controls. Guided workspace returns to the simplified interface. Switching saves and reopens the native design so geometry and parameters survive, with a fresh undo history. Tauri starts with the full interface and a compact project home; its updated native bundle still needs a separate build and native verification.

## Verified scope

| Workspace | Working evidence | Limits |
| --- | --- | --- |
| Capture | Separate playable MP4/WebM; real codecs/storage; routing, sampled timing, pause, recovery and failure handling. Later 20-minute MP4 soak passed at 640×360. | Synthetic device inputs in tests. Physical permissions/devices, high-resolution long sessions and browser matrix pending. |
| Model | Source-built engine; create plate, change dimensions, undo/redo, native reopen, independently measured STEP/STL exports. | Broader native tools/import formats and browser matrix pending. Large engine loads only when opened. |
| Cut | Actual FilmCraft MP4 import, sequence/split, native save/reopen and independently decoded four-second MP4 render. | Inherited artifact; larger timelines and cross-browser rendering pending. |
| Music | Actual audio import/arrangement/playback, injected mic recording, project backup and stereo WAV export with gain/pan/mute/solo checks. | Physical audio-device tests and beat/piano-roll workflow pending. |
| Audio | Fresh SoundCraft source build boots. | No command API; editing/export workflow not verified. |
| Other tools | Existing useful code and bundles preserved. | Individual workflows remain unverified. |

Reports and exact limits: [implementation status](docs/IMPLEMENTATION_STATUS.md). A local macOS `.app` now builds and launches with embedded assets. Native editor/capture workflows are not yet verified; the visible-window test is blocked by a hidden WebKit view. See [desktop path](docs/DESKTOP.md). Browser and installed-app behavior are tested separately.

## Sources and updates

The canonical [integration lock](integration/upstream-lock.json) records official repositories, exact pins, selected licenses and build evidence. Key revisions:

| Component | Official source | Revision |
| --- | --- | --- |
| SolidCraft | [tangency-labs/solidcraft](https://github.com/tangency-labs/solidcraft) | `56b77b405dc7c567854329a9511aa03e209caef7` |
| FilmCraft | [storytold/filmcraft](https://github.com/storytold/filmcraft) | `95cf47b883d2d2b2946c8c157822ee20835426a5` |
| SoundCraft | [storytold/soundcraft](https://github.com/storytold/soundcraft) | `85ffa1f53ee6d04c4e99b66afd142bd4345d2009` |
| Waveform Playlist | [naomiaro/waveform-playlist](https://github.com/naomiaro/waveform-playlist) | `d620a1d202b8033ec038b8c87cd307c3d7d2557b` |

Model and Audio now use fresh pinned-source builds with hashes in `integration/builds/`. Model's reviewed Rust overlay hides duplicate application chrome; its full release build includes Binaryen size optimization. Other Craft bundles are inherited, so a source pin is not proof of their exact binary provenance. Licenses and third-party notices remain under `public/licenses/` and each editor distribution.

```sh
npm run upstream:status
npm run upstream:licenses
npm run --silent upstream:check
npm run desktop:upstream-check
npm run verify:desktop-notices
node scripts/upstream.mjs check --app solidcraft
# Build an existing clean pinned checkout into staging; does not adopt/deploy:
npm run upstream:build -- solidcraft --overlay
```

Read-only checks never merge, change pins or deploy. Follow the [review, test, apply and rollback procedure](docs/UPSTREAM_WORKFLOW.md). Consult [candidate evaluations](docs/CANDIDATE_EVALUATION.md) before adding another tool.

The desktop dependency inventory now records the actual locked Cargo archives and 434 notice files. A manual Intel Mac packaging workflow is prepared under `.github/workflows/desktop-intel.yml` so compilation can happen away from the laptop. It has not completed a hosted build and does not deploy, create a release or open the app. See [desktop build instructions and limits](docs/DESKTOP.md).

With production preview running:

```sh
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:shell
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:model
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:model-library
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:capture-library
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:desktop-home
OMNICRAFT_URL=http://127.0.0.1:4173 CAPTURE_FORMAT=mp4 CAPTURE_SECONDS=62 npm run verify:recorder
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:music
```

Tests need Chrome/Playwright; media validation also needs ffmpeg/ffprobe. Large verification media are ignored by Git. No upstream command publishes the app.

## Binary assets in build checkouts

`npm run build` runs an asset preparation hook first. A checkout containing Git LFS pointer text downloads only the missing binaries from this public repository at the exact build commit, checks their declared byte size and SHA-256, and atomically installs the verified bytes. A failed download or mismatched hash stops the build. Normal hydrated checkouts need no download. This prevents deploying pointer text as a WASM engine. `npm run assets:check` checks locally without downloading. Standard `git lfs pull` is also supported.

Vercel can alternatively hydrate LFS during checkout through its [Git LFS project setting](https://vercel.com/docs/project-configuration/git-settings#git-large-file-storage-lfs). No project setting or manual deployment is changed by these scripts. Retrieval verification uses a temporary checkout and the public binary (`node scripts/verify-asset-build.mjs`); it downloads about 36 MB, verifies a correct object and rejects an incorrect hash.
