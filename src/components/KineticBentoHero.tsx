import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  HardDrive,
  Info,
  Layers,
  Lock,
  Maximize2,
  Mic,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCw,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  Video,
  Volume2,
  Zap
} from 'lucide-react';

export interface KineticBentoHeroProps {
  onOpenWorkspace: (workspaceId: string, projectId?: string) => void;
  onNavigateTab: (tab: 'home' | 'workspace' | 'projects' | 'assets' | 'settings') => void;
  onOpenShowcase?: (mode: 'brag' | 'master') => void;
  themeMode?: string;
  onToggleTheme?: () => void;
}

export const KineticBentoHero: React.FC<KineticBentoHeroProps> = ({
  onOpenWorkspace,
  onNavigateTab,
  onOpenShowcase,
  themeMode,
  onToggleTheme
}) => {
  // --- Shell Navigation & Modals ---
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // --- Tile 1: Multi-cam ISO state ---
  const [activeCam, setActiveCam] = useState<1 | 2 | 3 | 4>(1);
  const [timecodeSeconds, setTimecodeSeconds] = useState(2052); // starts at 00:34:12 (2052s)
  const [isRecording, setIsRecording] = useState(true);

  // Timecode counter tick
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setTimecodeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formattedTimecode = () => {
    const hours = Math.floor(timecodeSeconds / 3600);
    const minutes = Math.floor((timecodeSeconds % 3600) / 60);
    const seconds = timecodeSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Tile 2: 3D CAD Parametric Viewport state ---
  const cadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [yaw, setYaw] = useState<number>(35);
  const [pitch, setPitch] = useState<number>(-22);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const isDraggingCadRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 35, pitch: -22 });

  // 3D Wireframe rendering loop
  useEffect(() => {
    const canvas = cadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localYaw = yaw;
    let localPitch = pitch;

    const render = () => {
      if (autoRotate && !isDraggingCadRef.current) {
        localYaw = (localYaw + 0.45) % 360;
        setYaw(localYaw);
      } else {
        localYaw = yaw;
        localPitch = pitch;
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 8;
      const scale = Math.min(width, height) * 0.42;

      const radYaw = (localYaw * Math.PI) / 180;
      const radPitch = (localPitch * Math.PI) / 180;

      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);
      const cosP = Math.cos(radPitch);
      const sinP = Math.sin(radPitch);

      // 3D Projection helper
      const project = (x: number, y: number, z: number) => {
        // Rotate yaw around Y axis
        const x1 = x * cosY + z * sinY;
        const y1 = y;
        const z1 = -x * sinY + z * cosY;

        // Rotate pitch around X axis
        const x2 = x1;
        const y2 = y1 * cosP - z1 * sinP;
        const z2 = y1 * sinP + z1 * cosP;

        // Perspective camera
        const fov = 420;
        const dist = 380;
        const pz = dist + z2;
        const px = cx + (x2 * fov * scale) / pz;
        const py = cy + (y2 * fov * scale) / pz;
        return { px, py, pz, z2 };
      };

      // 1. Draw subtle background ground grid
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 4;
      const gridStep = 0.35;
      for (let i = -gridSize; i <= gridSize; i++) {
        const pA = project(i * gridStep, 0.55, -gridSize * gridStep);
        const pB = project(i * gridStep, 0.55, gridSize * gridStep);
        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.stroke();

        const pC = project(-gridSize * gridStep, 0.55, i * gridStep);
        const pD = project(gridSize * gridStep, 0.55, i * gridStep);
        ctx.beginPath();
        ctx.moveTo(pC.px, pC.py);
        ctx.lineTo(pD.px, pD.py);
        ctx.stroke();
      }

      // 2. Draw Drone Gimbal Orbital Ring (Green)
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ringSteps = 48;
      for (let i = 0; i <= ringSteps; i++) {
        const theta = (i / ringSteps) * Math.PI * 2;
        const rX = Math.cos(theta) * 0.95;
        const rZ = Math.sin(theta) * 0.95;
        const pt = project(rX, 0.3, rZ);
        if (i === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      }
      ctx.stroke();

      // Gimbal ring ticks / markers
      ctx.fillStyle = '#4ade80';
      for (let i = 0; i < 4; i++) {
        const theta = (i / 4) * Math.PI * 2;
        const pt = project(Math.cos(theta) * 0.95, 0.3, Math.sin(theta) * 0.95);
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Central Drone Chassis Wireframe
      const bodyWidth = 0.32;
      const bodyHeight = 0.16;
      const bodyDepth = 0.42;

      const bodyVertices = [
        [-bodyWidth, -bodyHeight, -bodyDepth],
        [bodyWidth, -bodyHeight, -bodyDepth],
        [bodyWidth, bodyHeight, -bodyDepth],
        [-bodyWidth, bodyHeight, -bodyDepth],
        [-bodyWidth, -bodyHeight, bodyDepth],
        [bodyWidth, -bodyHeight, bodyDepth],
        [bodyWidth, bodyHeight, bodyDepth],
        [-bodyWidth, bodyHeight, bodyDepth],
        // Camera nose cone
        [0, 0, bodyDepth + 0.22]
      ];

      const projectedBody = bodyVertices.map((v) => project(v[0], v[1], v[2]));

      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.25;
      const bodyEdges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // back face
        [4, 5], [5, 6], [6, 7], [7, 4], // front face
        [0, 4], [1, 5], [2, 6], [3, 7], // connecting edges
        [4, 8], [5, 8], [6, 8], [7, 8]  // nose gimbal cone
      ];

      ctx.beginPath();
      bodyEdges.forEach(([start, end]) => {
        ctx.moveTo(projectedBody[start].px, projectedBody[start].py);
        ctx.lineTo(projectedBody[end].px, projectedBody[end].py);
      });
      ctx.stroke();

      // 4. 4 Motor Arms & Rotors
      const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
      const armRadius = 0.78;

      armAngles.forEach((angle, idx) => {
        const armEndX = Math.cos(angle) * armRadius;
        const armEndZ = Math.sin(angle) * armRadius;

        // Draw arm beam
        const pArmStart = project(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2);
        const pArmEnd = project(armEndX, -0.05, armEndZ);

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pArmStart.px, pArmStart.py);
        ctx.lineTo(pArmEnd.px, pArmEnd.py);
        ctx.stroke();

        // Motor Hub cylinder
        const pMotorTop = project(armEndX, -0.2, armEndZ);
        const pMotorBottom = project(armEndX, 0.08, armEndZ);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pMotorTop.px, pMotorTop.py);
        ctx.lineTo(pMotorBottom.px, pMotorBottom.py);
        ctx.stroke();

        // Spinning Rotor Blade
        const propAngle = (Date.now() * 0.015 * (idx % 2 === 0 ? 1 : -1)) + idx;
        const propLen = 0.38;
        const propA = project(
          armEndX + Math.cos(propAngle) * propLen,
          -0.2,
          armEndZ + Math.sin(propAngle) * propLen
        );
        const propB = project(
          armEndX - Math.cos(propAngle) * propLen,
          -0.2,
          armEndZ - Math.sin(propAngle) * propLen
        );

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(propA.px, propA.py);
        ctx.lineTo(propB.px, propB.py);
        ctx.stroke();

        // Motor node dot
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pMotorTop.px, pMotorTop.py, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. 3D Axis Gizmo in Lower Left
      const gizmoOrigin = { px: 46, py: height - 42 };
      const gizmoLen = 22;

      // X axis (Red)
      const gX = {
        x: gizmoOrigin.px + cosY * gizmoLen,
        y: gizmoOrigin.py - sinP * sinY * gizmoLen
      };
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gizmoOrigin.px, gizmoOrigin.py);
      ctx.lineTo(gX.x, gX.y);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('X', gX.x + 3, gX.y + 3);

      // Y axis (Green)
      const gY = {
        x: gizmoOrigin.px,
        y: gizmoOrigin.py - cosP * gizmoLen
      };
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(gizmoOrigin.px, gizmoOrigin.py);
      ctx.lineTo(gY.x, gY.y);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.fillText('Y', gY.x - 2, gY.y - 4);

      // Z axis (Blue)
      const gZ = {
        x: gizmoOrigin.px + sinY * gizmoLen,
        y: gizmoOrigin.py + sinP * cosY * gizmoLen
      };
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(gizmoOrigin.px, gizmoOrigin.py);
      ctx.lineTo(gZ.x, gZ.y);
      ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('Z', gZ.x + 3, gZ.y + 3);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [yaw, pitch, autoRotate]);

  const handleCadMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingCadRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    startAnglesRef.current = { yaw, pitch };
  };

  const handleCadMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCadRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    setYaw((startAnglesRef.current.yaw + dx * 0.8) % 360);
    setPitch(Math.max(-80, Math.min(80, startAnglesRef.current.pitch + dy * 0.8)));
  };

  const handleCadMouseUp = () => {
    isDraggingCadRef.current = false;
  };

  // --- Tile 3: Tactile Audio Drum Sequencer Rack ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [activePadIndex, setActivePadIndex] = useState<number | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [spectrumLevels, setSpectrumLevels] = useState<number[]>([
    25, 45, 65, 85, 95, 75, 60, 40, 50, 70, 80, 55, 35, 60, 45, 30
  ]);

  const DRUM_PADS = [
    { id: 'kick', name: 'KICK 808', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)' },
    { id: 'snare', name: 'SNARE 909', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' },
    { id: 'hihat', name: 'HI-HAT CL', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)' },
    { id: 'clap', name: 'CLAP DUAL', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)' },
    { id: 'sub', name: 'SUB BASS', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)' },
    { id: 'synth', name: 'SYTRUS LEAD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.45)' },
    { id: 'tom', name: 'TOM PUNCH', color: '#fb923c', glow: 'rgba(251, 146, 60, 0.45)' },
    { id: 'rim', name: 'RIM CLICK', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)' }
  ];

  const playSynthesizedDrum = useCallback((padId: string, padIndex: number) => {
    setActivePadIndex(padIndex);
    setTimeout(() => setActivePadIndex((cur) => (cur === padIndex ? null : cur)), 140);

    // Dynamic spectrum flare
    setSpectrumLevels(
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 70 + 30))
    );

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (padId === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (padId === 'snare') {
        // Noise burst + tone
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        const osc = ctx.createOscillator();
        const toneGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(185, now);
        toneGain.gain.setValueAtTime(0.5, now);
        toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(toneGain);
        toneGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (padId === 'hihat') {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7500;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (padId === 'clap') {
        for (let burst = 0; burst < 3; burst++) {
          const t = now + burst * 0.012;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = 800 + Math.random() * 200;
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.05);
        }
      } else if (padId === 'sub') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      } else if (padId === 'synth') {
        const notes = [261.63, 329.63, 392.0, 523.25];
        const pitch = notes[Math.floor(Math.random() * notes.length)];
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (padId === 'tom') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      } else {
        // Rim click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1950, now);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Ignore user gesture constraints
    }
  }, []);

  // Sequencer auto-loop
  useEffect(() => {
    if (!isPlayingSequence) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % 8;
        // Trigger pad on specific steps
        const pattern = [0, 2, 4, 1, 6, 2, 5, 3];
        const padIdx = pattern[next];
        playSynthesizedDrum(DRUM_PADS[padIdx].id, padIdx);
        return next;
      });
    }, 220);
    return () => clearInterval(interval);
  }, [isPlayingSequence, playSynthesizedDrum]);

  // --- Tile 4: Instant Cross-App Asset Vault state ---
  const [benchmarking, setBenchmarking] = useState(false);
  const [latencyResult, setLatencyResult] = useState<string | null>(null);

  const runLatencyTest = () => {
    setBenchmarking(true);
    const t0 = performance.now();
    // Simulate real local memory bus data transfer
    const buf = new Uint8Array(1024 * 1024);
    for (let i = 0; i < buf.length; i += 256) {
      buf[i] = (i & 0xff);
    }
    const t1 = performance.now();
    const elapsed = Math.max(0.01, Number((t1 - t0).toFixed(3)));

    setTimeout(() => {
      setBenchmarking(false);
      setLatencyResult(`${elapsed}ms · 3.8 GB/s Bus · 0 Cloud Network Hops`);
    }, 450);
  };

  const copySuiteUrl = () => {
    navigator.clipboard?.writeText('omnicraft.os/suite');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <section className="mf-kinetic-bento-hero" aria-label="OmniCraft Hero">
      {/* 1. BROWSER VIEWPORT SHELL */}
      <div className="mf-browser-viewport-shell">
        {/* Top Window Bar */}
        <div className="mf-browser-window-bar">
          <div className="mf-browser-dots" aria-hidden="true">
            <span className="mf-dot mf-dot-red" />
            <span className="mf-dot mf-dot-yellow" />
            <span className="mf-dot mf-dot-green" />
          </div>

          <div className="mf-browser-history-controls" aria-hidden="true">
            <button type="button" className="mf-shell-icon-btn" title="Back">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="mf-shell-icon-btn" title="Forward">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Centered URL Address Bar */}
          <div className="mf-browser-url-pill" onClick={copySuiteUrl} title="Copy OmniCraft Address">
            <Lock size={12} className="mf-url-lock-icon" />
            <span className="mf-url-text">omnicraft.os/suite</span>
            {copiedUrl ? (
              <Check size={12} className="mf-url-copy-icon" style={{ color: '#10b981' }} />
            ) : (
              <RefreshCw size={12} className="mf-url-refresh-icon" />
            )}
          </div>

          <div className="mf-browser-actions">
            <button
              type="button"
              className="mf-shell-icon-btn"
              title="Share"
              onClick={copySuiteUrl}
            >
              <Share2 size={13} />
            </button>
            <button
              type="button"
              className="mf-shell-icon-btn"
              title="Toggle Theme"
              onClick={onToggleTheme}
            >
              <Sparkles size={13} />
            </button>
          </div>
        </div>

        {/* Clean Minimalist Navigation Bar */}
        <header className="mf-shell-navbar">
          <div className="mf-shell-brand" onClick={() => onNavigateTab('home')}>
            {/* Hexagonal Aperture Logo */}
            <svg
              className="mf-omnicraft-logo-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
              <line x1="9.69" y1="8" x2="21.17" y2="8" />
              <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
              <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
              <line x1="14.31" y1="16" x2="2.83" y2="16" />
              <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
            </svg>
            <span className="mf-omnicraft-brand-text">OmniCraft</span>
          </div>

          <nav className="mf-shell-nav-links" aria-label="OmniCraft Navigation">
            <a
              href="#studios-catalog"
              className="mf-shell-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('studios-catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Suite
            </a>
            <button
              type="button"
              className="mf-shell-nav-link"
              onClick={() => onNavigateTab('projects')}
            >
              Workflows
            </button>
            <button
              type="button"
              className="mf-shell-nav-link"
              onClick={() => setShowPerformanceModal(true)}
            >
              Performance
            </button>
            <button
              type="button"
              className="mf-shell-nav-link"
              onClick={() => setShowDocsModal(true)}
            >
              Docs
            </button>
          </nav>

          <div className="mf-shell-cta-cluster">
            <button
              type="button"
              className="mf-shell-btn-secondary"
              onClick={() => {
                document.getElementById('studios-catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Launch Web
            </button>
            <button
              type="button"
              className="mf-shell-btn-primary"
              onClick={() => onNavigateTab('projects')}
              data-testid="omnicraft-download-btn"
            >
              Download Now
            </button>
          </div>
        </header>

        {/* 2. DOMINANT HEADLINE & SUBTITLE */}
        <div className="mf-hero-statement-section">
          <h1 className="mf-dominant-headline">
            The Desktop Suite That<br />
            Doesn’t Touch The Cloud
          </h1>
          <p className="mf-dominant-subtitle">
            Built for power, designed for privacy. OmniCraft brings professional-grade workflows entirely local.
          </p>
        </div>

        {/* 3. INTERACTIVE 4-QUADRANT BENTO GRID */}
        <div className="mf-bento-grid">
          {/* TILE 1: Broadcast ISO Multi-Cam Video UI */}
          <article className="mf-bento-tile mf-tile-broadcast" data-testid="bento-tile-rivercast">
            <div className="mf-tile-header">
              <span className="mf-tile-title">Broadcast ISO multi-cam video UI</span>
              <span className="mf-live-badge">
                <span className="mf-live-dot" />
                LIVE
              </span>
            </div>

            {/* 2x2 Multi-Cam Switching Grid */}
            <div className="mf-multicam-grid">
              {/* CAM 1 */}
              <div
                className={`mf-cam-cell ${activeCam === 1 ? 'active' : ''}`}
                onClick={() => setActiveCam(1)}
                role="button"
                tabIndex={0}
                title="Switch to CAM 1"
              >
                <div className="mf-cam-badge">CAM 1</div>
                <div className="mf-cam-mock-feed cam-feed-1">
                  <div className="mf-feed-avatar-silhouette host-silhouette" />
                  <div className="mf-feed-scanlines" />
                </div>
                {activeCam === 1 && <span className="mf-cam-active-tag">TALLY 1</span>}
              </div>

              {/* CAM 2 */}
              <div
                className={`mf-cam-cell ${activeCam === 2 ? 'active' : ''}`}
                onClick={() => setActiveCam(2)}
                role="button"
                tabIndex={0}
                title="Switch to CAM 2"
              >
                <div className="mf-cam-badge">CAM 2</div>
                <div className="mf-cam-mock-feed cam-feed-2">
                  <div className="mf-feed-avatar-silhouette cohost-silhouette" />
                  <div className="mf-feed-scanlines" />
                </div>
                {activeCam === 2 && <span className="mf-cam-active-tag">TALLY 2</span>}
              </div>

              {/* CAM 3 */}
              <div
                className={`mf-cam-cell ${activeCam === 3 ? 'active' : ''}`}
                onClick={() => setActiveCam(3)}
                role="button"
                tabIndex={0}
                title="Switch to CAM 3"
              >
                <div className="mf-cam-badge">CAM 3</div>
                <div className="mf-cam-mock-feed cam-feed-3">
                  <div className="mf-feed-avatar-silhouette screen-silhouette" />
                  <div className="mf-feed-scanlines" />
                </div>
                {activeCam === 3 && <span className="mf-cam-active-tag">TALLY 3</span>}
              </div>

              {/* CAM 4 */}
              <div
                className={`mf-cam-cell ${activeCam === 4 ? 'active' : ''}`}
                onClick={() => setActiveCam(4)}
                role="button"
                tabIndex={0}
                title="Switch to CAM 4"
              >
                <div className="mf-cam-badge">CAM 4</div>
                <div className="mf-cam-mock-feed cam-feed-4">
                  <div className="mf-feed-avatar-silhouette desk-silhouette" />
                  <div className="mf-feed-scanlines" />
                </div>
                {activeCam === 4 && <span className="mf-cam-active-tag">TALLY 4</span>}
              </div>
            </div>

            {/* Audio Waveform Visualizer */}
            <div className="mf-waveform-container" aria-label="Live Audio Waveform Visualizer">
              <div className="mf-waveform-bars">
                {[
                  12, 28, 48, 80, 52, 90, 64, 40, 72, 98, 42, 60, 85, 30, 45, 95, 70, 50, 32,
                  65, 88, 55, 38, 76, 92, 44, 25, 60, 80, 50, 35, 20
                ].map((val, idx) => (
                  <span
                    key={idx}
                    className="mf-wave-bar"
                    style={{
                      height: `${activeCam ? Math.min(100, val + (idx % 3) * 6) : val}%`,
                      animationDelay: `${idx * 0.04}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Recording Badge & Status */}
            <div className="mf-tile-footer-bar">
              <div className="mf-rec-status">
                <span className="mf-rec-pulse-dot" />
                <span className="mf-rec-text">REC {formattedTimecode()}</span>
                <span className="mf-status-divider">/</span>
                <span className="mf-fps-text">60 FPS</span>
                <span className="mf-status-divider">/</span>
                <span className="mf-codec-text">ProRes 422</span>
              </div>
              <button
                type="button"
                className="mf-tile-action-btn"
                onClick={() => onOpenWorkspace('riverstudio')}
                data-testid="enter-rivercast-iso-btn"
              >
                <span>Enter RiverCast ISO</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </article>

          {/* TILE 2: 3D CAD Parametric Viewport */}
          <article className="mf-bento-tile mf-tile-cad" data-testid="bento-tile-solidcraft">
            <div className="mf-tile-header">
              <span className="mf-tile-title">3D CAD</span>
              <span className="mf-mesh-badge">3D MESH</span>
            </div>

            {/* Top HUD Specifications */}
            <div className="mf-cad-hud-overlay">
              <div className="mf-hud-item">Interactive 3D CAD</div>
              <div className="mf-hud-item">Polygon: 1,420</div>
              <div className="mf-hud-item">Vertex HUD: 890</div>
              <div className="mf-hud-item">Viewport: 4K 3D</div>
            </div>

            {/* Interactive 3D Wireframe Canvas */}
            <div className="mf-cad-canvas-wrapper">
              <canvas
                ref={cadCanvasRef}
                width={520}
                height={340}
                className="mf-cad-canvas"
                onMouseDown={handleCadMouseDown}
                onMouseMove={handleCadMouseMove}
                onMouseUp={handleCadMouseUp}
                onMouseLeave={handleCadMouseUp}
                title="Click and drag to rotate wireframe drone in 3D"
              />
              <div className="mf-cad-interaction-hint">
                <span>Drag to Rotate · Angle: {Math.round(yaw)}°</span>
                <button
                  type="button"
                  className="mf-cad-spin-toggle"
                  onClick={() => setAutoRotate(!autoRotate)}
                  title="Toggle Auto-Spin"
                >
                  <RotateCw size={11} className={autoRotate ? 'spin-active' : ''} />
                  <span>{autoRotate ? 'Auto' : 'Paused'}</span>
                </button>
              </div>
            </div>

            {/* Lower HUD & Spectrum */}
            <div className="mf-cad-bottom-hud">
              <div className="mf-cad-hud-coords">
                <span className="coord-tag">4K 3D</span>
                <span className="coord-axis">X:{Math.round(yaw)}°</span>
                <span className="coord-axis">Y:{Math.round(pitch)}°</span>
              </div>

              <div className="mf-cad-spectrum-cluster">
                <span className="hud-label">HUD SPECS</span>
                <div className="mf-cad-mini-bars">
                  {[40, 75, 90, 60, 45, 85, 95, 70, 50, 30].map((h, i) => (
                    <span
                      key={i}
                      className="mf-cad-bar"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mf-tile-footer-bar">
              <div className="mf-cad-poly-note">B-Rep NURBS &amp; STEP Kernel</div>
              <button
                type="button"
                className="mf-tile-action-btn"
                onClick={() => onOpenWorkspace('solidcraft', 'proj-solidcraft-motor-mount')}
                data-testid="enter-solidcraft-cad-btn"
              >
                <span>Enter SolidCraft CAD</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </article>

          {/* TILE 3: Tactile Audio Drum Sequencer Rack */}
          <article className="mf-bento-tile mf-tile-audio" data-testid="bento-tile-fruityforge">
            <div className="mf-tile-header">
              <span className="mf-tile-title">Tactile audio drum sequencer rack</span>
              <span className="mf-audio-badge">AUDIO</span>
            </div>

            {/* Sequencer Control Bar */}
            <div className="mf-audio-rack-controls">
              <div className="mf-velocity-selector">
                <ChevronLeft size={13} />
                <span>Velocity</span>
                <ChevronRight size={13} />
              </div>

              <button
                type="button"
                className={`mf-rack-play-btn ${isPlayingSequence ? 'playing' : ''}`}
                onClick={() => setIsPlayingSequence(!isPlayingSequence)}
                title={isPlayingSequence ? 'Pause Sequence' : 'Play 8-Step Pattern'}
              >
                {isPlayingSequence ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlayingSequence ? 'Step Loop' : 'Play Pattern'}</span>
              </button>

              <div className="mf-freq-tag">Frequency</div>
            </div>

            {/* 8 Tactile Drum Trigger Pads & Spectrum */}
            <div className="mf-audio-grid-wrapper">
              <div className="mf-tactile-pads-grid">
                {DRUM_PADS.map((pad, idx) => (
                  <button
                    key={pad.id}
                    type="button"
                    className={`mf-tactile-pad ${activePadIndex === idx ? 'pad-triggered' : ''} ${
                      isPlayingSequence && currentStep === idx ? 'step-cursor' : ''
                    }`}
                    style={{
                      borderColor: pad.color,
                      boxShadow: activePadIndex === idx ? `0 0 16px ${pad.glow}` : 'none'
                    }}
                    onClick={() => playSynthesizedDrum(pad.id, idx)}
                    title={`Click to trigger ${pad.name}`}
                  >
                    <span className="mf-pad-light-strip" style={{ background: pad.color }} />
                    <span className="mf-pad-label">{pad.name}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Frequency Spectrum Bars */}
              <div className="mf-drum-spectrum-rack">
                <div className="mf-spectrum-column-bars">
                  {spectrumLevels.map((lvl, i) => (
                    <span
                      key={i}
                      className="mf-spec-slice"
                      style={{
                        height: `${lvl}%`,
                        background: `linear-gradient(to top, #10b981 0%, #06b6d4 50%, #f59e0b 80%, #f43f5e 100%)`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mf-tile-footer-bar">
              <div className="mf-daw-note">16-Step 808 Rack &amp; Sytrus Engine</div>
              <button
                type="button"
                className="mf-tile-action-btn"
                onClick={() => onOpenWorkspace('flstudio')}
                data-testid="enter-fruityforge-btn"
              >
                <span>Enter FruityForge 21</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </article>

          {/* TILE 4: Instant Cross-App Asset Vault */}
          <article className="mf-bento-tile mf-tile-vault" data-testid="bento-tile-vault">
            <div className="mf-tile-header">
              <span className="mf-tile-title">Instant Cross-App Asset Vault</span>
              <span className="mf-vault-badge">VAULT</span>
            </div>

            <div className="mf-vault-hero-text">
              <div className="mf-vault-headline">0ms Latency / 100% Local-First</div>
              <div className="mf-vault-sub">
                No upload progress bars. No cloud relays. Files drop directly into the shared OPFS bus.
              </div>
            </div>

            {/* File Handoff Animation Graphic */}
            <div className="mf-vault-pipeline-visual">
              <div className="mf-pipeline-node file-source">
                <FileCode size={22} className="mf-node-icon" />
                <span className="mf-node-label">motor_plate.step</span>
              </div>

              <div className="mf-pipeline-arrows">
                <div className="mf-arrow-track">
                  <span className="mf-pulse-particle" />
                </div>
                <div className="mf-sync-status">
                  <HardDrive size={12} />
                  <span>0ms Bus</span>
                </div>
              </div>

              <div className="mf-pipeline-node vault-target">
                <Database size={22} className="mf-node-icon" />
                <span className="mf-node-label">OmniCraft Vault</span>
              </div>
            </div>

            {/* Interactive Benchmark Button */}
            <div className="mf-vault-bench-cluster">
              <button
                type="button"
                className={`mf-bench-trigger-btn ${benchmarking ? 'running' : ''}`}
                onClick={runLatencyTest}
                disabled={benchmarking}
              >
                <Zap size={13} />
                <span>{benchmarking ? 'Benchmarking Bus...' : 'Test Local Bus Speed'}</span>
              </button>
              {latencyResult && (
                <div className="mf-bench-result-tag">
                  <Check size={12} style={{ color: '#10b981' }} />
                  <span>{latencyResult}</span>
                </div>
              )}
            </div>

            <div className="mf-tile-footer-bar">
              <div className="mf-vault-security-note">
                <ShieldCheck size={13} style={{ color: '#10b981' }} />
                <span>Zero Telemetry · 100% Offline Vault</span>
              </div>
              <button
                type="button"
                className="mf-tile-action-btn"
                onClick={() => onNavigateTab('assets')}
                data-testid="inspect-vault-btn"
              >
                <span>Inspect Vault</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* PERFORMANCE MODAL */}
      {showPerformanceModal && (
        <div className="mf-modal-backdrop" onClick={() => setShowPerformanceModal(false)}>
          <div className="mf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mf-modal-header">
              <h3>Local Engine &amp; Hardware Telemetry</h3>
              <button
                type="button"
                className="mf-modal-close"
                onClick={() => setShowPerformanceModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="mf-modal-body">
              <p>
                OmniCraft executes 100% within your local hardware browser sandbox. No telemetry,
                no subscription keys, and zero cloud uploads.
              </p>
              <div className="mf-specs-grid">
                <div className="mf-spec-card">
                  <div className="spec-val">0.00 ms</div>
                  <div className="spec-lbl">Cloud Network Ping</div>
                </div>
                <div className="mf-spec-card">
                  <div className="spec-val">3.8 GB/s</div>
                  <div className="spec-lbl">Shared Memory Bus</div>
                </div>
                <div className="mf-spec-card">
                  <div className="spec-val">18/18</div>
                  <div className="spec-lbl">Offline Studios</div>
                </div>
                <div className="mf-spec-card">
                  <div className="spec-val">OPFS + IDB</div>
                  <div className="spec-lbl">Native File Storage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCS MODAL */}
      {showDocsModal && (
        <div className="mf-modal-backdrop" onClick={() => setShowDocsModal(false)}>
          <div className="mf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mf-modal-header">
              <h3>OmniCraft Documentation &amp; Upstream Architecture</h3>
              <button
                type="button"
                className="mf-modal-close"
                onClick={() => setShowDocsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="mf-modal-body">
              <p>
                OmniCraft integrates 18 open-source WebAssembly and HTML5 creative engines into one unified,
                private desktop workspace.
              </p>
              <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                <li><strong>RiverCast &amp; OneStudio:</strong> Multi-cam separate Screen &amp; Camera ISO recorder.</li>
                <li><strong>SolidCraft:</strong> 3D Parametric CAD with STEP, STL, and NURBS modeling.</li>
                <li><strong>FruityForge 21:</strong> Pattern drum sequencer, piano roll, and 8-bus mixer.</li>
                <li><strong>Studio Cut:</strong> Multi-track NLE with split-cuts and LUT color grading.</li>
                <li><strong>Unified Vault:</strong> Automatic instant cross-app file handoff via IndexedDB.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
