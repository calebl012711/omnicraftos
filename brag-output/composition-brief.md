# Hyperframes Composition Brief: Mosaic Forge

## Objective
Create a short, high-impact 20.0-second launch-style brag video for **Mosaic Forge** using native HyperFrames HTML/GSAP scenes, beat-locked transitions, real live UI screens, Kenney SFX, and an upbeat music bed.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — `1920x1080` @ `30fps`
- Duration: `20.0 seconds`

## Source Material
- Project root: `/Users/caleblickteig/Documents/antigravity/joyful-pasteur`
- Primary files read: `src/App.tsx`, `src/styles/app.css`, `src/config/workspaces.ts`, `src/config/branding.ts`, `public/editors/riverstudio/index.html`, `public/editors/studiocut/index.html`, `public/editors/garageband/index.html`, `public/editors/flstudio/index.html`
- Product name: `Mosaic Forge`
- Tagline / strongest claim: `18 Standalone Local-First Creative, Broadcast & CAD Studios in One Zero-Cloud Vault`
- Key UI or visual moments to recreate and animate:
  1. **Standalone Home Page App Launcher (`Choose a Studio to Enter`)**: 4 flagship Broadcast/Video/DAW cards + 18 studio cards with `Enter App →` and `Try Demo` buttons.
  2. **RiverCast & OneStudio Separate ISO Recording + Studio Cut Multi-Track NLE**: Separate `screen-recording-iso.webm`, `camera-video-iso.webm`, and `mic-audio-iso.wav` files flowing into V1 Screen + V2 Camera PIP tracks.
  3. **BandForge (GarageBand DAW), FruityForge 21 (FL Studio DAW) & SolidCraft 3D B-Rep CAD**: Smart Chords + '59 Tweed Amp rig, 16-step 808 Channel Rack + Sytrus Piano Roll, and 60×60×8mm NEMA-17 Motor Adapter Plate (`STEP` + `STL`).
  4. **Universal IndexedDB & OPFS Shared Asset Vault**: 1-click cross-studio handoff (`Open in Studio Cut`, `Open in CADCraft`, `Open in PhotoCraft`).
- Copy that must appear verbatim:
  - `Mosaic Forge`
  - `Choose a Studio to Enter`
  - `18 Standalone Studios`
  - `100% Local Vault · Zero Cloud Lag`
  - `RiverCast & OneStudio`
  - `Studio Cut Video Editor`
  - `BandForge Music Studio`
  - `FruityForge 21 DAW`
  - `SolidCraft 3D CAD`

## Creative Direction
- Tone preset: `cinematic` / `polished`
- Creative direction: Kinetic high-contrast launch film where real full-screen studios snap in on the beat, zoom into live workflows, and hand off real files across a zero-cloud local vault.
- Interpretation: Fast, deliberate `expo.out` / `power4.out` arrivals that land dead-still for effortless reading, beat-locked card reveals, and tactile cursor click transitions.
- Angle: Why pay for 18 separate cloud subscriptions when all 18 Broadcast ISO, Video NLE, GarageBand/FL Studio DAW, 3D Parametric CAD, and Raster/Vector studios run 100% locally in your browser with instant cross-app file handoff?
- Hook (0.0s–3.0s): `"18 Creative, Broadcast & CAD Studios. Zero Cloud Lag."`
- Outro / punchline (17.0s–20.0s): `"Mosaic Forge — Choose a Studio to Enter. 100% Local IndexedDB & OPFS Vault."`
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `#090b10` (`--bg-canvas`), `#11151f` (`--bg-surface`), `#171c29` (`--bg-elevated`)
- Text: `#f3f6fc` (`--text-primary`), `#cbd5e1` (high-contrast secondary)
- Accent: `#6366f1` (`--mf-accent`), `#10b981` (`--mf-accent-secondary`), `#34d399` (`--status-tested-fg`), `#f59e0b` (BandForge amber), `#f97316` (FruityForge orange), `#e05a47` (RiverCast coral)
- Display font: `Inter` (700/800/900)
- Mono font: `JetBrains Mono` (500/700)
- Visual references from the project:
  - `assets/screens/home-launcher.png`
  - `assets/screens/rivercast-iso.png`
  - `assets/screens/studiocut-nle.png`
  - `assets/screens/bandforge-daw.png`
  - `assets/screens/fruityforge-flstudio.png`
  - `assets/screens/solidcraft-cad.png`
  - `assets/screens/asset-vault.png`
  - `assets/screens/logo.svg`

## Storyboard (20.0s Total)
1. **Scene 1 (`0.0s – 3.5s`, `3.5s`): Hook & Standalone Home Launcher Reveal**
   - Kinetic title lockup (`18 Standalone Studios · Zero Cloud Lag`) snaps in at `0.2s`, followed by the real **Mosaic Forge Home Page Launcher** (`Choose a Studio to Enter`) rising into frame with 4 flagship studio pills popping on consecutive beat points (`3.02s`).
2. **Scene 2 (`3.5s – 8.0s`, `4.5s`): Broadcast ISO Recording → Multi-Track Video NLE**
   - Simulated cursor clicks **Enter Recording Studio →** (`3.52s`), morphing into full-screen **RiverCast & OneStudio ISO** (`screen-recording-iso.webm` + `camera-video-iso.webm` + `mic-audio-iso.wav`), then whips at `6.03s` into **Studio Cut Multi-Track Video Editor** splitting V1 Screen + V2 Camera PIP tracks.
3. **Scene 3 (`8.0s – 13.0s`, `5.0s`): Dual DAW Powerhouse — BandForge & FruityForge 21**
   - Beat-locked cut (`8.02s`) to **BandForge (GarageBand DAW)** with Smart Chords (`Cmaj9 · Am7 · Fmaj7`) and '59 Tweed Guitar Amp rig, then at `10.52s` transitions to **FruityForge 21 (FL Studio DAW)** showing the 16-step 808 Channel Rack, Sytrus Piano Roll, and 8-Bus Stem Mixer.
4. **Scene 4 (`13.0s – 17.0s`, `4.0s`): Parametric 3D CAD & Universal Asset Vault Handoff**
   - Beat-locked cut (`13.01s`) to **SolidCraft 3D CAD** (`60×60×8mm NEMA-17 Motor Adapter Plate`, `STEP` + `STL` exported) alongside the **Shared Asset Vault** (`15.02s`) showing 19 verified local exports with 1-click `Open in...` buttons.
5. **Scene 5 (`17.0s – 20.0s`, `3.0s`): Payoff Lockup & End Card (`// beat-locked: 17.02s`)**
   - Locked to the strongest cue in the window (`17.02s`, intensity `1.00`): Mosaic Forge mark + `"Mosaic Forge — Choose a Studio to Enter"` + `"18 Full-Screen Local Studios · IndexedDB & OPFS Vault"` held clean and readable through `20.0s`.

## Audio
- Audio role: Upbeat, energetic launch bed + OpenRouter voiceover + tactile UI/reveal SFX.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM)
- Music cue guidance: Precomputed preset `/Users/caleblickteig/.gemini/config/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json` (`beats`: `3.02, 3.52, 6.03, 8.02, 10.52, 13.01, 15.02`; `strongCues`: `16.02s, 17.02s, 18.52s`).
- Audio-reactive treatment: Subtle; hero glow and badge border luminance breathe with rhythmic pulse.
- SFX selection:
  - `assets/sfx/impact/impactSoft_medium_001.ogg` (`0.2s` hook reveal, `8.02s` DAW transition)
  - `assets/sfx/interface/click_002.ogg` (`3.52s` Enter Studio click, `13.01s` CAD switch)
  - `assets/sfx/casino/card-slide-1.ogg` (`6.03s` Studio Cut NLE slide, `10.52s` FruityForge rack slide)
  - `assets/sfx/interface/bong_001.ogg` (`15.02s` Asset Vault verification)
  - `assets/sfx/impact/impactBell_heavy_000.ogg` (`17.02s` Final Mosaic Forge End Card lockup)
