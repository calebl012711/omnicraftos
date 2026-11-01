#!/usr/bin/env python3
"""
Mosaic Forge — Production-Grade 10-Minute Master Showcase & /brag Launch Video Renderer
=======================================================================================
1. Full-Bleed 1920x1080 Studio Visuals & Real Live Browser Screen Recording (`live_master_walkthrough.webm`)
   — No boxy frames or shrunken screenshots; sleek Apple-Keynote glassmorphic lower-third bar.
2. Natural OpenRouter VoiceBridge Narration across 5 vocal personas (cached in brag-output/work/vo/).
3. Real Polyphonic Stereo Studio Musical Score (Warm Rhodes Cmaj9 -> Am9 -> Fmaj9 -> G13 progression,
   warm sub-bass, and gentle 115 BPM studio pulse synthesized natively in 48kHz stereo PCM).
"""

import array
import math
import os
import shutil
import subprocess
import sys
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SKILL_SCRIPTS_DIR = "/Users/caleblickteig/.gemini/config/skills/openrouter-voice-bridge/scripts"
sys.path.insert(0, SKILL_SCRIPTS_DIR)
from voice_bridge import VoiceBridge

ROOT_DIR = Path("/Users/caleblickteig/Documents/antigravity/joyful-pasteur")
ARTIFACT_DIR = Path("/Users/caleblickteig/.gemini/antigravity/brain/a4e921f4-9a26-464a-9067-b692b630441b")
OUTPUT_DIR = ROOT_DIR / "brag-output"
WORK_DIR = OUTPUT_DIR / "work"
VO_DIR = WORK_DIR / "vo"
SLIDES_DIR = WORK_DIR / "slides"
CLIPS_DIR = WORK_DIR / "clips"
LIVE_WEBM = WORK_DIR / "live_recordings" / "live_master_walkthrough.webm"

for d in (OUTPUT_DIR, WORK_DIR, VO_DIR, SLIDES_DIR, CLIPS_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# 25 CHAPTERS × 24.0 SECONDS = 600.0 SECONDS (10:00 MASTER SHOWCASE)
# ─────────────────────────────────────────────────────────────────────────────
CHAPTERS = [
    {
        "num": 1,
        "code": "CH.01 // HOME LAUNCHER",
        "title": "Mosaic Forge: Standalone App Launcher & Full-Screen Studios",
        "subtitle": "18 Local-First Applications • Directional View Transitions • Shared Vault",
        "style": "tech_keynote",
        "accent": (99, 102, 241),
        "img_main": "21-updated-studio-home-18-studios.png",
        "img_alt": "01-studio-home-dark.png",
        "focus_box": (0.12, 0.08, 0.88, 0.84),
        "live_slice": (0.0, 6.0),
        "metrics": ["18 FULL-SCREEN APPS", "STANDALONE HOME PAGE", "100% LOCAL INDEXEDDB"],
        "callout_b": "Clean App Launcher with category filters and instant full-screen Studio entry",
        "callout_c": "Every export writes directly to your local IndexedDB Shared Asset Vault",
        "vo": (
            "Welcome to Mosaic Forge—an eighteen-studio local creative suite engineered with Rust, "
            "WebAssembly, and WebAudio right inside your browser. From vector illustration and parametric "
            "three-D CAD to Riverside-class isolated recording, multi-track video editing, GarageBand, "
            "and FL Studio twenty-one, every workspace shares one instant local asset vault with zero cloud lag."
        ),
    },
    {
        "num": 2,
        "code": "CH.02 // INSTANT SWITCHING",
        "title": "Category Filtering, Light/Dark Themes & ⌘K App Switcher",
        "subtitle": "Sub-Millisecond Search Across 18 Applications & Local Actions",
        "style": "tech_keynote",
        "accent": (56, 189, 248),
        "img_main": "03-quick-switcher-modal.png",
        "img_alt": "02-studio-home-light.png",
        "focus_box": (0.20, 0.12, 0.80, 0.78),
        "metrics": ["⌘K INSTANT LAUNCH", "DARK & LIGHT THEMES", "VIEW TRANSITIONS API"],
        "callout_b": "Global App Switcher (⌘K) jumps between any of the 18 full-screen applications",
        "callout_c": "Switch between Obsidian Dark and Daylight themes or filter across 5 creative disciplines",
        "vo": (
            "Navigating eighteen professional engines takes less than a second. Hit Command-K from anywhere "
            "in Mosaic Forge to summon the global Quick Switcher, toggle between Obsidian Dark and Daylight "
            "studio themes, and jump straight into any workspace without losing your active state."
        ),
    },
    {
        "num": 3,
        "code": "CH.03 // RIVERCAST & ONESTUDIO ISO",
        "title": "RiverCast & OneStudio: Separate Screen + Camera ISO Studio",
        "subtitle": "Reverse-Engineered Riverside.fm & OneStudio Local Double-Ender Pipeline",
        "style": "institutional",
        "accent": (239, 68, 68),
        "img_main": "22-rivercast-onestudio-separate-iso.png",
        "img_alt": "27-shared-assets-iso-and-daw-exports.png",
        "focus_box": (0.12, 0.08, 0.88, 0.88),
        "live_slice": (6.0, 14.0),
        "metrics": ["SCREEN ISO .WEBM", "CAMERA ISO .WEBM", "48KHZ WAV + COMPOSITE"],
        "callout_b": "Dual isolated MediaRecorder pipelines capture Screen ISO & Camera 4K ISO simultaneously",
        "callout_c": "Zero frame drops: progressive local IndexedDB chunk flush + 1-click NLE handoff",
        "vo": (
            "First inside our Broadcast tier is RiverCast and OneStudio ISO. We reverse-engineered Riverside's "
            "local double-ender architecture and OneStudio's scene compositor so your screen capture and "
            "camera feed record on completely separate isolated tracks. Export your Screen ISO WebM, "
            "Camera ISO WebM, or forty-eight kilohertz WAV stem individually, or push both tracks straight into Studio Cut."
        ),
    },
    {
        "num": 4,
        "code": "CH.04 // STUDIO CUT NLE",
        "title": "Studio Cut: Full-Screen Multi-Track ISO Video Editor",
        "subtitle": "Synchronized V1 Screen, V2 PIP Cam, T1 Captions & A1 48kHz WAV Tracks",
        "style": "editorial",
        "accent": (244, 63, 94),
        "img_main": "23-studiocut-multitrack-video-editor.png",
        "img_alt": "22-rivercast-onestudio-separate-iso.png",
        "focus_box": (0.15, 0.08, 0.85, 0.92),
        "live_slice": (15.0, 23.0),
        "metrics": ["V1 SCREEN + V2 CAM PIP", "RAZOR SPLIT & RIPPLE", "COLOR LUT + .WEBM RENDER"],
        "callout_b": "Live Picture-in-Picture compositor with adjustable Camera ISO corner, scale & LUT grade",
        "callout_c": "Non-destructive Razor Split (S), cinema color grading sliders, and WebM master export",
        "vo": (
            "When your recording finishes, Studio Cut pulls both isolated streams onto a five-track non-linear "
            "timeline. V-One holds your crisp screen capture while V-Two floats your isolated camera as a "
            "customizable picture-in-picture overlay. Slice clips with the Blade tool, grade exposure and "
            "temperature in real time, and render a mastered WebM video directly to your Shared Asset Hub."
        ),
    },
    {
        "num": 5,
        "code": "CH.05 // BANDFORGE GARAGEBAND DAW",
        "title": "BandForge DAW: Multi-Track Arrangement, Smart Chords & Synth",
        "subtitle": "6 Instrument Tracks • Playable Smart Chords • 2-Octave Polyphonic Keyboard",
        "style": "tactile_craft",
        "accent": (245, 158, 11),
        "img_main": "24-bandforge-garageband-daw.png",
        "img_alt": "25-bandforge-tweed-amp-pedalboard.png",
        "focus_box": (0.08, 0.06, 0.92, 0.90),
        "live_slice": (24.0, 32.0),
        "metrics": ["6 TRACK ARRANGEMENT", "SMART CHORDS STRUMMER", "2-OCTAVE STUDIO SYNTH"],
        "callout_b": "Trigger lush Rhodes & Juno-106 Smart Chords or play the 2-octave keyboard live",
        "callout_c": "Record live MIDI performances onto the arrangement grid and bounce stereo WAVs",
        "vo": (
            "Next is BandForge, our GarageBand-inspired multi-track digital audio workstation. Arrange "
            "multi-bar audio and MIDI regions across six studio tracks while the interactive Smart Drummer "
            "X-Y matrix morphs kick, snare, and hi-hat complexity on the fly. Play the twenty-four-key "
            "polyphonic synthesizer live or capture performances straight onto the arrangement grid."
        ),
    },
    {
        "num": 6,
        "code": "CH.06 // BANDFORGE AMP & PEDALBOARD",
        "title": "BandForge Vintage '59 Tweed Amp Rig & Stompbox Pedalboard",
        "subtitle": "Real-Time WebAudio WaveShaper Overdrive • Stereo Chorus • Spring Reverb",
        "style": "tactile_craft",
        "accent": (234, 179, 8),
        "img_main": "25-bandforge-tweed-amp-pedalboard.png",
        "img_alt": "24-bandforge-garageband-daw.png",
        "focus_box": (0.08, 0.45, 0.92, 0.96),
        "metrics": ["TWEED 5-KNOB AMP HEAD", "3 STOMPBOX PEDALS", "44.1KHZ STEREO WAV BOUNCE"],
        "callout_b": "Interactive Gain, Bass, Mid, Treble & Master controls coupled with 3 live stompboxes",
        "callout_c": "Bounce full multi-track loops to a 16-bit PCM WAV file in the Mosaic Forge Vault",
        "vo": (
            "Switch BandForge's bottom dock to the Vintage Tweed Amp and Stompbox Pedalboard to sculpt "
            "authentic analog warmth. Dial in tube overdrive, stereo chorus, and lush spring reverb using "
            "five tactile rotary knobs and three bypass stomp switches—then bounce your entire mix to a "
            "lossless forty-four-point-one kilohertz stereo WAV file."
        ),
    },
    {
        "num": 7,
        "code": "CH.07 // FRUITYFORGE 21 FL STUDIO DAW",
        "title": "FruityForge 21: FL Studio Channel Rack, Piano Roll & 8-Bus Mixer",
        "subtitle": "16-Step Sequencer • Sytrus Piano Roll • F5/F6/F7/F9 Focused Window Switcher",
        "style": "tech_keynote",
        "accent": (249, 115, 22),
        "img_main": "26-fruityforge-flstudio-daw.png",
        "img_alt": "27-shared-assets-iso-and-daw-exports.png",
        "focus_box": (0.04, 0.04, 0.96, 0.94),
        "live_slice": (34.0, 44.0),
        "metrics": ["8-CHANNEL 16-STEP RACK", "PIANO ROLL + PLAYLIST", "8-BUS MIXER + WAV STEMS"],
        "callout_b": "Sub-millisecond WebAudio step scheduling across 808 Kick, Snare, Hat, Clap, Sub & Sytrus",
        "callout_c": "Switch between All Windows, F6 Rack, F7 Piano Roll, F5 Playlist, and F9 Mixer",
        "vo": (
            "For electronic producers and beatmakers, FruityForge twenty-one brings the iconic FL Studio "
            "workflow into the browser. Program trap and synthwave drums across the eight-instrument "
            "sixteen-step Channel Rack, sculpt melodies and per-note velocity stems in the Piano Roll, "
            "paint pattern blocks in the Playlist, and monitor peak meters across an eight-bus studio mixer."
        ),
    },
    {
        "num": 8,
        "code": "CH.08 // VECTORCRAFT ILLUSTRATION",
        "title": "VectorCraft: Precision Bezier Paths, Booleans & Node Graph",
        "subtitle": "Graphite Rust/WASM Vector Engine • Non-Destructive Procedural Workflows",
        "style": "tactile_craft",
        "accent": (249, 115, 22),
        "img_main": "11-vectorcraft-illustration.png",
        "img_alt": "09-photocraft-layer-lab.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["CUBIC BEZIER PEN", "BOOLEAN UNION / DIFF", "CLEAN SVG + PNG EXPORT"],
        "callout_b": "Manipulate cubic Bezier handles, multi-stop radial gradients, and boolean path compounds",
        "callout_c": "1-click Send to Suite broadcasts crisp SVG & rasterized PNG assets to every other studio",
        "vo": (
            "Moving into visual design, VectorCraft delivers non-destructive Bezier illustration and "
            "procedural node-graph compositing. Draw precision cubic splines, combine geometry with live "
            "boolean operations, inspect SVG code in real time, and push finished vector emblems directly "
            "into our 3D CAD or Motion VFX studios."
        ),
    },
    {
        "num": 9,
        "code": "CH.09 // PHOTOCRAFT LAYER LAB",
        "title": "PhotoCraft: Non-Destructive Layer Compositor & Brush Engine",
        "subtitle": "Multi-Layer Blend Modes • Procedural Filters • Retouching & Histogram HUD",
        "style": "editorial",
        "accent": (59, 130, 246),
        "img_main": "09-photocraft-layer-lab.png",
        "img_alt": "18-lightcraft-raw-catalog.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["MULTI-LAYER STACK", "LIVE RGB HISTOGRAM", "LOSSLESS PNG EXPORT"],
        "callout_b": "Stack adjustment layers, paint with pressure-curve brushes, and inspect live RGB histograms",
        "callout_c": "Exports composited high-DPI bitmaps directly into the shared IndexedDB project library",
        "vo": (
            "PhotoCraft is our high-speed raster layer compositor and retouching darkroom. Stack multiple "
            "blend-mode layers, paint with customizable hardness and flow brushes, dial in non-destructive "
            "exposure and color balance curves while monitoring the live RGB histogram, and export lossless "
            "composites in a single click."
        ),
    },
    {
        "num": 10,
        "code": "CH.10 // CADCRAFT 2D DXF DRAFTING",
        "title": "CADCraft: Architectural 2D Floorplans, Snap Dimensions & DXF Export",
        "subtitle": "Precision Ortho/Polar Snapping • Layer Management • Engineering Blueprints",
        "style": "quant_analyst",
        "accent": (168, 85, 247),
        "img_main": "10-cadcraft-2d-dxf-drafting.png",
        "img_alt": "07-solidcraft-3d-cad-workflow.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["ORTHO & GRID SNAP", "LINEAR DIMENSIONING", "DXF + PNG BLUEPRINT"],
        "callout_b": "Draft architectural floorplans and mechanical schematics with sub-millimeter callouts",
        "callout_c": "Export industry-standard 2D profiles ready for 3D extrusion inside SolidCraft",
        "vo": (
            "For architects and mechanical drafters, CADCraft provides a dedicated two-D technical drafting "
            "environment. Lay out multi-layer floorplans with ortho and polar snapping, place precision "
            "linear dimensions, and hand off schematics directly to SolidCraft for three-D extrusion."
        ),
    },
    {
        "num": 11,
        "code": "CH.11 // PROJECTS & WORKSPACE PIPELINES",
        "title": "Multi-Project Vault Manager & Cross-Discipline Templates",
        "subtitle": "Instant Project Switching • Pre-Configured Studio Bundles • Local Persistence",
        "style": "editorial",
        "accent": (20, 184, 166),
        "img_main": "04b-projects-manager.png",
        "img_alt": "04a-new-project-modal.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["MULTI-PROJECT ISOLATION", "1-CLICK TEMPLATE SEED", "INDEXEDDB SNAPSHOTS"],
        "callout_b": "Organize client campaigns, podcasts, and product launches into isolated local project vaults",
        "callout_c": "Create new projects from pre-wired templates with recommended multi-studio toolchains",
        "vo": (
            "The Projects Manager organizes every campaign, album, or product launch into its own isolated "
            "local vault. Spin up a new workspace from pre-configured templates, track asset counts across "
            "disciplines, and switch between active productions instantaneously."
        ),
    },
    {
        "num": 12,
        "code": "CH.12 // FIGCRAFT UI/UX DESIGN",
        "title": "FigCraft: Infinite Canvas UI Wireframing, Auto-Layout & Design Tokens",
        "subtitle": "Responsive Device Frames • Interactive Component States • CSS/SVG Code Inspect",
        "style": "tech_keynote",
        "accent": (236, 72, 153),
        "img_main": "12-figcraft-ui-design.png",
        "img_alt": "11-vectorcraft-illustration.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["AUTO-LAYOUT FRAMES", "DESIGN TOKEN INSPECTOR", "LIVE CSS + SVG HANDOFF"],
        "callout_b": "Construct responsive desktop & mobile artboards with live spacing guides and token bindings",
        "callout_c": "Copy production-ready CSS flex/grid snippets or push UI artboards to DeckCraft & Studio Cut",
        "vo": (
            "Product teams can wireframe and prototype inside FigCraft, our infinite-canvas UI and design "
            "system studio. Assemble responsive mobile and desktop artboards with smart alignment guides, "
            "inspect live CSS tokens, and export high-resolution interface mockups straight into your pitch decks."
        ),
    },
    {
        "num": 13,
        "code": "CH.13 // SOLIDCRAFT 3D CAD",
        "title": "SolidCraft: Parametric 3D Sketching, Revolve/Extrude & STL Mesh Export",
        "subtitle": "Constraint-Solved 2D Profiles • Real-Time PBR Viewport • 3D-Print Ready STL",
        "style": "quant_analyst",
        "accent": (16, 185, 129),
        "img_main": "07-solidcraft-3d-cad-workflow.png",
        "img_alt": "10-cadcraft-2d-dxf-drafting.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["PARAMETRIC EXTRUDE / REVOLVE", "BOOLEAN SHELL & CHAMFER", "ASCII STL + STEP EXPORT"],
        "callout_b": "Adjust extrusion depth, bevel radius, and boolean cut parameters with instant mesh regeneration",
        "callout_c": "Generates watertight .STL & .STEP geometry alongside shaded viewport renders in the vault",
        "vo": (
            "Engineers and industrial designers get SolidCraft, a parametric three-D CAD modeler. Extrude, "
            "revolve, and chamfer mechanical parts with live dimensional sliders, inspect wireframe topology "
            "from any orbit angle, and export watertight STL meshes ready for three-D printing alongside "
            "shaded viewport snapshots."
        ),
    },
    {
        "num": 14,
        "code": "CH.14 // FILMCRAFT TIMELINE NLE",
        "title": "FilmCraft: Cinema Keyframe Sequencer, Transitions & Title Overlays",
        "subtitle": "Multi-Layer Motion Sequencer • Lower-Third Generators • Frame-Accurate Scrubbing",
        "style": "editorial",
        "accent": (139, 92, 246),
        "img_main": "08-filmcraft-video-studio-workflow.png",
        "img_alt": "23-studiocut-multitrack-video-editor.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["MULTI-TRACK SEQUENCER", "ANIMATED LOWER THIRDS", "WEBM + FCPROJ EXPORT"],
        "callout_b": "Sequence motion clips, kinetic typography overlays, and audio beds with real-time scrubbing",
        "callout_c": "Works hand-in-hand with Studio Cut and EffectCraft for end-to-end broadcast finishing",
        "vo": (
            "Alongside Studio Cut, FilmCraft specializes in kinetic title sequencing and broadcast assembly. "
            "Layer animated lower thirds, scrub across multi-track video and audio timelines, preview "
            "color-graded motion transitions, and render clean reference frames or video masters to the vault."
        ),
    },
    {
        "num": 15,
        "code": "CH.15 // EFFECTCRAFT MOTION VFX",
        "title": "EffectCraft: Node-Based Shader Compositor & Particle VFX Graph",
        "subtitle": "Procedural GLSL-Style Effects • Bezier Easing Curves • Live Particle Emitter",
        "style": "tech_keynote",
        "accent": (168, 85, 247),
        "img_main": "17-effectcraft-motion-vfx.png",
        "img_alt": "08-filmcraft-video-studio-workflow.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["PROCEDURAL VFX NODES", "PARTICLE TURBULENCE", "KEYFRAME GRAPH EDITOR"],
        "callout_b": "Wire procedural glow, chromatic aberration, and particle emitters inside the node graph",
        "callout_c": "Send composited VFX plates directly into Studio Cut or FilmCraft timelines",
        "vo": (
            "When a shot needs visual effects or procedural motion graphics, launch EffectCraft. Wire "
            "particle emitters, chromatic glow, and distortion nodes together in the interactive compositor, "
            "fine-tune velocity curves, and send finished VFX plates straight back to your video editor."
        ),
    },
    {
        "num": 16,
        "code": "CH.16 // SOUNDCRAFT AUDIO MASTERING",
        "title": "SoundCraft: Spectral Waveform Editor, Parametric EQ & Mastering Lab",
        "subtitle": "Sample-Accurate Waveform Trim • 5-Band EQ Curve • LUFS Loudness & WAV Export",
        "style": "institutional",
        "accent": (6, 182, 212),
        "img_main": "16-soundcraft-audio-studio.png",
        "img_alt": "26-fruityforge-flstudio-daw.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["SPECTRAL WAVEFORM HUD", "PARAMETRIC EQ + COMP", "MASTERED .WAV EXPORT"],
        "callout_b": "Sculpt frequencies with interactive parametric EQ nodes, dynamics compression & stereo width",
        "callout_c": "Masters stems from RiverCast, BandForge, or FruityForge into broadcast-ready WAV files",
        "vo": (
            "SoundCraft completes our audio triad alongside BandForge and FruityForge. Load any recorded "
            "voiceover or instrumental stem into the spectral waveform editor, sculpt frequencies with the "
            "parametric equalizer and compressor, monitor stereo phase correlation, and export mastered WAV audio."
        ),
    },
    {
        "num": 17,
        "code": "CH.17 // LIGHTCRAFT RAW DARKROOM",
        "title": "LightCraft: Non-Destructive RAW Photo Catalog, Color Wheels & LUTs",
        "subtitle": "5-Star Culling Filmstrip • Shadow/Midtone/Highlight Wheels • Split-Screen Compare",
        "style": "editorial",
        "accent": (14, 165, 233),
        "img_main": "18-lightcraft-raw-catalog.png",
        "img_alt": "09-photocraft-layer-lab.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["3-WAY COLOR WHEELS", "BEFORE / AFTER SPLIT", "BATCH PRESET GRADING"],
        "callout_b": "Grade exposure, dehaze, vibrance, and three-way color wheels with instant before/after split",
        "callout_c": "Push graded hero photography straight to DesignCraft magazines or DeckCraft slides",
        "vo": (
            "Photographers can cull and color-grade entire shoots inside LightCraft. Rate shots across the "
            "bottom filmstrip, balance shadows, midtones, and highlights on three-way cinema color wheels, "
            "toggle split-screen before-and-after comparisons, and export graded photographs to the suite."
        ),
    },
    {
        "num": 18,
        "code": "CH.18 // DESIGNCRAFT DESKTOP PUBLISHING",
        "title": "DesignCraft: Multi-Page Editorial Spreads, Baseline Grids & Preflight",
        "subtitle": "Facing-Page Magazine Layout • CMYK/RGB Swatch System • Print-Ready Export",
        "style": "editorial",
        "accent": (244, 63, 94),
        "img_main": "19-designcraft-publishing.png",
        "img_alt": "13-pdfcraft-reader-editor.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["FACING-PAGE SPREADS", "BASELINE TYPOGRAPHY GRID", "LIVE PREFLIGHT CHECK"],
        "callout_b": "Flow multi-column editorial copy around vector and photo assets with bleed & slug guides",
        "callout_c": "Zero preflight errors: exports high-DPI publication spreads directly into PDFCraft",
        "vo": (
            "For print and editorial designers, DesignCraft offers facing-page magazine layout with baseline "
            "grids, bleed and slug guides, and live preflight verification. Drop in illustrations from "
            "VectorCraft or photos from LightCraft and publish multi-column editorial spreads in seconds."
        ),
    },
    {
        "num": 19,
        "code": "CH.19 // PDFCRAFT ACROBAT STUDIO",
        "title": "PDFCraft: Document Markup, Redaction, Cryptographic Stamps & Signatures",
        "subtitle": "Multi-Page Thumbnail Rail • Highlight & Callout Annotations • Wet-Ink Signature",
        "style": "institutional",
        "accent": (239, 68, 68),
        "img_main": "13-pdfcraft-reader-editor.png",
        "img_alt": "19-designcraft-publishing.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["HIGHLIGHT & REDACT", "VERIFIED DIGITAL STAMP", "SIGNED DOCUMENT EXPORT"],
        "callout_b": "Annotate contracts, apply permanent security redactions, and draw wet-ink signatures",
        "callout_c": "Archives signed, stamped document packages locally without uploading sensitive PDFs",
        "vo": (
            "PDFCraft handles confidential document review completely offline. Highlight clauses, place "
            "approval stamps, apply permanent black-box redactions, draw a legally binding signature on "
            "the canvas, and save the finalized document package to your local encrypted vault."
        ),
    },
    {
        "num": 20,
        "code": "CH.20 // WORDCRAFT EXECUTIVE DOCS",
        "title": "WordCraft: Distraction-Free Rich Text Publishing, Outline & Word Count",
        "subtitle": "Live Document Hierarchy • Typography Styles • Markdown & HTML Print Export",
        "style": "institutional",
        "accent": (37, 99, 235),
        "img_main": "14-wordcraft-documents.png",
        "img_alt": "15-gridcraft-spreadsheets.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["LIVE OUTLINE NAV", "TYPOGRAPHIC STYLES", "INSTANT DOC + PDF SNAPSHOT"],
        "callout_b": "Author technical specifications, scripts, and briefs with real-time reading-time telemetry",
        "callout_c": "One-click Send to Suite shares formatted document pages across your project workspace",
        "vo": (
            "Need to draft a production script, technical specification, or press release? WordCraft pairs "
            "a structured document outline with rich typographic formatting, live word and reading-time "
            "telemetry, and instant document export to the Shared Asset Hub."
        ),
    },
    {
        "num": 21,
        "code": "CH.21 // GRIDCRAFT QUANT SPREADSHEETS",
        "title": "GridCraft: Reactive Formula Engine, Financial Modeling & Live Charts",
        "subtitle": "SUM / AVG / NPV Formulas • Conditional Cell Formatting • Embedded Sparklines",
        "style": "quant_analyst",
        "accent": (22, 163, 74),
        "img_main": "15-gridcraft-spreadsheets.png",
        "img_alt": "20-deckcraft-presentations.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["REACTIVE FORMULA BAR", "LIVE REVENUE CHARTS", "CSV / JSON / XLSX EXPORT"],
        "callout_b": "Edit cells to recalculate multi-quarter revenue, margin, and runway charts instantaneously",
        "callout_c": "Export financial tables and rendered chart visuals directly into DeckCraft investor slides",
        "vo": (
            "GridCraft powers quantitative modeling and financial analytics inside Mosaic Forge. Write live "
            "spreadsheet formulas that recalculate multi-quarter revenue projections and visual bar charts "
            "in real time, then export both raw data and chart snapshots into your executive presentations."
        ),
    },
    {
        "num": 22,
        "code": "CH.22 // DECKCRAFT KEYNOTE STUDIO",
        "title": "DeckCraft: Widescreen Keynote Builder, Speaker Notes & Laser Presenter",
        "subtitle": "16:9 Slide Sorter • Kinetic Slide Themes • Live Stage Preview & Export",
        "style": "tech_keynote",
        "accent": (245, 158, 11),
        "img_main": "20-deckcraft-presentations.png",
        "img_alt": "12-figcraft-ui-design.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["16:9 KEYNOTE CANVAS", "SPEAKER TELEPROMPTER", "HIGH-DPI SLIDE EXPORT"],
        "callout_b": "Combine charts from GridCraft, UI mocks from FigCraft, and 3D renders from SolidCraft",
        "callout_c": "Present full-screen or record your keynote live using RiverCast's isolated screen studio",
        "vo": (
            "Bring every creative artifact together inside DeckCraft, our sixteen-by-nine keynote presentation "
            "studio. Combine UI mockups, financial charts, and three-D renders onto themed slides with "
            "speaker notes—then record your keynote live using RiverCast's isolated screen and camera studio."
        ),
    },
    {
        "num": 23,
        "code": "CH.23 // SHARED ASSET VAULT & HANDOFF",
        "title": "Universal IndexedDB Shared Asset Vault & 1-Click Cross-Studio Handoff",
        "subtitle": "19+ Verified Live Exports • PNG, SVG, STL, WAV, ISO WebM & Master Video",
        "style": "institutional",
        "accent": (99, 102, 241),
        "img_main": "27-shared-assets-iso-and-daw-exports.png",
        "img_alt": "05-shared-assets-hub.png",
        "focus_box": (0.10, 0.08, 0.90, 0.90),
        "live_slice": (46.0, 54.0),
        "metrics": ["19+ LIVE EXPORTS VERIFIED", "ZERO CLOUD ROUNDTRIPS", "1-CLICK OPEN IN ANY STUDIO"],
        "callout_b": "Every Screen ISO WebM, Camera ISO WebM, DAW WAV stem, STL mesh & PNG lives in one local vault",
        "callout_c": "Click 'Open in Studio' on any card to route that asset into another workspace via postMessage",
        "vo": (
            "Here is the heart of Mosaic Forge: the Shared Asset Hub. Every single artifact we created across "
            "all eighteen studios—separate Screen and Camera ISO WebMs, Studio Cut video masters, BandForge "
            "and FruityForge WAV mixes, STL meshes, and high-DPI graphics—is stored locally in IndexedDB and "
            "ready to open in any companion studio with one click."
        ),
    },
    {
        "num": 24,
        "code": "CH.24 // HARDWARE SETTINGS & UPSTREAM LICENSE MATRIX",
        "title": "WebGPU Hardware Telemetry, Custom Branding & Upstream License Matrix",
        "subtitle": "Single-Instance Memory Isolation • COOP/COEP SharedArrayBuffer • Zero Telemetry",
        "style": "quant_analyst",
        "accent": (56, 189, 248),
        "img_main": "06a-settings-branding-hardware.png",
        "img_alt": "06b-upstream-license-matrix.png",
        "focus_box": (0.14, 0.08, 0.86, 0.90),
        "metrics": ["WEBGPU + WASM SIMD", "CUSTOM SUITE BRANDING", "OPEN-SOURCE LICENSE MATRIX"],
        "callout_b": "Configure GPU acceleration, storage quotas, white-label branding & open-source engine attribution",
        "callout_c": "Strict local-first isolation guarantees your creative IP never leaves your machine",
        "vo": (
            "Inside Settings and Engine Architecture, inspect WebGPU hardware acceleration, customize suite "
            "branding, manage Origin Private File System storage quotas, and audit our transparent open-source "
            "Rust and WebAssembly engine matrix."
        ),
    },
    {
        "num": 25,
        "code": "CH.25 // FINALE & COMPLETE VERIFICATION",
        "title": "Mosaic Forge v2.5 — All 18 Studios Verified, Recorded & Production Ready",
        "subtitle": "Standalone App Launcher + Full-Screen Local Creative OS in a Single Tab",
        "style": "tech_keynote",
        "accent": (16, 185, 129),
        "img_main": "21-updated-studio-home-18-studios.png",
        "img_alt": "27-shared-assets-iso-and-daw-exports.png",
        "focus_box": (0.12, 0.08, 0.88, 0.88),
        "metrics": ["18/18 STUDIOS VERIFIED", "SEPARATE ISO + 2 DAWS", "PRODUCTION READY"],
        "callout_b": "Riverside + OneStudio ISO • Studio Cut NLE • BandForge GarageBand • FruityForge FL Studio 21",
        "callout_c": "Mosaic Forge: Create, Record, Produce, Edit & Master — 100% Locally.",
        "vo": (
            "Eighteen specialized creative studios. Separate Riverside and OneStudio isolated recording, "
            "Studio Cut multi-track video editing, BandForge GarageBand, FruityForge FL Studio twenty-one, "
            "and fourteen design, CAD, and office engines—unified in one zero-cloud browser workspace. "
            "This is Mosaic Forge."
        ),
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# FONT LOADER
# ─────────────────────────────────────────────────────────────────────────────
def load_font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    if mono:
        candidates = ["/System/Library/Fonts/SFNSMono.ttf", "/System/Library/Fonts/Menlo.ttc"]
    elif bold:
        candidates = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/SFNS.ttf"]
    else:
        candidates = ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/SFNS.ttf"]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                pass
    return ImageFont.load_default()


FONT_BADGE = load_font(17, bold=True, mono=True)
FONT_TITLE = load_font(28, bold=True)
FONT_CAPTION = load_font(21, bold=False)
FONT_METRIC = load_font(16, bold=True, mono=True)


# ─────────────────────────────────────────────────────────────────────────────
# REAL POLYPHONIC STEREO MUSICAL SCORE SYNTHESIZER (WARM RHODES + SUB BASS + PULSE)
# ─────────────────────────────────────────────────────────────────────────────
STUDIO_MUSIC_BED_WAV = WORK_DIR / "studio_music_bed_24s.wav"


def ensure_studio_music_bed() -> Path:
    """
    Synthesizes a warm, production-grade 24.0s stereo 48kHz musical bed:
      - 4-bar jazz/electronic progression (Cmaj9 -> Am9 -> Fmaj9 -> G13, 6.0s per chord)
      - Warm electric piano harmonics with stereo chorus detuning
      - Deep sine-triangle sub-bass with gentle envelope
      - Soft brushed hi-hat pulse at 115 BPM
    """
    if STUDIO_MUSIC_BED_WAV.exists() and STUDIO_MUSIC_BED_WAV.stat().st_size > 100000:
        return STUDIO_MUSIC_BED_WAV

    sr = 48000
    dur = 24.0
    total_samples = int(sr * dur)
    buf = array.array("h", [0] * (total_samples * 2))

    chords = [
        # Cmaj9: C2 (bass), C4, E4, G4, B4, D5
        (65.41, [261.63, 329.63, 392.00, 493.88, 587.33]),
        # Am9: A1 (bass), A3, C4, E4, G4, B4
        (55.00, [220.00, 261.63, 329.63, 392.00, 493.88]),
        # Fmaj9: F1 (bass), F3, A3, C4, E4, G4
        (43.65, [174.61, 220.00, 261.63, 329.63, 392.00]),
        # G13: G1 (bass), G3, B3, D4, F4, E5
        (49.00, [196.00, 246.94, 293.66, 349.23, 659.25]),
    ]

    two_pi = 2.0 * math.pi
    beat_sec = 60.0 / 115.0  # 115 BPM

    for i in range(total_samples):
        t = i / sr
        chord_idx = min(3, int(t // 6.0))
        local_t = t - chord_idx * 6.0
        bass_freq, notes = chords[chord_idx]

        # Smooth chord envelope (gentle attack & release across each 6s bar)
        env = min(1.0, local_t / 0.35) * min(1.0, (6.0 - local_t) / 0.45)

        # Warm Sub Bass
        bass_val = math.sin(two_pi * bass_freq * t) * 0.32 * env

        # Rhodes Electric Piano Voices (with slight stereo chorus detune L/R)
        ep_l = 0.0
        ep_r = 0.0
        # Gentle bell attack at the start of every 3.0s half-bar
        bell_t = local_t % 3.0
        bell_env = math.exp(-bell_t * 2.2) * 0.35 + 0.65
        for n_idx, freq in enumerate(notes):
            pan = 0.35 + 0.12 * n_idx
            v_l = math.sin(two_pi * (freq * 0.9992) * t) + 0.25 * math.sin(two_pi * freq * 2.0 * t) * math.exp(-bell_t * 3.5)
            v_r = math.sin(two_pi * (freq * 1.0008) * t) + 0.25 * math.sin(two_pi * freq * 2.0 * t) * math.exp(-bell_t * 3.5)
            ep_l += v_l * (1.0 - pan * 0.4)
            ep_r += v_r * (0.6 + pan * 0.4)

        ep_l = (ep_l / len(notes)) * 0.38 * env * bell_env
        ep_r = (ep_r / len(notes)) * 0.38 * env * bell_env

        # Soft 115 BPM rhythmic pulse
        beat_phase = (t % beat_sec) / beat_sec
        kick_pulse = math.sin(two_pi * (95.0 * math.exp(-beat_phase * 14.0) + 42.0) * (t % beat_sec)) * math.exp(-beat_phase * 9.5) * 0.16

        # Master fade-in & fade-out across 24s
        master_fade = min(1.0, t / 0.5) * min(1.0, (dur - t) / 0.6)
        out_l = (bass_val + ep_l + kick_pulse) * master_fade * 0.22
        out_r = (bass_val + ep_r + kick_pulse) * master_fade * 0.22

        buf[i * 2] = max(-32000, min(32000, int(out_l * 32767)))
        buf[i * 2 + 1] = max(-32000, min(32000, int(out_r * 32767)))

    with wave.open(str(STUDIO_MUSIC_BED_WAV), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(buf.tobytes())

    return STUDIO_MUSIC_BED_WAV


# ─────────────────────────────────────────────────────────────────────────────
# CLEAN FULL-BLEED 1920x1080 COMPOSITOR WITH FLOATING GLASSMORPHIC LOWER-THIRD
# ─────────────────────────────────────────────────────────────────────────────
def render_chapter_slides(ch: dict) -> list[Path]:
    """
    Generates 3 full-bleed 1920x1080 frames per chapter:
      - Stage 0: Full 1920x1080 Studio View (100% screen area) + sleek floating lower-third bar
      - Stage 1: Gentle 1.15x Cinema Detail Focus + floating lower-third bar
      - Stage 2: Companion / Asset Vault View + verified metric pills in floating lower-third bar
    """
    num = ch["num"]
    accent = ch["accent"]
    ar, ag, ab = accent

    src_main = Image.open(ARTIFACT_DIR / ch["img_main"]).convert("RGBA")
    src_alt = Image.open(ARTIFACT_DIR / ch["img_alt"]).convert("RGBA")

    vo_words = ch["vo"].split()
    third = max(1, len(vo_words) // 3)
    vo_chunks = [
        " ".join(vo_words[:third]),
        " ".join(vo_words[third : third * 2]),
        " ".join(vo_words[third * 2 :]),
    ]

    stage_paths = []
    for stage_idx in range(3):
        out_path = SLIDES_DIR / f"ch_{num:02d}_stage_{stage_idx}.png"

        if stage_idx == 0:
            # Full-bleed 1920x1080 studio interface
            canvas = src_main.resize((1920, 1080), Image.Resampling.LANCZOS)
        elif stage_idx == 1:
            # Gentle, non-janky 1.18x detail zoom on the active studio workspace
            fx0, fy0, fx1, fy1 = ch["focus_box"]
            w, h = src_main.size
            crop_box = (int(fx0 * w), int(fy0 * h), int(fx1 * w), int(fy1 * h))
            canvas = src_main.crop(crop_box).resize((1920, 1080), Image.Resampling.LANCZOS)
        else:
            # Full-bleed companion / vault verification view
            canvas = src_alt.resize((1920, 1080), Image.Resampling.LANCZOS)

        # Create sleek translucent floating lower-third bar (y: 938 .. 1062)
        overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Floating glass bar with subtle accent border
        draw.rounded_rectangle(
            (36, 936, 1884, 1060),
            radius=16,
            fill=(8, 11, 18, 224),
            outline=(ar, ag, ab, 185),
            width=2,
        )

        # Chapter badge pill (dynamically sized)
        code_bbox = draw.textbbox((0, 0), ch["code"], font=FONT_BADGE)
        code_w = (code_bbox[2] - code_bbox[0]) + 28
        draw.rounded_rectangle((56, 950, 56 + code_w, 980), radius=7, fill=(ar, ag, ab, 235))
        draw.text((70, 955), ch["code"], font=FONT_BADGE, fill=(255, 255, 255, 255))

        # Chapter Title next to badge
        draw.text((56 + code_w + 16, 949), ch["title"], font=FONT_TITLE, fill=(248, 250, 252, 255))

        # Top-right metric pill inside lower-third bar
        metric_txt = f"✓ {ch['metrics'][stage_idx % len(ch['metrics'])]}"
        m_bbox = draw.textbbox((0, 0), metric_txt, font=FONT_METRIC)
        m_w = (m_bbox[2] - m_bbox[0]) + 28
        draw.rounded_rectangle((1864 - m_w, 950, 1864, 980), radius=7, fill=(22, 30, 46, 240), outline=(ar, ag, ab, 160), width=1)
        draw.text((1864 - m_w + 14, 956), metric_txt, font=FONT_METRIC, fill=(226, 232, 240, 255))

        # Live synchronized narration subtitle line
        caption_str = f"“{vo_chunks[stage_idx]}”"
        draw.text((56, 992), caption_str[:118], font=FONT_CAPTION, fill=(203, 213, 225, 255))

        # Slim 4px progress bar along the bottom edge of the lower-third
        elapsed_sec = (num - 1) * 24 + (stage_idx + 1) * 8
        progress_frac = elapsed_sec / 600.0
        bar_x0, bar_x1 = 56, 1730
        bar_w = int((bar_x1 - bar_x0) * progress_frac)
        draw.rounded_rectangle((bar_x0, 1038, bar_x1, 1044), radius=3, fill=(30, 41, 59, 255))
        draw.rounded_rectangle((bar_x0, 1038, max(bar_x0 + 10, bar_x0 + bar_w), 1044), radius=3, fill=(ar, ag, ab, 255))

        mm_e, ss_e = divmod(elapsed_sec, 60)
        draw.text((1748, 1029), f"{mm_e:02d}:{ss_e:02d} / 10:00", font=FONT_METRIC, fill=(148, 163, 184, 255))

        composited = Image.alpha_composite(canvas, overlay).convert("RGB")
        composited.save(out_path, "PNG", optimize=False)
        stage_paths.append(out_path)

    return stage_paths


# ─────────────────────────────────────────────────────────────────────────────
# AUDIO SYNTHESIS & STUDIO MIXER (NATURAL CADENCE + POLYPHONIC RHODES SCORE)
# ─────────────────────────────────────────────────────────────────────────────
def get_duration(path: Path) -> float:
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        return float(res.stdout.strip())
    except Exception:
        return 0.0


def synthesize_chapter_vo(ch: dict) -> Path:
    num = ch["num"]
    raw_mp3 = VO_DIR / f"ch_{num:02d}_raw.mp3"
    padded_wav = VO_DIR / f"ch_{num:02d}_24s.wav"

    if not raw_mp3.exists() or raw_mp3.stat().st_size < 1000:
        vb = VoiceBridge()
        vb.synthesize_text(text=ch["vo"], style=ch["style"], output_path=raw_mp3)

    dur = get_duration(raw_mp3)
    tempo = 1.0
    if dur > 22.8:
        tempo = min(1.22, dur / 22.6)

    af_chain = []
    if tempo > 1.01:
        af_chain.append(f"atempo={tempo:.4f}")
    af_chain.append("adelay=450|450")
    af_chain.append("apad=whole_dur=24.0")

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(raw_mp3),
            "-af", ",".join(af_chain),
            "-t", "24.0",
            "-ar", "48000",
            "-ac", "2",
            "-c:a", "pcm_s16le",
            str(padded_wav),
        ],
        check=True,
        capture_output=True,
    )
    return padded_wav


def generate_chapter_score_and_mix(num: int, vo_wav: Path, music_bed_wav: Path) -> Path:
    """Mixes the chapter voiceover with the warm Rhodes/Sub-bass studio music bed."""
    mixed_wav = VO_DIR / f"ch_{num:02d}_mixed.wav"
    filter_complex = (
        "[0:a]volume=1.15[vo];"
        "[1:a]volume=0.32[music];"
        "[vo][music]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.95[outa]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(vo_wav),
            "-i", str(music_bed_wav),
            "-filter_complex", filter_complex,
            "-map", "[outa]",
            "-t", "24.0",
            "-ar", "48000",
            "-ac", "2",
            "-c:a", "pcm_s16le",
            str(mixed_wav),
        ],
        check=True,
        capture_output=True,
    )
    return mixed_wav


# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 24.0s MP4 CLIP RENDERER (WITH LIVE SCREEN RECORDING SPLICING)
# ─────────────────────────────────────────────────────────────────────────────
def render_chapter_clip(ch: dict, music_bed_wav: Path) -> Path:
    num = ch["num"]
    clip_path = CLIPS_DIR / f"chapter_{num:02d}.mp4"
    slides = render_chapter_slides(ch)
    vo_wav = synthesize_chapter_vo(ch)
    mixed_wav = generate_chapter_score_and_mix(num, vo_wav, music_bed_wav)

    # If this chapter has a live recorded browser video slice, weave the real moving screen recording into Stage 0!
    if "live_slice" in ch and LIVE_WEBM.exists():
        t_start, t_end = ch["live_slice"]
        slice_dur = max(4.0, t_end - t_start)
        filter_complex = (
            f"[0:v]trim=start={t_start}:duration={slice_dur},setpts=PTS-STARTPTS,"
            f"scale=1920:1080,fps=30,tpad=stop_mode=clone:stop_duration=4.5,trim=duration=8.25,"
            f"format=yuv420p,fade=t=in:st=0:d=0.4[v0];"
            f"[1:v]format=yuv420p[v1];"
            f"[2:v]format=yuv420p[v2];"
            f"[v0][v1]xfade=transition=smoothleft:duration=0.75:offset=7.5[vx1];"
            f"[vx1][v2]xfade=transition=fade:duration=0.75:offset=15.5,"
            f"fade=t=out:st=23.5:d=0.5[vout]"
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(LIVE_WEBM),
                "-loop", "1", "-t", "8.75", "-r", "30", "-i", str(slides[1]),
                "-loop", "1", "-t", "8.50", "-r", "30", "-i", str(slides[2]),
                "-i", str(mixed_wav),
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "3:a",
                "-t", "24.0",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "19",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",
                str(clip_path),
            ],
            check=True,
            capture_output=True,
        )
    else:
        filter_complex = (
            "[0:v]format=yuv420p,fade=t=in:st=0:d=0.4[v0];"
            "[1:v]format=yuv420p[v1];"
            "[2:v]format=yuv420p[v2];"
            "[v0][v1]xfade=transition=smoothleft:duration=0.75:offset=7.5[vx1];"
            "[vx1][v2]xfade=transition=fade:duration=0.75:offset=15.5,"
            "fade=t=out:st=23.5:d=0.5[vout]"
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-loop", "1", "-t", "8.25", "-r", "30", "-i", str(slides[0]),
                "-loop", "1", "-t", "8.75", "-r", "30", "-i", str(slides[1]),
                "-loop", "1", "-t", "8.50", "-r", "30", "-i", str(slides[2]),
                "-i", str(mixed_wav),
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "3:a",
                "-t", "24.0",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "19",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",
                str(clip_path),
            ],
            check=True,
            capture_output=True,
        )
    return clip_path


# ─────────────────────────────────────────────────────────────────────────────
# SUBTITLES (.VTT & .SRT)
# ─────────────────────────────────────────────────────────────────────────────
def fmt_ts_vtt(sec: float) -> str:
    hrs = int(sec // 3600)
    mins = int((sec % 3600) // 60)
    secs = sec % 60
    return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"


def fmt_ts_srt(sec: float) -> str:
    return fmt_ts_vtt(sec).replace(".", ",")


def write_master_subtitles() -> tuple[Path, Path]:
    vtt_path = OUTPUT_DIR / "mosaic-forge-10min-subtitles.vtt"
    srt_path = OUTPUT_DIR / "mosaic-forge-10min-subtitles.srt"

    vtt_lines = ["WEBVTT\n"]
    srt_lines = []
    cue_idx = 1

    for ch in CHAPTERS:
        base_t = (ch["num"] - 1) * 24.0
        words = ch["vo"].split()
        third = max(1, len(words) // 3)
        parts = [
            " ".join(words[:third]),
            " ".join(words[third : third * 2]),
            " ".join(words[third * 2 :]),
        ]
        for p_idx, text in enumerate(parts):
            t0 = base_t + p_idx * 8.0 + 0.3
            t1 = base_t + (p_idx + 1) * 8.0 - 0.2
            vtt_lines.append(f"{cue_idx}\n{fmt_ts_vtt(t0)} --> {fmt_ts_vtt(t1)}\n{text}\n")
            srt_lines.append(f"{cue_idx}\n{fmt_ts_srt(t0)} --> {fmt_ts_srt(t1)}\n{text}\n")
            cue_idx += 1

    vtt_path.write_text("\n".join(vtt_lines), encoding="utf-8")
    srt_path.write_text("\n".join(srt_lines), encoding="utf-8")
    return vtt_path, srt_path


# ─────────────────────────────────────────────────────────────────────────────
# 20-SECOND /BRAG SOCIAL LAUNCH VIDEO (REAL LIVE RECORDING + RHODES SCORE)
# ─────────────────────────────────────────────────────────────────────────────
def render_brag_20s_launch_video(music_bed_wav: Path) -> tuple[Path, Path, Path]:
    brag_vo_mp3 = VO_DIR / "brag_20s_vo.mp3"
    brag_vo_text = (
        "Meet Mosaic Forge: eighteen native-speed creative studios in one local browser tab. "
        "Record separate screen and camera ISOs in RiverCast, edit multi-track video in Studio Cut, "
        "produce beats in GarageBand and FL Studio twenty-one, and hand off every asset locally with zero cloud lag."
    )
    if not brag_vo_mp3.exists() or brag_vo_mp3.stat().st_size < 1000:
        vb = VoiceBridge()
        vb.synthesize_text(text=brag_vo_text, style="tech_keynote", output_path=brag_vo_mp3)

    dur = get_duration(brag_vo_mp3)
    tempo = 1.0
    if dur > 18.8:
        tempo = min(1.22, dur / 18.5)

    brag_audio_wav = VO_DIR / "brag_20s_mixed.wav"
    af_vo = f"atempo={tempo:.4f},adelay=300|300,apad=whole_dur=20.0" if tempo > 1.01 else "adelay=300|300,apad=whole_dur=20.0"
    filter_audio = (
        f"[0:a]{af_vo},volume=1.18[vo];"
        f"[1:a]afade=t=out:st=19.0:d=1.0,volume=0.35[pad];"
        f"[vo][pad]amix=inputs=2:duration=first,alimiter=limit=0.95[aout]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(brag_vo_mp3),
            "-i", str(music_bed_wav),
            "-filter_complex", filter_audio,
            "-map", "[aout]",
            "-t", "20.0",
            "-ar", "48000",
            "-ac", "2",
            "-c:a", "pcm_s16le",
            str(brag_audio_wav),
        ],
        check=True,
        capture_output=True,
    )

    # Save settled poster frame as brag.jpg (full-bleed Home Page Launcher + lower-third)
    poster_jpg = OUTPUT_DIR / "brag.jpg"
    Image.open(SLIDES_DIR / "ch_01_stage_0.png").convert("RGB").save(poster_jpg, "JPEG", quality=95)

    raw_brag_mp4 = WORK_DIR / "brag_raw.mp4"
    # Use the real moving live_master_walkthrough.webm (accelerated smoothly to 20s) so the /brag video is 100% live screen recording!
    live_dur = get_duration(LIVE_WEBM)
    pts_factor = 19.6 / max(20.0, live_dur)
    filter_v = (
        f"[0:v]setpts={pts_factor:.4f}*PTS,scale=1920:1080,fps=30,"
        f"format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=19.5:d=0.5[vout]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(LIVE_WEBM),
            "-i", str(brag_audio_wav),
            "-filter_complex", filter_v,
            "-map", "[vout]",
            "-map", "1:a",
            "-t", "20.0",
            "-r", "30",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            str(raw_brag_mp4),
        ],
        check=True,
        capture_output=True,
    )

    # Bake brag.jpg into Frame 0 of brag.mp4
    final_brag_mp4 = OUTPUT_DIR / "brag.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(raw_brag_mp4),
            "-i", str(poster_jpg),
            "-filter_complex", "[0:v][1:v]overlay=enable='eq(n,0)'[v]",
            "-map", "[v]",
            "-map", "0:a",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(final_brag_mp4),
        ],
        check=True,
        capture_output=True,
    )

    share_copy_path = OUTPUT_DIR / "share-copy.txt"
    share_copy_path.write_text(
        "Built Mosaic Forge: 18 local-first creative studios with a standalone Home Page App Launcher and "
        "full-screen studios—featuring a reverse-engineered Riverside + OneStudio separate Screen/Camera ISO "
        "recording studio, Studio Cut multi-track video editor, BandForge GarageBand DAW, and FruityForge FL "
        "Studio 21. Every export stays 100% local in IndexedDB with instant cross-studio handoff.\n",
        encoding="utf-8",
    )
    return final_brag_mp4, poster_jpg, share_copy_path


def main():
    print("════════════════════════════════════════════════════════════════════════")
    print("  MOSAIC FORGE — PRODUCTION-READY FULL-BLEED VIDEO & SCORE PIPELINE")
    print("════════════════════════════════════════════════════════════════════════")

    print("[0/4] Synthesizing polyphonic stereo Rhodes + Sub-Bass studio music bed...")
    music_bed_wav = ensure_studio_music_bed()
    print(f"  ✓ Studio music bed ready: {music_bed_wav.name}")

    print("[1/4] Rendering 25 full-bleed chapters (600.0s total) with live recordings & Rhodes score...")
    clip_paths = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        future_map = {pool.submit(render_chapter_clip, ch, music_bed_wav): ch["num"] for ch in CHAPTERS}
        for fut in as_completed(future_map):
            num = future_map[fut]
            clip_path = fut.result()
            clip_paths[num] = clip_path
            dur = get_duration(clip_path)
            print(f"  ✓ Chapter {num:02d}/25 rendered -> {clip_path.name} ({dur:.2f}s)")

    print("[2/4] Concatenating 25 chapters into 10-minute (600.0s) Master Showcase MP4...")
    concat_txt = WORK_DIR / "concat_list.txt"
    ordered_lines = [f"file '{clip_paths[i]}'" for i in range(1, 26)]
    concat_txt.write_text("\n".join(ordered_lines) + "\n", encoding="utf-8")

    master_mp4 = OUTPUT_DIR / "mosaic-forge-10min-master-showcase.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_txt),
            "-c", "copy",
            "-movflags", "+faststart",
            str(master_mp4),
        ],
        check=True,
        capture_output=True,
    )
    master_dur = get_duration(master_mp4)
    master_mb = master_mp4.stat().st_size / (1024 * 1024)
    print(f"  ✓ Master Showcase Video: {master_mp4} ({master_dur:.2f}s / {master_mb:.2f} MB)")

    print("[3/4] Writing synchronized 10-minute WebVTT and SRT subtitle tracks...")
    vtt_path, srt_path = write_master_subtitles()

    print("[4/4] Rendering 20-second live-recorded /brag launch cut + settled poster...")
    brag_mp4, poster_jpg, share_copy = render_brag_20s_launch_video(music_bed_wav)
    brag_dur = get_duration(brag_mp4)
    print(f"  ✓ Brag Launch Cut: {brag_mp4} ({brag_dur:.2f}s)")

    for src_file in [
        master_mp4,
        brag_mp4,
        poster_jpg,
        vtt_path,
        srt_path,
        SLIDES_DIR / "ch_01_stage_0.png",
        SLIDES_DIR / "ch_03_stage_1.png",
        SLIDES_DIR / "ch_04_stage_1.png",
        SLIDES_DIR / "ch_05_stage_1.png",
        SLIDES_DIR / "ch_07_stage_0.png",
        SLIDES_DIR / "ch_23_stage_2.png",
    ]:
        shutil.copy2(src_file, ARTIFACT_DIR / src_file.name)

    print("════════════════════════════════════════════════════════════════════════")
    print("  PRODUCTION VIDEO & AUDIO DELIVERABLES COMPLETED SUCCESSFULLY")
    print("════════════════════════════════════════════════════════════════════════")


if __name__ == "__main__":
    main()
