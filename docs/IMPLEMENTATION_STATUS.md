# OmniCraft OS implementation status

The full project brief and final integration addendum were read. **OmniCraft OS** remains the product name. The workspace names are Capture, Model, Cut, Motion, Photo, Develop, Vector, Layout, Audio, Music, Draft, Field, PDF, Interface, Write, Sheets and Present. Local experiments are labeled Scene sketch, Loop sketch and Beat sketch. Upstream identities, notices, native formats and storage IDs remain intact.

The home page combines the selected generated directions 1, 3 and 5: ivory, forest-green typography, cobalt actions and a labeled illustrative recording preview. All five concepts are retained in `design/hero-options-2026-11-01/`. The user subsequently authorized pushing reviewed changes to `main`; no separate deployment or purchase was performed.

## Reused, repaired and replaced

- Reused React/TypeScript/Vite, compatible project and asset storage, useful existing editor bundles, actual upstream Rust/WASM applications, and their licenses. Preserved the user's preexisting CSS, quick-start component and tests.
- Replaced the home page's nested browser-window presentation. Capture and Model open as full workspaces. Experimental tools retain explicit pending-verification labels.
- Replaced the simulated recorder with real capture APIs, actual encoders, incremental chunk storage and interrupted-take recovery. Refined the interface around separate screen/face previews, live mic levels, preview readiness, quality presets, elapsed time, pause/stop and clear export progress. Mirroring affects the preview only.
- Repaired storage serialization, bounded pending chunks, cached completed files, encoder-stall detection and the final-data/stop handshake. Folder export streams existing chunks to chosen files. Capability detection offers MP4 where supported and explains the WebM fallback.
- Built SolidCraft from its pinned official source. A small reviewed Rust overlay hides duplicate native application chrome only when hosted by OmniCraft. The real canvas, body browser, history and modeling dialogs remain. Retired the stale inherited offline worker without clearing user storage. Model adds parametric starters, editable dimensions, genuine tool commands, undo/redo, native saves and STEP/STL exports. Saved Model snapshots integrate with the suite library and backups.
- Built SoundCraft from its pinned official source and verified its actual web runner starts. This version exposes no command API; its full audio workflow is not claimed as verified. Music remains the tested Waveform Playlist/Tone arrangement foundation. Fixed hard-panned mono export gain and recording-finalization/save races without expanding beat-making scope.

## Current verification evidence

| Report | Result and practical scope |
| --- | --- |
| `verification/shell/report.json` | Home desktop/mobile layout, overflow, navigation, keyboard focus and direct Capture launch. |
| `verification/capture-final/report.json` | Passed 62-second separate MP4 playback, independent decoding, source/audio routing, sampled timing, save/reload, folder writes, pause/source-ended, denial, low storage, interruption recovery and stalled encoder. |
| `verification/capture-webm-final/report.json` | Passed the same latest short workflow/failure tests using actual VP8/Opus WebM. Duration was checked from real packet timestamps because streaming WebM omits its optional duration header. |
| `verification/capture-long-verified/report.json` | Passed a 20-minute MP4 run using synthetic 640×360/30 fps inputs and real MediaRecorder/OPFS on the Intel MacBook Air. Distinct videos and mic audio independently decoded. |
| `verification/model-minified-final/report.json` | Passed the fully optimized adopted source-built engine through Model: plate with five bores, parameter rebuild, undo/redo, SC save/reopen/import, STEP/STL exports. Independent mesh bounds and volume checked. |
| `verification/model-library-minified/report.json` | Passed suite-library native snapshot save, backup, reload and reopen; Block/Cylinder geometry measurements and camera view buttons. |
| `verification/filmcraft-default-gpu/report.json` | Passed actual MP4 import, sequence/split, native save/reset/reopen and a four-second H.264/AAC MP4 render; full output independently decoded by ffmpeg. |
| `verification/music/report.json` | Passed WAV import, arrangement, playback, persistence, injected mic/worklet recording, portable project backup and stereo WAV export. Exported samples checked for gain, pan, mute and solo. |
| `verification/builds/soundcraft-runtime.json` | Actual fresh source-built runner booted. Full workflow explicitly unverified. |
| `verification/desktop/bundled/report.json` | The actual local `.app` launches with embedded assets and passes home/Capture interface/capability checks. Native CAD rendering is blocked because WebKit reports the window hidden. Physical recording, native exports and installed persistence remain unverified. |
| `verification/library-final/report.json` | Passed library import with actual IndexedDB fallback, reload and byte-identical download, accurate failed-OPFS state, injected database failure, backup/restore in a fresh context, and actual native SC handoff into Model. |
| `verification/asset-build/report.json` | Passed retrieval of a real LFS artifact at a fixed commit and rejection of a mismatched SHA-256 while preserving its original pointer. |

Capture device inputs are injected **only in the test harness**. Production contains no simulated source fallback. The 20-minute test sampled alignment at start, 10 minutes and end: 0, 0 and 0.1 seconds of difference at 0.1-second marker resolution. JS heap ranged approximately 4.5–5.8 MiB; this excludes native encoder/GPU memory. Resource sampling began partway through the run and sums RSS, which can double-count shared pages. These results establish neither frame-perfect hardware sync nor 720p/1080p long-session performance. Older failed long tests remain historical failures; the later passing run does not rewrite them.

Folder-export testing used real file writes to a test directory; the OS directory-picker boundary was injected. Native picker interaction, physical screen/camera/mic permissions, system audio and a browser matrix remain unverified. Use the balanced or light Capture preset on the 2018 Intel MacBook Air and download takes before clearing site storage.

## Source provenance

| Integrated component | Official repository | Exact source revision | Adopted artifact status |
| --- | --- | --- | --- |
| Model / SolidCraft | https://github.com/tangency-labs/solidcraft | `56b77b405dc7c567854329a9511aa03e209caef7` | Fresh release O3 + thin LTO build plus reviewed host overlay; wasm-bindgen complete. Adopted module is 99,795,192 bytes after Binaryen size minification; the full Trunk pipeline completed. |
| Audio / SoundCraft | https://github.com/storytold/soundcraft | `85ffa1f53ee6d04c4e99b66afd142bd4345d2009` | Fresh full Trunk release build adopted; boot verified. |
| Cut / FilmCraft | https://github.com/storytold/filmcraft | `95cf47b883d2d2b2946c8c157822ee20835426a5` | Official source evaluated; inherited browser bundle retained and tested. Its exact binary provenance was not reproduced. |
| Music / Waveform Playlist | https://github.com/naomiaro/waveform-playlist | `d620a1d202b8033ec038b8c87cd307c3d7d2557b` | Exact npm versions and lock integrity; 166 installed source-map entries matched this checkout. |

Source pins do not by themselves prove inherited artifact provenance. The full inventory, selected licenses, evaluated candidates and individual verification states are in `integration/upstream-lock.json`, `docs/SOURCE_INVENTORY.md` and `docs/CANDIDATE_EVALUATION.md`. Fresh build hashes are in `integration/builds/`. License, NOTICE, attribution and font/third-party notices are retained. New host code is separate from upstream except the small tracked Rust patch.

## Run, verify and update

```sh
npm ci
npm run dev -- --host 127.0.0.1
# http://127.0.0.1:5173
# Standalone: /?tool=recorder, /?tool=model, /?tool=music
npm test
npm run build
npm run preview -- --host 127.0.0.1
# With preview running, in another terminal:
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:shell
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:model
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:model-library
OMNICRAFT_URL=http://127.0.0.1:4173 CAPTURE_FORMAT=mp4 CAPTURE_SECONDS=62 npm run verify:recorder
OMNICRAFT_URL=http://127.0.0.1:4173 npm run verify:music
npm run verify:filmcraft
npm run assets:check
npm run verify:library
npm run upstream:status
npm run upstream:licenses
npm run --silent upstream:check
```

Verification uses Chrome/Playwright; media checks require ffmpeg/ffprobe. Scripts write separate reports and export files. Large test media stay local and are ignored by Git. Update checks are read-only and return a nonzero status for unknown/failed checks. See `docs/UPSTREAM_WORKFLOW.md` for isolated review, builds, tests, adoption and rollback. Nothing auto-merges or auto-deploys upstream changes.

## Remaining work

Physical-device and cross-browser capture; long high-resolution sessions; native picker interaction; broader CAD modeling/import formats; full workflows for the other retained editors; larger Film timelines; SoundCraft browser editing/export; and native desktop editor/capture workflows remain incomplete. The current Model UI improves common workflows but does not establish that its full CAD capability exceeds upstream SolidCraft. Music is an audio foundation, with beat-making and piano roll deferred at the user's request.

A local ad-hoc signed macOS `.app` now builds and launches from its bundle; it is not a verified release. Its home and Capture interface load embedded assets. WebKit reports the window hidden, blocking CAD frames. Native recording, downloads, offline behavior and persistence across app restarts remain unverified. Details and commands are in `docs/DESKTOP.md`. Project directories were backed up before major edits under the sibling `omnicraft-backups/2026-11-01/` and `2026-11-02/` folders.

## Live binary delivery repair

A read-only live-site check on 2026-11-02 found the CAD WASM URL returning a 134-byte Git LFS pointer, not the 138 MB module (`verification/live-binary-before-fix.json`). Local workflow evidence did not prove the deployed editor worked. The new `prebuild` hook checks public binary assets and, when a pointer is present, streams its actual bytes from this public GitHub repository at the exact build commit. It verifies both size and SHA-256 before replacing the pointer, and fails the build on mismatch. Already hydrated binaries are left intact. It changes no source pin, external project setting or deployment state. The existing Vercel Git integration subsequently built commit `3386bd897768b5b12908c75515c42f0f379690f2`. A read-only HTTP check confirmed a real 99,795,192-byte WASM resource (`verification/live-binary-after-fix.json`). The live Model create/edit/save/reopen/STEP/STL workflow passed (`verification/model-live/report.json`), and the live 62-second MP4 recorder workflow and failure tests passed with synthetic inputs (`verification/capture-live/report.json`). No manual deployment was invoked.

The new Files interface removes unsupported instant-transfer, unconditional OPFS-sync and immediate-memory-reclamation claims. Library records now report the actual optional OPFS write result. File imports display errors instead of an uncaught failure; library imports are limited to 128 MB to avoid loading long recordings fully into RAM. Capture is excluded from import suggestions because it records new sources rather than importing existing media.

A fresh unmodified FilmCraft source rebuild at `95cf47b883d2d2b2946c8c157822ee20835426a5` completed into local staging. A separate build applying the fork-branding patch was interrupted at the user's request. Neither staging artifact has been adopted. The currently integrated FilmCraft bundle remains the inherited, tested artifact. No upstream compiler is running for the current frontend iteration.

## App workflow refinement

The desktop frontend now has a compact launcher, recent native projects ordered by modification date, and Open model for disk files. It requests the actual SolidCraft ribbon at the top of its CAD viewport, with suite navigation below. Browser Model offers Full CAD workspace and Guided workspace. Interface switching serializes the complete native design before reopening it; geometry and parameters are preserved, with a fresh undo history. Temporary snapshots use the upstream native JSON export so their generated filename does not rename the design. Other SolidCraft tools remain available through the actual upstream interface; availability is not a claim that every tool has been tested.

Capture adds saved-take naming, session duration and byte totals, closable playback, and confirmed deletion. Names persist with the manifest. Deletion removes only the selected take's storage, and closing playback revokes its media URL. `verification/capture-library/report.json` verifies two real encoded videos, independent decoding, rename/reload, cancellation, physical removal of saved media and preservation of another take, using OPFS and IndexedDB separately. Inputs are synthetic; native and physical-device capture remain unverified.

Frontend validation runs serially at low CPU priority. No Rust/WASM rebuild or native app launch is part of these checks. The previously built Mac bundle remains a separate older artifact until rebuilt and verified; current source changes must not be described as a completed installed-app release.

The current iteration passed the production build and all 24 unit tests. `verification/model-interface/report.json` passes real plate creation, parameter rebuild, undo/redo, native save/reopen/import, independently measured STEP/STL exports, and switching in both directions with geometry and design name preserved. The full interface exposes 556 upstream commands; this count does not mean every command was exercised. `verification/desktop-home/report.json` passes launcher navigation/search and file handoff using a test Tauri marker, with WASM blocked and no native app launch. The first failed interface check is retained separately; it led to fixing stale loading fields and preserving the design name during snapshot export.
