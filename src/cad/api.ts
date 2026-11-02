export interface CadCommand { id: string; label: string; panel: string; tab: string; enabled: boolean; disabled_reason?: string; }
export interface CadState { name: string; dirty: boolean; revision: number; undo: number; redo: number; bodies: any[]; timeline: any[]; params: any[]; selection: any[]; active_sketch: unknown; units: string; }
export interface CadEngine { execute(command: string, params?: Record<string, unknown>): Promise<any>; request(method: string, params?: Record<string, unknown>): Promise<any>; inspect(): Promise<CadState>; commands(): Promise<CadCommand[]>; }
export interface SavedModel { id?: string; name: string; path: string; at: string; }
export function getSavedModels(): SavedModel[] { try { return JSON.parse(localStorage.getItem('omnicraft-models-v1') || '[]'); } catch { return []; } }
export function rememberModel(value: SavedModel) { const entries = [value, ...getSavedModels().filter(item => (item.id || item.path) !== (value.id || value.path))].slice(0, 30); localStorage.setItem('omnicraft-models-v1', JSON.stringify(entries)); return entries; }
export async function readEngineFile(name: string): Promise<File> {
  const root = await navigator.storage.getDirectory();
  const until = performance.now() + 60000;
  while (performance.now() < until) {
    try { const file = await (await root.getFileHandle(name)).getFile(); if (file.size > 100) return file; } catch { /* Engine writes are asynchronous; wait for the completed file. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The engine has not finished writing the file. Your model is still open; try again.');
}
export function downloadModel(file: Blob, name: string) { const url = URL.createObjectURL(file); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
export async function openEngineFile(engine: CadEngine, iframe: HTMLIFrameElement, file: File) {
  // SolidCraft's synchronous VFS must receive imported bytes, not only an OPFS
  // filename. Use its real browser file-drop route so it registers and opens the
  // file exactly as a user dropping a native project onto the canvas would.
  const target = iframe.contentWindow as any;
  const canvas = target?.document.getElementById('solidcraft_canvas');
  if (!canvas || !target.DataTransfer) throw new Error('This browser cannot pass the file to the CAD engine.');
  const extension = file.name.split('.').pop() || 'sc';
  const name = `omnicraft-open-${crypto.randomUUID()}.${extension}`;
  const transfer = new target.DataTransfer();
  transfer.items.add(new target.File([file], name, { type: file.type }));
  canvas.dispatchEvent(new target.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  const until = performance.now() + 60000;
  while (performance.now() < until) {
    const state = await engine.inspect() as CadState & { path?: string };
    if (state.path?.endsWith(name)) { await engine.request('ui.home', { open: false }); return; }
    const ui = await engine.request('ui.inspect', {});
    if (ui.status?.error) throw new Error(ui.status.text);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('The CAD engine has not opened the file yet. Check its viewport for an import message.');
}
export async function createStarter(engine: CadEngine, shape: string, name: string, dimensions: Record<string, number>) {
  await engine.execute('file.new', { name });
  for (const [parameter, value] of Object.entries(dimensions)) await engine.execute('parameters.add', { name: parameter, expression: String(value), unit: 'mm' });
  await engine.execute('sketch.create', { plane: 'XY', name: 'Base profile' });
  if (shape === 'cylinder') await engine.execute('sketch.circle.center', { center: [0, 0], radius: 'part_width / 2' });
  else await engine.execute('sketch.rectangle.two_point', { p0: ['-part_width / 2', '-part_depth / 2'], p1: ['part_width / 2', 'part_depth / 2'] });
  await engine.execute('sketch.finish', {});
  await engine.execute('solid.extrude', { distance: 'part_thickness', name: 'Base extrusion', body_name: name });
  if (shape === 'plate') {
    await engine.execute('sketch.create', { plane: 'XY', name: 'Hole profiles' });
    await engine.execute('sketch.circle.center', { center: [0, 0], radius: 'center_bore / 2' });
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) await engine.execute('sketch.circle.center', { center: [`${x} * (part_width / 2 - edge_inset)`, `${y} * (part_depth / 2 - edge_inset)`], radius: 'mount_hole / 2' });
    await engine.execute('sketch.finish', {});
    await engine.execute('solid.extrude', { distance: 'part_thickness', operation: 'cut', name: 'Through holes' });
  }
  await engine.request('ui.home', { open: false });
  await engine.request('ui.view', { view: 'iso' });
  await engine.execute('view.fit', {});
}
