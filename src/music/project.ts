import { type ClipTrack } from '@waveform-playlist/core';

export interface MusicProject { version: 1; name: string; bpm: number; savedAt: string; tracks: any[]; }
const MAX_PCM_BYTES = 64 * 1024 * 1024;
export function packProject(name: string, bpm: number, tracks: ClipTrack[], states: { volume: number; pan: number; muted: boolean; soloed: boolean }[]): MusicProject {
  let bytes = 0;
  return { version: 1, name, bpm, savedAt: new Date().toISOString(), tracks: tracks.map((track, i) => ({
    id: track.id, name: track.name, ...{ volume: track.volume, pan: track.pan, muted: track.muted, soloed: track.soloed }, ...states[i],
    clips: track.clips.map(clip => {
      const { audioBuffer, waveformData, ...metadata } = clip;
      const channels = audioBuffer ? Array.from({ length: audioBuffer.numberOfChannels }, (_, c) => audioBuffer.getChannelData(c).slice()) : [];
      bytes += channels.reduce((sum, data) => sum + data.byteLength, 0);
      if (bytes > MAX_PCM_BYTES) throw new Error('This music foundation supports up to 64 MB of decoded audio per project. Use SoundCraft for larger sessions.');
      return { ...metadata, channels };
    })
  })) };
}
export function unpackProject(value: unknown, context: AudioContext): { project: MusicProject; tracks: ClipTrack[] } {
  const project = value as MusicProject;
  if (project?.version !== 1 || !Array.isArray(project.tracks) || project.tracks.length > 32 || !Number.isFinite(project.bpm) || project.bpm < 30 || project.bpm > 300)
    throw new Error('Unsupported or invalid OmniCraft music project.');
  let bytes = 0;
  const tracks: ClipTrack[] = project.tracks.map(track => {
    if (!Array.isArray(track.clips) || track.clips.length > 512) throw new Error('Invalid clip list.');
    if (![track.volume, track.pan].every(Number.isFinite) || track.volume < 0 || track.volume > 2 || Math.abs(track.pan) > 1) throw new Error('Invalid mixer values.');
    return { ...track, clips: track.clips.map((clip: any) => {
      if (!Array.isArray(clip.channels) || clip.channels.length > 2 || clip.sampleRate < 8000 || clip.sampleRate > 96000 || !Number.isFinite(clip.sampleRate)) throw new Error('Unsupported audio channels or sample rate.');
      for (const key of ['startSample', 'offsetSamples', 'durationSamples']) if (!Number.isSafeInteger(clip[key]) || clip[key] < 0 || clip[key] > 96000 * 3600) throw new Error('Invalid clip timing.');
      const channels: Float32Array[] = clip.channels.map((channel: any) => channel instanceof Float32Array ? channel : new Float32Array(channel));
      if (!channels.length) return { ...clip, audioBuffer: undefined };
      const length = channels[0].length;
      if (!length || channels.some(c => c.length !== length)) throw new Error('Invalid PCM data.');
      bytes += length * channels.length * 4;
      if (bytes > MAX_PCM_BYTES) throw new Error('Project exceeds the 64 MB decoded audio limit.');
      const buffer = context.createBuffer(channels.length, length, clip.sampleRate);
      channels.forEach((data, i) => buffer.copyToChannel(data, i));
      const { channels: _, ...metadata } = clip;
      return { ...metadata, audioBuffer: buffer };
    }) };
  });
  return { project, tracks };
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('omnicraft-music', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('projects', { keyPath: 'name' });
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
export async function saveMusic(project: MusicProject) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
  finally { db.close(); }
}
export async function listMusic(): Promise<MusicProject[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => { const req = db.transaction('projects').objectStore('projects').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  finally { db.close(); }
}
export function portableProject(project: MusicProject): string {
  return JSON.stringify(project, (_, value) => {
    if (!(value instanceof Float32Array)) return value;
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += 32_768) parts.push(String.fromCharCode(...bytes.subarray(i, i + 32_768)));
    return { pcmFloat32Base64: btoa(parts.join('')) };
  });
}
export function parsePortableProject(text: string): MusicProject {
  if (text.length > 96 * 1024 * 1024) throw new Error('Project file is too large.');
  return JSON.parse(text, (_, value) => {
    if (value && typeof value.pcmFloat32Base64 === 'string') {
      const text = atob(value.pcmFloat32Base64); const bytes = Uint8Array.from(text, c => c.charCodeAt(0));
      if (bytes.byteLength % 4) throw new Error('Corrupt PCM audio.');
      return new Float32Array(bytes.buffer);
    }
    return value;
  });
}
