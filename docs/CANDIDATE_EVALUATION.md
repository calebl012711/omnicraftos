# Candidate evaluation

Reviewed actual public checkouts on 2026-11-01. Exact commits are in [SOURCE_INVENTORY.md](SOURCE_INVENTORY.md) and `integration/upstream-lock.json`.

| Candidate | Evidence from source | Decision |
|---|---|---|
| SoundCraft | Rust engine, native playback/recording, web session bundles, import and downloads. `crates/playback/src/record.rs` explicitly reports recording unsupported on the wasm target. Fresh pinned-source web build now adopted and boot-verified. This version exposes no command API; import/edit/export remains unverified. | Keep real upstream workstation. Do not claim browser microphone recording. |
| ai-music/webdaw | MIT license file. `src/controller/Projects.ts` load/save functions log placeholders; `Engine.adjustBpm` throws unimplemented. | Useful research, not a complete recording/persistence foundation. No source incorporated. |
| dvir-drori/daw | React/Vite, multitrack and DSP source. README says MIT, but checkout has no LICENSE file. | Source reviewed only; do not redistribute until licensing is adequately established. |
| Contrast Recorder | MIT. `contexts/recording.tsx` records one `composedStream`, retains chunks in memory, and downloads one WebM. | Does not satisfy separate screen/camera and long-session storage requirements. No code incorporated. |
| Framecast | MIT app; README discloses mediabunny MPL-2.0 dependency. `recorder/disk.worker.ts` uses OPFS sync handles and periodic flush; it has recovery machinery. | Useful recorder/storage reference; not a proven separate-output engine. No source incorporated at this stage. |
| Waveform Playlist | MIT license file; current TypeScript packages supply real clip editing, mixer, playback, AudioWorklet recording, and offline WAV rendering. Runtime imports the actual published packages, not a recreated editor UI. | Selected browser music foundation alongside SoundCraft. Exact npm versions and integrity hashes pinned. UI adapter and project persistence remain separate. Runtime workflow tests passed, including sampled exported gain/pan/mute/solo and injected microphone recording; physical devices remain untested. |
| Tone.js | MIT Web Audio framework used by Waveform Playlist. | Exact runtime version pinned; its samples and demo assets are not bundled. |

No GridSound/openDAW AGPL source was incorporated. Existing Loop sketch/Beat sketch/Scene sketch (formerly BandForge/FruityForge/Studio Cut) are local experimental tools, not upstream SoundCraft/FilmCraft integrations; keep their source while individually auditing what works.
