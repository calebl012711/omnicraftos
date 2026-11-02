# OmniCraft OS

A React, TypeScript and Vite creative workbench with separate screen/camera recording, a Waveform Playlist audio workspace, and retained ArtCraft/SolidCraft Rust/WebAssembly editors. The home page combines the selected ivory, forest-green and recording-studio design directions. Editors load when opened.

## Run the browser app

Use Node.js 20+ and npm. Existing editor bundles are included; Rust is only needed to rebuild upstream tools or develop the desktop prototype.

```sh
npm ci
npm run dev -- --host 127.0.0.1
# http://127.0.0.1:5173
# http://127.0.0.1:5173/?tool=recorder
# http://127.0.0.1:5173/?tool=music

npm run build
npm run preview -- --host 127.0.0.1
# http://127.0.0.1:4173
npm test
```

Capture requires localhost or HTTPS and browser permission. MP4 is offered only when the browser reports a compatible encoder; WebM is the alternative. Screen and camera stay separate, with source audio on screen and microphone audio on camera plus an additional audio file where supported. Chunks are stored incrementally in OPFS, with an IndexedDB fallback and recovery metadata. Keep this origin's browser storage until recordings have been downloaded.

## Verified scope

| Workspace | Evidence | Remaining work |
| --- | --- | --- |
| Recording Studio | Separate playable MP4 and WebM outputs in 62-second Chrome tests; real encoding/storage, audio routing, sampled alignment, pause/resume, reload, interruption and storage failures | Tests inject synthetic device streams. Physical devices, cross-browser behavior and reliable long-session operation remain unverified. Two earlier long-session attempts did not pass all checks. |
| SolidCraft | Real engine plate with five bores, native SC save/reopen, STEP/STL export; independently measured mesh | Current bundle is inherited. Fresh source build and broader browser tests remain pending. |
| FilmCraft | Import MP4, create sequence, split clips, save and reopen native project | Rendered video export did not complete during verification. |
| Music Studio | Actual Waveform Playlist/Tone playback, audio import, clip positioning, mixer persistence, microphone worklet capture using an injected stream, portable project backup, stereo WAV export | Physical microphone tests, deeper export audio analysis, beat/piano-roll workflow and browser matrix remain pending. |
| Other retained tools | Existing bundles and prototypes preserved, with explicit verification labels | Individual end-to-end workflows have not been reverified. |

Music projects use local IndexedDB and portable `.omnimusic` backups. Audio import and recording limits are intentionally conservative for a 16 GB Intel Mac. The current music workspace is an audio arrangement foundation; it is not a completed GarageBand/FL Studio replacement.

Reports live under `verification/`; large test media remain local and are ignored by Git. Reports identify their tested scope and failures. Legacy reports and interface capability lists are not proof that every advertised format works.

## Upstream sources and updates

The complete official repository, exact revision and license inventory is [integration/upstream-lock.json](integration/upstream-lock.json). Key pins:

| Component | Repository | Revision |
| --- | --- | --- |
| SolidCraft | [tangency-labs/solidcraft](https://github.com/tangency-labs/solidcraft) | `56b77b405dc7c567854329a9511aa03e209caef7` |
| FilmCraft | [storytold/filmcraft](https://github.com/storytold/filmcraft) | `95cf47b883d2d2b2946c8c157822ee20835426a5` |
| SoundCraft | [storytold/soundcraft](https://github.com/storytold/soundcraft) | `85ffa1f53ee6d04c4e99b66afd142bd4345d2009` |
| Waveform Playlist | [naomiaro/waveform-playlist](https://github.com/naomiaro/waveform-playlist) | `d620a1d202b8033ec038b8c87cd307c3d7d2557b` |

Waveform Playlist is integrated through exact npm versions and lockfile integrity values. Installed source maps were compared with the pinned repository: all 166 checked entries matched. This does not establish a reproducible binary build of the inherited Craft bundles. License texts and credits are retained under `public/licenses/` and the editor distributions.

```sh
npm run upstream:status
npm run upstream:licenses
npm run --silent upstream:check
# Save a pure JSON report:
npm run --silent upstream:check > upstream-review.json
# Build an existing pinned checkout into a separate staging directory:
npm run upstream:build -- solidcraft
```

Checks are read-only. They never merge, update pins or deploy. See [update and rollback instructions](docs/UPSTREAM_WORKFLOW.md), [source inventory](docs/SOURCE_INVENTORY.md), and [candidate evaluations](docs/CANDIDATE_EVALUATION.md). Source checkouts under ignored `upstream/` are local; obtain the official repository and check out its locked revision before source builds. Custom adapters stay outside upstream source where practical.

## Verification and desktop development

With the browser server running, use `npm run verify:shell` and `npm run verify:recorder`. For production preview, set `OMNICRAFT_URL=http://127.0.0.1:4173`. Set `CAPTURE_FORMAT=mp4` to test MP4 and `CAPTURE_SECONDS=62` for the normal recording test. Recorder verification requires Chrome/Playwright and ffmpeg/ffprobe; editor verification also uses the retained WASM assets. See scripts and [implementation status](docs/IMPLEMENTATION_STATUS.md) for scope and limitations.

The Tauri v2 desktop path is a development prototype, tested separately from the web app. There is no verified installable release yet. See [desktop commands and limitations](docs/DESKTOP.md). No public deployment is performed by the upstream scripts.
