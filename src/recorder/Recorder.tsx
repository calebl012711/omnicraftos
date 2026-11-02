import { useEffect, useRef, useState } from 'react';
import { CaptureSession, chooseVideoMime } from './engine';
import { RecordingStore, recoverRecordings } from './storage';
import './recorder.css';

function Preview({ stream, label }: { stream: MediaStream | null; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.srcObject = stream; if (stream) void ref.current.play().catch(() => {}); }
  }, [stream]);
  return <figure className="capture-preview"><figcaption>{label}</figcaption><video ref={ref} muted autoPlay playsInline aria-label={`${label} live preview`} />{!stream && <span>Connect {label.toLowerCase()} to preview</span>}</figure>;
}

export function Recorder() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [micId, setMicId] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState<MediaStream | null>(null);
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
    const audio = new AudioContext(); const source = audio.createMediaStreamSource(mic); const analyser = audio.createAnalyser();
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
      const next = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      screen?.getTracks().forEach(t => t.stop()); streams.current.push(next); setScreen(next);
      next.getVideoTracks()[0].addEventListener('ended', () => setScreen(null), { once: true });
    } catch (e) { setError(`Screen not connected: ${e instanceof Error ? e.message : e}`); }
    finally { setConnecting(false); }
  }
  async function connectCamera() {
    setError(''); setConnecting(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { ...(cameraId ? { deviceId: { exact: cameraId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
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
    const capture = new CaptureSession(screen, camera, mic, { mime, test,
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
    setExporting(key); setError('');
    try {
      const file = store.files.get(kind)!;
      const blob = await store.file(kind);
      const url = URL.createObjectURL(blob);
      if (preview) setPreviews(previous => { if (previous[key]) URL.revokeObjectURL(previous[key]); return { ...previous, [key]: url }; });
      else { const a = document.createElement('a'); a.href = url; a.download = `${store.manifest.id}-${file.name}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    } catch (e) { setError(`Could not assemble saved recording: ${e}. Chunks have been retained.`); }
    finally { setExporting(''); }
  }
  function downloadManifest(store: RecordingStore) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(store.manifest, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${store.manifest.id}-sync.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return <main className="capture-studio">
    <header><div><p className="capture-eyebrow">OMNICRAFT OS / RECORDING</p><h1>Two views. One take.</h1><p>Record your screen and camera as separate video files.</p></div><span className="capture-state" role="status" aria-live="polite">{state === 'countdown' ? `Starting in ${countdown}…` : state}</span></header>
    {error && <p className="capture-error" role="alert">{error}</p>}
    <section className="capture-setup" aria-label="Capture setup"><div>
      <label>Camera<select value={cameraId} disabled={busy} onChange={e => setCameraId(e.target.value)}><option value="">System default</option>{devices.filter(d => d.kind === 'videoinput').map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select></label>
      <label>Microphone<select value={micId} disabled={busy || !micEnabled} onChange={e => setMicId(e.target.value)}><option value="">System default</option>{devices.filter(d => d.kind === 'audioinput').map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}</select></label>
      <label className="capture-check"><input type="checkbox" checked={micEnabled} disabled={busy} onChange={e => setMicEnabled(e.target.checked)} />Include microphone on next connection</label>
      <button disabled={busy || connecting} onClick={() => void connectCamera()}>Connect camera &amp; microphone</button>
      <label>Microphone level<meter min="0" max="1" value={level} aria-label="Live microphone level" /></label>
    </div><div>
      <label>Video format<select aria-label="Video format" value={preference} disabled={busy} onChange={e => setPreference(e.target.value as 'mp4' | 'webm')}><option value="mp4">MP4 if supported</option><option value="webm">WebM</option></select></label>
      <p>{mime ? `Selected encoder: ${mime}` : 'No compatible recording encoder available.'}</p>
      {preference === 'mp4' && !mime.includes('mp4') && <p>MP4 encoding is unavailable here. This take will use playable WebM files. Converting to MP4 later needs a separate encode and can be slow on an Intel MacBook Air.</p>}
      <button disabled={busy || connecting} onClick={() => void connectScreen()}>Choose screen or window</button>
      <p>Screen audio: {screen?.getAudioTracks().length ? 'Shared source audio enabled' : 'No shared audio supplied'}. Availability depends on your browser, system, and selected source.</p>
    </div></section>
    <section className="capture-monitors" aria-label="Separate source previews"><Preview stream={screen} label="Screen" /><Preview stream={camera} label="Camera" /></section>
    <div className="capture-transport">
      <button className="capture-primary" disabled={busy || !screen || !camera || !mime} onClick={() => void start(false)}>Start recording</button>
      <button disabled={busy || !screen || !camera || !mime} onClick={() => void start(true)}>10-second test take</button>
      <button disabled={!['recording', 'paused'].includes(state)} onClick={() => session.current?.pause()}>{state === 'paused' ? 'Resume both' : 'Pause both'}</button>
      <button disabled={!['countdown', 'recording', 'paused'].includes(state)} onClick={() => { clearTimeout(testTimer.current); void session.current?.stop(); }}>Stop &amp; save</button>
      <button disabled={busy} onClick={() => { streams.current.forEach(s => s.getTracks().forEach(t => t.stop())); setCamera(null); setMic(null); setScreen(null); }}>Disconnect devices</button>
    </div>
    <p className="capture-note">Audio routing: shared-source audio goes to the screen file. The microphone goes to the camera file and a separate encoded audio file when supported. Both encoders start from one command; the sync JSON records start offsets and pause events. It does not guarantee frame-perfect hardware synchronization.</p>
    <p className="capture-note">Capture is saved in local browser storage each second. Keep this tab open and the Mac awake. Download your files after each take; browser storage can be cleared or evicted. Assembling downloads needs extra disk space. Interrupted takes may be incomplete, especially MP4. No upload is performed by this recorder.</p>
    <section className="capture-takes" aria-label="Saved takes"><h2>Saved takes</h2>{!takes.length && <p>Your recordings will appear here, including recoverable takes after a reload.</p>}{takes.map(store => <article key={store.manifest.id}>
      <h3>{new Date(store.manifest.createdAt).toLocaleString()} <small>{store.manifest.mode === 'test' ? 'Test take · ' : ''}{store.manifest.state}</small></h3>
      {store.manifest.state === 'interrupted' && <p>Recovered saved chunks. Check playback before relying on this take.</p>}
      <div className="capture-files">{store.manifest.files.filter(f => f.chunks).map(file => { const key = `${store.manifest.id}/${file.kind}`; return <div key={key}><strong>{file.name}</strong><span>{(file.bytes / 1024 / 1024).toFixed(2)} MB · {file.chunks} saved chunks</span><button disabled={!!exporting || busy} onClick={() => void exportFile(store, file.kind)}>Download {file.kind}</button><button disabled={!!exporting || busy} onClick={() => void exportFile(store, file.kind, true)}>Check playback</button>{previews[key] && (file.kind === 'microphone' ? <audio src={previews[key]} controls /> : <video src={previews[key]} controls playsInline />)}</div>; })}</div>
      <button onClick={() => downloadManifest(store)}>Download sync JSON</button>
    </article>)}</section>
  </main>;
}
