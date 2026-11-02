import upstreamLock from '../../integration/upstream-lock.json';
export type VerificationStatus = 'tested' | 'partially tested' | 'not tested' | 'blocked';
export type IntegrationLevel = 'integrated' | 'source-only' | 'blocked';

export interface WorkspaceSpec {
  id: string;
  name: string;
  upstreamName: string;
  upstreamRepo: string;
  category: string;
  purpose: string;
  pinnedCommit: string;
  pinnedTag: string;
  licenseDeclared: string;
  licenseSelected: string;
  integrationLevel: IntegrationLevel;
  verificationStatus: VerificationStatus;
  editorUrl: string | null;
  supportsHostParentParam: boolean;
  windowApiGlobal: string | null;
  nativeFormats: string[];
  importFormats: string[];
  exportFormats: string[];
  recommendedSampleAsset?: string;
  verifiedWorkflowSummary: string;
  roleNotes: string;
  accentColor: string;
  iconKey:
    | 'box'
    | 'compass'
    | 'film'
    | 'sparkles'
    | 'image'
    | 'sun'
    | 'pen-tool'
    | 'layout'
    | 'file-text'
    | 'figma'
    | 'type'
    | 'music'
    | 'presentation'
    | 'table'
    | 'cpu'
    | 'radio'
    | 'video'
    | 'disc'
    | 'sliders'
    | 'shield-alert';
}

const REGISTERED_WORKSPACES: WorkspaceSpec[] = [
  {
    id: 'riverstudio',
    name: 'RiverCast & OneStudio ISO',
    upstreamName: 'Mosaic RiverCast & OneStudio Engine',
    upstreamRepo: 'https://github.com/storytold/filmcraft',
    category: 'Riverside & OneStudio Multi-Track ISO Recording Studio',
    purpose:
      'Local progressive multi-track ISO studio: records Screen Capture and Camera Video as separate isolated files alongside 48kHz PCM WAV audio and a live OneStudio switched program feed.',
    pinnedCommit: 'local-iso-engine-v1.0',
    pinnedTag: 'v1.0.0-iso',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/riverstudio/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'riverstudio',
    nativeFormats: ['.webm', '.wav'],
    importFormats: ['.webm', '.mp4', '.wav'],
    exportFormats: ['.webm (Screen ISO)', '.webm (Camera ISO)', '.wav (48kHz Stem)', '.webm (Program Mix)'],
    verifiedWorkflowSummary:
      'Verified end-to-end: simultaneous parallel MediaRecorder capture of isolated Screen track (screen-recording-iso.webm), isolated Camera track (camera-video-iso.webm), 48kHz PCM WAV stem (mic-audio-iso.wav), OneStudio live scene switching, and separate track exports into Shared Assets.',
    roleNotes:
      'Reverse-engineered Riverside.fm local ISO progressive recording + OneStudio live broadcast scene switcher. Guarantees screen recordings and camera video are exported as separate files.',
    accentColor: '#e05a47',
    iconKey: 'radio'
  },
  {
    id: 'studiocut',
    name: 'Studio Cut ISO Video Editor',
    upstreamName: 'Mosaic Studio Cut NLE',
    upstreamRepo: 'https://github.com/storytold/filmcraft',
    category: 'Multi-Track ISO Video & Screen-Cast Editor',
    purpose:
      'Non-destructive multi-track video editor built for separate Screen (V1) + Camera PIP (V2) + Captions (T1) + Audio Stem (A1) workflows, with post-recording PIP re-framing, razor splits, LUT color grading, and separate or master video export.',
    pinnedCommit: 'local-studiocut-nle-v1.0',
    pinnedTag: 'v1.0.0-nle',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/studiocut/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'studiocut',
    nativeFormats: ['.otio', '.webm'],
    importFormats: ['.webm', '.mp4', '.mov', '.wav', '.otio'],
    exportFormats: ['.webm (Master)', '.webm (V1 Screen)', '.webm (V2 Camera)', '.wav', '.otio'],
    recommendedSampleAsset: 'mosaic-test-clip.mp4',
    verifiedWorkflowSummary:
      'Verified end-to-end: multi-track V1 Screen + V2 Camera PIP post-production layout switching, playhead razor split, caption overlay, OpenTimelineIO (.otio) export, and separate/composited WebM renders.',
    roleNotes:
      'Pairs directly with RiverCast & OneStudio for editing separate screen and camera ISO recordings, and bridges to FilmCraft WASM via OpenTimelineIO.',
    accentColor: '#f43f5e',
    iconKey: 'video'
  },
  {
    id: 'bandforge',
    name: 'BandForge (GarageBand DAW)',
    upstreamName: 'Mosaic BandForge Studio',
    upstreamRepo: 'https://github.com/storytold/soundcraft',
    category: 'GarageBand-Style Track, Smart Chords, Amp Rig & Live Loops',
    purpose:
      'Multi-track song arrangement, playable Smart Chords strips, 2-octave synth/Rhodes keyboard, 59 Tweed guitar amplifier & stompbox pedalboard, Live Loops matrix, and 44.1kHz stereo WAV bounce.',
    pinnedCommit: 'local-bandforge-daw-v1.0',
    pinnedTag: 'v1.0.0-gb',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/bandforge/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'bandforge',
    nativeFormats: ['.wav', '.mid'],
    importFormats: ['.wav', '.mp3', '.flac', '.mid'],
    exportFormats: ['.wav (Stereo Master)', '.mid'],
    recommendedSampleAsset: 'mosaic-tone.wav',
    verifiedWorkflowSummary:
      'Verified end-to-end: Smart Chords polyphonic WebAudio synthesis, 6-track region arrangement, Tweed guitar amp + pedalboard DSP, Live Loops scene matrix, and stereo 44.1kHz PCM WAV bounce.',
    roleNotes:
      'GarageBand-inspired creative music studio with instant Smart Instruments and one-click stem handoff to SoundCraft WASM.',
    accentColor: '#f59e0b',
    iconKey: 'disc'
  },
  {
    id: 'flstudio',
    name: 'FruityForge 21 (FL Studio DAW)',
    upstreamName: 'Mosaic FruityForge Sequencer',
    upstreamRepo: 'https://github.com/storytold/soundcraft',
    category: 'FL Studio-Style 16-Step Channel Rack, Piano Roll & Mixer',
    purpose:
      '8-channel 16-step drum & 808 sequencer, chromatic Piano Roll editor, Bar 1–8 Pattern Playlist arrangement, 8-insert + Master Soft Clipper FX Mixer, and master WAV or separate stem export.',
    pinnedCommit: 'local-fruityforge-v1.0',
    pinnedTag: 'v1.0.0-fl',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/flstudio/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'flstudio',
    nativeFormats: ['.wav', '.json'],
    importFormats: ['.wav', '.mp3', '.mid'],
    exportFormats: ['.wav (Master Beat)', '.wav (Drums Stem)', '.wav (808 Stem)', '.wav (Synth Stem)'],
    recommendedSampleAsset: 'mosaic-tone.wav',
    verifiedWorkflowSummary:
      'Verified end-to-end: 16-step Channel Rack pattern sequencing, chromatic Piano Roll note entry, genre preset switching, and master + separate stem 44.1kHz stereo WAV rendering.',
    roleNotes:
      'FL Studio 21-inspired pattern & beat workstation with real-time WebAudio 808/Sytrus/3xOsc synthesis and separate stem bounce.',
    accentColor: '#f97316',
    iconKey: 'sliders'
  },
  {
    id: 'solidcraft',
    name: 'SolidCraft 3D CAD',
    upstreamName: 'SolidCraft',
    upstreamRepo: 'https://github.com/tangency-labs/solidcraft',
    category: 'Parametric 3D B-Rep CAD (Primary CAD)',
    purpose: 'Parametric 3D solid modeling, sketch constraints, extrusions, boolean features, assemblies, and STEP/STL manufacturing export.',
    pinnedCommit: '56b77b405dfedfa287a4a4c1d18d76aa96c79214',
    pinnedTag: 'v0.29.0',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT (with Apache-2.0 solidcore B-rep kernel)',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/solidcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'solidcraft',
    nativeFormats: ['.sc'],
    importFormats: ['.sc', '.step', '.stp', '.iges', '.igs', '.stl'],
    exportFormats: ['.sc', '.step', '.stl'],
    verifiedWorkflowSummary:
      'Verified end-to-end: parametric sketch creation, rectangle & hole circle profile, solid extrusion of a 3D motor-adapter concept plate, OPFS save/reopen (/opfs/*.sc), and binary/ASCII STL + ISO-10303-21 STEP export via window.solidcraft.',
    roleNotes:
      'Primary 3D CAD workspace in OmniCraft OS. Powered by the solidcore B-rep geometric kernel. Intentionally kept separate from CADCraft (which handles 2D DXF/DWG drafting).',
    accentColor: '#c87d55',
    iconKey: 'box'
  },
  {
    id: 'filmcraft',
    name: 'FilmCraft Video Studio',
    upstreamName: 'FilmCraft',
    upstreamRepo: 'https://github.com/storytold/filmcraft',
    category: 'Non-Linear Video Editing',
    purpose: 'Multi-track timeline video editing, razor/trim operations, color scopes, keyframed effects, and WebCodecs MP4/MOV export.',
    pinnedCommit: '95cf47b883f22b4abffbeff22296e29c192eb441',
    pinnedTag: 'v0.15.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/filmcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'filmcraft',
    nativeFormats: ['.fcproj', '.otio', '.fcpxml'],
    importFormats: ['.mp4', '.mov', '.webm', '.wav', '.mp3', '.png', '.jpg', '.fcproj'],
    exportFormats: ['.mp4', '.mov', '.wav', '.fcproj', '.otio', '.fcpxml', '.edl'],
    recommendedSampleAsset: 'mosaic-test-clip.mp4',
    verifiedWorkflowSummary:
      'Verified end-to-end: project creation, importing self-generated MP4 media via window.filmcraft.importUrl, timeline clip placement, razor split / trim edit, project serialization, and WebCodecs H.264/AAC export verification.',
    roleNotes:
      'Browser build uses WebCodecs + virtual file system. For 20–60 minute long-form timelines on the 2018 Intel MacBook Air (i5-8210Y, 16 GB RAM), proxy media and local filesystem handoff are recommended.',
    accentColor: '#d46a6a',
    iconKey: 'film'
  },
  {
    id: 'photocraft',
    name: 'PhotoCraft Layer Lab',
    upstreamName: 'PhotoCraft',
    upstreamRepo: 'https://github.com/storytold/photocraft',
    category: 'Layered Raster & Photo Editing',
    purpose: 'Non-destructive layered raster editing, adjustment layers, brushes, masks, retouching, and PSD/PNG/JPEG/WebP/TIFF export.',
    pinnedCommit: '1f984bffb331d760a80dd6c2276878950f491df2',
    pinnedTag: 'v0.18.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/photocraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: null,
    nativeFormats: ['.pht', '.psd'],
    importFormats: ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.psd', '.pht'],
    exportFormats: ['.png', '.jpg', '.webp', '.tiff', '.psd', '.pht'],
    recommendedSampleAsset: 'mosaic-test-image.png',
    verifiedWorkflowSummary:
      'Verified end-to-end: opening self-generated PNG image via synthetic canvas file drop bridge, visible adjustment & canvas edit, and exporting a valid PNG back to the Shared Assets store.',
    roleNotes:
      'Uses WebGPU/WebGL2 tile rendering and Web Worker brush/filter pipelines.',
    accentColor: '#5b8fd9',
    iconKey: 'image'
  },
  {
    id: 'cadcraft',
    name: 'CADCraft 2D Drafting',
    upstreamName: 'CADCraft',
    upstreamRepo: 'https://github.com/storytold/cadcraft',
    category: '2D Technical Drafting (DXF / DWG)',
    purpose: '2D architectural and mechanical drafting, layers, dimensions, hatches, snaps, paper-space layouts, and DXF/DWG/PDF exchange.',
    pinnedCommit: '5caaf73e3b3de9136723770520bd01e0acde461a',
    pinnedTag: 'v0.15.1',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/cadcraft/index.html?host=parent',
    supportsHostParentParam: true,
    windowApiGlobal: null,
    nativeFormats: ['.dxf', '.dwg'],
    importFormats: ['.dxf', '.dwg'],
    exportFormats: ['.dxf', '.pdf', '.svg', '.png'],
    recommendedSampleAsset: 'motor-plate-2d.dxf',
    verifiedWorkflowSummary:
      'Verified native ?host=parent postMessage protocol (cadcraft:ready, cadcraft:open, cadcraft:save, cadcraft:dirty) with 2D DXF motor plate drawing.',
    roleNotes:
      'Dedicated 2D DXF/DWG drafting workspace. Separate from SolidCraft 3D parametric B-rep CAD so each engine stays clean and upstream-compatible.',
    accentColor: '#3b7a6b',
    iconKey: 'compass'
  },
  {
    id: 'vectorcraft',
    name: 'VectorCraft Illustration',
    upstreamName: 'VectorCraft',
    upstreamRepo: 'https://github.com/storytold/vectorcraft',
    category: 'Vector Graphics & Illustration',
    purpose: 'Bezier pen paths, boolean path operations, artboards, gradients, typography, and SVG/PDF/EPS/PNG export.',
    pinnedCommit: '433ddb593dfbf470f214f66bf78a6c0f822bbca3',
    pinnedTag: 'v0.19.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/vectorcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'vectorcraft',
    nativeFormats: ['.vct', '.svg'],
    importFormats: ['.svg', '.vct', '.ai', '.eps', '.pdf'],
    exportFormats: ['.svg', '.pdf', '.png', '.vct'],
    recommendedSampleAsset: 'mosaic-badge.svg',
    verifiedWorkflowSummary:
      'Verified WASM initialization, window.vectorcraft command catalog, SVG file open via openFile(), and download capture.',
    roleNotes: 'Exposes full window.vectorcraft automation and inspection API.',
    accentColor: '#d98f4e',
    iconKey: 'pen-tool'
  },
  {
    id: 'effectcraft',
    name: 'EffectCraft Motion & VFX',
    upstreamName: 'EffectCraft',
    upstreamRepo: 'https://github.com/storytold/effectcraft',
    category: 'Motion Graphics & Compositing',
    purpose: 'Layer- and node-based motion graphics, keyframe graph editor, particle emitters, chroma key, and VFX compositing.',
    pinnedCommit: 'f4f390b1531bc573790922f2c3f63d519df11d99',
    pinnedTag: 'v0.19.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'partially tested',
    editorUrl: '/editors/effectcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'effectcraft',
    nativeFormats: ['.ecproj'],
    importFormats: ['.mp4', '.png', '.jpg', '.svg', '.wav', '.ecproj'],
    exportFormats: ['.mp4', '.webm', '.png', '.ecproj'],
    recommendedSampleAsset: 'mosaic-test-clip.mp4',
    verifiedWorkflowSummary:
      'Verified WASM boot and window.effectcraft JS API initialization; complex multi-pass GPU shader exports are partially tested in headless browser.',
    roleNotes: 'Exposes window.effectcraft (execute, addFile, saveToBrowser, listStored).',
    accentColor: '#966fd6',
    iconKey: 'sparkles'
  },
  {
    id: 'lightcraft',
    name: 'LightCraft RAW & Catalog',
    upstreamName: 'LightCraft',
    upstreamRepo: 'https://github.com/storytold/lightcraft',
    category: 'Photography & RAW Development',
    purpose: 'Photo cataloging, ratings, non-destructive parametric tone curves, HSL color grading, and lens corrections.',
    pinnedCommit: 'c50b74df9c5f27ab8d9551b1146b779b9384a026',
    pinnedTag: 'v0.16.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'partially tested',
    editorUrl: '/editors/lightcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: 'lightcraft',
    nativeFormats: ['.lcat'],
    importFormats: ['.png', '.jpg', '.jpeg', '.dng', '.cr2', '.nef', '.arw', '.tiff'],
    exportFormats: ['.jpg', '.png', '.tiff'],
    recommendedSampleAsset: 'mosaic-test-image.png',
    verifiedWorkflowSummary:
      'Verified WASM boot, Web Worker render offload, and window.lightcraft.command interface.',
    roleNotes: 'Uses dedicated Web Worker (`worker_entry.js`) for background RAW development.',
    accentColor: '#4ea8b8',
    iconKey: 'sun'
  },
  {
    id: 'designcraft',
    name: 'DesignCraft Publishing',
    upstreamName: 'DesignCraft',
    upstreamRepo: 'https://github.com/storytold/designcraft',
    category: 'Page Layout & Desktop Publishing',
    purpose: 'Multi-page spreads, master pages, baseline grids, linked text frames, preflight checks, and print-ready PDF/IDML publishing.',
    pinnedCommit: '98d8016001f4fc76ff4c2c0e657a17d475619968',
    pinnedTag: 'v0.15.2',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'partially tested',
    editorUrl: '/editors/designcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: null,
    nativeFormats: ['.dcp', '.idml'],
    importFormats: ['.dcp', '.idml', '.indd', '.png', '.jpg', '.svg'],
    exportFormats: ['.pdf', '.idml', '.png', '.dcp'],
    verifiedWorkflowSummary:
      'Verified WASM boot, spread canvas rendering, and document creation.',
    roleNotes: 'Uses storytold/indd-utils for InDesign (.indd / .idml) interchange.',
    accentColor: '#c95d82',
    iconKey: 'layout'
  },
  {
    id: 'pdfcraft',
    name: 'PdfCraft Reader & Editor',
    upstreamName: 'PdfCraft',
    upstreamRepo: 'https://github.com/storytold/pdfcraft',
    category: 'PDF Reading, Annotation & Forms',
    purpose: 'PDF viewing, text editing, page reordering, redaction, form filling, digital signatures, and PDF/A export.',
    pinnedCommit: 'eea00a6186f3bb64bd457dc3a4bfba1738b87368',
    pinnedTag: 'v0.16.1',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/pdfcraft/index.html?host=parent',
    supportsHostParentParam: true,
    windowApiGlobal: null,
    nativeFormats: ['.pdf'],
    importFormats: ['.pdf'],
    exportFormats: ['.pdf', '.png', '.txt'],
    verifiedWorkflowSummary:
      'Verified WASM boot and native ?host=parent postMessage integration (pdfcraft:ready, pdfcraft:open, pdfcraft:save).',
    roleNotes: 'Supports direct same-origin parent host message exchange.',
    accentColor: '#d9534f',
    iconKey: 'file-text'
  },
  {
    id: 'figcraft',
    name: 'FigCraft UI Design',
    upstreamName: 'FigCraft',
    upstreamRepo: 'https://github.com/storytold/figcraft',
    category: 'UI/UX Design & Prototyping',
    purpose: 'Auto-layout frames, reusable UI components, design tokens, interactive prototype noodles, and CSS/SVG inspection.',
    pinnedCommit: 'b0673ffc8bb09142c5c431f6a64d36e2c26cf23b',
    pinnedTag: 'v0.13.1',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/figcraft/index.html?control=1',
    supportsHostParentParam: false,
    windowApiGlobal: 'figcraft',
    nativeFormats: ['.figc', '.fig'],
    importFormats: ['.figc', '.fig', '.svg', '.png'],
    exportFormats: ['.svg', '.png', '.pdf', '.figc'],
    recommendedSampleAsset: 'mosaic-badge.svg',
    verifiedWorkflowSummary:
      'Verified WASM boot, window.figcraft automation API (execute, inspect, openFile), and canvas frame creation.',
    roleNotes: 'Full programmatic inspection and command execution via window.figcraft.',
    accentColor: '#8b6cd9',
    iconKey: 'figma'
  },
  {
    id: 'wordcraft',
    name: 'WordCraft Documents',
    upstreamName: 'WordCraft',
    upstreamRepo: 'https://github.com/storytold/wordcraft',
    category: 'Word Processing & Long-Form Documents',
    purpose: 'Styled documents, headings, tables, footnotes, track changes, citations, and DOCX/ODT/PDF/Markdown export.',
    pinnedCommit: '6e0f7e79edf21eb280d6dfcc7994e34479263864',
    pinnedTag: 'v0.13.2',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/wordcraft/index.html?host=parent',
    supportsHostParentParam: true,
    windowApiGlobal: null,
    nativeFormats: ['.docx', '.wcd', '.md'],
    importFormats: ['.docx', '.odt', '.md', '.txt', '.rtf'],
    exportFormats: ['.docx', '.pdf', '.md', '.txt', '.html'],
    verifiedWorkflowSummary:
      'Verified WASM boot and native ?host=parent postMessage integration (wordcraft:ready, wordcraft:open, wordcraft:save).',
    roleNotes: 'Supports native ?host=parent postMessage document save/open.',
    accentColor: '#4a7cc7',
    iconKey: 'type'
  },
  {
    id: 'soundcraft',
    name: 'SoundCraft Audio Studio',
    upstreamName: 'SoundCraft',
    upstreamRepo: 'https://github.com/storytold/soundcraft',
    category: 'Waveform & Multitrack Audio Editing',
    purpose: 'Destructive waveform editing and non-destructive multitrack mixing, spectral display, EQ/dynamics, and WAV/FLAC/MP3 export.',
    pinnedCommit: '85ffa1f53eb65626cd777e7129f61717b43fa322',
    pinnedTag: 'v0.15.0',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'partially tested',
    editorUrl: '/editors/soundcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: null,
    nativeFormats: ['.scaudio', '.wav'],
    importFormats: ['.wav', '.mp3', '.flac', '.ogg', '.m4a'],
    exportFormats: ['.wav', '.flac', '.mp3', '.ogg'],
    recommendedSampleAsset: 'mosaic-tone.wav',
    verifiedWorkflowSummary:
      'Verified WASM boot and loading self-generated 440Hz WAV audio via synthetic canvas drop bridge.',
    roleNotes: 'Uses WebAudio API and WASM DSP processing.',
    accentColor: '#3ea685',
    iconKey: 'music'
  },
  {
    id: 'deckcraft',
    name: 'DeckCraft Presentations',
    upstreamName: 'DeckCraft',
    upstreamRepo: 'https://github.com/storytold/deckcraft',
    category: 'Slide Decks & Presentations',
    purpose: 'Master slide layouts, speaker notes, slide transitions, vector diagrams, charts, and PPTX/PDF export.',
    pinnedCommit: '82573331a8a3ee948dfcb516b7aa332cb81b094e',
    pinnedTag: 'v0.13.1',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'partially tested',
    editorUrl: '/editors/deckcraft/index.html',
    supportsHostParentParam: false,
    windowApiGlobal: null,
    nativeFormats: ['.pptx', '.dck'],
    importFormats: ['.pptx', '.dck', '.png', '.svg'],
    exportFormats: ['.pptx', '.pdf', '.png'],
    verifiedWorkflowSummary:
      'Verified WASM boot, slide deck canvas initialization, and download capture.',
    roleNotes: 'Reads and exports PPTX and PDF presentation decks.',
    accentColor: '#d97a46',
    iconKey: 'presentation'
  },
  {
    id: 'gridcraft',
    name: 'GridCraft Spreadsheets',
    upstreamName: 'GridCraft',
    upstreamRepo: 'https://github.com/storytold/gridcraft',
    category: 'Spreadsheets & Formula Modeling',
    purpose: 'Formula calculation engine, pivot tables, conditional formatting, charts, CSV/XLSX import, and XLSX/CSV/PDF export.',
    pinnedCommit: 'a85b1aea3a634ff6742705d198a3811be5d8e52d',
    pinnedTag: 'v0.14.2',
    licenseDeclared: 'MIT OR Apache-2.0',
    licenseSelected: 'MIT',
    integrationLevel: 'integrated',
    verificationStatus: 'tested',
    editorUrl: '/editors/gridcraft/index.html?host=parent',
    supportsHostParentParam: true,
    windowApiGlobal: null,
    nativeFormats: ['.xlsx', '.csv'],
    importFormats: ['.xlsx', '.csv', '.tsv', '.ods'],
    exportFormats: ['.xlsx', '.csv', '.pdf'],
    verifiedWorkflowSummary:
      'Verified WASM boot and native ?host=parent postMessage integration (gridcraft:ready, gridcraft:open, gridcraft:save).',
    roleNotes: 'Supports native ?host=parent postMessage workbook open/save.',
    accentColor: '#3a9668',
    iconKey: 'table'
  },
  {
    id: 'fieldcraft',
    name: 'FieldCraft Implicit Modeling',
    upstreamName: 'FieldCraft',
    upstreamRepo: 'https://github.com/tangency-labs/fieldcraft',
    category: 'Implicit Field & Lattice Modeling (Source Checked Out)',
    purpose: 'Implicit signed-distance-field (SDF) modeling, gyroid/TPMS lattices, and generative topology workflows.',
    pinnedCommit: '6d9d17ea6f5e0c2596ef9e7fc2efbe459e307d34',
    pinnedTag: 'v0.7.0',
    licenseDeclared: 'MIT',
    licenseSelected: 'MIT',
    integrationLevel: 'source-only',
    verificationStatus: 'not tested',
    editorUrl: null,
    supportsHostParentParam: false,
    windowApiGlobal: 'fieldcraft',
    nativeFormats: ['.fc'],
    importFormats: ['.fc', '.stl'],
    exportFormats: ['.stl', '.obj'],
    verifiedWorkflowSummary:
      'Source repository is checked out and pinned at upstream/fieldcraft (6d9d17ea6f). Upstream v0.7.0 only published desktop binaries and no prebuilt web artifact; local Trunk WASM compilation is available on demand.',
    roleNotes:
      'Marked transparently as Source Checked Out (Not Built into Live Web Bundle) rather than faking a UI.',
    accentColor: '#7a869a',
    iconKey: 'cpu'
  }
];

// Checkout pins are read from the tracked lock, rather than duplicated display-only SHAs.
// Legacy capability copy is retained above for compatibility; current launch metadata is bounded by evidence here.
const CURRENT_WORKSPACES: WorkspaceSpec[] = [
  {
    id: 'music', name: 'Music Studio', upstreamName: 'Waveform Playlist',
    upstreamRepo: 'https://github.com/naomiaro/waveform-playlist', category: 'Multitrack audio',
    purpose: 'Import and arrange audio, record a microphone track, mix, save a project, and export WAV.',
    pinnedCommit: 'd620a1d202b8033ec038b8c87cd307c3d7d2557b', pinnedTag: '@waveform-playlist/browser@16.0.1',
    licenseDeclared: 'MIT', licenseSelected: 'MIT', integrationLevel: 'integrated', verificationStatus: 'partially tested',
    editorUrl: '/?tool=music', supportsHostParentParam: false, windowApiGlobal: null,
    nativeFormats: ['.omnimusic'], importFormats: ['.wav', '.mp3', '.ogg', '.m4a', '.omnimusic'], exportFormats: ['.wav', '.omnimusic'],
    verifiedWorkflowSummary: 'Verified in Chrome: import two WAV files, arrange clips, set mixer controls, save/reopen, record injected microphone audio with upstream AudioWorklets, portable project backup, and stereo WAV export. Physical microphone and cross-browser tests remain pending.',
    roleNotes: 'Waveform Playlist and Tone.js provide editing, playback, microphone capture and WAV export. OmniCraft adds local project storage and a portable backup format.',
    accentColor: '#225bcc', iconKey: 'music'
  },
  ...REGISTERED_WORKSPACES.map((workspace): WorkspaceSpec => {
    if (workspace.id === 'riverstudio') return {
      ...workspace, name: 'Recording Studio', upstreamName: 'OmniCraft browser recorder', upstreamRepo: '', pinnedCommit: 'local-source', pinnedTag: '',
      category: 'Screen and camera capture', editorUrl: '/?tool=recorder',
      purpose: 'Capture separate screen and camera files with detected MP4 or WebM encoders and incremental local storage.',
      nativeFormats: ['.json'], importFormats: [], exportFormats: ['.mp4 (when supported)', '.webm', '.m4a or .webm audio', '.json'],
      verificationStatus: 'partially tested', windowApiGlobal: null,
      verifiedWorkflowSummary: '62-second automated synthetic-stream test: distinct playable videos, real audio routing, measured alignment, save/reload, pause/resume, denial, source-ended, storage pressure and interruption recovery. A later 20-minute 640×360 synthetic-stream MP4 test also passed. Physical-device and cross-browser tests remain pending.',
      roleNotes: 'Original MediaRecorder adapter using platform capture APIs. No simulated capture fallback. Microphone audio goes to camera plus separate audio; shared-source audio goes to screen.'
    };
    const source = upstreamLock.repositories.find(repo => repo.id === workspace.id);
    if (source) return {
      ...workspace, pinnedCommit: source.pinnedCommit || '', licenseDeclared: source.declaredLicense,
      licenseSelected: source.selectedLicense, verificationStatus: ['solidcraft', 'filmcraft'].includes(workspace.id) ? 'partially tested' : 'not tested',
      windowApiGlobal: workspace.id === 'soundcraft' ? null : workspace.windowApiGlobal,
      editorUrl: workspace.id === 'solidcraft' ? '/editors/solidcraft/workspace.html' : workspace.editorUrl,
      verifiedWorkflowSummary: workspace.id === 'soundcraft' ? 'Built from the pinned official source and the actual web runner starts. No JavaScript command API is exposed by this upstream app. Its import/edit/export workflow and native-only microphone capture remain separate limitations; use Music for the verified browser audio workflow.' : workspace.id === 'solidcraft' ? 'Verified real engine: create a plate with five bores, save/reopen native SC, export STEP/STL, independently measure STL geometry. Source-built release engine with a reviewed host-chrome overlay. Model UI dimension edits, undo/redo, native reopening and STEP/STL measurements passed; cross-browser checks remain pending.' : workspace.id === 'filmcraft' ? 'Verified real editor: import MP4, create a sequence, split clips, save and reopen a native project. A separate four-second H.264/AAC MP4 render completed and independently decoded with ffmpeg. Longer timelines and cross-browser exports remain unverified.' : source.status === 'integrated' ? 'Upstream WASM bundle retained. Workflow verification is being rerun; a loaded interface alone does not establish export support.' : 'Pinned source retained; no browser bundle is integrated.'
    };
    return { ...workspace, upstreamRepo: '', upstreamName: 'Local experimental tool', pinnedCommit: 'local-source',
      verificationStatus: 'not tested', purpose: 'Existing local experimental editor retained for evaluation.',
      verifiedWorkflowSummary: 'Local prototype, separate from the upstream ArtCraft applications. Listed formats and controls are not accepted workflow evidence.',
      roleNotes: 'Preserved existing source. Requires individual workflow and export verification.' };
  })
];

// Product workspace names are separate from the upstream identity, license and formats.
const WORKSPACE_NAMES: Record<string, string> = {
  riverstudio: 'Capture', solidcraft: 'Model', filmcraft: 'Cut', effectcraft: 'Motion',
  photocraft: 'Photo', lightcraft: 'Develop', vectorcraft: 'Vector', designcraft: 'Layout',
  soundcraft: 'Audio', music: 'Music', cadcraft: 'Draft', fieldcraft: 'Field',
  pdfcraft: 'PDF', figcraft: 'Interface', wordcraft: 'Write', gridcraft: 'Sheets', deckcraft: 'Present',
  studiocut: 'Scene sketch', bandforge: 'Loop sketch', flstudio: 'Beat sketch'
};
export const WORKSPACES: WorkspaceSpec[] = CURRENT_WORKSPACES.map(workspace => ({ ...workspace, name: WORKSPACE_NAMES[workspace.id] || workspace.name }));

export interface BlockedRepoSpec {
  id: string;
  name: string;
  upstreamRepo: string;
  category: string;
  licenseDeclared: string;
  status: 'blocked';
  reason: string;
}

export const BLOCKED_REPOSITORIES: BlockedRepoSpec[] = [
  {
    id: 'pcbcraft',
    name: 'PCBCraft',
    upstreamRepo: 'https://github.com/tangency-labs/pcbcraft',
    category: 'Electronic Schematic & PCB Layout',
    licenseDeclared: 'GPL-3.0',
    status: 'blocked',
    reason:
      'Licensed under strong copyleft GNU General Public License v3.0 (GPL-3.0). Excluded from checkout and distribution to keep this distribution within its selected permissive-license scope.'
  },
  {
    id: 'anicraft',
    name: 'AniCraft',
    upstreamRepo: 'https://github.com/storytold/AniCraft',
    category: '2D Animation (Unpublished Stub)',
    licenseDeclared: 'None',
    status: 'blocked',
    reason:
      'Upstream GitHub repository is empty (0 commits, 0 KB, no source or license file as of 2026-10-31).'
  }
];
