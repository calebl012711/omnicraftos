import { useRef, useState } from 'react';
import { ArrowRight, FilePlus2, FolderOpen, Search } from 'lucide-react';
import type { WorkspaceSpec } from '../config/workspaces';
import type { SuiteProject } from '../storage/db';
import { AppIcon } from './icons/AppIcon';
import './desktop-home.css';

interface Props {
  workspaces: WorkspaceSpec[];
  projects: SuiteProject[];
  onOpenWorkspace: (id: string) => void;
  onOpenProject: (workspaceId: string, projectId: string) => void;
  onNewProject: () => void;
  onShowProjects: () => void;
  onOpenModel: (file: File) => void;
}
const ORDER = ['riverstudio', 'solidcraft', 'filmcraft', 'photocraft', 'vectorcraft', 'effectcraft', 'lightcraft', 'music'];
export function DesktopHome({ workspaces, projects, onOpenWorkspace, onOpenProject, onNewProject, onShowProjects, onOpenModel }: Props) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const openInput = useRef<HTMLInputElement>(null);
  const saved = projects.filter(project => project.storedSnapshotFileId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const tools = workspaces.filter(tool => !['studiocut', 'bandforge', 'flstudio'].includes(tool.id))
    .filter(tool => `${tool.name} ${tool.category} ${tool.nativeFormats.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (ORDER.includes(a.id) ? ORDER.indexOf(a.id) : 100) - (ORDER.includes(b.id) ? ORDER.indexOf(b.id) : 100));
  return <section className="desktop-home" aria-labelledby="desktop-home-title">
    <div className="desktop-home-heading"><div><h1 id="desktop-home-title">Home</h1><p>Open a project or choose a workspace.</p></div><div className="desktop-home-actions"><button onClick={() => openInput.current?.click()}><FolderOpen size={15} />Open model</button><button onClick={onNewProject}><FilePlus2 size={15} />New project</button></div></div>
    <input ref={openInput} className="desktop-file-input" aria-label="Open a model from disk" type="file" accept=".sc,.solidcraft,.step,.stp,.stl" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      if (file.size > 100 * 1024 * 1024) { setError('Choose a model smaller than 100 MB.'); return; }
      if (!/\.(sc|solidcraft|step|stp|stl)$/i.test(file.name)) { setError('Choose a native SC project, STEP solid, or STL mesh.'); return; }
      setError(''); onOpenModel(file);
    }} />
    {error && <p role="alert">{error}</p>}
    <div className="desktop-home-body">
      <section className="desktop-recent" aria-labelledby="desktop-recent-title"><div className="desktop-section-heading"><h2 id="desktop-recent-title">Recent projects</h2><button onClick={onShowProjects}>View all<ArrowRight size={13} /></button></div>
        {saved.length ? <div className="desktop-project-list">{saved.map(project => <button key={project.id} onClick={() => onOpenProject(project.workspaceId, project.id)}><AppIcon id={project.workspaceId} size={29} /><span><strong>{project.name}</strong><small>{workspaces.find(tool => tool.id === project.workspaceId)?.name} · {new Date(project.updatedAt).toLocaleDateString()}</small></span><ArrowRight size={14} /></button>)}</div> : <div className="desktop-empty"><FolderOpen size={27} strokeWidth={1.3} /><strong>No saved projects yet</strong><p>Save a Model design to add it to your project library. Recordings are kept inside Capture.</p><button onClick={() => onOpenWorkspace('solidcraft')}>Start a model<ArrowRight size={13} /></button></div>}
        <div className="desktop-shortcuts"><h2>Start working</h2><button onClick={() => onOpenWorkspace('riverstudio')}><AppIcon id="riverstudio" size={26} /><span><strong>Record screen and camera</strong><small>Separate video files from one take</small></span><ArrowRight size={13} /></button><button onClick={() => onOpenWorkspace('solidcraft')}><AppIcon id="solidcraft" size={26} /><span><strong>Create a part</strong><small>SolidCraft’s full CAD workspace</small></span><ArrowRight size={13} /></button></div>
      </section>
      <section className="desktop-workspaces" aria-labelledby="desktop-workspaces-title"><div className="desktop-section-heading"><h2 id="desktop-workspaces-title">Workspaces</h2><label className="desktop-tool-search"><Search size={14} /><input type="search" aria-label="Find a workspace" placeholder="Find a workspace" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        <div className="desktop-tool-grid">{tools.map(tool => <button key={tool.id} onClick={() => onOpenWorkspace(tool.id)} data-testid={`desktop-open-${tool.id}`}><AppIcon id={tool.id} size={34} /><span><strong>{tool.name}</strong><small>{tool.id === 'riverstudio' ? 'Screen + camera' : tool.id === 'solidcraft' ? '3D CAD' : tool.category.split('(')[0]}</small><em>{tool.integrationLevel === 'source-only' ? 'Source only' : tool.verificationStatus === 'not tested' ? 'Workflow checks pending' : 'Some workflows verified'}</em></span><ArrowRight size={13} /></button>)}</div>
        {!tools.length && <p className="desktop-no-tools">No matching workspace.</p>}
      </section>
    </div>
  </section>;
}
