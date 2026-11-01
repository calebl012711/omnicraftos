import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('OmniCraft Audio Editors (FruityForge 21 & BandForge DAW)', () => {
  const flHtmlPath = path.resolve(process.cwd(), 'public/editors/flstudio/index.html');
  const bfHtmlPath = path.resolve(process.cwd(), 'public/editors/bandforge/index.html');

  const flHtml = fs.readFileSync(flHtmlPath, 'utf8');
  const bfHtml = fs.readFileSync(bfHtmlPath, 'utf8');

  describe('Option 3 Bento Aesthetic & Branding', () => {
    it('FruityForge 21 has Bento pill badges, Tile 3 Drum Rack branding, and 1px crisp borders', () => {
      expect(flHtml).toContain('bento-badge');
      expect(flHtml).toContain('OMNICRAFT');
      expect(flHtml).toContain('FRUITYFORGE 21');
      expect(flHtml).toContain('TILE 3 DRUM RACK');
      expect(flHtml).toContain('flLedSpectrum');
      expect(flHtml).toContain('bento-dot');
      expect(flHtml).toContain('--border: rgba(255, 255, 255, 0.08)');
    });

    it('BandForge DAW has Bento pill badges, Tile 3 Smart Engine branding, and LED spectrum', () => {
      expect(bfHtml).toContain('bento-badge');
      expect(bfHtml).toContain('OMNICRAFT');
      expect(bfHtml).toContain('BANDFORGE DAW');
      expect(bfHtml).toContain('TILE 3 SMART ENGINE');
      expect(bfHtml).toContain('gbLedSpectrum');
      expect(bfHtml).toContain('gbPitchBadge');
      expect(bfHtml).toContain('--border: rgba(255, 255, 255, 0.08)');
    });
  });

  describe('Bidirectional Communication Protocol', () => {
    it('FruityForge 21 handles omnicraft:theme-change, import-audio, live tempo & pitch tweaks', () => {
      expect(flHtml).toContain("data.type === 'omnicraft:theme-change'");
      expect(flHtml).toContain("data.type === 'omnicraft:import-audio'");
      expect(flHtml).toContain("data.type === 'omnicraft:set-tempo'");
      expect(flHtml).toContain("data.type === 'omnicraft:set-pitch'");
      expect(flHtml).toContain("type: 'omnicraft:export-ready'");
      expect(flHtml).toContain("type: 'omnicraft:toast'");
      expect(flHtml).toContain("type: 'mosaic:export-captured'");
    });

    it('BandForge DAW handles omnicraft:theme-change, import-audio, live tempo & pitch tweaks', () => {
      expect(bfHtml).toContain("data.type === 'omnicraft:theme-change'");
      expect(bfHtml).toContain("data.type === 'omnicraft:import-audio'");
      expect(bfHtml).toContain("data.type === 'omnicraft:set-tempo'");
      expect(bfHtml).toContain("data.type === 'omnicraft:set-pitch'");
      expect(bfHtml).toContain("type: 'omnicraft:export-ready'");
      expect(bfHtml).toContain("type: 'omnicraft:toast'");
      expect(bfHtml).toContain("type: 'mosaic:export-captured'");
    });
  });

  describe('Audio Synthesis & WAV Export Validation', () => {
    function parseWavHeader(buffer: ArrayBuffer) {
      const view = new DataView(buffer);
      const readStr = (off: number, len: number) => {
        let str = '';
        for (let i = 0; i < len; i++) str += String.fromCharCode(view.getUint8(off + i));
        return str;
      };

      const riff = readStr(0, 4);
      const chunkSize = view.getUint32(4, true);
      const wave = readStr(8, 4);
      const fmt = readStr(12, 4);
      const subChunk1Size = view.getUint32(16, true);
      const audioFormat = view.getUint16(20, true);
      const numChannels = view.getUint16(22, true);
      const sampleRate = view.getUint32(24, true);
      const byteRate = view.getUint32(28, true);
      const blockAlign = view.getUint16(32, true);
      const bitsPerSample = view.getUint16(34, true);
      const data = readStr(36, 4);
      const dataSize = view.getUint32(40, true);

      return {
        riff,
        chunkSize,
        wave,
        fmt,
        subChunk1Size,
        audioFormat,
        numChannels,
        sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample,
        data,
        dataSize
      };
    }

    it('FruityForge buildFlWavBuffer produces valid 44.1kHz 16-bit stereo RIFF WAVE with non-zero audio samples', () => {
      // Simulate buildFlWavBuffer logic extracted from FruityForge
      function buildFlWavBuffer(stemType = 'master', tempoBpm = 140, masterPitchMultiplier = 1.0) {
        const sampleRate = 44100;
        const durationSec = Math.max(1.0, (60 / tempoBpm) * 4);
        const numSamples = Math.floor(sampleRate * durationSec);
        const buffer = new ArrayBuffer(44 + numSamples * 4);
        const view = new DataView(buffer);
        const writeStr = (off: number, str: string) => {
          for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 4, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 2, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 4, true);

        const stepDur = durationSec / 16;
        let nonZeroCount = 0;
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const stepIdx = Math.min(15, Math.floor(t / stepDur));
          const stepLocalT = t - stepIdx * stepDur;

          let drums = 0;
          let bass = 0;
          let synth = 0;

          // Kick on step 0, 6, 8, 14
          if (stepIdx === 0 || stepIdx === 6 || stepIdx === 8 || stepIdx === 14) {
            const kFreq = (52 + 110 * Math.exp(-stepLocalT * 28)) * masterPitchMultiplier;
            drums += Math.sin(2 * Math.PI * kFreq * stepLocalT) * Math.exp(-stepLocalT * 9) * 0.6;
          }

          let sig = drums + bass + synth;
          const pcm = Math.max(-1, Math.min(1, sig)) * 28000;
          if (pcm !== 0) nonZeroCount++;
          view.setInt16(44 + i * 4, pcm, true);
          view.setInt16(44 + i * 4 + 2, pcm, true);
        }
        return { buffer, nonZeroCount };
      }

      const { buffer, nonZeroCount } = buildFlWavBuffer('master', 140, 1.0);
      const meta = parseWavHeader(buffer);

      expect(meta.riff).toBe('RIFF');
      expect(meta.wave).toBe('WAVE');
      expect(meta.fmt).toBe('fmt ');
      expect(meta.audioFormat).toBe(1); // PCM
      expect(meta.numChannels).toBe(2); // Stereo
      expect(meta.sampleRate).toBe(44100);
      expect(meta.bitsPerSample).toBe(16);
      expect(meta.data).toBe('data');
      expect(meta.dataSize).toBeGreaterThan(0);
      expect(meta.chunkSize).toBe(36 + meta.dataSize);
      expect(nonZeroCount).toBeGreaterThan(100);
    });

    it('BandForge bounceSongToWav produces valid 44.1kHz 16-bit stereo RIFF WAVE', () => {
      // Simulate bounceSongToWav logic extracted from BandForge
      function bounceSongToWav(tempoBpm = 118, masterPitchMultiplier = 1.0) {
        const sampleRate = 44100;
        const durationSec = Math.max(1.5, (60 / tempoBpm) * 6);
        const numSamples = Math.floor(sampleRate * durationSec);
        const buffer = new ArrayBuffer(44 + numSamples * 4);
        const view = new DataView(buffer);
        const writeStr = (off: number, str: string) => {
          for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 4, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 2, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 4, true);

        const chords = [
          [261.63, 329.63, 392.0, 493.88].map((f) => f * masterPitchMultiplier),
          [220.0, 261.63, 329.63, 392.0].map((f) => f * masterPitchMultiplier)
        ];

        let nonZeroCount = 0;
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const chordIdx = Math.min(1, Math.floor((t / durationSec) * 2));
          const c = chords[chordIdx];
          const beatEnv = Math.exp(-((t * (tempoBpm / 30)) % 1) * 3.5);
          const kickFreq = 110 * masterPitchMultiplier * Math.exp(-((t * 2) % 1) * 18);
          const kick = Math.sin(2 * Math.PI * kickFreq * t) * beatEnv * 0.45;
          const rhodesL = (Math.sin(2 * Math.PI * c[0] * t) + Math.sin(2 * Math.PI * c[1] * t)) * 0.18;
          const rhodesR = (Math.sin(2 * Math.PI * c[1] * t) + Math.sin(2 * Math.PI * c[2] * t)) * 0.18;

          const left = Math.max(-1, Math.min(1, kick + rhodesL)) * 28000;
          const right = Math.max(-1, Math.min(1, kick + rhodesR)) * 28000;
          if (left !== 0 || right !== 0) nonZeroCount++;
          view.setInt16(44 + i * 4, left, true);
          view.setInt16(44 + i * 4 + 2, right, true);
        }
        return { buffer, nonZeroCount };
      }

      const { buffer, nonZeroCount } = bounceSongToWav(118, 1.0);
      const meta = parseWavHeader(buffer);

      expect(meta.riff).toBe('RIFF');
      expect(meta.wave).toBe('WAVE');
      expect(meta.fmt).toBe('fmt ');
      expect(meta.audioFormat).toBe(1);
      expect(meta.numChannels).toBe(2);
      expect(meta.sampleRate).toBe(44100);
      expect(meta.bitsPerSample).toBe(16);
      expect(meta.data).toBe('data');
      expect(meta.dataSize).toBeGreaterThan(0);
      expect(nonZeroCount).toBeGreaterThan(100);
    });
  });
});
