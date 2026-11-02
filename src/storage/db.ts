export const DB_NAME = 'mosaic-forge-db';
export const DB_VERSION = 1;
export const SCHEMA_VERSION = '1.0.0';

export interface MediaReference {
  assetId: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  lastVerifiedAt: string;
}

export interface SuiteProject {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  nativeFileName: string | null;
  storedSnapshotFileId: string | null;
  mediaReferences: MediaReference[];
  notes: string;
  tags: string[];
}

export interface StoredFileRecord {
  id: string;
  projectId: string | null;
  name: string;
  mimeType: string;
  size: number;
  bytes: ArrayBuffer;
  sourceWorkspaceId: string;
  kind: 'snapshot' | 'export' | 'import';
  createdAt: string;
}

export interface SharedAssetRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  bytes: ArrayBuffer;
  sourceWorkspaceId: string;
  isBuiltInSample: boolean;
  sampleUrl?: string;
  compatibleWorkspaces: string[];
  createdAt: string;
  description: string;
  latencyMs?: number;
  opfsSynced?: boolean;
}

export interface BackupBundle {
  schemaVersion: string;
  exportedAt: string;
  projects: SuiteProject[];
  files: Array<Omit<StoredFileRecord, 'bytes'> & { base64Bytes: string }>;
  assets: Array<Omit<SharedAssetRecord, 'bytes'> & { base64Bytes: string }>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('workspaceId', 'workspaceId', { unique: false });
        projects.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('files')) {
        const files = db.createObjectStore('files', { keyPath: 'id' });
        files.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('assets')) {
        const assets = db.createObjectStore('assets', { keyPath: 'id' });
        assets.createIndex('name', 'name', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listProjects(): Promise<SuiteProject[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const req = tx.objectStore('projects').getAll();
    req.onsuccess = () => {
      const list = (req.result as SuiteProject[]) || [];
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: SuiteProject): Promise<SuiteProject> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put(project);
    tx.oncomplete = () => resolve(project);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'files'], 'readwrite');
    tx.objectStore('projects').delete(projectId);
    const fileStore = tx.objectStore('files');
    const idx = fileStore.index('projectId');
    const cursorReq = idx.openCursor(IDBKeyRange.only(projectId));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Origin-Private File System (OPFS) Persistence Helpers
 * Optional disk copies; IndexedDB remains the library record store.
 */
export async function saveFileToOpfs(fileName: string, bytes: ArrayBuffer | Uint8Array): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      await writable.write(u8);
      await writable.close();
      return true;
    }
  } catch {
    // Graceful fallback for test or restricted sandbox environments
  }
  return false;
}

export async function readFileFromOpfs(fileName: string): Promise<ArrayBuffer | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(fileName, { create: false });
      const file = await handle.getFile();
      return await file.arrayBuffer();
    }
  } catch {
    // Not found or unsupported
  }
  return null;
}

export async function deleteFileFromOpfs(fileName: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(fileName);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export async function listOpfsFiles(): Promise<string[]> {
  const fileNames: string[] = [];
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const root = await navigator.storage.getDirectory();
      // @ts-expect-error entries() is standard on FileSystemDirectoryHandle
      for await (const [name, handle] of root.entries()) {
        if (handle.kind === 'file') {
          fileNames.push(name);
        }
      }
    }
  } catch {
    // Ignore
  }
  return fileNames;
}

export async function saveStoredFile(record: StoredFileRecord): Promise<StoredFileRecord> {
  const db = await openDatabase();
  await saveFileToOpfs(record.name, record.bytes);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredFile(fileId: string): Promise<StoredFileRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(fileId);
    req.onsuccess = () => resolve((req.result as StoredFileRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listStoredFiles(): Promise<StoredFileRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').getAll();
    req.onsuccess = () => {
      const list = (req.result as StoredFileRecord[]) || [];
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listSharedAssets(): Promise<SharedAssetRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readonly');
    const req = tx.objectStore('assets').getAll();
    req.onsuccess = () => {
      const list = (req.result as SharedAssetRecord[]) || [];
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSharedAsset(asset: SharedAssetRecord): Promise<SharedAssetRecord> {
  const db = await openDatabase();
  const record: SharedAssetRecord = {
    ...asset,
    opfsSynced: await saveFileToOpfs(asset.name, asset.bytes)
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSharedAsset(assetId: string): Promise<void> {
  const db = await openDatabase();
  const asset = await new Promise<SharedAssetRecord | null>((resolve) => {
    const tx = db.transaction('assets', 'readonly');
    const req = tx.objectStore('assets').get(assetId);
    req.onsuccess = () => resolve((req.result as SharedAssetRecord) || null);
    req.onerror = () => resolve(null);
  });
  if (asset) {
    await deleteFileFromOpfs(asset.name);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').delete(assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Dynamic in-memory registry of live upstream format capabilities
const liveStudioFormatRegistry = new Map<
  string,
  {
    importFormats: Set<string>;
    exportFormats: Set<string>;
    nativeFormats: Set<string>;
  }
>();

// Custom extension-to-workspaces mappings registered at runtime
const customFormatCompatibilityMap = new Map<string, string[]>();

export function registerStudioFormatUpdate(
  workspaceId: string,
  formats: {
    importFormats?: string[];
    exportFormats?: string[];
    nativeFormats?: string[];
  }
): void {
  let existing = liveStudioFormatRegistry.get(workspaceId);
  if (!existing) {
    existing = {
      importFormats: new Set(),
      exportFormats: new Set(),
      nativeFormats: new Set()
    };
    liveStudioFormatRegistry.set(workspaceId, existing);
  }

  const clean = (fmt: string) => {
    const match = fmt.toLowerCase().match(/\.[a-z0-9_-]+/);
    return match ? match[0] : fmt.toLowerCase().trim();
  };

  formats.importFormats?.forEach((f) => existing!.importFormats.add(clean(f)));
  formats.exportFormats?.forEach((f) => existing!.exportFormats.add(clean(f)));
  formats.nativeFormats?.forEach((f) => existing!.nativeFormats.add(clean(f)));
}

export function updateStudioFormatCompatibility(
  extensionOrFormat: string,
  workspaces: string[]
): void {
  const ext = extensionOrFormat.startsWith('.')
    ? extensionOrFormat.toLowerCase()
    : `.${extensionOrFormat.toLowerCase()}`;
  customFormatCompatibilityMap.set(ext, [...workspaces]);
}

export function resetFormatCompatibility(): void {
  liveStudioFormatRegistry.clear();
  customFormatCompatibilityMap.clear();
}

export function getStudioFormatCompatibilityMap(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [ext, wsList] of customFormatCompatibilityMap.entries()) {
    result[ext] = [...wsList];
  }
  return result;
}

export function inferCompatibleWorkspaces(
  fileName: string,
  dynamicOverrides?: Record<string, string[]>
): string[] {
  const lower = fileName.toLowerCase();
  const extMatch = lower.match(/\.[a-z0-9_-]+$/);
  const ext = extMatch ? extMatch[0] : '';

  // 1. Dynamic caller overrides
  if (dynamicOverrides && ext && dynamicOverrides[ext]) {
    return [...dynamicOverrides[ext]];
  }

  // 2. Custom live format registrations
  if (ext && customFormatCompatibilityMap.has(ext)) {
    return [...customFormatCompatibilityMap.get(ext)!];
  }

  // 3. Live studio format capabilities dynamically registered by upstream editors
  const dynamicLiveMatches: string[] = [];
  if (ext && liveStudioFormatRegistry.size > 0) {
    for (const [wsId, formats] of liveStudioFormatRegistry.entries()) {
      if (formats.importFormats.has(ext) || formats.nativeFormats.has(ext)) {
        if (!dynamicLiveMatches.includes(wsId)) {
          dynamicLiveMatches.push(wsId);
        }
      }
    }
  }

  // 4. Canonical suite mappings with exact ordering preserved for backwards compatibility
  let canonicalMatches: string[] | null = null;
  if (lower.endsWith('.sc') || lower.endsWith('.step') || lower.endsWith('.stp') || lower.endsWith('.stl')) {
    canonicalMatches = ['solidcraft'];
  } else if (lower.endsWith('.dxf') || lower.endsWith('.dwg')) {
    canonicalMatches = ['cadcraft'];
  } else if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) {
    canonicalMatches = ['studiocut', 'filmcraft', 'riverstudio', 'effectcraft'];
  } else if (lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.flac')) {
    canonicalMatches = ['bandforge', 'flstudio', 'soundcraft', 'studiocut', 'filmcraft', 'effectcraft'];
  } else if (lower.endsWith('.svg')) {
    canonicalMatches = ['vectorcraft', 'figcraft', 'designcraft', 'deckcraft'];
  } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
    canonicalMatches = ['photocraft', 'lightcraft', 'filmcraft', 'effectcraft', 'designcraft', 'figcraft', 'deckcraft'];
  } else if (lower.endsWith('.pdf')) {
    canonicalMatches = ['pdfcraft', 'designcraft', 'vectorcraft'];
  } else if (lower.endsWith('.docx') || lower.endsWith('.md') || lower.endsWith('.txt')) {
    canonicalMatches = ['wordcraft'];
  } else if (lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    canonicalMatches = ['gridcraft'];
  } else if (lower.endsWith('.pptx')) {
    canonicalMatches = ['deckcraft'];
  } else if (lower.endsWith('.otio') || lower.endsWith('.fcproj')) {
    canonicalMatches = ['studiocut', 'filmcraft'];
  } else if (lower.endsWith('.ogg') || lower.endsWith('.m4a') || lower.endsWith('.mid') || lower.endsWith('.midi')) {
    canonicalMatches = ['bandforge', 'flstudio', 'soundcraft'];
  } else if (lower.endsWith('.obj') || lower.endsWith('.gltf') || lower.endsWith('.glb')) {
    canonicalMatches = ['solidcraft'];
  }

  if (canonicalMatches) {
    if (dynamicLiveMatches.length > 0) {
      // Merge any new upstream live additions without breaking or duplicating
      const merged = [...canonicalMatches];
      for (const ws of dynamicLiveMatches) {
        if (!merged.includes(ws)) {
          merged.push(ws);
        }
      }
      return merged;
    }
    return canonicalMatches;
  }

  if (dynamicLiveMatches.length > 0) {
    return dynamicLiveMatches;
  }

  return ['photocraft', 'filmcraft', 'solidcraft'];
}

const BUILTIN_SAMPLES: Array<{
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sourceWorkspaceId: string;
  description: string;
}> = [
  {
    id: 'sample-video-mp4',
    name: 'mosaic-test-clip.mp4',
    url: '/sample-assets/mosaic-test-clip.mp4',
    mimeType: 'video/mp4',
    sourceWorkspaceId: 'filmcraft',
    description: 'Self-generated 4s 640x360 @ 30fps H.264 + 440Hz AAC calibration clip for FilmCraft & EffectCraft.'
  },
  {
    id: 'sample-image-png',
    name: 'mosaic-test-image.png',
    url: '/sample-assets/mosaic-test-image.png',
    mimeType: 'image/png',
    sourceWorkspaceId: 'photocraft',
    description: 'Self-generated 640x480 RGB calibration target for PhotoCraft & LightCraft.'
  },
  {
    id: 'sample-audio-wav',
    name: 'mosaic-tone.wav',
    url: '/sample-assets/mosaic-tone.wav',
    mimeType: 'audio/wav',
    sourceWorkspaceId: 'soundcraft',
    description: 'Self-generated 2s 44.1kHz PCM sine tone for SoundCraft & FilmCraft.'
  },
  {
    id: 'sample-vector-svg',
    name: 'mosaic-badge.svg',
    url: '/sample-assets/mosaic-badge.svg',
    mimeType: 'image/svg+xml',
    sourceWorkspaceId: 'vectorcraft',
    description: 'Self-generated vector studio badge for VectorCraft & FigCraft.'
  },
  {
    id: 'sample-cad-dxf',
    name: 'motor-plate-2d.dxf',
    url: '/sample-assets/motor-plate-2d.dxf',
    mimeType: 'application/dxf',
    sourceWorkspaceId: 'cadcraft',
    description: 'Self-generated 60x60mm 2D DXF motor plate drawing with 12mm center bore for CADCraft.'
  }
];

export async function ensureSeedData(): Promise<void> {
  const existingAssets = await listSharedAssets();
  const existingIds = new Set(existingAssets.map((a) => a.id));

  for (const sample of BUILTIN_SAMPLES) {
    if (existingIds.has(sample.id)) continue;
    try {
      const resp = await fetch(sample.url);
      if (!resp.ok) continue;
      const bytes = await resp.arrayBuffer();
      await saveSharedAsset({
        id: sample.id,
        name: sample.name,
        mimeType: sample.mimeType,
        size: bytes.byteLength,
        bytes,
        sourceWorkspaceId: sample.sourceWorkspaceId,
        isBuiltInSample: true,
        sampleUrl: sample.url,
        compatibleWorkspaces: inferCompatibleWorkspaces(sample.name),
        createdAt: new Date().toISOString(),
        description: sample.description
      });
    } catch {
      // ignore offline/test environment fetch misses
    }
  }

  const existingProjects = await listProjects();
  if (existingProjects.length === 0) {
    const now = new Date().toISOString();
    const starterProjects: SuiteProject[] = [
      {
        id: 'proj-solidcraft-motor-mount',
        name: 'NEMA-17 Motor Adapter Plate (3D CAD)',
        workspaceId: 'solidcraft',
        createdAt: now,
        updatedAt: now,
        nativeFileName: 'motor_adapter_plate.sc',
        storedSnapshotFileId: null,
        mediaReferences: [],
        notes: 'Project setup for a motor adapter concept. Open Model to create geometry and save a native project.',
        tags: ['3D CAD', 'Parametric', 'Project setup']
      },
      {
        id: 'proj-filmcraft-launch-cut',
        name: 'Studio Calibration Reel (Video Cut)',
        workspaceId: 'filmcraft',
        createdAt: now,
        updatedAt: now,
        nativeFileName: 'calibration-reel.fcproj',
        storedSnapshotFileId: null,
        mediaReferences: [
          {
            assetId: 'sample-video-mp4',
            fileName: 'mosaic-test-clip.mp4',
            mimeType: 'video/mp4',
            byteLength: 249129,
            lastVerifiedAt: now
          }
        ],
        notes: 'Project setup referencing the sample clip. Create and save the timeline inside Cut.',
        tags: ['Video', 'Timeline', 'Project setup']
      },
      {
        id: 'proj-photocraft-color-study',
        name: 'Color Calibration Plate (Layered Photo)',
        workspaceId: 'photocraft',
        createdAt: now,
        updatedAt: now,
        nativeFileName: 'color-plate.pht',
        storedSnapshotFileId: null,
        mediaReferences: [
          {
            assetId: 'sample-image-png',
            fileName: 'mosaic-test-image.png',
            mimeType: 'image/png',
            byteLength: 2016,
            lastVerifiedAt: now
          }
        ],
        notes: 'Project setup referencing the sample image. Create and save the composition inside Photo.',
        tags: ['Photo', 'Raster', 'Project setup']
      }
    ];
    for (const proj of starterProjects) {
      await saveProject(proj);
    }
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportBackupBundle(): Promise<BackupBundle> {
  const [projects, files, assets] = await Promise.all([
    listProjects(),
    listStoredFiles(),
    listSharedAssets()
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    files: files.map(({ bytes, ...rest }) => ({
      ...rest,
      base64Bytes: arrayBufferToBase64(bytes)
    })),
    assets: assets
      .filter((a) => !a.isBuiltInSample)
      .map(({ bytes, ...rest }) => ({
        ...rest,
        base64Bytes: arrayBufferToBase64(bytes)
      }))
  };
}

export async function importBackupBundle(bundle: BackupBundle): Promise<{
  projectsImported: number;
  filesImported: number;
  assetsImported: number;
}> {
  if (!bundle || typeof bundle !== 'object' || !Array.isArray(bundle.projects)) {
    throw new Error('Invalid OmniCraft OS backup bundle.');
  }

  for (const project of bundle.projects) {
    await saveProject(project);
  }

  let filesImported = 0;
  if (Array.isArray(bundle.files)) {
    for (const f of bundle.files) {
      const { base64Bytes, ...rest } = f;
      await saveStoredFile({
        ...rest,
        bytes: base64ToArrayBuffer(base64Bytes)
      });
      filesImported++;
    }
  }

  let assetsImported = 0;
  if (Array.isArray(bundle.assets)) {
    for (const a of bundle.assets) {
      const { base64Bytes, ...rest } = a;
      await saveSharedAsset({
        ...rest,
        bytes: base64ToArrayBuffer(base64Bytes)
      });
      assetsImported++;
    }
  }

  return {
    projectsImported: bundle.projects.length,
    filesImported,
    assetsImported
  };
}

export interface StorageHealthReport {
  usageBytes: number;
  quotaBytes: number;
  persisted: boolean;
  opfsAvailable: boolean;
}

export async function inspectStorageHealth(): Promise<StorageHealthReport> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let persisted = false;
  let opfsAvailable = false;

  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    }
    if (navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }
    if (navigator.storage && 'getDirectory' in navigator.storage) {
      await navigator.storage.getDirectory();
      opfsAvailable = true;
    }
  } catch {
    // ignore in restricted environments
  }

  return {
    usageBytes,
    quotaBytes,
    persisted,
    opfsAvailable
  };
}
