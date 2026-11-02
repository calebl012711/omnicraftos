import { RecordingStore, SessionManifest } from './storage';

export function chooseVideoMime(preference: 'mp4' | 'webm' = 'mp4'): string {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is unavailable in this browser.');
  const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
  const webm = ['video/webm;codecs=vp8,opus', 'video/webm'];
  const result = (preference === 'mp4' ? [...mp4, ...webm] : webm).find(t => MediaRecorder.isTypeSupported(t));
  if (!result) throw new Error('No supported MP4 or WebM recording encoder was found.');
  return result;
}
export function extension(mime: string) { return mime.includes('mp4') ? (mime.startsWith('audio/') ? 'm4a' : 'mp4') : 'webm'; }
export type CaptureState = 'idle' | 'countdown' | 'recording' | 'paused' | 'saving' | 'complete';

export class CaptureSession {
  readonly store: RecordingStore;
  readonly manifest: SessionManifest;
  private recorders: MediaRecorder[] = [];
  private startTime = 0;
  private stopTask?: Promise<void>;
  private cancelled = false;
  private healthTimer?: ReturnType<typeof setInterval>;
  private encodedAt = new Map<string, number>();
  private started = new Set<MediaRecorder>();
  private stopped = new Map<MediaRecorder, Promise<void>>();
  private listeners: { track: MediaStreamTrack; listener: () => void }[] = [];
  state: CaptureState = 'idle';
  constructor(private screen: MediaStream, private camera: MediaStream, private mic: MediaStream | null,
    private options: { mime: string; test?: boolean; onChange: () => void; onError: (e: Error) => void; countdownMs?: number; videoRates?: { screen: number; camera: number }; stallTimeoutMs?: number }) {
    this.manifest = {
      version: 1, id: `take-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 6)}`,
      createdAt: new Date().toISOString(), state: 'preparing', mode: options.test ? 'test' : 'capture', durationMs: 0,
      files: [], events: [], routing: { screen: screen.getAudioTracks().length ? 'Shared source audio only' : 'No audio supplied by screen share',
        camera: mic ? 'Microphone' : 'No microphone', microphone: mic ? 'Separate encoded audio file, also included in camera video' : 'Off' }
    };
    this.store = new RecordingStore(this.manifest, e => { options.onError(e); void this.stop('storage-error'); });
  }
  private change(state: CaptureState) { this.state = state; this.options.onChange(); }
  private event(type: string, detail?: string) { this.manifest.events.push({ type, offsetMs: this.startTime ? performance.now() - this.startTime : 0, detail }); }
  async start() {
    try {
      if (!this.screen.getVideoTracks().some(t => t.readyState === 'live') || !this.camera.getVideoTracks().some(t => t.readyState === 'live'))
        throw new Error('Connect both screen and camera before recording.');
      await this.store.init();
      const streams = [
        { kind: 'screen', stream: new MediaStream(this.screen.getTracks()), mime: this.options.mime },
        { kind: 'camera', stream: new MediaStream([...this.camera.getVideoTracks(), ...(this.mic?.getAudioTracks() || [])]), mime: this.options.mime }
      ];
      if (this.mic) {
        const audioMime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
        if (audioMime) streams.push({ kind: 'microphone', stream: new MediaStream(this.mic.getAudioTracks()), mime: audioMime });
      }
      for (const { kind, stream, mime } of streams) {
        const recorder = new MediaRecorder(stream, { mimeType: mime, ...(kind !== 'microphone' ? { videoBitsPerSecond: kind === 'screen' ? (this.options.videoRates?.screen ?? 2_500_000) : (this.options.videoRates?.camera ?? 1_000_000) } : {}), audioBitsPerSecond: 128_000 });
        this.stopped.set(recorder, new Promise(resolve => recorder.addEventListener('stop', () => {
          resolve();
          if (this.state === 'recording' || this.state === 'paused') {
            this.options.onError(new Error(`The ${kind} encoder stopped unexpectedly. Both views were stopped; check the saved take before using it.`));
            this.manifest.state = 'interrupted'; void this.stop('encoder-ended');
          }
        }, { once: true })));
        const actualMime = recorder.mimeType || mime;
        this.store.register({ kind, name: `${kind}.${extension(actualMime)}`, mime: actualMime, bytes: 0, chunks: 0 });
        recorder.addEventListener('dataavailable', e => {
          if (e.data.size) this.encodedAt.set(kind, performance.now());
          this.manifest.durationMs = this.startTime ? performance.now() - this.startTime : 0;
          this.store.append(kind, e.data); this.options.onChange();
        });
        recorder.addEventListener('start', () => this.event(`${kind}-encoder-start`));
        recorder.addEventListener('error', () => {
          this.options.onError(new Error(`${kind} encoder failed. Saved chunks remain available; playback may be incomplete.`));
          this.manifest.state = 'interrupted'; void this.stop('encoder-error');
        });
        this.recorders.push(recorder);
      }
      for (const track of [...this.screen.getVideoTracks(), ...this.camera.getVideoTracks(), ...(this.mic?.getAudioTracks() || [])]) {
        const listener = () => { this.options.onError(new Error(`${track.kind} source disconnected. The take has been stopped.`)); void this.stop('source-ended'); };
        track.addEventListener('ended', listener); this.listeners.push({ track, listener });
      }
      this.change('countdown');
      await new Promise(r => setTimeout(r, this.options.countdownMs ?? 3000));
      if (this.cancelled) return;
      if ([...this.screen.getVideoTracks(), ...this.camera.getVideoTracks(), ...(this.mic?.getAudioTracks() || [])].some(t => t.readyState !== 'live'))
        throw new Error('A source ended during the countdown. Reconnect it and start a new take.');
      this.startTime = performance.now();
      this.manifest.state = 'recording';
      this.event('common-start', new Date().toISOString());
      for (const recorder of this.recorders) { recorder.start(1000); this.started.add(recorder); this.event('encoder-start-request', recorder.mimeType); }
      for (const file of this.manifest.files) this.encodedAt.set(file.kind, this.startTime);
      this.healthTimer = setInterval(() => {
        if (this.state !== 'recording') return;
        const stalled = [...this.encodedAt].find(([, at]) => performance.now() - at > (this.options.stallTimeoutMs ?? 15_000));
        if (stalled) {
          this.options.onError(new Error(`The ${stalled[0]} encoder stopped delivering data. This take was stopped to protect saved chunks. Reconnect your inputs and make a short test take.`));
          this.manifest.state = 'interrupted'; void this.stop('encoder-stalled');
        }
      }, 2000);
      this.change('recording'); await this.store.saveManifest();
    } catch (e) {
      this.options.onError(e instanceof Error ? e : new Error(String(e)));
      this.manifest.state = 'interrupted'; await this.stop('start-failed');
    }
  }
  pause() {
    if (this.state !== 'recording' && this.state !== 'paused') return;
    const pause = this.state === 'recording';
    try {
      for (const recorder of this.recorders) pause ? recorder.pause() : recorder.resume();
      if (!pause) for (const kind of this.encodedAt.keys()) this.encodedAt.set(kind, performance.now());
      this.event(pause ? 'pause' : 'resume'); this.manifest.state = pause ? 'paused' : 'recording';
      this.change(pause ? 'paused' : 'recording');
    } catch (e) { this.options.onError(new Error(String(e))); void this.stop('pause-error'); }
  }
  stop(reason = 'user-stop'): Promise<void> {
    if (this.stopTask) return this.stopTask;
    this.cancelled = true;
    this.stopTask = this.finish(reason);
    return this.stopTask;
  }
  private async finish(reason: string) {
    clearInterval(this.healthTimer);
    this.event('stop', reason); this.change('saving');
    for (const { track, listener } of this.listeners) track.removeEventListener('ended', listener);
    await Promise.all(this.recorders.map(recorder => {
      if (!this.started.has(recorder)) return Promise.resolve();
      // A device can make the recorder inactive before its final data/stop events
      // arrive. Always await that stop event so the final chunk is saved too.
      if (recorder.state !== 'inactive') recorder.stop();
      return this.stopped.get(recorder)!;
    }));
    this.manifest.durationMs = this.startTime ? performance.now() - this.startTime : 0;
    await this.store.drain();
    if (!this.store.error && this.manifest.state !== 'interrupted') this.manifest.state = reason === 'user-stop' || reason === 'test-complete' ? 'complete' : 'interrupted';
    try { await this.store.saveManifest(); } catch (e) { this.options.onError(new Error(`Unable to save session manifest: ${e}`)); }
    this.change('complete');
  }
  dispose() {
    void this.stop('page-leave');
    for (const stream of [this.screen, this.camera, this.mic]) stream?.getTracks().forEach(t => t.stop());
  }
}
