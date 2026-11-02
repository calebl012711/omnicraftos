import { useEffect, useState } from 'react';
import { WaveformPlaylistProvider, ClipInteractionProvider, Waveform, usePlaylistControls, usePlaylistData, usePlaylistState, usePlaybackAnimation, ZoomInButton, ZoomOutButton } from '@waveform-playlist/browser';
import { useExportWav } from '@waveform-playlist/browser/tone';
import { useIntegratedRecording } from '@waveform-playlist/recording';
import { createTrack, createClipFromSeconds, type ClipTrack } from '@waveform-playlist/core';
import { getGlobalAudioContext } from '@waveform-playlist/playout';
import { listMusic, packProject, parsePortableProject, portableProject, saveMusic, unpackProject, type MusicProject } from './project';
import '../recorder/recorder.css';
import './music.css';

function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000); }
function stereoExportInput(tracks: ClipTrack[], states: { volume: number; pan: number; muted: boolean; soloed: boolean }[]) {
  // Upstream derives offline output channels from its audible input tracks. A silent
  // stereo bus requests stereo output without changing mono source panning/gain.
  // Duplicating a mono buffer into two channels would double its hard-panned level.
  const context = getGlobalAudioContext();
  const bus = createTrack({ name: 'Stereo export bus', clips: [createClipFromSeconds({ audioBuffer: context.createBuffer(2, 1, context.sampleRate), startTime: 0 })] });
  return {
    tracks: [...tracks, bus],
    states: [...states, { volume: 0, pan: 0, muted: false, soloed: states.some(state => state.soloed) }]
  };
}
function MusicTrackControls({ index, locked }: { index: number; locked: boolean }) {
  const { tracks, trackStates, playoutRef, isReady } = usePlaylistData();
  const controls = usePlaylistControls(); const { selectedTrackId } = usePlaylistState();
  const track = tracks[index], state = trackStates[index] || track;
  return <div className="music-track-controls">
    <button disabled={locked} aria-pressed={selectedTrackId === track.id} onClick={() => controls.setSelectedTrackId(track.id)}>{track.name}</button>
    <div><button aria-label={`Mute ${track.name}`} aria-pressed={state.muted} onClick={() => controls.setTrackMute(index, !state.muted)}>Mute</button><button aria-label={`Solo ${track.name}`} aria-pressed={state.soloed} onClick={() => controls.setTrackSolo(index, !state.soloed)}>Solo</button></div>
    <label>Volume<input aria-label={`Volume ${track.name}`} type="range" min="0" max="1" step="0.01" value={state.volume} onChange={e => controls.setTrackVolume(index, Number(e.target.value))} /></label>
    <label>Pan<input aria-label={`Pan ${track.name}`} type="range" min="-1" max="1" step="0.01" value={state.pan} onChange={e => controls.setTrackPan(index, Number(e.target.value))} /></label>
    {track.clips.map((clip, n) => <label key={clip.id}>Clip {n + 1} start (seconds)<input aria-label={`Start ${track.name} clip ${n + 1}`} type="number" min="0" max="3600" step="0.1" disabled={!isReady || locked} value={Number((clip.startSample / clip.sampleRate).toFixed(3))} onChange={e => { const time = Number(e.target.value); if (Number.isFinite(time) && time >= 0 && time <= 3600) playoutRef.current?.moveClip(track.id, clip.id, Math.round(time * clip.sampleRate) - clip.startSample); }} /></label>)}
  </div>;
}
function StudioControls({ tracks, setTracks }: { tracks: ClipTrack[]; setTracks: (tracks: ClipTrack[]) => void }) {
  const [name, setName] = useState('Untitled music project');
  const [bpm, setBpm] = useState(120);
  const [click, setClick] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Import audio or add a track to record.');
  const [saved, setSaved] = useState<MusicProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordingStart, setRecordingStart] = useState(0);
  const [finalizingRecording, setFinalizingRecording] = useState(false);
  const controls = usePlaylistControls();
  const { selectedTrackId } = usePlaylistState();
  const { currentTime, isPlaying, getPlaybackTime, getAudioContextTime } = usePlaybackAnimation();
  const { trackStates, isReady } = usePlaylistData();
  const recording = useIntegratedRecording(tracks, setTracks, selectedTrackId, { currentTime });
  const exporter = useExportWav();
  const busy = loading || finalizingRecording || recording.isRecording || exporter.isExporting;
  async function finishRecording(limit = false) {
    setFinalizingRecording(true);
    try {
      // The upstream type says void, but this hook returns its async stop handshake.
      // Keep Save and Export disabled until the worklet buffer has become a clip.
      await recording.stopRecording();
      setMessage(limit ? 'Microphone take stopped at the two-minute foundation limit. Review the track, then save or export.' : 'Microphone stopped. Review the recorded clip before saving.');
    } catch (e) { setError(`Could not finish recording: ${e}`); }
    finally { setFinalizingRecording(false); }
  }
  useEffect(() => {
    if (recording.isRecording && recording.duration >= 120 && !finalizingRecording) {
      void finishRecording(true);
    }
  }, [recording.isRecording, recording.duration, finalizingRecording]);
  useEffect(() => { void listMusic().then(setSaved).catch(e => setError(String(e))); window.parent.postMessage({ type: 'omnicraft:ready', appId: 'music', capabilities: { audio: true } }, location.origin); }, []);
  useEffect(() => {
    if (!click || !isPlaying) return;
    const context = getGlobalAudioContext(); let lastBeat = -1;
    const timer = setInterval(() => {
      const time = getPlaybackTime(); const beat = Math.floor(time * bpm / 60);
      if (beat === lastBeat) return;
      lastBeat = beat; const oscillator = context.createOscillator(); const gain = context.createGain();
      const at = Math.max(context.currentTime, getAudioContextTime()) + 0.005;
      oscillator.frequency.value = beat % 4 === 0 ? 1400 : 950; gain.gain.setValueAtTime(0.07, at); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.04);
      oscillator.connect(gain).connect(context.destination); oscillator.start(at); oscillator.stop(at + 0.05); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }, 15);
    return () => clearInterval(timer);
  }, [click, isPlaying, bpm, getPlaybackTime, getAudioContextTime]);
  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true); setError('');
    try {
      if (tracks.length + files.length > 32) throw new Error('This foundation supports up to 32 tracks.');
      const context = getGlobalAudioContext(); const added: ClipTrack[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 32 * 1024 * 1024) throw new Error('Use an audio file smaller than 32 MB in this foundation.');
        const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
        if (audioBuffer.numberOfChannels > 2) throw new Error('Import mono or stereo audio in this foundation.');
        added.push(createTrack({ name: file.name, clips: [createClipFromSeconds({ audioBuffer, startTime: 0, name: file.name })] }));
      }
      const next = [...tracks, ...added]; packProject(name, bpm, next, []); setTracks(next);
      setMessage(`Imported ${added.length} audio track${added.length === 1 ? '' : 's'}. Drag clips to arrange them.`);
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  }
  async function save() {
    setError(''); setLoading(true);
    try { await saveMusic(packProject(name.trim() || 'Untitled music project', bpm, tracks, trackStates)); setSaved(await listMusic()); setMessage('Saved audio, arrangement, tempo, and mixer settings in this browser.'); }
    catch (e) { setError(`Save failed: ${e}`); } finally { setLoading(false); }
  }
  async function open(project: MusicProject) {
    setError('');
    try { const result = unpackProject(project, getGlobalAudioContext()); await controls.stop(); setTracks(result.tracks); setName(result.project.name); setBpm(result.project.bpm); setMessage('Project reopened with its audio.'); }
    catch (e) { setError(`Open failed: ${e}`); }
  }
  async function exportMix() {
    setError('');
    try { const input = stereoExportInput(tracks, trackStates); await exporter.exportWav(input.tracks, input.states, { filename: name, bitDepth: 16 }); setMessage('Stereo WAV mix exported.'); }
    catch (e) { setError(String(e)); }
  }
  return <>
    <header><div><p className="capture-eyebrow">OMNICRAFT OS / MUSIC</p><h1>Start with a sound.</h1><p>Multitrack audio powered by Waveform Playlist and Tone.js.</p></div><span className="capture-state">{finalizingRecording ? 'Finalizing take…' : recording.isRecording ? `Recording · ${recording.duration.toFixed(1)}s` : isPlaying ? 'Playing' : 'Stopped'}</span></header>
    {(error || recording.error || exporter.error) && <p className="capture-error" role="alert">{error || recording.error?.message || exporter.error}</p>}
    <div className="music-project"><label>Project name<input aria-label="Music project name" value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label><button disabled={busy || !tracks.length} onClick={() => void save()}>Save project</button><label>Reopen project<select aria-label="Reopen music project" value="" disabled={busy} onChange={e => { const p = saved.find(s => s.name === e.target.value); if (p) void open(p); }}><option value="">Choose a saved project…</option>{saved.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></label>
      <button disabled={busy || !tracks.length} onClick={() => { try { download(new Blob([portableProject(packProject(name, bpm, tracks, trackStates))], { type: 'application/json' }), `${name}.omnimusic`); } catch (e) { setError(String(e)); } }}>Download project backup</button>
      <label className="music-file">Open backup<input aria-label="Open music project backup" type="file" accept=".omnimusic" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) { if (file.size > 96 * 1024 * 1024) { setError('Backup exceeds 96 MB.'); return; } void file.text().then(t => open(parsePortableProject(t))).catch(e => setError(String(e))); } e.target.value = ''; }} /></label>
    </div>
    <div className="capture-transport">
      <button className="capture-primary" disabled={busy || !isReady} onClick={() => void controls.play().catch(e => setError(String(e)))}>Play</button><button disabled={!isPlaying || recording.isRecording} onClick={() => void controls.pause()}>Pause</button><button disabled={!isPlaying || recording.isRecording} onClick={() => void controls.stop()}>Stop</button>
      <label className="music-tempo">Tempo<input aria-label="Tempo BPM" type="number" min="30" max="300" value={bpm} onChange={e => { const n = Number(e.target.value); if (n >= 30 && n <= 300) setBpm(n); }} /></label><label className="capture-check"><input type="checkbox" checked={click} onChange={e => setClick(e.target.checked)} />Metronome during playback</label><ZoomInButton /><ZoomOutButton />
    </div>
    <div className="capture-transport music-import"><label className="music-file">Import audio<input aria-label="Import music audio" type="file" accept="audio/*" multiple disabled={busy} onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} /></label>
      <button disabled={busy || tracks.length >= 32} onClick={() => { const track = createTrack({ name: `Audio ${tracks.length + 1}` }); setTracks([...tracks, track]); controls.setSelectedTrackId(track.id); }}>Add recording track</button>
      <button disabled={busy} onClick={() => void recording.requestMicAccess().catch(e => setError(String(e)))}>Connect microphone</button>
      <button disabled={!recording.hasPermission || !selectedTrackId || loading || finalizingRecording || exporter.isExporting} onClick={() => { if (recording.isRecording) void finishRecording(); else { setError(''); setRecordingStart(Math.round(currentTime * 48000)); void recording.startRecording().then(started => { if (!started) setError('Microphone recording could not start. Check the input and permission, then reconnect it.'); }).catch(e => setError(String(e))); } }}>{recording.isRecording ? 'Stop microphone recording' : 'Record selected track'}</button>
      <meter value={recording.level} max={1} aria-label="Music microphone level" />
      <button disabled={busy || !tracks.some(t => t.clips.length)} onClick={() => void exportMix()}>Export WAV mix</button>
    </div>
    <p role="status" className="capture-note">{message} {loading ? 'Loading…' : ''}</p>
    <p className="capture-note">Drag clips to move or trim them. Mixer controls affect playback and WAV export. Tempo sets the metronome; imported audio keeps its original speed. Short projects only: 64 MB decoded audio, 32 tracks, two-minute microphone takes. Exported WAV omits the metronome. Browser storage is local to this address; download a project backup before clearing it.</p>
    <Waveform showClipHeaders renderTrackControls={index => <MusicTrackControls index={index} locked={recording.isRecording || finalizingRecording} />} recordingState={recording.isRecording ? { isRecording: true, trackId: selectedTrackId || '', startSample: recordingStart, durationSamples: Math.round(recording.duration * 48000), peaks: recording.recordingPeaks, bits: 16 } : undefined} />
    <p className="capture-note music-credit">Waveform Playlist © Naomi Aro, MIT · Tone.js © Yotam Mann, MIT. SoundCraft remains available separately for its own session format.</p>
  </>;
}
export function MusicStudio() {
  const [tracks, setTracks] = useState<ClipTrack[]>([]);
  return <main className="capture-studio music-studio"><WaveformPlaylistProvider tracks={tracks} onTracksChange={setTracks} sampleRate={48000} samplesPerPixel={512} controls={{ show: true, width: 220 }} timescale waveHeight={220} fillViewport theme={{ playlistBackgroundColor: '#f6f5f1', backgroundColor: '#ffffff', surfaceColor: '#efeeea', textColor: '#17212e', textColorMuted: '#4d5d70', waveFillColor: '#225bcc', waveOutlineColor: '#e7edf6', timescaleBackgroundColor: '#efeeea', timeColor: '#4d5d70', playheadColor: '#c23727', borderColor: '#c9ced2' }}><ClipInteractionProvider><StudioControls tracks={tracks} setTracks={setTracks} /></ClipInteractionProvider></WaveformPlaylistProvider></main>;
}
