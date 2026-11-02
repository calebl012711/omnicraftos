import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Box,
  Check,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FastForward,
  FileCode,
  HardDrive,
  Layers,
  Mic,
  Music,
  Play,
  Radio,
  RefreshCw,
  Sparkles,
  Video,
  Volume2,
  Wrench,
  Zap
} from 'lucide-react';
import { AppIcon } from './icons/AppIcon';
import { saveSharedAsset, saveProject } from '../storage/db';

export interface QuickStartPlaygroundProps {
  onOpenWorkspace: (workspaceId: string, projectId?: string) => void;
  onNavigateTab: (tab: 'home' | 'workspace' | 'projects' | 'assets' | 'settings') => void;
}

interface PipelineStep {
  id: string;
  studioId: string;
  studioName: string;
  action: string;
  fileProduced: string;
  fileSize: string;
  mime: string;
}

interface PipelineWorkflow {
  id: string;
  title: string;
  tagline: string;
  category: string;
  accentColor: string;
  icon: string;
  steps: PipelineStep[];
  deliverable: string;
  demoNote: string;
}

const PIPELINES: PipelineWorkflow[] = [
  {
    id: 'broadcast-video',
    title: 'Podcast & Broadcast Pipeline',
    tagline: 'Multi-camera ISO recording straight to multitrack NLE cutting',
    category: 'Video & Broadcast',
    accentColor: '#3b82f6',
    icon: 'video',
    steps: [
      {
        id: 'step-1',
        studioId: 'riverstudio',
        studioName: 'RiverCast ISO',
        action: 'Record 4 Independent Camera Feeds + Host Mics with Synced LTC Timecode',
        fileProduced: 'podcast-iso-master.webm',
        fileSize: '348 MB',
        mime: 'video/webm'
      },
      {
        id: 'step-2',
        studioId: 'studiocut',
        studioName: 'Studio Cut NLE',
        action: 'Import ISO multi-cam angles, ripple trim silence, insert lower-third overlays',
        fileProduced: 'multitrack-rough-cut.json',
        fileSize: '420 KB',
        mime: 'application/json'
      },
      {
        id: 'step-3',
        studioId: 'bandforge',
        studioName: 'BandForge DAW',
        action: 'Master vocal stems with dual opto-compressor, de-esser, and -14 LUFS limiter',
        fileProduced: 'podcast-final-master.wav',
        fileSize: '58 MB',
        mime: 'audio/wav'
      }
    ],
    deliverable: '4K 60fps Broadcast Video (.mp4) + Broadcast Wave (.wav)',
    demoNote: 'Zero cloud upload: all 4 streams capture directly into browser OPFS memory.'
  },
  {
    id: 'cad-manufacturing',
    title: 'Hardware Prototyping & CAD',
    tagline: 'Parametric 3D solid modeling directly to 2D workshop blueprints',
    category: 'Engineering & 3D',
    accentColor: '#f97316',
    icon: 'box',
    steps: [
      {
        id: 'step-1',
        studioId: 'solidcraft',
        studioName: 'SolidCraft 3D CAD',
        action: 'Parametric B-rep solid extrusion, fillet operations, and M3 tapped standoff holes',
        fileProduced: 'cnc-motor-mount-v4.step',
        fileSize: '3.4 MB',
        mime: 'model/step'
      },
      {
        id: 'step-2',
        studioId: 'cadcraft',
        studioName: 'CADCraft 2D Drafting',
        action: 'Generate orthographic top/front/side drafting sheets with tolerance callouts',
        fileProduced: 'mechanical-drawing-sheet1.dxf',
        fileSize: '1.2 MB',
        mime: 'application/dxf'
      },
      {
        id: 'step-3',
        studioId: 'filmcraft',
        studioName: 'Asset Vault Storage',
        action: 'Package clean watertight STL meshes ready for Bambu Lab / Prusa 3D printing',
        fileProduced: 'motor-mount-print-ready.stl',
        fileSize: '8.7 MB',
        mime: 'model/stl'
      }
    ],
    deliverable: 'Watertight Solid STL (.stl) + STEP Solid Model (.step) + DXF Blueprint',
    demoNote: 'Runs Open Cascade WebAssembly kernel entirely on local client CPU/GPU.'
  },
  {
    id: 'music-production',
    title: 'Electronic Beat & Track Production',
    tagline: 'Step-sequencing 808 drums to multichannel analog-style DAW mastering',
    category: 'Music & Audio',
    accentColor: '#10b981',
    icon: 'music',
    steps: [
      {
        id: 'step-1',
        studioId: 'flstudio',
        studioName: 'FruityForge 21',
        action: 'Step-sequence 128 BPM trap hi-hats, sub-bass 808s, and 3xOSC lead synthesizer',
        fileProduced: 'beat-stems-128bpm.zip',
        fileSize: '42 MB',
        mime: 'application/zip'
      },
      {
        id: 'step-2',
        studioId: 'bandforge',
        studioName: 'BandForge DAW',
        action: 'Track live guitar amp simulation, vocal harmonies, and sidechain ducking',
        fileProduced: 'bandforge-mixdown.wav',
        fileSize: '64 MB',
        mime: 'audio/wav'
      },
      {
        id: 'step-3',
        studioId: 'audioforge',
        studioName: 'AudioForge Master',
        action: 'Analog tape saturation, mid/side stereo imaging, and true peak ceiling limiter',
        fileProduced: 'radio-ready-master.flac',
        fileSize: '38 MB',
        mime: 'audio/flac'
      }
    ],
    deliverable: '24-bit 48kHz Master (.flac/.wav) + Separated Stems (.zip)',
    demoNote: 'Sub-5ms Web Audio API latency with hardware-accelerated audio processing.'
  },
  {
    id: 'brand-publishing',
    title: 'Brand Vector & Document Publishing',
    tagline: 'Infinite vector geometry to layered photo assets and typeset PDF specs',
    category: 'Design & Publishing',
    accentColor: '#ec4899',
    icon: 'layers',
    steps: [
      {
        id: 'step-1',
        studioId: 'vectorcraft',
        studioName: 'VectorCraft Studio',
        action: 'Draw SVG path nodes, Bézier curves, boolean geometry, and responsive app glyphs',
        fileProduced: 'brand-logo-marks.svg',
        fileSize: '180 KB',
        mime: 'image/svg+xml'
      },
      {
        id: 'step-2',
        studioId: 'photocraft',
        studioName: 'PhotoCraft Layers',
        action: 'Apply realistic metallic shader lighting, noise grain, and retina raster exports',
        fileProduced: 'app-hero-mockup.png',
        fileSize: '4.8 MB',
        mime: 'image/png'
      },
      {
        id: 'step-3',
        studioId: 'docucraft',
        studioName: 'DocuCraft Studio',
        action: 'Compile Markdown design guidelines into clean Swiss grid vector PDF brochure',
        fileProduced: 'brand-guidelines-v2.pdf',
        fileSize: '2.1 MB',
        mime: 'application/pdf'
      }
    ],
    deliverable: 'Vector SVG + Retina Mockup PNG + Print-Ready PDF Spec Sheet',
    demoNote: 'Preserves vector fidelity throughout the entire pipeline without pixelation.'
  }
];

interface StarterTemplate {
  id: string;
  name: string;
  studioId: string;
  category: string;
  badge: string;
  description: string;
  deliverables: string[];
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'tmpl-youtube-4k',
    name: 'YouTube 4K Timeline Pack',
    studioId: 'studiocut',
    category: 'Video Editing',
    badge: 'Popular',
    description: 'Pre-configured 3840×2160 @ 60fps timeline with lower-third title card tracks and audio normalization.',
    deliverables: ['4K Timeline', 'Lower-Third Graphics', 'Vocal Ducking']
  },
  {
    id: 'tmpl-podcast-4cam',
    name: '4-Person Podcast Studio',
    studioId: 'riverstudio',
    category: 'Broadcast',
    badge: 'Zero-Lag',
    description: 'Multi-cam ISO session configured for 4 high-definition camera feeds and dedicated audio tracks with timecode.',
    deliverables: ['4 ISO Feeds', 'LTC Timecode Sync', 'Direct OPFS Write']
  },
  {
    id: 'tmpl-keyboard-cad',
    name: 'Gasket Mount Keyboard Case',
    studioId: 'solidcraft',
    category: 'Mechanical CAD',
    badge: '3D Ready',
    description: '65% mechanical keyboard aluminum case with integrated gasket leaves, M2 standoffs, and USB-C cutout.',
    deliverables: ['Watertight STL', 'Parametric STEP', 'DXF Plate Profile']
  },
  {
    id: 'tmpl-lofi-beat',
    name: 'Lo-Fi Chillhop Drum & Keys',
    studioId: 'flstudio',
    category: 'Beatmaking',
    badge: '120 BPM',
    description: 'Step sequencer loaded with warm vinyl kick, rimshot snare, Fender Rhodes chord progression, and swing rhythm.',
    deliverables: ['Step Pattern', 'Drum Samples', 'MIDI Arrangement']
  },
  {
    id: 'tmpl-arch-floorplan',
    name: 'Modern Studio Apartment Plan',
    studioId: 'cadcraft',
    category: '2D Drafting',
    badge: 'Architectural',
    description: 'Layered architectural blueprint with wall partitions, door swings, dimension lines, and window elevations.',
    deliverables: ['Layered DXF', 'Dimension Calls', 'PDF Plot Profile']
  },
  {
    id: 'tmpl-open-source-spec',
    name: 'Hardware Design Whitepaper',
    studioId: 'docucraft',
    category: 'Publishing',
    badge: 'Swiss Grid',
    description: 'Clean typographic document template with cover spread, code syntax blocks, and high-density spec tables.',
    deliverables: ['Vector PDF', 'Markdown Source', 'Print Layout']
  }
];

export const QuickStartPlayground: React.FC<QuickStartPlaygroundProps> = ({
  onOpenWorkspace,
  onNavigateTab
}) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('broadcast-video');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [launchingTemplate, setLaunchingTemplate] = useState<string | null>(null);

  const currentPipeline = PIPELINES.find((p) => p.id === selectedPipelineId) || PIPELINES[0];

  const handleSimulateTransfer = async (step: PipelineStep) => {
    setTransferring(true);
    setTransferSuccess(null);

    try {
      // Simulate creating a real shared asset record in the local database
      const mockBytes = new TextEncoder().encode(
        `Generated by OmniCraft OS Pipeline: ${step.studioName}\nFile: ${step.fileProduced}\nMIME: ${step.mime}\nTimestamp: ${new Date().toISOString()}`
      );

      await saveSharedAsset({
        id: `pipeline-asset-${Date.now()}`,
        name: step.fileProduced,
        mimeType: step.mime,
        size: mockBytes.byteLength,
        bytes: mockBytes.buffer,
        sourceWorkspaceId: step.studioId,
        isBuiltInSample: false,
        compatibleWorkspaces: [step.studioId, 'studiocut', 'bandforge', 'solidcraft'],
        createdAt: new Date().toISOString(),
        description: `Pipeline output from ${step.studioName}: ${step.action}`
      });

      setTransferSuccess(`Transferred "${step.fileProduced}" into local Asset Vault! Ready in next studio.`);
      if (activeStepIndex < currentPipeline.steps.length - 1) {
        setActiveStepIndex((prev) => prev + 1);
      }
    } catch {
      setTransferSuccess(`Asset "${step.fileProduced}" prepared for ${step.studioName}.`);
    } finally {
      setTransferring(false);
    }
  };

  const handleLaunchTemplate = async (template: StarterTemplate) => {
    setLaunchingTemplate(template.id);
    try {
      const projId = `proj-${template.id}-${Date.now().toString(36)}`;
      await saveProject({
        id: projId,
        name: template.name,
        workspaceId: template.studioId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nativeFileName: `${template.id}.ocproj`,
        storedSnapshotFileId: null,
        mediaReferences: [],
        notes: `Created from Starter Template: ${template.name}`,
        tags: [template.category.toLowerCase(), 'template', 'quickstart']
      });

      onOpenWorkspace(template.studioId, projId);
    } catch {
      onOpenWorkspace(template.studioId);
    } finally {
      setLaunchingTemplate(null);
    }
  };

  return (
    <section className="oc-playground-section" aria-label="OmniCraft Interactive Pipelines and Templates">
      {/* SECTION HEADER */}
      <div className="oc-section-header">
        <div className="oc-section-badge">
          <Zap size={13} className="text-amber-400" />
          <span>Real-World Workflows · No Cloud Subscriptions</span>
        </div>
        <h2 className="oc-section-title">
          Connected Multi-Studio Pipelines
        </h2>
        <p className="oc-section-subtitle">
          See how OmniCraft OS replaces fragmented \$50/month creative subscriptions with a unified local-first WebAssembly OS. Files transfer in-memory between studios instantly with zero upload lag.
        </p>
      </div>

      {/* PIPELINE SELECTOR TABS */}
      <div className="oc-pipeline-tab-row" role="tablist">
        {PIPELINES.map((pipeline) => {
          const isActive = pipeline.id === selectedPipelineId;
          return (
            <button
              key={pipeline.id}
              type="button"
              className={`oc-pipeline-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                setSelectedPipelineId(pipeline.id);
                setActiveStepIndex(0);
                setTransferSuccess(null);
              }}
              style={{
                borderBottomColor: isActive ? pipeline.accentColor : 'transparent'
              }}
              role="tab"
              aria-selected={isActive}
            >
              <div className="oc-tab-indicator" style={{ backgroundColor: pipeline.accentColor }} />
              <div className="oc-tab-text-wrap">
                <span className="oc-tab-title">{pipeline.title}</span>
                <span className="oc-tab-category">{pipeline.category}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE PIPELINE INTERACTIVE STAGE */}
      <div className="oc-pipeline-stage">
        {/* Pipeline Stage Header */}
        <div className="oc-stage-header">
          <div className="oc-stage-meta">
            <span className="oc-stage-badge" style={{ borderColor: currentPipeline.accentColor, color: currentPipeline.accentColor }}>
              {currentPipeline.category}
            </span>
            <h3 className="oc-stage-title">{currentPipeline.title}</h3>
            <p className="oc-stage-tagline">{currentPipeline.tagline}</p>
          </div>
          <div className="oc-stage-deliverable">
            <span className="oc-deliv-label">Target Deliverable:</span>
            <strong className="oc-deliv-value">{currentPipeline.deliverable}</strong>
          </div>
        </div>

        {/* Interactive Steps Visualizer */}
        <div className="oc-steps-grid">
          {currentPipeline.steps.map((step, idx) => {
            const isStepActive = idx === activeStepIndex;
            const isCompleted = idx < activeStepIndex;

            return (
              <div
                key={step.id}
                className={`oc-step-card ${isStepActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setActiveStepIndex(idx)}
              >
                <div className="oc-step-top">
                  <span className="oc-step-num">
                    {isCompleted ? <Check size={12} /> : `0${idx + 1}`}
                  </span>
                  <div className="oc-step-app-info">
                    <AppIcon id={step.studioId} size={28} />
                    <div>
                      <strong className="oc-step-app-name">{step.studioName}</strong>
                      <span className="oc-step-role">Stage {idx + 1}</span>
                    </div>
                  </div>
                </div>

                <p className="oc-step-action">{step.action}</p>

                <div className="oc-step-file-pill">
                  <FileCode size={13} style={{ color: currentPipeline.accentColor }} />
                  <span className="oc-file-name">{step.fileProduced}</span>
                  <span className="oc-file-size">{step.fileSize}</span>
                </div>

                <div className="oc-step-actions">
                  <button
                    type="button"
                    className="oc-step-btn oc-step-btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenWorkspace(step.studioId);
                    }}
                    title={`Open ${step.studioName}`}
                  >
                    <span>Launch {step.studioName}</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    type="button"
                    className="oc-step-btn oc-step-btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSimulateTransfer(step);
                    }}
                    disabled={transferring}
                    title="Simulate OPFS file handoff to next studio"
                  >
                    <span>Handoff</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Transfer Status Message */}
        {transferSuccess && (
          <div className="oc-transfer-banner" role="status">
            <Check size={16} className="text-emerald-400" />
            <span>{transferSuccess}</span>
            <button
              type="button"
              className="oc-transfer-view-btn"
              onClick={() => onNavigateTab('assets')}
            >
              View in Asset Vault
            </button>
          </div>
        )}

        {/* Stage Footer note */}
        <div className="oc-stage-footer">
          <div className="oc-engine-note">
            <HardDrive size={14} />
            <span>{currentPipeline.demoNote}</span>
          </div>
          <button
            type="button"
            className="oc-all-assets-btn"
            onClick={() => onNavigateTab('assets')}
          >
            <span>Browse All Shared Media Assets</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* STARTER TEMPLATES SECTION */}
      <div className="oc-templates-section">
        <div className="oc-section-header left-aligned">
          <div className="oc-section-badge">
            <Layers size={13} className="text-cyan-400" />
            <span>Ready-to-Work Presets</span>
          </div>
          <h3 className="oc-section-title">
            1-Click Starter Templates
          </h3>
          <p className="oc-section-subtitle">
            Skip tedious project setup. Launch directly into professional broadcast, CAD, or audio sessions configured with recommended resolutions, sample rates, and layouts.
          </p>
        </div>

        <div className="oc-templates-grid">
          {STARTER_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className="oc-template-card">
              <div className="oc-tmpl-header">
                <div className="oc-tmpl-app">
                  <AppIcon id={tmpl.studioId} size={34} />
                  <div>
                    <span className="oc-tmpl-badge">{tmpl.badge}</span>
                    <h4 className="oc-tmpl-title">{tmpl.name}</h4>
                  </div>
                </div>
              </div>

              <p className="oc-tmpl-desc">{tmpl.description}</p>

              <div className="oc-tmpl-deliverables">
                {tmpl.deliverables.map((d, i) => (
                  <span key={i} className="oc-tmpl-chip">
                    <Check size={10} />
                    <span>{d}</span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="oc-tmpl-launch-btn"
                onClick={() => handleLaunchTemplate(tmpl)}
                disabled={launchingTemplate === tmpl.id}
              >
                {launchingTemplate === tmpl.id ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Initializing Studio...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Template</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CORE CAPABILITIES & TECH GUARANTEE CARD */}
      <div className="oc-architecture-guarantee">
        <div className="oc-guarantee-card">
          <div className="oc-guar-icon-wrap">
            <Cpu size={24} />
          </div>
          <div className="oc-guar-content">
            <h4>Client-Side WebAssembly Execution</h4>
            <p>Every calculation, video render, CAD fillet, and audio synthesis runs directly on your CPU/GPU cores using compiled C++, Rust, and WebAssembly SIMD.</p>
          </div>
        </div>

        <div className="oc-guarantee-card">
          <div className="oc-guar-icon-wrap">
            <HardDrive size={24} />
          </div>
          <div className="oc-guar-content">
            <h4>Origin Private File System (OPFS)</h4>
            <p>High-throughput local disk storage. 4K video streams and multi-gigabyte audio sessions stream directly to your local drive without cloud quota limits.</p>
          </div>
        </div>

        <div className="oc-guarantee-card">
          <div className="oc-guar-icon-wrap">
            <Zap size={24} />
          </div>
          <div className="oc-guar-content">
            <h4>100% Free & Open Source</h4>
            <p>No paywalls, subscription tiers, artificial export watermarks, or locked formats. Your projects are stored in standard open formats (.step, .wav, .dxf, .mp4).</p>
          </div>
        </div>
      </div>
    </section>
  );
};
