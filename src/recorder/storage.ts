export interface RecordingFile { name: string; kind: string; mime: string; bytes: number; chunks: number; error?: string; }
export interface SessionManifest {
  version: 1; id: string; createdAt: string; state: 'preparing' | 'recording' | 'paused' | 'complete' | 'interrupted';
  mode: 'capture' | 'test'; durationMs: number; files: RecordingFile[];
  events: { type: string; offsetMs: number; detail?: string }[];
  routing: { screen: string; camera: string; microphone: string };
}
// One closed file per chunk survives tab interruption; no recording-sized arrays in RAM.
export class RecordingStore {
  readonly files = new Map<string, RecordingFile>();
  private root?: FileSystemDirectoryHandle;
  private db?: IDBDatabase;
  private queue = Promise.resolve();
  private manifestQueue = Promise.resolve();
  private pending = 0;
  private pendingBytes = 0;
  private lastSpaceCheck = 0;
  error?: Error;
  constructor(readonly manifest: SessionManifest, private onFailure: (error: Error) => void) {}
  async init(recover = false) {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      const recordings = await root.getDirectoryHandle('omnicraft-recordings', { create: true });
      this.root = await recordings.getDirectoryHandle(this.manifest.id, { create: true });
    } else {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('omnicraft-recordings', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('chunks');
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
    }
    if (!recover) { await this.checkSpace(); await this.saveManifest(); }
  }
  private async checkSpace() {
    if (this.lastSpaceCheck > 0 && performance.now() - this.lastSpaceCheck < 5000) return;
    const estimate = await navigator.storage?.estimate?.();
    if (estimate?.quota && estimate.usage !== undefined && estimate.quota - estimate.usage < 32 * 1024 * 1024)
      throw new Error('Browser storage is nearly full. Recording stopped; saved chunks remain available.');
    this.lastSpaceCheck = performance.now();
  }
  private async put(key: string, value: Blob) {
    if (this.root) {
      const file = await this.root.getFileHandle(key, { create: true });
      const writer = await file.createWritable();
      try { await writer.write(value); await writer.close(); } catch (e) { await writer.abort().catch(() => {}); throw e; }
    } else {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction('chunks', 'readwrite');
        tx.objectStore('chunks').put(value, `${this.manifest.id}/${key}`);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    }
  }
  private async get(key: string): Promise<Blob> {
    if (this.root) return (await this.root.getFileHandle(key)).getFile();
    return new Promise((resolve, reject) => {
      const req = this.db!.transaction('chunks').objectStore('chunks').get(`${this.manifest.id}/${key}`);
      req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error(`Missing chunk ${key}`));
      req.onerror = () => reject(req.error);
    });
  }
  register(file: RecordingFile) { this.files.set(file.kind, file); this.manifest.files.push(file); }
  append(kind: string, data: Blob) {
    if (!data.size || this.error) return;
    const file = this.files.get(kind)!;
    this.pending++;
    this.pendingBytes += data.size;
    if (this.pending > 512 || this.pendingBytes > 32 * 1024 * 1024) {
      this.fail(new Error('Storage cannot keep up with capture. Recording stopped at the 32 MB queue limit; saved chunks remain available.'));
      this.pending--; this.pendingBytes -= data.size; return;
    }
    this.queue = this.queue.then(async () => {
      try {
        await this.checkSpace();
        await this.put(`${kind}-${String(file.chunks).padStart(8, '0')}`, data);
        file.chunks++; file.bytes += data.size;
        await this.saveManifest();
      } catch (e) { file.error = String(e); this.fail(e); }
      finally { this.pending--; this.pendingBytes -= data.size; }
    });
  }
  private fail(e: unknown) {
    if (this.error) return;
    this.error = e instanceof Error ? e : new Error(String(e));
    this.manifest.state = 'interrupted'; this.onFailure(this.error);
  }
  saveManifest() {
    const data = new Blob([JSON.stringify(this.manifest, null, 2)], { type: 'application/json' });
    this.manifestQueue = this.manifestQueue.catch(() => {}).then(() => this.put('session.json', data));
    return this.manifestQueue;
  }
  async drain() { await this.queue; await this.manifestQueue; }
  async file(kind: string): Promise<Blob> {
    await this.drain();
    const file = this.files.get(kind)!;
    if (!file?.chunks) throw new Error(`No saved data for ${kind}.`);
    if (this.root) {
      // Assemble by streaming disk chunks into a file, using at most one chunk at a time.
      const handle = await this.root.getFileHandle(file.name, { create: true });
      const existing = await handle.getFile();
      if (existing.size === file.bytes && existing.size > 0) return existing;
      const writer = await handle.createWritable();
      try {
        for (let i = 0; i < file.chunks; i++) await writer.write(await this.get(`${kind}-${String(i).padStart(8, '0')}`));
        await writer.close(); return handle.getFile();
      } catch (e) { await writer.abort().catch(() => {}); throw e; }
    }
    const parts: Blob[] = [];
    for (let i = 0; i < file.chunks; i++) parts.push(await this.get(`${kind}-${String(i).padStart(8, '0')}`));
    return new Blob(parts, { type: file.mime });
  }
  async release() { await this.drain(); this.db?.close(); }
}

export async function recoverRecordings(): Promise<RecordingStore[]> {
  const manifests: SessionManifest[] = [];
  if (navigator.storage?.getDirectory) {
    const root = await navigator.storage.getDirectory();
    const recordings = await root.getDirectoryHandle('omnicraft-recordings', { create: true });
    for await (const entry of (recordings as any).values()) {
      if (entry.kind !== 'directory') continue;
      try { manifests.push(JSON.parse(await (await (await entry.getFileHandle('session.json')).getFile()).text())); } catch { /* An empty directory is not a saved session. */ }
    }
  } else {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('omnicraft-recordings', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('chunks');
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    const saved: Blob[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction('chunks').objectStore('chunks').openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(); return; }
        if (String(cursor.key).endsWith('/session.json')) saved.push(cursor.value);
        cursor.continue();
      }; req.onerror = () => reject(req.error);
    });
    for (const blob of saved) {
      try { manifests.push(JSON.parse(await blob.text())); } catch { /* A corrupt manifest cannot be reopened. */ }
    }
    db.close();
  }
  const stores: RecordingStore[] = [];
  for (const manifest of manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!manifest.files.some(f => f.chunks > 0)) continue;
    if (!['complete', 'interrupted'].includes(manifest.state)) {
      manifest.state = 'interrupted';
      manifest.events.push({ type: 'recovered-after-interruption', offsetMs: manifest.durationMs });
    }
    const store = new RecordingStore(manifest, () => {});
    const files = [...manifest.files]; manifest.files = [];
    for (const file of files) store.register(file);
    await store.init(true); stores.push(store);
  }
  return stores;
}
