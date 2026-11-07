import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, Check, ChevronDown, Circle, Download, FolderOpen, Maximize, Pencil, Plus, Redo2, Save, Search, Undo2 } from 'lucide-react';
import { type CadCommand, type CadEngine, type CadState, type SavedModel, createStarter, downloadModel, getSavedModels, openEngineFile, readEngineFile, rememberModel } from './api';
import './model.css';
import { isDesktopShell } from '../platform';

const LABELS: Record<string, string> = { part_width: 'Width / diameter', part_depth: 'Depth', part_thickness: 'Thickness', center_bore: 'Center bore diameter', mount_hole: 'Mounting hole diameter', edge_inset: 'Hole inset from edge' };
const DEFAULT_DIMENSIONS = { part_width: 80, part_depth: 60, part_thickness: 8, center_bore: 22, mount_hole: 5, edge_inset: 10 };
const EMPTY: CadState = { name: 'Untitled part', bodies: [], timeline: [], params: [], selection: [], dirty: false, revision: 0, undo: 0, redo: 0, active_sketch: null, units: 'mm' };
export interface ModelProjectLink { id: string; name: string; file?: File; }
export function ModelStudio({ onBack, initialProject, onSaved }: { onBack?: () => void; initialProject?: ModelProjectLink; onSaved?: (project: { id: string; name: string; file: File }) => Promise<void> } = {}) {
  const [nativeChrome, setNativeChrome] = useState(() => isDesktopShell() || new URLSearchParams(location.search).get('cad') === 'full');
  const documentId = useRef(initialProject?.id || crypto.randomUUID());
  const initial = useRef(initialProject);
  const newDocument = useRef(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const engine = useRef<CadEngine>();
  const lastRevision = useRef('');
  const partDialog = useRef<HTMLDialogElement>(null);
  const commandDialog = useRef<HTMLDialogElement>(null);
  const [showStartCard, setShowStartCard] = useState(true);
  const [ready, setReady] = useState(false);
  const [engineAttached, setEngineAttached] = useState(false);
  const [bootFailure, setBootFailure] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Loading the modeling engine…');
  const [state, setState] = useState<CadState>(EMPTY);
  const [commands, setCommands] = useState<CadCommand[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<SavedModel[]>(getSavedModels);
  const [shape, setShape] = useState('plate');
  const [name, setName] = useState(initialProject?.name || 'Mounting plate');
  const [dimensions, setDimensions] = useState<Record<string, number>>(DEFAULT_DIMENSIONS);
  const [search, setSearch] = useState('');
  const [measure, setMeasure] = useState<any>();
  const [selectedFeature, setSelectedFeature] = useState<any>();

  async function refresh(full = false) {
    const api = engine.current; if (!api) return;
    const next = await api.inspect(); setState(next);
    const key = `${next.revision}/${JSON.stringify(next.selection)}/${next.active_sketch}`;
    if (!nativeChrome && (full || key !== lastRevision.current)) {
      lastRevision.current = key;
      const [list, values] = await Promise.all([api.commands(), api.execute('parameters.list', { filter: 'user' })]);
      setCommands(list); setParameters(Array.isArray(values) ? values : values.parameters || []);
    }
  }
  useEffect(() => {
    let cancelled = false, pending = false, initialized = false;
    engine.current = undefined; lastRevision.current = '';
    setReady(false); setEngineAttached(false); setBootFailure(false); setError('');
    setState(EMPTY); setParameters([]); setCommands([]); setEdits({});
    async function startup<T>(task: Promise<T>, label: string): Promise<T> {
      let deadline: ReturnType<typeof setTimeout>;
      try { return await Promise.race([task, new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error(`The CAD engine loaded but did not respond while ${label}. Reload Model or use a supported desktop browser.`)), 20000); })]); }
      finally { clearTimeout(deadline!); }
    }
    const started = performance.now();
    const timer = setInterval(async () => {
      if (pending || (initialized && document.visibilityState === 'hidden')) return; pending = true;
      try {
        if (!engine.current) {
          const api = (iframe.current?.contentWindow as (Window & { solidcraft?: CadEngine }) | null)?.solidcraft;
          if (api) {
            engine.current = api;
            if (!cancelled) setEngineAttached(true);
            await startup(api.request('ui.home', { open: false }), 'opening the viewport');
            if (!nativeChrome) {
              await startup(api.request('ui.set', { layout: 'docked', dark: false, showBrowser: true, showTimeline: true }), 'configuring the workspace');
              await startup(api.request('ui.prefs', { history_in_browser: true }), 'configuring feature history');
            }
            if (initial.current?.file) { await openEngineFile(api, iframe.current!, initial.current.file); setMessage('Native project reopened from the suite library.'); }
            else { setMessage('Ready. Start a part or open your design.'); if (initial.current && !nativeChrome) partDialog.current?.showModal(); }
            initialized = true; if (!cancelled) setReady(true);
          } else if (iframe.current?.contentDocument?.getElementById('error')?.textContent) throw Error(iframe.current.contentDocument.getElementById('error')!.textContent!);
          else if (performance.now() - started > 120000) throw Error('The modeling engine is taking longer than expected. Reload this workspace or try another desktop browser.');
        }
        if (!cancelled && engine.current) await refresh();
      } catch (e) { if (!cancelled) { setError((e as Error).message || String(e)); if (!initialized) { setBootFailure(true); clearInterval(timer); } } }
      finally { pending = false; }
    }, nativeChrome ? 3000 : 1200);
    return () => { cancelled = true; clearInterval(timer); };
  }, [attempt, nativeChrome]);
  async function run(label: string, task: (api: CadEngine) => Promise<void>) {
    if (!engine.current || busy) return;
    setBusy(label); setError('');
    try { await task(engine.current); await refresh(true); }
    catch (e) { setError((e as Error).message || String(e)); }
    finally { setBusy(''); }
  }
  async function switchInterface() {
    const api = engine.current;
    if (!api || busy) return;
    setBusy('Switching CAD interface'); setError('');
    try {
      // Serialize the actual engine document before remounting its canvas.
      // This preserves sketches, parameters and bodies across interface modes.
      const current = await api.inspect();
      const filename = `interface-${crypto.randomUUID()}.sc`;
      // The upstream Save As operation can adopt the temporary filename as the
      // design name. A native JSON export preserves the complete named design.
      await api.execute('file.export', { path: `/opfs/${filename}`, format: 'json' });
      initial.current = { id: documentId.current, name: current.name, file: await readEngineFile(filename) };
      setReady(false); setNativeChrome(value => !value);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(''); }
  }
  async function leave() {
    let dirty = state.dirty;
    const liveApi = engine.current || (iframe.current?.contentWindow as (Window & { solidcraft?: CadEngine }) | null)?.solidcraft;
    if (liveApi) {
      let timeout: ReturnType<typeof setTimeout>;
      try { const current = await Promise.race([liveApi.inspect(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('CAD response timed out')), 2000); })]); dirty = current.dirty; }
      catch { dirty = true; }
      finally { clearTimeout(timeout!); }
    }
    if (dirty && !window.confirm('Leave this design? Save a project copy first if you want to keep these changes.')) return;
    if (onBack) onBack(); else window.top!.location.href = '/';
  }
  async function save(download = false) {
    await run('Saving project', async api => {
      const currentName = (await api.inspect()).name || state.name;
      const filename = `model-${crypto.randomUUID()}.sc`;
      await api.execute('file.save', { path: `/opfs/${filename}` });
      const file = await readEngineFile(filename);
      setRecent(rememberModel({ id: documentId.current, name: currentName, path: `/opfs/${filename}`, at: new Date().toISOString() }));
      if (onSaved) await onSaved({ id: documentId.current, name: currentName, file });
      if (download) downloadModel(file, `${currentName.replace(/[^\p{L}\p{N} ._-]/gu, '_') || 'part'}.sc`);
      setMessage(download ? 'Native project download started. Your browser copy is also saved.' : 'Project saved in this browser. Download a backup before clearing browser storage.');
    });
  }
  async function openSaved(path: string) {
    if (state.dirty && !window.confirm('Open another design and discard these unsaved changes?')) return;
    await run('Opening project', async api => { await openEngineFile(api, iframe.current!, await readEngineFile(path.split('/').pop()!)); await api.execute('view.fit', {}); documentId.current = recent.find(item => item.path === path)?.id || crypto.randomUUID(); setEdits({}); setMessage('Project reopened from browser storage.'); });
  }
  async function openFile(file?: File) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { setError('Open a project smaller than 100 MB on this browser workspace.'); return; }
    if (state.dirty && !window.confirm('Open this file and discard unsaved changes?')) return;
    await run('Opening file', async api => {
      await openEngineFile(api, iframe.current!, file); await api.execute('view.fit', {}); documentId.current = crypto.randomUUID(); setEdits({}); setMessage(`Opened ${file.name}.`);
    });
  }
  async function exportPart(format: 'step' | 'stl') {
    await run(`Exporting ${format.toUpperCase()}`, async api => {
      const filename = `export-${crypto.randomUUID()}.${format}`;
      await api.execute('file.export', { path: `/opfs/${filename}`, format, ...(format === 'stl' ? { quality: 'fine' } : {}) });
      const file = await readEngineFile(filename); downloadModel(file, `${state.name.replace(/[^\p{L}\p{N} ._-]/gu, '_') || 'part'}.${format}`);
      setMessage(`${format.toUpperCase()} export download started · ${(file.size / 1024).toFixed(1)} KB.`);
    });
  }
  async function startPart() {
    const values = Object.fromEntries(Object.entries(dimensions).filter(([key]) => key === 'part_width' || key === 'part_thickness' || (shape !== 'cylinder' && key === 'part_depth') || shape === 'plate'));
    if (Object.values(values).some(value => !Number.isFinite(value) || value <= 0 || value > 2000)) { setError('Use dimensions greater than zero and at most 2000 mm.'); return; }
    if (shape === 'plate') {
      const { part_width: width, part_depth: depth, center_bore: bore, mount_hole: hole, edge_inset: inset } = dimensions;
      if (bore >= Math.min(width, depth) || inset <= hole / 2 || inset >= Math.min(width, depth) / 2 || Math.hypot(width / 2 - inset, depth / 2 - inset) <= (bore + hole) / 2) { setError('The bores overlap or reach an edge. Increase the plate dimensions, reduce the holes, or adjust the inset.'); return; }
    }
    if (state.dirty && !window.confirm('Create a new part and discard the unsaved design?')) return;
    await run('Creating part', async api => {
      await createStarter(api, shape, name.trim() || 'Untitled part', values); if (newDocument.current) documentId.current = crypto.randomUUID(); newDocument.current = false; setEdits({}); partDialog.current?.close(); setMessage('Part created. Edit dimensions or keep modeling with the tools above.');
    });
  }
  function startTool(command: string) { setShowStartCard(false); const capability = commands.find(item => item.id === command); if (capability && !capability.enabled) { setError(capability.disabled_reason || 'Select the geometry this tool needs in the viewport first.'); return; } void run('Opening tool', async api => { await api.request('ui.start', { command }); setMessage('Use the viewport and the modeling dialog to complete the tool.'); commandDialog.current?.close(); }); }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !ready || busy) return;
      const letter = event.key.toLowerCase();
      if (letter === 's') { event.preventDefault(); void save(); }
      if (letter === 'k' && !nativeChrome) { event.preventDefault(); commandDialog.current?.showModal(); }
      if (letter === 'z' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault(); void run(event.shiftKey ? 'Redo' : 'Undo', async api => { await api.execute(event.shiftKey ? 'edit.redo' : 'edit.undo', {}); setEdits({}); });
      }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, [ready, busy, state]);
  function newPart() { setShowStartCard(false); if (state.timeline.length || initial.current?.file) newDocument.current = true; setError(''); partDialog.current?.showModal(); }
  const blocked = !ready || !!busy;
  const hasBodies = !!state.bodies.length;
  const changes = Object.keys(edits).length;
  return <main className={`model-studio ${nativeChrome ? 'model-native-chrome' : ''}`}>
    {nativeChrome ? <header className="model-native-hostbar"><button className="model-back" onClick={leave}><ArrowLeft size={14} />OmniCraft OS</button><span>Model</span><div><span role="status" className="model-native-status">{busy || (ready ? `${state.name} · ${state.dirty ? 'Unsaved changes' : 'Saved in engine'}` : 'Loading CAD…')}</span><button disabled={blocked} onClick={() => void switchInterface()}>Guided workspace</button><button disabled={blocked} onClick={newPart}><Plus size={14} />Quick part</button><button disabled={blocked} onClick={() => void save()}><Save size={14} />Save to Projects</button></div></header> : (<header className="model-header"><button className="model-back" onClick={leave}><ArrowLeft size={15} />OmniCraft OS</button><div className="model-document-title"><Box size={19} /><div><span>MODEL</span><h1>{state.name || 'Untitled part'}</h1></div><span className="model-save-state">{state.dirty ? 'Unsaved changes' : ready ? 'No unsaved changes' : 'Loading…'}</span></div><div className="model-file-actions"><button disabled={blocked} onClick={() => void switchInterface()}>Full CAD workspace</button><label className="model-open"><FolderOpen size={15} />Open<input aria-label="Open model file" type="file" accept=".sc,.solidcraft,.step,.stp,.stl" disabled={blocked} onChange={event => { void openFile(event.target.files?.[0]); event.target.value = ''; }} /></label><button disabled={blocked} onClick={() => void save()}><Save size={15} />Save project</button><details className="model-export-menu"><summary><Download size={15} />Export<ChevronDown size={12} /></summary><div><button disabled={blocked} onClick={() => void save(true)}>Native project (.sc)</button><button disabled={blocked || !hasBodies} onClick={() => void exportPart('step')}>STEP · editable solid</button><button disabled={blocked || !hasBodies} onClick={() => void exportPart('stl')}>STL · print mesh</button></div></details></div></header>)}
    {!nativeChrome && <nav className="model-toolbar" aria-label="Modeling tools"><button className="model-new" disabled={blocked} onClick={newPart}><Plus size={15} />New part</button><span className="model-divider" />{[['sketch.create', 'Sketch', Pencil], ['solid.extrude', 'Extrude', Box], ['solid.fillet', 'Fillet', Circle], ['solid.chamfer', 'Chamfer', Box]].map(([id, label, Icon]) => { const Component = Icon as typeof Box; return <button key={String(id)} disabled={blocked} onClick={() => startTool(String(id))}><Component size={15} />{String(label)}</button>; })}{state.active_sketch != null && <><button disabled={blocked} onClick={() => startTool('sketch.line')}>Line</button><button disabled={blocked} onClick={() => startTool('sketch.rectangle.two_point')}>Rectangle</button><button disabled={blocked} onClick={() => startTool('sketch.circle.center')}>Circle</button><button disabled={blocked} onClick={() => void run('Finishing sketch', async api => { await api.execute('sketch.finish', {}); })}><Check size={14} />Finish sketch</button></>}<button disabled={blocked} onClick={() => commandDialog.current?.showModal()}><Search size={15} />More tools</button><span className="model-toolbar-space" /><button aria-label="Undo model edit" disabled={blocked || !state.undo} onClick={() => void run('Undo', async api => { await api.execute('edit.undo', {}); setEdits({}); })}><Undo2 size={16} /></button><button aria-label="Redo model edit" disabled={blocked || !state.redo} onClick={() => void run('Redo', async api => { await api.execute('edit.redo', {}); setEdits({}); })}><Redo2 size={16} /></button></nav>}
    {error && <div className="model-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss modeling error">×</button></div>}
    <div className="model-body"><section className="model-viewport" aria-label="Interactive CAD viewport"><iframe key={`${attempt}/${nativeChrome}`} ref={iframe} src={nativeChrome ? "/editors/solidcraft/workspace.html?webgl=1" : "/editors/solidcraft/workspace.html?omnicraft=1&webgl=1"} title="Model geometry engine" />
      {!ready && <div className={`model-loading ${engineAttached ? 'model-configuring' : ''}`} role="status"><Box size={28} /><strong>{bootFailure ? 'Model could not start' : engineAttached ? 'Connecting to the viewport' : 'Starting the modeling engine'}</strong><p>{bootFailure ? error : engineAttached ? 'The CAD engine has loaded. Waiting for its command channel.' : 'Loading the actual CAD kernel. This can take a moment on an Intel Mac.'}</p>{bootFailure && <button onClick={() => setAttempt(value => value + 1)}>Reload Model</button>}</div>}
      {!nativeChrome && ready && showStartCard && !hasBodies && !state.active_sketch && <div className="model-start-card"><p>YOUR NEXT PART STARTS HERE</p><h2>From a shape<br />to something useful.</h2><span>Build a parametric part, open a design,<br />or start sketching in the viewport.</span><button disabled={blocked} onClick={newPart}><Plus size={15} />Create a part</button></div>}
      {!nativeChrome && <div className="model-view-controls" aria-label="Camera views">{['iso', 'front', 'top', 'right'].map(view => <button key={view} disabled={blocked} onClick={() => void run('Changing view', async api => { await api.request('ui.view', { view }); })}>{view === 'iso' ? '3D' : view}</button>)}<button aria-label="Fit model in view" disabled={blocked} onClick={() => void run('Fitting model', async api => { await api.execute('view.fit', {}); })}><Maximize size={14} /></button></div>}
    </section>{!nativeChrome && <aside className="model-properties" aria-label="Part properties"><div className="model-panel-title"><h2>Design details</h2><span>{state.units}</span></div><details open className="model-property-section"><summary>Dimensions</summary>{!parameters.length && <p>Create a parametric part to edit its dimensions here. Sketch and feature dimensions remain available in the viewport.</p>}{parameters.map(parameter => <label key={parameter.name}>{LABELS[parameter.name] || parameter.name}<div><input aria-label={`Model dimension ${parameter.name}`} disabled={blocked} value={edits[parameter.name] ?? String(parameter.expression ?? parameter.value ?? '')} onChange={event => setEdits(previous => ({ ...previous, [parameter.name]: event.target.value }))} /><span>{parameter.unit || 'mm'}</span></div></label>)}{!!changes && <button className="model-apply" disabled={blocked} onClick={() => void run('Updating dimensions', async api => { await api.execute('parameters.change', { changes: edits }); setEdits({}); setMessage('Dimensions rebuilt by the CAD kernel.'); })}><Check size={14} />Update dimensions</button>}</details>
      <details className="model-property-section" open><summary>Feature history <span>{state.timeline.length}</span></summary>{!state.timeline.length && <p>Your sketches and modeling steps will appear here.</p>}<ol>{state.timeline.map((feature, index) => <li key={feature.id || index}><button className={feature.error ? 'has-error' : ''} disabled={blocked} onClick={() => void run('Inspecting feature', async api => setSelectedFeature(await api.execute('timeline.inspect', { feature: feature.id || feature.name })))}><span>{String(index + 1).padStart(2, '0')}</span>{feature.name || feature.type || 'Feature'}{feature.error && <strong>!</strong>}</button></li>)}</ol>{selectedFeature && <div className="model-feature-info"><strong>{selectedFeature.type}</strong>{selectedFeature.error && <p>{selectedFeature.error}</p>}{selectedFeature.inputs?.map((input: any) => <p key={input.param}>{input.label}: {input.expression} {input.unit}</p>)}</div>}</details>
      <details className="model-property-section"><summary>Measure</summary><button disabled={blocked || !hasBodies} onClick={() => void run('Measuring part', async api => setMeasure(await api.execute('inspect.measure', {})))}>Measure solids</button>{measure && <dl><dt>Bodies</dt><dd>{measure.body_count}</dd><dt>Volume</dt><dd>{Number(measure.total?.volume_mm3 || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} mm³</dd><dt>Area</dt><dd>{Number(measure.total?.area_mm2 || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} mm²</dd></dl>}</details>
      <details className="model-property-section"><summary>Recent projects</summary>{!recent.length && <p>Save a project to reopen it here. Browser storage belongs to this address.</p>}{recent.map(item => <button className="model-recent" key={item.path} disabled={blocked} onClick={() => void openSaved(item.path)}><FolderOpen size={13} />{item.name}</button>)}</details>
      <p className="model-engine-credit">Model uses the SolidCraft engine.<br />SolidCraft contributors · MIT.<br /><a href="https://github.com/tangency-labs/solidcraft" target="_blank" rel="noreferrer">Upstream source &amp; credit</a></p>
    </aside>}</div>
    {!nativeChrome && <footer className="model-status"><span role="status">{busy || message}</span><span>{state.bodies.length} {state.bodies.length === 1 ? 'body' : 'bodies'} · {state.timeline.length} features · {state.units}</span></footer>}
    <dialog ref={partDialog} className="model-dialog"><form onSubmit={event => { event.preventDefault(); void startPart(); }}><div className="model-dialog-heading"><div><p>START MODELING</p><h2>Create a part</h2></div><button type="button" onClick={() => partDialog.current?.close()} aria-label="Close new part">×</button></div><p>These shapes are built from real sketches and editable dimensions.</p><label>Part name<input aria-label="New part name" value={name} maxLength={100} onChange={event => setName(event.target.value)} /></label><div className="model-shape-picker">{[['plate', 'Mounting plate'], ['block', 'Block'], ['cylinder', 'Cylinder']].map(([value, label]) => <button type="button" key={value} aria-pressed={shape === value} onClick={() => { setShape(value); setName(label); }}>{value === 'cylinder' ? <Circle size={20} /> : <Box size={20} />}{label}</button>)}</div><div className="model-dimension-grid">{Object.keys(DEFAULT_DIMENSIONS).filter(key => key === 'part_width' || key === 'part_thickness' || (shape !== 'cylinder' && key === 'part_depth') || shape === 'plate').map(key => <label key={key}>{key === 'part_width' && shape === 'cylinder' ? 'Diameter' : LABELS[key]}<div><input aria-label={`New part ${key}`} type="number" min="0.1" max="2000" step="0.1" value={dimensions[key]} onChange={event => setDimensions(previous => ({ ...previous, [key]: Number(event.target.value) }))} /><span>mm</span></div></label>)}</div>{error && <p className="model-dialog-error" role="alert">{error}</p>}<button className="model-dialog-submit" disabled={blocked} type="submit">{busy || 'Create solid part'}</button></form></dialog>
    <dialog ref={commandDialog} className="model-dialog model-command-dialog"><div className="model-dialog-heading"><h2>Modeling tools</h2><button onClick={() => commandDialog.current?.close()} aria-label="Close modeling tools">×</button></div><input autoFocus aria-label="Search modeling tools" placeholder="Find a sketch, modeling, or inspection tool…" value={search} onChange={event => setSearch(event.target.value)} /><div className="model-command-list">{commands.filter(command => /^(sketch|solid|surface|construct|inspect|joint|pattern|body)\./.test(command.id) && `${command.label} ${command.id}`.toLowerCase().includes(search.toLowerCase())).map(command => <button key={command.id} disabled={blocked || !command.enabled} title={command.disabled_reason || command.id} onClick={() => startTool(command.id)}><span>{command.label}</span><small>{command.tab} / {command.panel}</small></button>)}</div></dialog>
  </main>;
}
