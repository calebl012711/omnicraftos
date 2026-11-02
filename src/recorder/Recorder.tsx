import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Download, FolderDown, Mic, Monitor, Pause, Play, Radio, Square, Video } from 'lucide-react';
import { CaptureSession, chooseVideoMime } from './engine';
import { RecordingStore, recoverRecordings } from './storage';
import './recorder.css';
import './recorder-ui.css';

const PROFILES = {
  balanced: { label: 'Balanced · 720p / 24 fps', width: 1280, height: 720, fps: 24, screen: 2_500_000, camera: 1_000_000 },
  light: { label: 'Lightweight · 720p / 15 fps', width: 1280, height: 720, fps: 15, screen: 1_800_000, camera: 700_000 },
  detail: { label: 'More detail · 1080p / 30 fps', width: 1920, height: 1080, fps: 30, screen: 4_000_000, camera: 2_000_000 }
};
function duration(milliseconds: number) { const seconds = Math.floor(milliseconds / 1000); return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function Preview({ stream, label, camera, mirror, onConnect, disabled, onReady, microphone = true }: { stream: MediaStream | null; label: string; camera?: boolean; mirror?: boolean; onConnect: () => void; disabled: boolean; onReady?: (value: boolean) => void; microphone?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    setVideoReady(false); onReady?.(false);
    if (ref.current) { ref.current.srcObject = stream; if (stream) void ref.current.play().catch(() => {}); }
  }, [stream, onReady]);
  const settings = stream?.getVideoTracks()[0]?.getSettings();
  const Icon = camera ? Camera : Monitor;
  return <figure className={`capture-preview ${camera ? 'capture-face-preview' : ''}`}>
    <figcaption><span><Icon size={15} />{label}</span><span className="capture-source-status">{stream ? <><i />{videoReady ? 'Connected' : 'Starting preview…'}</> : 'Not connected'}</span></figcaption>
    <div className="capture-preview-image"><video ref={ref} muted autoPlay playsInline className={mirror ? 'capture-mirrored' : ''} aria-label={`${label} live preview`} onLoadedData={() => { setVideoReady(true); onReady?.(true); }} />
      {!stream && <div className="capture-preview-empty"><Icon size={34} strokeWidth={1.3} /><strong>{camera ? 'Your face, in its own frame.' : 'Choose what you want to share.'}</strong><p>{camera ? 'Your camera stays a separate video.' : 'A screen, a window, or a browser tab.'}</p><button disabled={disabled} onClick={onConnect}>{camera ? microphone ? 'Connect camera & microphone' : 'Connect camera' : 'Choose screen or window'}</button></div>}
    </div>
    {stream && <div className="capture-source-footer"><span>{settings?.width && settings?.height ? `${settings.width} × ${settings.height}` : 'Live source'}{settings?.frameRate ? ` · ${Math.round(settings.frameRate)} fps` : ''}</span><button disabled={disabled} onClick={onConnect}>{camera ? 'Change camera' : 'Change screen'}</button></div>}
  </figure>;
}

export function Recorder({ onBack }: { onBack?: () => void } = {}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [micId, setMicId] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenReady, setScreenReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<keyof typeof PROFILES>('balanced');
  const [mirror, setMirror] = useState(true);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const profile = PROFILES[quality];
  const [preference, setPreference] = useState<'mp4' | 'webm'>('mp4');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [version, redraw] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<RecordingStore[]>([]);
  const [exporting, setExporting] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const session = useRef<CaptureSession | null>(null);
  const streams = useRef<MediaStream[]>([]);
  const testTimer = useRef<ReturnType<typeof setTimeout>>();
  const state = session.current?.state || 'idle';
  const busy = ['countdown', 'recording', 'paused', 'saving'].includes(state);
  let mime = '';
  try { mime = chooseVideoMime(preference); } catch { /* Render unsupported state below. */ }
  const refreshDevices = async () => {
    if (navigator.mediaDevices?.enumerateDevices) setDevices(await navigator.mediaDevices.enumerateDevices());
  };
  useEffect(() => {
    void refreshDevices().catch(e => setError(String(e)));
    void recoverRecordings().then(setTakes).catch(e => setError(`Recovery: ${e}`));
    const deviceChange = () => { void refreshDevices().catch(() => {}); };
    navigator.mediaDevices?.addEventListener('devicechange', deviceChange);
    window.parent.postMessage({ type: 'omnicraft:ready', appId: 'riverstudio', capabilities: { recording: true } }, location.origin);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.current && ['countdown', 'recording', 'paused', 'saving'].includes(session.current.state)) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    const pageHide = () => session.current?.dispose();
    window.addEventListener('beforeunload', beforeUnload); window.addEventListener('pagehide', pageHide);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', deviceChange);
      window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('pagehide', pageHide);
      clearTimeout(testTimer.current); session.current?.dispose(); streams.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    };
  }, []);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => { redraw(v => v + 1); if (session.current?.state === 'countdown') setCountdown(n => Math.max(1, n - 1)); }, 1000);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (!mic) { setLevel(0); return; }
    let audio: AudioContext;
    try { audio = new AudioContext({ sinkId: { type: 'none' } } as AudioContextOptions); } catch { audio = new AudioContext(); }
    const source = audio.createMediaStreamSource(mic); const analyser = audio.createAnalyser();
    analyser.fftSize = 256; source.connect(analyser); const data = new Uint8Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      setLevel(Math.min(1, Math.sqrt(data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length) * 4));
    }, 100);
    return () => { clearInterval(timer); source.disconnect(); void audio.close(); };
  }, [mic]);
  async function connectScreen() {
    setError(''); setConnecting(true);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Screen capture is unavailable here. Open this studio in a supported desktop browser over HTTPS or localhost.');
      const next = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: profile.fps, max: profile.fps }, width: { ideal: profile.width, max: profile.width }, height: { ideal: profile.height, max: profile.height } }, audio: true });
      screen?.getTracks().forEach(t => t.stop()); streams.current.push(next); setScreen(next);
      next.getVideoTracks()[0].addEventListener('ended', () => setScreen(null), { once: true });
    } catch (e) { setError(`Screen not connected: ${e instanceof Error ? e.message : e}`); }
    finally { setConnecting(false); }
  }
  async function connectCamera() {
    setError(''); setConnecting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera capture is unavailable here. Use HTTPS or localhost in a supported browser.');
      const next = await navigator.mediaDevices.getUserMedia({
        video: { ...(cameraId ? { deviceId: { exact: cameraId } } : {}), width: { ideal: profile.width, max: profile.width }, height: { ideal: profile.height, max: profile.height }, frameRate: { ideal: profile.fps, max: profile.fps } },
        audio: micEnabled ? { ...(micId ? { deviceId: { exact: micId } } : {}), echoCancellation: true } : false
      });
      camera?.getTracks().forEach(t => t.stop()); mic?.getTracks().forEach(t => t.stop());
      streams.current.push(next); setCamera(new MediaStream(next.getVideoTracks()));
      setMic(next.getAudioTracks().length ? new MediaStream(next.getAudioTracks()) : null);
      next.getVideoTracks()[0].addEventListener('ended', () => setCamera(null), { once: true });
      await refreshDevices();
    } catch (e) { setError(`Camera / microphone not connected: ${e instanceof Error ? e.message : e}`); }
    finally { setConnecting(false); }
  }
  async function start(test: boolean) {
    if (!screen || !camera || busy) return;
    setError(''); setCountdown(3);
    const capture = new CaptureSession(screen, camera, mic, { mime, test, videoRates: profile,
      onChange: () => redraw(v => v + 1), onError: e => setError(e.message) });
    session.current = capture;
    await capture.start();
    if (capture.state === 'recording' && test) testTimer.current = setTimeout(() => { void capture.stop('test-complete'); }, 10_000);
  }
  useEffect(() => {
    const store = session.current?.store;
    if (state === 'complete' && store?.manifest.files.some(f => f.chunks) && !takes.some(t => t.manifest.id === store.manifest.id)) setTakes(t => [store, ...t]);
  }, [state, version]);
  async function exportFile(store: RecordingStore, kind: string, preview = false) {
    const key = `${store.manifest.id}/${kind}`;
    setExporting(key); setExportProgress(0); setError(''); setNotice('');
    try {
      const file = store.files.get(kind)!;
      const blob = await store.file(kind, setExportProgress);
      const url = URL.createObjectURL(blob);
      if (preview) setPreviews(previous => { if (previous[key]) URL.revokeObjectURL(previous[key]); return { ...previous, [key]: url }; });
      else { const a = document.createElement('a'); a.href = url; a.download = `${store.manifest.id}-${file.name}`; a.click(); setNotice(`Download started: ${file.name}`); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    } catch (e) { setError(`Could not assemble saved recording: ${e}. Chunks have been retained.`); }
    finally { setExporting(''); }
  }
  function downloadManifest(store: RecordingStore) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(store.manifest, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${store.manifest.id}-sync.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function saveFolder(store: RecordingStore) {
    setError(''); setNotice(''); setExportProgress(0); setExporting(`${store.manifest.id}/folder`);
    try {
      const directory = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const folder = await directory.getDirectoryHandle(store.manifest.id, { create: true });
      const files = store.manifest.files.filter(file => file.chunks);
      for (const [index, file] of files.entries()) {
        const handle = await folder.getFileHandle(file.name, { create: true });
        await store.writeTo(file.kind, await handle.createWritable(), fraction => setExportProgress((index + fraction) / files.length));
      }
      const handle = await folder.getFileHandle('sync.json', { create: true });
      const writer = await handle.createWritable(); await writer.write(JSON.stringify(store.manifest, null, 2)); await writer.close();
      setNotice(`Saved ${files.length} separate media files and sync.json in ${store.manifest.id}.`);
    } catch (e) { if ((e as DOMException).name !== 'AbortError') setError(`Could not save the folder: ${e}. Your browser copy is retained.`); }
    finally { setExporting(''); }
  }
  async function leave() {
    if (busy && !window.confirm('Stop this take and return to OmniCraft OS? Saved chunks will stay in this browser.')) return;
    if (busy) await session.current?.stop();
    if (onBack) onBack(); else window.top!.location.href = '/';
  }
  const connected = !!screen && !!camera && screenReady && cameraReady;
  const bytesSaved = session.current?.manifest.files.reduce((sum, file) => sum + file.bytes, 0) || 0;
  return <main className="capture-studio recorder-studio">
    <a className="capture-back" href="/" target="_top" onClick={event => { if (onBack || busy) { event.preventDefault(); void leave(); } }}><ArrowLeft size={14} />OmniCraft OS</a>
    <header><div><p className="capture-eyebrow">CAPTURE / SCREEN + FACE</p><h1>Two views. One take.</h1><p>Record together. Keep the screen and camera separate.</p></div><div className="capture-session-status"><span className={`capture-state is-${state}`} role="status" aria-live="polite"><i />{state === 'countdown' ? `Starting in ${countdown}…` : state}</span><time>{duration(session.current?.manifest.durationMs || 0)}</time></div></header>
    {error && <p className="capture-error" role="alert">{error}</p>}
    <div className="capture-workflow-steps" aria-label="Recording setup"><span className={screen ? 'done' : ''}>{screen ? <Check size={14} /> : '1'} Screen</span><span className={camera ? 'done' : ''}>{camera ? <Check size={14} /> : '2'} Face camera</span><span className={connected ? 'done' : ''}>{connected ? <Check size={14} /> : '3'} {connected ? 'Ready to record' : 'Connect both to begin'}</span></div>
    <section className="capture-monitors" aria-label="Separate source previews"><Preview stream={screen} label="Screen" onReady={setScreenReady} onConnect={() => void connectScreen()} disabled={busy || connecting} /><Preview stream={camera} label="Face camera" camera microphone={micEnabled} mirror={mirror} onReady={setCameraReady} onConnect={() => void connectCamera()} disabled={busy || connecting} /></section>
    <div className="capture-control-deck"><div className="capture-transport">
      <button className="capture-primary" disabled={busy || !connected || !mime} onClick={() => void start(false)}><Radio size={16} />Start recording</button>
      <button disabled={!['recording', 'paused'].includes(state)} onClick={() => session.current?.pause()}>{state === 'paused' ? <Play size={15} /> : <Pause size={15} />}{state === 'paused' ? 'Resume both' : 'Pause both'}</button>
      <button className="capture-stop" disabled={!['countdown', 'recording', 'paused'].includes(state)} onClick={() => { clearTimeout(testTimer.current); void session.current?.stop(); }}><Square size={13} fill="currentColor" />Stop &amp; save</button>
      <button disabled={busy || !connected || !mime} onClick={() => void start(true)}>10-second test take</button>
    </div><div className="capture-live-level"><Mic size={15} /><meter min="0" max="1" value={level} aria-label="Live microphone level" /><span>{mic ? 'Mic connected' : 'Mic off'}</span></div></div>
    <div className="capture-session-notes"><span><Video size={14} />{mime.includes('mp4') ? 'Separate MP4 videos' : mime ? 'Separate WebM videos' : 'No supported encoder'}</span><span>{(bytesSaved / 1024 / 1024).toFixed(1)} MB saved locally</span><label><input type="checkbox" checked={mirror} onChange={e => setMirror(e.target.checked)} />Mirror face preview only</label></div>
    <details className="capture-device-details"><summary>Devices, recording quality &amp; audio routing</summary><section className="capture-setup" aria-label="Capture setup"><div>
      <label>Camera<select value={cameraId} disabled={busy} onChange={e => setCameraId(e.target.value)}><option value="">System default</option>{devices.filter(d => d.kind === 'videoinput').map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select></label>
      <label>Microphone<select value={micId} disabled={busy || !micEnabled} onChange={e => setMicId(e.target.value)}><option value="">System default</option>{devices.filter(d => d.kind === 'audioinput').map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}</select></label>
      <label className="capture-check"><input type="checkbox" checked={micEnabled} disabled={busy} onChange={e => setMicEnabled(e.target.checked)} />Include microphone on next connection</label>
      <p>Microphone goes to the camera video and a separate audio file when supported. Screen audio comes only from the shared source.</p>
    </div><div>
      <label>Quality for next connection<select aria-label="Recording quality" value={quality} disabled={busy} onChange={e => setQuality(e.target.value as keyof typeof PROFILES)}>{Object.entries(PROFILES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <label>Video format<select aria-label="Video format" value={preference} disabled={busy} onChange={e => setPreference(e.target.value as 'mp4' | 'webm')}><option value="mp4">MP4 if supported</option><option value="webm">WebM</option></select></label>
      <p>{mime ? `Selected encoder: ${mime}` : 'No compatible recording encoder available.'} Actual resolution is shown below each connected preview.</p>
      {preference === 'mp4' && !mime.includes('mp4') && <p>MP4 is unavailable here. You will get playable WebM files. Converting later needs another encode and can be slow on an Intel MacBook Air.</p>}
      <p>Shared screen audio: {screen?.getAudioTracks().length ? 'enabled' : 'not supplied'}. Support depends on the browser, operating system, and selected source.</p>
      <button disabled={busy} onClick={() => { streams.current.forEach(stream => stream.getTracks().forEach(track => track.stop())); streams.current = []; setCamera(null); setMic(null); setScreen(null); }}>Disconnect devices</button>
    </div></section></details>
    <p className="capture-note">Capture saves to browser storage each second. Keep the Mac awake and download after each take. The sync JSON records encoder starts and pause events; hardware sync is not guaranteed. Preview mirroring never changes the saved camera video.</p>
    <section className="capture-takes" aria-label="Saved takes"><div className="capture-takes-heading"><div><p className="capture-eyebrow">YOUR SESSION LIBRARY</p><h2>Saved takes</h2></div><span>{takes.length} {takes.length === 1 ? 'take' : 'takes'} in this browser</span></div>
      {exporting && <div className="capture-export-progress" role="status"><span>Preparing files · {Math.round(exportProgress * 100)}%</span><progress value={exportProgress} max={1} /><small>Saved chunks stay in this browser. Long takes may take a moment to prepare.</small></div>}
      {notice && <p className="capture-export-notice" role="status">{notice}</p>}
      {!takes.length && <div className="capture-library-empty"><FolderDown size={24} /><p>Your recordings will appear here.<br />Each take keeps your screen, camera, and available audio separate.</p></div>}
      {takes.map(store => <article key={store.manifest.id} className="capture-take-card"><div className="capture-take-heading"><h3>{new Date(store.manifest.createdAt).toLocaleString()} <small>{store.manifest.mode === 'test' ? 'Test take · ' : ''}{store.manifest.state}</small></h3>{typeof (window as any).showDirectoryPicker === 'function' && <button disabled={!!exporting || busy} onClick={() => void saveFolder(store)}><FolderDown size={14} />Save all to folder</button>}</div>
        {store.manifest.state === 'interrupted' && <p>Recovered saved chunks. Check playback before relying on this take.</p>}
        <div className="capture-files">{store.manifest.files.filter(file => file.chunks).map(file => { const key = `${store.manifest.id}/${file.kind}`; return <div key={key}><strong>{file.kind === 'screen' ? <Monitor size={16} /> : file.kind === 'camera' ? <Camera size={16} /> : <Mic size={16} />}{file.name}</strong><span>{(file.bytes / 1024 / 1024).toFixed(2)} MB · {file.chunks} saved chunks</span><div className="capture-file-actions"><button disabled={!!exporting || busy} onClick={() => void exportFile(store, file.kind)}><Download size={13} />Download {file.kind}</button><button disabled={!!exporting || busy} onClick={() => void exportFile(store, file.kind, true)}>Check playback</button></div>{previews[key] && (file.kind === 'microphone' ? <audio src={previews[key]} controls /> : <video src={previews[key]} controls playsInline />)}</div>; })}</div>
        <button className="capture-sync-download" onClick={() => downloadManifest(store)}>Download sync JSON</button>
      </article>)}
    </section>
  </main>;
}
