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

export async function saveStoredFile(record: StoredFileRecord): Promise<StoredFileRecord> {
  const db = await openDatabase();
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').put(asset);
    tx.oncomplete = () => resolve(asset);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSharedAsset(assetId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').delete(assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function inferCompatibleWorkspaces(fileName: string): string[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.sc') || lower.endsWith('.step') || lower.endsWith('.stp') || lower.endsWith('.stl')) {
    return ['solidcraft'];
  }
  if (lower.endsWith('.dxf') || lower.endsWith('.dwg')) {
    return ['cadcraft'];
  }
  if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) {
    return ['studiocut', 'filmcraft', 'riverstudio', 'effectcraft'];
  }
  if (lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.flac')) {
    return ['bandforge', 'flstudio', 'soundcraft', 'studiocut', 'filmcraft', 'effectcraft'];
  }
  if (lower.endsWith('.svg')) {
    return ['vectorcraft', 'figcraft', 'designcraft', 'deckcraft'];
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
    return ['photocraft', 'lightcraft', 'filmcraft', 'effectcraft', 'designcraft', 'figcraft', 'deckcraft'];
  }
  if (lower.endsWith('.pdf')) {
    return ['pdfcraft', 'designcraft', 'vectorcraft'];
  }
  if (lower.endsWith('.docx') || lower.endsWith('.md') || lower.endsWith('.txt')) {
    return ['wordcraft'];
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    return ['gridcraft'];
  }
  if (lower.endsWith('.pptx')) {
    return ['deckcraft'];
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
        notes: 'Parametric 60x60x8mm motor mount concept plate with center shaft bore. Ready for STEP & STL manufacturing export.',
        tags: ['3D CAD', 'Parametric', 'Verified Workflow']
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
        notes: 'Multi-track timeline project referencing mosaic-test-clip.mp4 with razor split and trim points.',
        tags: ['Video', 'Timeline', 'Verified Workflow']
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
        notes: 'Layered raster composition using mosaic-test-image.png with non-destructive adjustments.',
        tags: ['Photo', 'Raster', 'Verified Workflow']
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
    throw new Error('Invalid Mosaic Forge backup bundle.');
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
