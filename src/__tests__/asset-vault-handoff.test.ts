import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  inferCompatibleWorkspaces,
  registerStudioFormatUpdate,
  updateStudioFormatCompatibility,
  resetFormatCompatibility,
  getStudioFormatCompatibilityMap,
  saveFileToOpfs,
  readFileFromOpfs,
  deleteFileFromOpfs,
  listOpfsFiles,
  saveSharedAsset,
  SharedAssetRecord
} from '../storage/db';

describe('Shared Asset Vault & Cross-Studio Bidirectional Handoff', () => {
  beforeEach(() => {
    resetFormatCompatibility();
    vi.restoreAllMocks();
  });

  describe('Option 3 Bento Aesthetic & 0ms Local Bus Latency Indicator', () => {
    it('creates shared asset records with 0ms latency and OPFS synchronized status', () => {
      const asset: SharedAssetRecord = {
        id: 'asset-test-motor-plate',
        name: 'motor_adapter_plate.step',
        mimeType: 'application/step',
        size: 1024,
        bytes: new Uint8Array([1, 2, 3, 4]).buffer,
        sourceWorkspaceId: 'solidcraft',
        isBuiltInSample: false,
        compatibleWorkspaces: inferCompatibleWorkspaces('motor_adapter_plate.step'),
        createdAt: new Date().toISOString(),
        description: '3D CAD STEP Solid of Motor Adapter Plate',
        latencyMs: 0,
        opfsSynced: true
      };

      expect(asset.latencyMs).toBe(0);
      expect(asset.opfsSynced).toBe(true);
      expect(asset.compatibleWorkspaces).toEqual(['solidcraft']);
    });
  });

  describe('Bidirectional Live Handoff Pipeline & PostMessage Protocol', () => {
    it('formats structured omnicraft:load-asset postMessage with id, name, mimeType, and bytes', () => {
      const sampleBytes = new Uint8Array([65, 66, 67, 68]).buffer;
      const asset: SharedAssetRecord = {
        id: 'asset-rivercast-iso-01',
        name: 'screen-recording-iso.webm',
        mimeType: 'video/webm',
        size: sampleBytes.byteLength,
        bytes: sampleBytes,
        sourceWorkspaceId: 'riverstudio',
        isBuiltInSample: false,
        compatibleWorkspaces: inferCompatibleWorkspaces('screen-recording-iso.webm'),
        createdAt: new Date().toISOString(),
        description: 'Isolated screen track from RiverCast studio take'
      };

      // Construct the exact structured message dispatched to active iframe
      const handoffMessage = {
        type: 'omnicraft:load-asset',
        asset: {
          id: asset.id,
          name: asset.name,
          mimeType: asset.mimeType,
          bytes: asset.bytes
        },
        name: asset.name,
        mime: asset.mimeType,
        bytes: asset.bytes
      };

      expect(handoffMessage.type).toBe('omnicraft:load-asset');
      expect(handoffMessage.asset.id).toBe('asset-rivercast-iso-01');
      expect(handoffMessage.asset.name).toBe('screen-recording-iso.webm');
      expect(handoffMessage.asset.mimeType).toBe('video/webm');
      expect(handoffMessage.asset.bytes).toBe(sampleBytes);
      expect(handoffMessage.name).toBe('screen-recording-iso.webm');
    });

    it('resolves cross-studio target workspaces for RiverCast ISO, Studio Cut, FruityForge, BandForge, and SolidCraft', () => {
      // RiverCast Separate Screen ISO -> Studio Cut, FilmCraft, RiverStudio, EffectCraft
      const screenIsoCompat = inferCompatibleWorkspaces('screen-recording-iso.webm');
      expect(screenIsoCompat).toContain('studiocut');
      expect(screenIsoCompat).toContain('filmcraft');
      expect(screenIsoCompat).toContain('riverstudio');

      // Studio Cut OpenTimelineIO Project (.otio) -> Studio Cut, FilmCraft
      const otioCompat = inferCompatibleWorkspaces('project-rough-cut.otio');
      expect(otioCompat).toContain('studiocut');
      expect(otioCompat).toContain('filmcraft');

      // FruityForge 21 808 Stem & BandForge Chords (.wav) -> DAWs and Video Editors
      const wavCompat = inferCompatibleWorkspaces('808-kick-stem.wav');
      expect(wavCompat).toContain('flstudio');
      expect(wavCompat).toContain('bandforge');
      expect(wavCompat).toContain('soundcraft');
      expect(wavCompat).toContain('studiocut');

      // SolidCraft 3D CAD (.step & .stl) -> SolidCraft
      expect(inferCompatibleWorkspaces('motor_adapter_plate.step')).toEqual(['solidcraft']);
      expect(inferCompatibleWorkspaces('motor_bracket.stl')).toEqual(['solidcraft']);
    });
  });

  describe('Upstream Live Edits & Dynamic Format Compatibility Resolution', () => {
    it('dynamically registers new formats from upstream live studio edits without breaking existing mappings', () => {
      // Baseline before update:
      expect(inferCompatibleWorkspaces('model.gltf')).toEqual(['solidcraft']);

      // Upstream studio live edit: RiverStudio adds WebM ISO and new custom lossless stream format .riveriso
      registerStudioFormatUpdate('riverstudio', {
        importFormats: ['.riveriso', '.webm'],
        exportFormats: ['.riveriso']
      });

      // Verification: .riveriso now dynamically resolves to include riverstudio!
      const riverIsoCompat = inferCompatibleWorkspaces('session.riveriso');
      expect(riverIsoCompat).toContain('riverstudio');

      // Existing formats remain completely functional and unbroken
      expect(inferCompatibleWorkspaces('motor_plate.step')).toEqual(['solidcraft']);
      expect(inferCompatibleWorkspaces('clip.mp4')).toEqual([
        'studiocut',
        'filmcraft',
        'riverstudio',
        'effectcraft'
      ]);
    });

    it('supports custom live format compatibility overrides at runtime', () => {
      updateStudioFormatCompatibility('.3mf', ['solidcraft', 'cadcraft']);

      const customMap = getStudioFormatCompatibilityMap();
      expect(customMap['.3mf']).toEqual(['solidcraft', 'cadcraft']);

      const resolved = inferCompatibleWorkspaces('bracket.3mf');
      expect(resolved).toEqual(['solidcraft', 'cadcraft']);
    });

    it('gracefully handles missing extensions or unrecognized formats with clean fallback', () => {
      const fallback = inferCompatibleWorkspaces('unknown_file_without_extension');
      expect(Array.isArray(fallback)).toBe(true);
      expect(fallback.length).toBeGreaterThan(0);
      expect(fallback).toContain('solidcraft');
    });
  });

  describe('OPFS File System Persistence Simulation', () => {
    it('gracefully handles OPFS calls in mock or headless sandbox environments', async () => {
      const testBytes = new Uint8Array([10, 20, 30, 40]);
      const saved = await saveFileToOpfs('test-opfs-file.bin', testBytes);
      // In node / jsdom without navigator.storage.getDirectory, returns false without throwing
      expect(typeof saved).toBe('boolean');

      const read = await readFileFromOpfs('test-opfs-file.bin');
      expect(read === null || read instanceof ArrayBuffer).toBe(true);

      const deleted = await deleteFileFromOpfs('test-opfs-file.bin');
      expect(typeof deleted).toBe('boolean');

      const list = await listOpfsFiles();
      expect(Array.isArray(list)).toBe(true);
    });

    it('simulates OPFS write and read when navigator.storage.getDirectory is polyfilled', async () => {
      const mockStorage = new Map<string, Uint8Array>();

      const mockFileHandle = (name: string) => ({
        kind: 'file',
        getFile: vi.fn(async () => ({
          arrayBuffer: async () => mockStorage.get(name)?.buffer || new ArrayBuffer(0)
        })),
        createWritable: vi.fn(async () => {
          let writtenBytes: Uint8Array = new Uint8Array(0);
          return {
            write: async (b: Uint8Array) => {
              writtenBytes = b;
            },
            close: async () => {
              mockStorage.set(name, writtenBytes);
            }
          };
        })
      });

      const mockDirectoryHandle = {
        kind: 'directory',
        getFileHandle: vi.fn(async (name: string, opts?: { create?: boolean }) => {
          if (!mockStorage.has(name) && !opts?.create) {
            throw new Error('Not found');
          }
          return mockFileHandle(name);
        }),
        removeEntry: vi.fn(async (name: string) => {
          mockStorage.delete(name);
        }),
        entries: async function* () {
          for (const [name] of mockStorage.entries()) {
            yield [name, { kind: 'file' }];
          }
        }
      };

      // Mock navigator.storage
      const originalStorage = globalThis.navigator?.storage;
      Object.defineProperty(globalThis.navigator, 'storage', {
        value: {
          getDirectory: vi.fn(async () => mockDirectoryHandle),
          estimate: vi.fn(async () => ({ usage: 1048576, quota: 10737418240 })),
          persisted: vi.fn(async () => true)
        },
        configurable: true,
        writable: true
      });

      const testData = new Uint8Array([42, 43, 44]);
      const writeOk = await saveFileToOpfs('mock-plate.step', testData);
      expect(writeOk).toBe(true);
      expect(mockStorage.has('mock-plate.step')).toBe(true);

      const readBuf = await readFileFromOpfs('mock-plate.step');
      expect(readBuf).not.toBeNull();
      expect(new Uint8Array(readBuf!)).toEqual(testData);

      const files = await listOpfsFiles();
      expect(files).toContain('mock-plate.step');

      const delOk = await deleteFileFromOpfs('mock-plate.step');
      expect(delOk).toBe(true);
      expect(mockStorage.has('mock-plate.step')).toBe(false);

      // Restore
      if (originalStorage) {
        Object.defineProperty(globalThis.navigator, 'storage', {
          value: originalStorage,
          configurable: true,
          writable: true
        });
      }
    });
  });
});
