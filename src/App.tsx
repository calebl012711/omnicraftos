import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Compass,
  Cpu,
  Database,
  Disc,
  Download,
  FileCode,
  FileText,
  Film,
  FolderKanban,
  HardDrive,
  Home,
  Image as ImageIcon,
  Layers,
  Layout,
  Moon,
  Music,
  PenTool,
  Play,
  Plus,
  Presentation,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Table,
  Terminal,
  Trash2,
  Type,
  Upload,
  Video,
  Wrench,
  Zap
} from 'lucide-react';
import {
  applyBrandingCssVariables,
  BrandingConfig,
  loadBrandingConfig,
  resetBrandingConfig,
  saveBrandingConfig
} from './config/branding';
import { Recorder } from './recorder/Recorder';
import { StudioHero } from './components/StudioHero';
import { AppIcon } from './components/icons/AppIcon';
import {
  BLOCKED_REPOSITORIES,
  VerificationStatus,
  WORKSPACES,
  WorkspaceSpec
} from './config/workspaces';
import {
  deleteProject,
  deleteSharedAsset,
  ensureSeedData,
  exportBackupBundle,
  getStoredFile,
  importBackupBundle,
  inferCompatibleWorkspaces,
  inspectStorageHealth,
  listProjects,
  listSharedAssets,
  listStoredFiles,
  registerStudioFormatUpdate,
  saveFileToOpfs,
  saveProject,
  saveSharedAsset,
  saveStoredFile,
  SharedAssetRecord,
  StorageHealthReport,
  StoredFileRecord,
  SuiteProject
} from './storage/db';
import { isSameOriginEvent } from './utils/origin';

type NavTab = 'home' | 'workspace' | 'projects' | 'assets' | 'settings';
type RendererMode = 'auto' | 'webgl' | 'cpu';
type HomeCategoryFilter = 'all' | 'broadcast' | 'daw' | 'cad' | 'design' | 'office';

const ModelStudio = React.lazy(() => import('./cad/ModelStudio').then(module => ({ default: module.ModelStudio })));

interface CapturedExportNotice {
  id: string;
  appId: string;
  name: string;
  size: number;
  mime: string;
  timestamp: string;
}

interface UpstreamReportItem {
  id: string;
  name: string;
  repo: string;
  status: string;
  pinnedCommit?: string;
  remoteHeadCommit?: string;
  upToDate?: boolean;
  updateAvailable?: boolean;
  aheadCommits?: string[];
  latestReleaseTag?: string;
  latestReleaseName?: string;
  releaseBodyPreview?: string;
  licenseSelected?: string;
  blockedReason?: string;
}

interface UpstreamReport {
  checkedAtUtc: string;
  readOnly: boolean;
  summary: {
    total: number;
    upToDate: number;
    updatesAvailable: number;
    blocked: number;
    errors: number;
  };
  results: UpstreamReportItem[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function renderWorkspaceIcon(iconKey: WorkspaceSpec['iconKey'], size = 18) {
  switch (iconKey) {
    case 'box':
      return <Box size={size} />;
    case 'compass':
      return <Compass size={size} />;
    case 'film':
      return <Film size={size} />;
    case 'sparkles':
      return <Sparkles size={size} />;
    case 'image':
      return <ImageIcon size={size} />;
    case 'sun':
      return <Sun size={size} />;
    case 'pen-tool':
      return <PenTool size={size} />;
    case 'layout':
      return <Layout size={size} />;
    case 'file-text':
      return <FileText size={size} />;
    case 'figma':
      return <Layers size={size} />;
    case 'type':
      return <Type size={size} />;
    case 'music':
      return <Music size={size} />;
    case 'presentation':
      return <Presentation size={size} />;
    case 'table':
      return <Table size={size} />;
    case 'cpu':
      return <Cpu size={size} />;
    case 'radio':
      return <Radio size={size} />;
    case 'video':
      return <Video size={size} />;
    case 'disc':
      return <Disc size={size} />;
    case 'sliders':
      return <Sliders size={size} />;
    default:
      return <ShieldAlert size={size} />;
  }
}

function statusBadgeClass(status: VerificationStatus): string {
  switch (status) {
    case 'tested':
      return 'mf-badge tested';
    case 'partially tested':
      return 'mf-badge partial';
    case 'not tested':
      return 'mf-badge untested';
    case 'blocked':
      return 'mf-badge blocked';
  }
}

function matchesHomeCategory(ws: WorkspaceSpec, filter: HomeCategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'broadcast') {
    return ['riverstudio', 'studiocut', 'filmcraft', 'effectcraft'].includes(ws.id);
  }
  if (filter === 'daw') {
    return ['music', 'bandforge', 'flstudio', 'soundcraft'].includes(ws.id);
  }
  if (filter === 'cad') {
    return ['solidcraft', 'cadcraft', 'fieldcraft'].includes(ws.id);
  }
  if (filter === 'design') {
    return ['photocraft', 'lightcraft', 'vectorcraft', 'figcraft'].includes(ws.id);
  }
  if (filter === 'office') {
    return ['designcraft', 'pdfcraft', 'wordcraft', 'deckcraft', 'gridcraft'].includes(ws.id);
  }
  return true;
}

/**
 * Directional View Transition helper per modern-web-guidance `directional-navigation-transitions`
 */
function navigateWithViewTransition(updateDOM: () => void, direction: 'forward' | 'backward') {
  const doc = document as Document & {
    startViewTransition?: (arg: (() => void) | { update: () => void; types?: string[] }) => unknown;
  };
  if (typeof doc.startViewTransition !== 'function') {
    updateDOM();
    return;
  }
  try {
    doc.startViewTransition({
      update: updateDOM,
      types: [direction]
    });
  } catch {
    updateDOM();
  }
}

/**
 * Top-layer exit transition probe & helper per modern-web-guidance `animate-to-from-top-layer`
 */
let supportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

async function closeTopLayer(element: HTMLDialogElement | HTMLElement | null) {
  if (!element) return;
  if (!supportsTopLayerExit()) {
    element.setAttribute('data-closing', '');
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 2000))
      ]);
    }
    if (!element.hasAttribute('data-closing')) return;
    element.removeAttribute('data-closing');
  }

  if (element instanceof HTMLDialogElement) {
    if (element.open) element.close();
  } else if ('hidePopover' in element && typeof (element as any).hidePopover === 'function') {
    try {
      (element as any).hidePopover();
    } catch {
      // ignore if already hidden
    }
  }
}

export function App() {
  const [branding, setBranding] = useState<BrandingConfig>(() => loadBrandingConfig());
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('riverstudio');
  const [modelOpenFile, setModelOpenFile] = useState<File>();
  const modelOpenLink = useMemo(() => modelOpenFile ? { id: crypto.randomUUID(), name: modelOpenFile.name.replace(/\.[^.]+$/, ''), file: modelOpenFile } : undefined, [modelOpenFile]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>('proj-solidcraft-motor-mount');
  const [rendererMode, setRendererMode] = useState<RendererMode>('webgl');
  const [homeCategory, setHomeCategory] = useState<HomeCategoryFilter>('all');
  const [homeSearch, setHomeSearch] = useState<string>('');
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'light dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'light dark') return saved;
    return 'dark';
  });

  const [projects, setProjects] = useState<SuiteProject[]>([]);
  const [assets, setAssets] = useState<SharedAssetRecord[]>([]);
  const [storedFiles, setStoredFiles] = useState<StoredFileRecord[]>([]);
  const [storageHealth, setStorageHealth] = useState<StorageHealthReport>({
    usageBytes: 0,
    quotaBytes: 0,
    persisted: false,
    opfsAvailable: false
  });

  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [editorDirty, setEditorDirty] = useState<boolean>(false);
  const [, setEditorCapabilities] = useState<Record<string, boolean>>({});
  const [capturedExports, setCapturedExports] = useState<CapturedExportNotice[]>([]);
  const [latestToast, setLatestToast] = useState<CapturedExportNotice | null>(null);
  const [showAutomationDrawer, setShowAutomationDrawer] = useState<boolean>(false);
  const [automationOutput, setAutomationOutput] = useState<string>(
    'Select an action above or run a workflow to inspect live studio telemetry.'
  );
  const [workflowRunning, setWorkflowRunning] = useState<boolean>(false);
  const [pendingAutoDemoWorkspace, setPendingAutoDemoWorkspace] = useState<string | null>(null);
  const [showcaseVideoMode, setShowcaseVideoMode] = useState<'brag' | 'master'>('brag');

  const [projectSearch, setProjectSearch] = useState<string>('');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [upstreamReport, setUpstreamReport] = useState<UpstreamReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'OmniCraft OS · Choose a workspace to begin'
  );

  // Dialog & Popover refs following modern-web-guidance `dialog`, `light-dismiss-a-dialog`, `animate-to-from-top-layer` & `persistent-toast-notifications`
  const newProjectDialogRef = useRef<HTMLDialogElement | null>(null);
  const quickSwitchDialogRef = useRef<HTMLDialogElement | null>(null);
  const showcaseDialogRef = useRef<HTMLDialogElement | null>(null);
  const showcaseVideoRef = useRef<HTMLVideoElement | null>(null);
  const toastPopoverRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectWorkspace, setNewProjectWorkspace] = useState<string>('riverstudio');
  const [newProjectNotes, setNewProjectNotes] = useState<string>('');
  const [quickSwitchQuery, setQuickSwitchQuery] = useState<string>('');

  const [assetCategoryFilter, setAssetCategoryFilter] = useState<
    'all' | 'cad' | 'video' | 'audio' | 'image' | 'docs'
  >('all');
  const pendingHandoffAssetRef = useRef<SharedAssetRecord | null>(null);

  const activeWorkspace = useMemo(
    () => WORKSPACES.find((w) => w.id === activeWorkspaceId) || WORKSPACES[0],
    [activeWorkspaceId]
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const showExportToast = (notice: CapturedExportNotice) => {
    setLatestToast(notice);
    const pop = toastPopoverRef.current as (HTMLDivElement & { showPopover?: () => void }) | null;
    if (pop && typeof pop.showPopover === 'function') {
      try {
        pop.showPopover();
      } catch {
        // already open
      }
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      if (toastPopoverRef.current) {
        closeTopLayer(toastPopoverRef.current);
      }
    }, 5200);
  };

  const refreshLocalStores = async () => {
    const [p, a, f, h] = await Promise.all([
      listProjects(),
      listSharedAssets(),
      listStoredFiles(),
      inspectStorageHealth()
    ]);
    setProjects(p);
    setAssets(a);
    setStoredFiles(f);
    setStorageHealth(h);
  };

  useEffect(() => {
    applyBrandingCssVariables(branding);
  }, [branding]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) {
      meta.content = themeMode;
    }
    if (themeMode === 'light dark') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', themeMode);
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'omnicraft:theme-change',
            theme: themeMode === 'light dark' ? 'dark' : themeMode
          },
          window.location.origin
        );
      } catch {}
    }
  }, [themeMode]);

  useEffect(() => {
    ensureSeedData().then(refreshLocalStores);
    fetch('/upstream-report.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUpstreamReport(data);
      })
      .catch(() => {
        // ignore if offline
      });
  }, []);

  // Light-dismiss dialog polyfill check + cancel animation routing per `light-dismiss-a-dialog` & `animate-to-from-top-layer`
  useEffect(() => {
    const dialogs = [
      newProjectDialogRef.current,
      quickSwitchDialogRef.current,
      showcaseDialogRef.current
    ].filter(Boolean) as HTMLDialogElement[];
    const handlers: Array<{
      el: HTMLDialogElement;
      fn: (e: MouseEvent) => void;
      closeFn: () => void;
      cancelFn: (e: Event) => void;
    }> = [];

    for (const dialog of dialogs) {
      const closeFn = () => {
        dialog.returnValue = '';
        if (dialog === showcaseDialogRef.current && showcaseVideoRef.current) {
          showcaseVideoRef.current.pause();
        }
      };
      dialog.addEventListener('close', closeFn);

      const cancelFn = (e: Event) => {
        e.preventDefault();
        closeTopLayer(dialog);
      };
      dialog.addEventListener('cancel', cancelFn);

      const fn = (e: MouseEvent) => {
        if (!('closedBy' in HTMLDialogElement.prototype) && e.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          const clickedOutside =
            e.clientY < rect.top ||
            e.clientY > rect.bottom ||
            e.clientX < rect.left ||
            e.clientX > rect.right;
          if (clickedOutside) closeTopLayer(dialog);
        }
      };
      dialog.addEventListener('click', fn);
      handlers.push({ el: dialog, fn, closeFn, cancelFn });
    }

    return () => {
      for (const h of handlers) {
        h.el.removeEventListener('click', h.fn);
        h.el.removeEventListener('close', h.closeFn);
        h.el.removeEventListener('cancel', h.cancelFn);
      }
    };
  }, []);

  // Keyboard shortcut Cmd/Ctrl+K for quick switcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSwitchQuery('');
        if (quickSwitchDialogRef.current && !quickSwitchDialogRef.current.open) {
          quickSwitchDialogRef.current.showModal();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Listen to same-origin postMessage events from embedded editor iframe
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!isSameOriginEvent(event)) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

      if (
        data.type === 'mosaic:ready' ||
        data.type === 'mosaic:editor-ready' ||
        data.type.endsWith(':ready') ||
        data.type === 'omnicraft:ready'
      ) {
        setEditorReady(true);
        if (data.capabilities) {
          setEditorCapabilities(data.capabilities);
          if (data.capabilities.importFormats || data.capabilities.exportFormats) {
            registerStudioFormatUpdate(activeWorkspace.id, {
              importFormats: data.capabilities.importFormats,
              exportFormats: data.capabilities.exportFormats
            });
          }
        }
        setStatusMessage(`${activeWorkspace.name} ready.`);
        if (pendingHandoffAssetRef.current) {
          const assetToLoad = pendingHandoffAssetRef.current;
          pendingHandoffAssetRef.current = null;
          await sendAssetIntoActiveEditor(assetToLoad);
        }
      } else if (data.type === 'mosaic:dirty' || data.type.endsWith(':dirty')) {
        setEditorDirty(true);
      } else if (
        data.type === 'mosaic:format-update' ||
        data.type === 'omnicraft:format-update'
      ) {
        if (data.formats || data.capabilities) {
          registerStudioFormatUpdate(activeWorkspace.id, data.formats || data.capabilities);
          await refreshLocalStores();
        }
      } else if (
        data.type === 'mosaic:export-captured' ||
        data.type === 'omnicraft:export-captured' ||
        data.type === 'omnicraft:export-ready' ||
        data.type === 'omnicraft:save' ||
        data.type.endsWith(':save')
      ) {
        const fileObj = (typeof data.file === 'object' && data.file !== null) ? data.file : {};
        const fileName =
          data.name ||
          fileObj.name ||
          (data.fileName as string) ||
          `${activeWorkspace.id}-export.bin`;
        const mimeType =
          data.mime ||
          fileObj.mime ||
          fileObj.type ||
          (data.mimeType as string) ||
          'application/octet-stream';
        const rawBytes: ArrayBuffer | Uint8Array | null =
          data.bytes ||
          fileObj.bytes ||
          fileObj.buffer ||
          (fileObj instanceof ArrayBuffer ? fileObj : null) ||
          null;
        if (rawBytes) {
          const buffer =
            rawBytes instanceof ArrayBuffer
              ? rawBytes
              : rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength);

          const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          await saveStoredFile({
            id: fileId,
            projectId: activeProjectId,
            name: fileName,
            mimeType,
            size: buffer.byteLength,
            bytes: buffer,
            sourceWorkspaceId: activeWorkspace.id,
            kind: 'export',
            createdAt: new Date().toISOString()
          });

          const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          await saveSharedAsset({
            id: assetId,
            name: fileName,
            mimeType,
            size: buffer.byteLength,
            bytes: buffer,
            sourceWorkspaceId: activeWorkspace.id,
            isBuiltInSample: false,
            compatibleWorkspaces: inferCompatibleWorkspaces(fileName),
            createdAt: new Date().toISOString(),
            description: `Captured export from ${activeWorkspace.name}`,
            latencyMs: 0,
            opfsSynced: true
          });

          await saveFileToOpfs(fileName, buffer);

          if (activeProject) {
            await saveProject({
              ...activeProject,
              updatedAt: new Date().toISOString(),
              nativeFileName: fileName,
              storedSnapshotFileId: fileId
            });
          }

          const notice: CapturedExportNotice = {
            id: fileId,
            appId: activeWorkspace.id,
            name: fileName,
            size: buffer.byteLength,
            mime: mimeType,
            timestamp: new Date().toLocaleTimeString()
          };
          setCapturedExports((prev) => [notice, ...prev.slice(0, 9)]);
          showExportToast(notice);
          setEditorDirty(false);
          setStatusMessage(
            `Saved "${fileName}" (${formatBytes(buffer.byteLength)}) to the file library.`
          );
          await refreshLocalStores();
        }
      } else if (data.type === 'mosaic:switch-workspace' && typeof data.workspaceId === 'string') {
        await refreshLocalStores();
        navigateWithViewTransition(() => {
          setEditorReady(false);
          setEditorDirty(false);
          setActiveWorkspaceId(data.workspaceId);
          setActiveTab('workspace');
          if (typeof data.reason === 'string') {
            setStatusMessage(data.reason);
          }
        }, 'forward');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeWorkspace, activeProjectId, activeProject]);

  // Compute editor iframe URL with renderer mode query flag
  const computedEditorUrl = useMemo(() => {
    if (activeWorkspace.id === 'riverstudio') return '/?tool=recorder';
    if (!activeWorkspace.editorUrl) return null;
    const url = new URL(activeWorkspace.editorUrl, window.location.origin);
    if (rendererMode === 'webgl') {
      url.searchParams.set('webgl', '1');
    } else if (rendererMode === 'cpu') {
      url.searchParams.set('cpu', '1');
    }
    return url.pathname + url.search;
  }, [activeWorkspace, rendererMode]);

  const openWorkspace = (workspaceId: string, projectId?: string | null, nativeFile?: File) => {
    navigateWithViewTransition(() => {
      setEditorReady(false);
      setEditorDirty(false);
      setShowAutomationDrawer(false);
      setActiveWorkspaceId(workspaceId);
      setModelOpenFile(workspaceId === 'solidcraft' ? nativeFile : undefined);
      if (nativeFile) {
        setActiveProjectId(null);
      } else if (projectId !== undefined) {
        setActiveProjectId(projectId);
      } else {
        const matchingProj = projects.find((p) => p.workspaceId === workspaceId);
        setActiveProjectId(matchingProj ? matchingProj.id : null);
      }
      setActiveTab('workspace');
    }, 'forward');
  };

  const openWorkspaceAndRunDemo = (workspaceId: string) => {
    setPendingAutoDemoWorkspace(workspaceId);
    openWorkspace(workspaceId);
  };

  const openShowcaseModal = (mode: 'brag' | 'master' = 'brag', seekSeconds?: number) => {
    setShowcaseVideoMode(mode);
    if (showcaseDialogRef.current && !showcaseDialogRef.current.open) {
      showcaseDialogRef.current.showModal();
    }
    if (typeof seekSeconds === 'number') {
      setTimeout(() => {
        if (showcaseVideoRef.current) {
          showcaseVideoRef.current.currentTime = seekSeconds;
          showcaseVideoRef.current.play().catch(() => {});
        }
      }, 120);
    }
  };

  const returnToHome = (targetTab: NavTab = 'home') => {
    navigateWithViewTransition(() => {
      document.querySelector('.mf-scroll-page')?.scrollTo(0, 0);
      setModelOpenFile(undefined);
      setShowAutomationDrawer(false);
      setActiveTab(targetTab);
    }, 'backward');
  };

  const sendAssetIntoActiveEditor = async (asset: SharedAssetRecord) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      setStatusMessage('Active studio is still initializing...');
      return;
    }

    // Structured postMessage required by OmniCraft cross-studio handoff specification
    iframe.contentWindow.postMessage(
      {
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
      },
      window.location.origin
    );

    const ext = asset.name.split('.').pop()?.toLowerCase();
    if (['step', 'stp', 'stl', 'dxf', 'dwg', 'sc', 'solidcraft'].includes(ext || '')) {
      iframe.contentWindow.postMessage(
        {
          type: 'omnicraft:import-cad',
          name: asset.name,
          format: ext,
          mime: asset.mimeType,
          bytes: asset.bytes,
          asset: {
            id: asset.id,
            name: asset.name,
            mimeType: asset.mimeType,
            bytes: asset.bytes
          },
          file: {
            name: asset.name,
            format: ext,
            mime: asset.mimeType,
            bytes: asset.bytes,
            size: asset.size
          }
        },
        window.location.origin
      );
    }
    iframe.contentWindow.postMessage(
      {
        type: 'mosaic:open-file',
        name: asset.name,
        mime: asset.mimeType,
        bytes: asset.bytes,
        asset: {
          id: asset.id,
          name: asset.name,
          mimeType: asset.mimeType,
          bytes: asset.bytes
        }
      },
      window.location.origin
    );
    setStatusMessage(
      `Sent "${asset.name}" (${formatBytes(asset.size)}) to ${activeWorkspace.name}. Check the editor to confirm import.`
    );
  };

  const handleHandoffToStudio = async (workspaceId: string, asset: SharedAssetRecord) => {
    if (workspaceId === 'solidcraft') {
      if (asset.size > 100 * 1024 * 1024) { setStatusMessage('Open a model smaller than 100 MB in this browser.'); return; }
      openWorkspace(workspaceId, null, new File([asset.bytes], asset.name, { type: asset.mimeType }));
      return;
    }
    if (activeWorkspace.id === workspaceId && activeTab === 'workspace') {
      await sendAssetIntoActiveEditor(asset);
    } else {
      pendingHandoffAssetRef.current = asset;
      openWorkspace(workspaceId);
      setTimeout(async () => {
        if (pendingHandoffAssetRef.current?.id === asset.id) {
          await sendAssetIntoActiveEditor(asset);
          pendingHandoffAssetRef.current = null;
        }
      }, 750);
    }
  };

  const handleUploadAssetToEditor = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const bytes = await file.arrayBuffer();
    const asset: SharedAssetRecord = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: bytes.byteLength,
      bytes,
      sourceWorkspaceId: activeWorkspace.id,
      isBuiltInSample: false,
      compatibleWorkspaces: inferCompatibleWorkspaces(file.name),
      createdAt: new Date().toISOString(),
      description: `User imported file (${file.name})`
    };
    await saveSharedAsset(asset);
    await refreshLocalStores();
    await sendAssetIntoActiveEditor(asset);
    e.target.value = '';
  };

  const inspectActiveEditor = async () => {
    const win = iframeRef.current?.contentWindow as Record<string, any> | undefined;
    if (!win) {
      setAutomationOutput('No active studio window.');
      return;
    }
    try {
      const apiName = activeWorkspace.windowApiGlobal;
      if (apiName && win[apiName]) {
        const api = win[apiName];
        const info = typeof api.inspect === 'function' ? await api.inspect() : null;
        const cmds = typeof api.commands === 'function' ? await api.commands() : null;
        setAutomationOutput(
          JSON.stringify(
            {
              workspace: activeWorkspace.id,
              apiGlobal: `window.${apiName}`,
              commandCount: Array.isArray(cmds) ? cmds.length : cmds ? Object.keys(cmds).length : 'n/a',
              sampleCommands: Array.isArray(cmds) ? cmds.slice(0, 18) : cmds,
              inspectState: info
            },
            null,
            2
          )
        );
      } else if (win.__mosaicBridge) {
        const state = await win.__mosaicBridge.inspectState();
        setAutomationOutput(JSON.stringify(state, null, 2));
      } else {
        setAutomationOutput(`Workspace ${activeWorkspace.name} uses canvas/host postMessage bridge.`);
      }
    } catch (err) {
      setAutomationOutput(`Inspect error: ${(err as Error).message}`);
    }
  };

  const runVerifiedWorkflow = async () => {
    const win = iframeRef.current?.contentWindow as Record<string, any> | undefined;
    if (!win) {
      setStatusMessage('Please wait for the studio to finish loading.');
      return;
    }
    setWorkflowRunning(true);

    try {
      if (activeWorkspace.id === 'solidcraft') {
        setStatusMessage('Building 3D NEMA-17 Motor Adapter Plate in SolidCraft...');
        let retries = 30;
        while (!win.solidcraft && retries > 0) {
          await new Promise((r) => setTimeout(r, 250));
          retries--;
        }
        if (!win.solidcraft) throw new Error('window.solidcraft API did not initialize in time.');

        const sc = win.solidcraft;
        const log: Record<string, any> = { workflow: 'SolidCraft 3D Motor Adapter Plate' };

        const cmds = await sc.commands();
        log.totalCommands = Array.isArray(cmds) ? cmds.length : 0;

        await sc.execute('sketch.create', { plane: 'XY', name: 'BasePlate' });
        await sc.execute('sketch.rectangle.two_point', { p0: [0, 0], p1: [60, 60] });
        await sc.execute('sketch.finish', {});
        await sc.execute('solid.extrude', { distance: 8 });

        await sc.execute('sketch.create', { plane: 'XY', name: 'MotorBoreAndMounts' });
        await sc.execute('sketch.circle.center', { center: [30, 30], radius: 11 });
        await sc.execute('sketch.circle.center', { center: [10, 10], radius: 2.5 });
        await sc.execute('sketch.circle.center', { center: [50, 10], radius: 2.5 });
        await sc.execute('sketch.circle.center', { center: [50, 50], radius: 2.5 });
        await sc.execute('sketch.circle.center', { center: [10, 50], radius: 2.5 });
        await sc.execute('sketch.finish', {});
        await sc.execute('solid.extrude', { distance: 8, operation: 'cut' });

        const afterBuild = await sc.inspect();
        log.afterBuildInspect = afterBuild;

        await sc.execute('file.save', { path: '/opfs/motor_adapter_plate.sc' });
        await sc.execute('doc.open', { path: '/opfs/motor_adapter_plate.sc' });
        try {
          await sc.execute('ui.home', { open: false });
        } catch {}
        try {
          const canvas = win.document?.querySelector('canvas');
          if (canvas) {
            canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            canvas.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
          }
        } catch {}
        const afterReopen = await sc.inspect();
        log.reopenedFromOpfs = '/opfs/motor_adapter_plate.sc';
        log.afterReopenInspect = afterReopen;

        const stlRes = await sc.execute('file.export', {
          path: '/downloads/motor_adapter_plate.stl',
          format: 'stl'
        });
        const stepRes = await sc.execute('file.export', {
          path: '/downloads/motor_adapter_plate.step'
        });
        log.stlExportResult = stlRes;
        log.stepExportResult = stepRes;

        setAutomationOutput(JSON.stringify(log, null, 2));
        setStatusMessage(
          'SolidCraft 3D CAD: 60×60×8mm motor plate extruded and exported to STL + STEP.'
        );
      } else if (activeWorkspace.id === 'filmcraft') {
        setStatusMessage('Running FilmCraft Timeline Cut & Sequence Export...');
        let retries = 30;
        while (!win.filmcraft && retries > 0) {
          await new Promise((r) => setTimeout(r, 250));
          retries--;
        }
        if (!win.filmcraft) throw new Error('window.filmcraft API did not initialize in time.');

        const fc = win.filmcraft;
        const log: Record<string, any> = { workflow: 'FilmCraft Video Timeline & Export' };

        const importRes = await fc.importUrl(
          `${window.location.origin}/sample-assets/mosaic-test-clip.mp4`,
          'mosaic-test-clip.mp4'
        );
        log.importedMedia = importRes;

        const cmds = await fc.commands();
        log.availableCommandsCount = Array.isArray(cmds) ? cmds.length : 0;

        await fc.execute('file.newSequence', {
          name: 'Mosaic Calibration Cut',
          width: 640,
          height: 360,
          fps: 30
        });
        const itemId =
          typeof importRes === 'number'
            ? importRes
            : Array.isArray(importRes?.items) && typeof importRes.items[0] === 'number'
            ? importRes.items[0]
            : importRes && typeof importRes.id === 'number'
            ? importRes.id
            : 1;
        await fc.execute('timeline.place', {
          item: itemId,
          videoTrack: 'V1',
          audioTrack: 'A1',
          seconds: 0.0
        });
        await fc.execute('playhead.set', { seconds: 1.5 });
        await fc.execute('sequence.addEditAllTracks', {});
        const seqAfterSplit = await fc.execute('sequence.inspect', {});
        log.sequenceAfterRazorSplit = seqAfterSplit;

        await fc.execute('file.saveAs', { path: '/mosaic-calibration-cut.fcproj' });
        await fc.execute('file.open', { path: '/mosaic-calibration-cut.fcproj' });
        const vfsFiles = typeof fc.files === 'function' ? await fc.files() : [];
        log.vfsFiles = vfsFiles;

        setAutomationOutput(JSON.stringify(log, null, 2));
        setStatusMessage(
          'FilmCraft: mosaic-test-clip.mp4 placed on V1/A1, razor-split at 1.5s, and saved.'
        );
      } else if (activeWorkspace.id === 'riverstudio') {
        setStatusMessage('Recording Multi-Track Separate ISO Take in RiverCast & OneStudio...');
        let retries = 25;
        while (!win.riverstudio && retries > 0) {
          await new Promise((r) => setTimeout(r, 200));
          retries--;
        }
        if (!win.riverstudio) throw new Error('window.riverstudio API did not initialize.');
        const rs = win.riverstudio;
        await rs.execute('studio.setScene', { scene: 'screen-pip-circle' });
        await rs.execute('studio.recordCalibratedTake', { durationMs: 1100 });
        await rs.execute('studio.addMarker', { label: 'Verified Separate ISO Export Point' });
        const exportRes = await rs.execute('studio.exportSeparateTracks', { download: false });
        const inspectState = await rs.inspect();
        setAutomationOutput(
          JSON.stringify({ workflow: 'RiverCast & OneStudio Separate ISO Export', exportRes, inspectState }, null, 2)
        );
        setStatusMessage(
          'RiverCast & OneStudio: Screen ISO (.webm), Camera ISO (.webm), and 48kHz WAV exported separately.'
        );
      } else if (activeWorkspace.id === 'studiocut') {
        setStatusMessage('Running Studio Cut Multi-Track ISO Split & Render...');
        let retries = 25;
        while (!win.studiocut && retries > 0) {
          await new Promise((r) => setTimeout(r, 200));
          retries--;
        }
        if (!win.studiocut) throw new Error('window.studiocut API did not initialize.');
        const sc = win.studiocut;
        await sc.execute('pip.setLayout', { layout: 'pip-tr' });
        await sc.execute('timeline.splitAtPlayhead', { playheadPct: 45 });
        const separateRes = await sc.execute('export.separateScreenAndCamera', {});
        const masterRes = await sc.execute('export.masterVideo', {});
        const inspectState = await sc.inspect();
        setAutomationOutput(
          JSON.stringify(
            { workflow: 'Studio Cut Multi-Track ISO & Master Render', separateRes, masterRes, inspectState },
            null,
            2
          )
        );
        setStatusMessage(
          'Studio Cut: V1 Screen + V2 Camera split at 45%, PIP framed, and exported to Vault.'
        );
      } else if (activeWorkspace.id === 'bandforge') {
        setStatusMessage('Strumming BandForge Smart Chords & Bouncing Stereo WAV...');
        let retries = 25;
        while (!win.bandforge && retries > 0) {
          await new Promise((r) => setTimeout(r, 200));
          retries--;
        }
        if (!win.bandforge) throw new Error('window.bandforge API did not initialize.');
        const bf = win.bandforge;
        await bf.execute('smartChords.trigger', { chord: 'Cmaj9' });
        await bf.execute('smartChords.trigger', { chord: 'Am7' });
        await bf.execute('smartChords.trigger', { chord: 'Fmaj7' });
        const bounceRes = await bf.execute('song.bounceWav', { download: false });
        const inspectState = await bf.inspect();
        setAutomationOutput(
          JSON.stringify({ workflow: 'BandForge GarageBand Session Bounce', bounceRes, inspectState }, null, 2)
        );
        setStatusMessage(
          'BandForge: Smart Chords performed and stereo 44.1kHz WAV bounced to Vault.'
        );
      } else if (activeWorkspace.id === 'flstudio') {
        setStatusMessage('Sequencing FruityForge 21 Pattern & Rendering Stems...');
        let retries = 25;
        while (!win.flstudio && retries > 0) {
          await new Promise((r) => setTimeout(r, 200));
          retries--;
        }
        if (!win.flstudio) throw new Error('window.flstudio API did not initialize.');
        const fl = win.flstudio;
        await fl.execute('sequencer.toggleStep', { channelId: 'kick808', step: 2 });
        await fl.execute('pianoroll.toggleNote', { row: 1, col: 4 });
        const masterWav = await fl.execute('render.masterWav', { download: false });
        const stemsWav = await fl.execute('render.separateStems', { download: false });
        const inspectState = await fl.inspect();
        setAutomationOutput(
          JSON.stringify(
            { workflow: 'FruityForge 21 Beat & Stem Render', masterWav, stemsWav, inspectState },
            null,
            2
          )
        );
        setStatusMessage(
          'FruityForge 21: Master beat + separate Drum/808/Synth stems rendered to WAV.'
        );
      } else {
        const sampleName = activeWorkspace.recommendedSampleAsset;
        const matchingAsset = assets.find((a) => a.name === sampleName) || assets[0];
        if (matchingAsset) {
          await sendAssetIntoActiveEditor(matchingAsset);
          await new Promise((r) => setTimeout(r, 600));
          await inspectActiveEditor();
        }
      }
    } catch (err) {
      setAutomationOutput(`Workflow error: ${(err as Error).message}`);
      setStatusMessage(`Workflow error: ${(err as Error).message}`);
    } finally {
      setWorkflowRunning(false);
    }
  };

  // Auto-run demo workflow when launched via "Try Demo" on a Home Page card
  useEffect(() => {
    if (
      activeTab === 'workspace' &&
      editorReady &&
      pendingAutoDemoWorkspace &&
      pendingAutoDemoWorkspace === activeWorkspace.id &&
      !workflowRunning
    ) {
      setPendingAutoDemoWorkspace(null);
      runVerifiedWorkflow();
    }
  }, [activeTab, editorReady, pendingAutoDemoWorkspace, activeWorkspace.id, workflowRunning]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const now = new Date().toISOString();
    const spec = WORKSPACES.find((w) => w.id === newProjectWorkspace) || WORKSPACES[0];
    const ext = spec.nativeFormats[0] || '.proj';
    const slug = newProjectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const proj: SuiteProject = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      workspaceId: spec.id,
      createdAt: now,
      updatedAt: now,
      nativeFileName: `${slug}${ext}`,
      storedSnapshotFileId: null,
      mediaReferences: [],
      notes: newProjectNotes.trim() || `${spec.name} project created in ${branding.productName}.`,
      tags: [spec.category.split(' ')[0]]
    };

    await saveProject(proj);
    await refreshLocalStores();
    setNewProjectName('');
    setNewProjectNotes('');
    newProjectDialogRef.current?.close();
    openWorkspace(spec.id, proj.id);
  };

  const handleDownloadStoredSnapshot = async (project: SuiteProject) => {
    if (!project.storedSnapshotFileId) {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mosaic-project.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = await getStoredFile(project.storedSnapshotFileId);
    if (!file) return;
    const blob = new Blob([file.bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsset = (asset: SharedAssetRecord) => {
    const blob = new Blob([asset.bytes], { type: asset.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFullBackup = async () => {
    const bundle = await exportBackupBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnicraft-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported the OmniCraft OS project and file library backup JSON. Capture takes and Music projects have separate export controls.');
  };

  const handleImportFullBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await importBackupBundle(parsed);
      await refreshLocalStores();
      setStatusMessage(
        `Restored ${res.projectsImported} project(s), ${res.filesImported} snapshot(s), and ${res.assetsImported} asset(s).`
      );
    } catch (err) {
      setStatusMessage(`Backup restore failed: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  const filteredHomeWorkspaces = useMemo(() => {
    const q = homeSearch.trim().toLowerCase();
    return WORKSPACES.filter((ws) => {
      if (!matchesHomeCategory(ws, homeCategory)) return false;
      if (!q) return true;
      return (
        ws.name.toLowerCase().includes(q) ||
        ws.category.toLowerCase().includes(q) ||
        ws.purpose.toLowerCase().includes(q) ||
        ws.exportFormats.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [homeCategory, homeSearch]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.workspaceId.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
    );
  }, [projects, projectSearch]);

  const getAssetCategory = (fileName: string): 'cad' | 'video' | 'audio' | 'image' | 'docs' | 'other' => {
    const lower = fileName.toLowerCase();
    if (
      lower.endsWith('.sc') ||
      lower.endsWith('.step') ||
      lower.endsWith('.stp') ||
      lower.endsWith('.stl') ||
      lower.endsWith('.dxf') ||
      lower.endsWith('.dwg') ||
      lower.endsWith('.obj') ||
      lower.endsWith('.gltf') ||
      lower.endsWith('.glb')
    ) {
      return 'cad';
    }
    if (
      lower.endsWith('.webm') ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.otio') ||
      lower.endsWith('.fcproj') ||
      lower.endsWith('.mkv')
    ) {
      return 'video';
    }
    if (
      lower.endsWith('.wav') ||
      lower.endsWith('.mp3') ||
      lower.endsWith('.flac') ||
      lower.endsWith('.ogg') ||
      lower.endsWith('.mid') ||
      lower.endsWith('.midi')
    ) {
      return 'audio';
    }
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.pht') ||
      lower.endsWith('.gif')
    ) {
      return 'image';
    }
    if (
      lower.endsWith('.pdf') ||
      lower.endsWith('.docx') ||
      lower.endsWith('.doc') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.csv') ||
      lower.endsWith('.md') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.pptx')
    ) {
      return 'docs';
    }
    return 'other';
  };

  const getAssetIcon = (fileName: string) => {
    const cat = getAssetCategory(fileName);
    switch (cat) {
      case 'cad':
        return <Box size={18} style={{ color: '#38bdf8' }} />;
      case 'video':
        return <Video size={18} style={{ color: '#f43f5e' }} />;
      case 'audio':
        return <Disc size={18} style={{ color: '#f59e0b' }} />;
      case 'image':
        return <ImageIcon size={18} style={{ color: '#10b981' }} />;
      default:
        return <FileCode size={18} style={{ color: '#a855f7' }} />;
    }
  };

  const assetCounts = useMemo(() => {
    return {
      all: assets.length,
      cad: assets.filter((a) => getAssetCategory(a.name) === 'cad').length,
      video: assets.filter((a) => getAssetCategory(a.name) === 'video').length,
      audio: assets.filter((a) => getAssetCategory(a.name) === 'audio').length,
      image: assets.filter((a) => getAssetCategory(a.name) === 'image').length,
      docs: assets.filter((a) => getAssetCategory(a.name) === 'docs').length
    };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let list = assets;
    if (assetCategoryFilter !== 'all') {
      list = list.filter((a) => getAssetCategory(a.name) === assetCategoryFilter);
    }
    const q = assetSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.compatibleWorkspaces.some((w) => w.includes(q))
    );
  }, [assets, assetSearch, assetCategoryFilter]);

  const filteredQuickSwitch = useMemo(() => {
    const q = quickSwitchQuery.trim().toLowerCase();
    if (!q) return WORKSPACES;
    return WORKSPACES.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.purpose.toLowerCase().includes(q)
    );
  }, [quickSwitchQuery]);

  async function saveModelProject(model: { id: string; name: string; file: File }) {
    const now = new Date().toISOString();
    const fileId = `model-snapshot-${model.id}`;
    const previous = projects.find(project => project.id === model.id);
    const fileName = `${model.name}.sc`;
    await saveStoredFile({ id: fileId, projectId: model.id, name: fileName, mimeType: 'application/x-solidcraft', size: model.file.size, bytes: await model.file.arrayBuffer(), sourceWorkspaceId: 'solidcraft', kind: 'snapshot', createdAt: now });
    await saveProject({ id: model.id, name: model.name, workspaceId: 'solidcraft', createdAt: previous?.createdAt || now, updatedAt: now, nativeFileName: fileName, storedSnapshotFileId: fileId, mediaReferences: previous?.mediaReferences || [], notes: previous?.notes || 'Native Model project. Open to resume the actual CAD design.', tags: previous?.tags || ['CAD', 'Native project'] });
    setActiveProjectId(model.id); await refreshLocalStores();
  }
  const modelSnapshot = activeProject?.workspaceId === 'solidcraft' ? storedFiles.find(file => file.id === activeProject.storedSnapshotFileId) : undefined;
  const modelProject = modelOpenLink || (activeProject?.workspaceId === 'solidcraft' ? { id: activeProject.id, name: activeProject.name, file: modelSnapshot ? new File([modelSnapshot.bytes], modelSnapshot.name, { type: modelSnapshot.mimeType }) : undefined } : undefined);

  if (activeTab === 'workspace' && activeWorkspace.id === 'riverstudio') return <Recorder onBack={() => returnToHome('home')} />;
  if (activeTab === 'workspace' && activeWorkspace.id === 'solidcraft') return <React.Suspense fallback={<p>Loading Model…</p>}><ModelStudio onBack={() => returnToHome('home')} initialProject={modelProject} onSaved={saveModelProject} /></React.Suspense>;

  return (
    <div className="mf-shell oc-shell">
      {/* WHEN NOT INSIDE AN APP: Render the Spacious Standalone Home Launcher Header */}
      {activeTab !== 'workspace' && (
        <header className="mf-topbar" aria-label="Primary Suite Navigation">
          <div className="mf-topbar-left">
            <button
              type="button"
              className="mf-topbar-brand"
              onClick={() => returnToHome('home')}
            >
              <img src={branding.logoPath} alt="" className="mf-brand-logo" />
              <div>
                <span className="mf-brand-title" data-testid="brand-title">
                  {branding.productName}
                </span>
                <p className="mf-brand-sub">Creative &amp; Broadcast OS</p>
              </div>
            </button>
          </div>

          <nav className="mf-pill-nav" aria-label="Suite Sections">
            <button
              type="button"
              className={`mf-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
              data-testid="nav-home"
            >
              <Home size={15} />
              <span>Workspaces</span>
            </button>
            <button
              type="button"
              className={`mf-nav-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
              data-testid="nav-projects"
            >
              <FolderKanban size={15} />
              <span>Projects ({projects.length})</span>
            </button>
            <button
              type="button"
              className={`mf-nav-btn ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
              data-testid="nav-assets"
            >
              <HardDrive size={15} />
              <span>Files ({assets.length})</span>
            </button>
            <button
              type="button"
              className={`mf-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              data-testid="nav-settings"
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="mf-nav-btn"
              onClick={() => openWorkspace(activeWorkspace.id)}
              data-testid="nav-workspace"
              title={`Resume ${activeWorkspace.name}`}
            >
              <Wrench size={14} />
              <span>Resume {activeWorkspace.name.split(' ')[0]}</span>
            </button>
          </nav>

          <div className="mf-topbar-right">
            <button
              type="button"
              className="mf-btn"
              onClick={() => {
                setQuickSwitchQuery('');
                quickSwitchDialogRef.current?.showModal();
              }}
              data-testid="quick-switcher-trigger"
            >
              <Search size={14} />
              <span>Find a tool</span>
              <kbd
                style={{
                  fontSize: '10.5px',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              className="mf-btn mf-btn-primary"
              onClick={() => newProjectDialogRef.current?.showModal()}
              data-testid="new-project-trigger"
            >
              <Plus size={14} />
              <span>New Project</span>
            </button>

            <button
              type="button"
              className="mf-btn mf-btn-sm"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              title="Toggle Studio Dark / Light Mode"
              data-testid="theme-toggle-btn"
            >
              {themeMode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{themeMode === 'light' ? 'Editors: dark' : 'Editors: light'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="mf-main">
        {/* VIEW 1: STANDALONE HOME PAGE LAUNCHER */}
        {activeTab === 'home' && (
          <div className="mf-scroll-page" data-testid="view-home">
            <div className="mf-home-container">
              <StudioHero onOpenWorkspace={openWorkspace} />
              <div className="oc-catalog-heading">
                <h2>A workspace for what’s next.</h2>
                <p>Start with recording, music, CAD, or an upstream editor. Verification labels describe tested workflows; other tools remain available for exploration.</p>
              </div>

              {/* Category Pills & Search Filter */}
              <div id="studios-catalog" className="mf-filter-bar">
                <div className="mf-category-pills" role="tablist" aria-label="Filter Applications by Category">
                  {[
                    { id: 'all', label: 'All workspaces' },
                    { id: 'broadcast', label: 'Video' },
                    { id: 'daw', label: 'Music & audio' },
                    { id: 'cad', label: 'CAD' },
                    { id: 'design', label: 'Photo & design' },
                    { id: 'office', label: 'Documents' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`mf-cat-pill ${homeCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setHomeCategory(cat.id as HomeCategoryFilter)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <input
                  type="search"
                  className="mf-input"
                  style={{ minWidth: '250px' }}
                  placeholder="Filter apps by name or format (.wav, .stl, .webm)..."
                  value={homeSearch}
                  onChange={(e) => setHomeSearch(e.target.value)}
                  aria-label="Filter applications"
                />
              </div>

              {/* Clean, Uncluttered Application Grid */}
              <div className="mf-grid deferred-section">
                {filteredHomeWorkspaces.map((ws) => (
                  <article key={ws.id} className="mf-card" data-testid={`workspace-card-${ws.id}`}>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <AppIcon id={ws.id} size={42} />
                          <div>
                            <span className="mf-card-category" style={{ color: ws.accentColor }}>
                              {ws.category}
                            </span>
                            <h3 className="mf-card-title">{ws.name}</h3>
                          </div>
                        </div>
                      </div>

                      <p className="mf-card-desc">{ws.purpose}</p>
                      <p className="oc-card-status">{ws.verificationStatus === 'tested' ? 'Workflow verified' : ws.verificationStatus === 'partially tested' ? 'Some workflows verified' : 'Workflow verification pending'}</p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--mf-font-mono)', lineHeight: 1.4 }}>
                        {ws.exportFormats.slice(0, 3).join(' · ')}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                          type="button"
                          className="mf-btn mf-btn-primary mf-btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => openWorkspace(ws.id)}
                          data-testid={`card-open-${ws.id}`}
                        >
                          <span data-testid={`launch-ws-${ws.id}`}>Open workspace</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULL-SCREEN ENTERED APPLICATION (SINGLE MOUNTED STUDIO) */}
        {activeTab === 'workspace' && (
          <div className="mf-workspace-host" data-testid="view-workspace">
            <div className="mf-workspace-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="mf-back-home-btn"
                  onClick={() => returnToHome('home')}
                  data-testid="back-to-home-btn"
                  title="Return to App Launcher Home Page"
                >
                  <ArrowLeft size={14} />
                  <span>Home</span>
                </button>

                <div
                  style={{
                    height: '18px',
                    width: '1px',
                    background: 'var(--border-strong)',
                    marginInline: '2px'
                  }}
                />

                <AppIcon id={activeWorkspace.id} size={24} style={{ marginRight: '4px' }} />
                <strong style={{ fontSize: '14px' }}>{activeWorkspace.name}</strong>

                {/* Quick-Hop Studio Strip for 1-Click Pipeline Switching */}
                <div className="mf-quick-hop-strip" aria-label="Quick Studio Pipeline Switcher">
                  {[
                    { id: 'riverstudio', label: 'Capture' },
                    { id: 'filmcraft', label: 'Cut' },
                    { id: 'music', label: 'Music' },
                    { id: 'photocraft', label: 'Photo' },
                    { id: 'solidcraft', label: 'Model' }
                  ].map((hop) => (
                    <button
                      key={hop.id}
                      type="button"
                      className={`mf-hop-pill ${activeWorkspace.id === hop.id ? 'active' : ''}`}
                      onClick={() => openWorkspace(hop.id)}
                      data-testid={`hop-${hop.id}`}
                    >
                      <span>{hop.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mf-btn mf-btn-sm"
                  onClick={() => {
                    setQuickSwitchQuery('');
                    quickSwitchDialogRef.current?.showModal();
                  }}
                  data-testid="quick-switcher-trigger"
                  title="Switch to another application (⌘K)"
                >
                  <Search size={12} />
                  <span>All workspaces</span>
                  <kbd style={{ fontSize: '10px', opacity: 0.75 }}>⌘K</kbd>
                </button>

                {editorDirty && (
                  <span className="mf-badge partial" title="Unsaved changes reported by studio">
                    ● Unsaved Edits
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Sample / Shared Asset Quick Send */}
                <select
                  aria-label="Send Shared Asset into Editor"
                  className="mf-select"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  defaultValue=""
                  onChange={(e) => {
                    const asset = assets.find((a) => a.id === e.target.value);
                    if (asset) {
                      sendAssetIntoActiveEditor(asset);
                      e.target.value = '';
                    }
                  }}
                  data-testid="workspace-send-asset-select"
                >
                  <option value="" disabled>
                    Load from Files ({assets.length})...
                  </option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatBytes(a.size)})
                    </option>
                  ))}
                </select>

                {/* Local Disk File Import */}
                <label className="mf-btn mf-btn-sm" style={{ cursor: 'pointer' }}>
                  <Upload size={13} />
                  <span>Import File</span>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleUploadAssetToEditor}
                  />
                </label>

                {/* Run Studio Quick Action */}
                {['solidcraft', 'filmcraft'].includes(activeWorkspace.id) && (
                  <button
                    type="button"
                    className="mf-btn mf-btn-primary mf-btn-sm"
                    onClick={runVerifiedWorkflow}
                    disabled={workflowRunning}
                    data-testid="run-verified-workflow-btn"
                  >
                    <Play size={13} />
                    <span>
                      {workflowRunning
                        ? 'Running...'
                        : activeWorkspace.id === 'solidcraft'
                        ? 'Auto-Build 3D Motor Plate'
                        : activeWorkspace.id === 'filmcraft'
                        ? 'Auto-Cut Sample Timeline'
                        : activeWorkspace.id === 'riverstudio'
                        ? 'Record Separate ISO Take'
                        : activeWorkspace.id === 'studiocut'
                        ? 'Split & Render ISO Video'
                        : activeWorkspace.id === 'bandforge'
                        ? 'Strum Chords & Bounce WAV'
                        : activeWorkspace.id === 'flstudio'
                        ? 'Sequence Beat & Export Stems'
                        : 'Load Sample Asset'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className="mf-btn mf-btn-sm"
                  onClick={() => returnToHome('assets')}
                  title="Open file library"
                >
                  <HardDrive size={13} />
                  <span>Vault ({assets.length})</span>
                </button>

                {/* Renderer Selector (compact) */}
                <select
                  aria-label="Renderer Backend Mode"
                  className="mf-select"
                  style={{ padding: '4px 8px', fontSize: '11.5px' }}
                  value={rendererMode}
                  onChange={(e) => setRendererMode(e.target.value as RendererMode)}
                  data-testid="renderer-mode-select"
                >
                  <option value="auto">GPU: Auto</option>
                  <option value="webgl">WebGL2</option>
                  <option value="cpu">CPU</option>
                </select>

                <button
                  type="button"
                  className="mf-btn mf-btn-sm"
                  onClick={() => {
                    setShowAutomationDrawer((prev) => !prev);
                    inspectActiveEditor();
                  }}
                  data-testid="toggle-automation-drawer-btn"
                  title="Toggle Studio Telemetry Inspector"
                >
                  <Terminal size={13} />
                </button>
              </div>
            </div>

            <div className="mf-workspace-stage">
              {computedEditorUrl ? (
                <iframe
                  key={`${activeWorkspace.id}-${rendererMode}`}
                  ref={iframeRef}
                  src={computedEditorUrl}
                  title={`${activeWorkspace.name} Embedded Workspace`}
                  className="mf-editor-iframe"
                  allow="camera; microphone; display-capture"
                  data-testid="active-editor-iframe"
                />
              ) : (
                <div style={{ padding: '32px', maxWidth: '680px', margin: '0 auto' }}>
                  <div className="mf-card">
                    <span className="mf-badge untested">Source Repository Checked Out</span>
                    <h2 style={{ margin: '6px 0' }}>{activeWorkspace.name}</h2>
                    <p className="mf-card-desc">{activeWorkspace.verifiedWorkflowSummary}</p>
                    <div className="mf-code-block">
                      {`Repository: ${activeWorkspace.upstreamRepo}\nPinned Commit: ${activeWorkspace.pinnedCommit}\nLocal Checkout: upstream/${activeWorkspace.id}\nLicense: ${activeWorkspace.licenseSelected}`}
                    </div>
                  </div>
                </div>
              )}

              {showAutomationDrawer && (
                <aside className="mf-automation-drawer" aria-label="Workspace Bridge & Automation Inspector">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Studio Telemetry Inspector</strong>
                    <button
                      type="button"
                      className="mf-btn mf-btn-sm"
                      onClick={() => setShowAutomationDrawer(false)}
                    >
                      Close
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {activeWorkspace.roleNotes}
                  </p>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="mf-btn mf-btn-sm"
                      onClick={inspectActiveEditor}
                      data-testid="inspect-editor-state-btn"
                    >
                      <RefreshCw size={12} />
                      <span>Inspect Live State</span>
                    </button>
                    <button
                      type="button"
                      className="mf-btn mf-btn-sm"
                      onClick={runVerifiedWorkflow}
                      disabled={workflowRunning}
                    >
                      <Play size={12} />
                      <span>Execute Demo Script</span>
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Live Editor Output
                    </div>
                    <pre className="mf-code-block" data-testid="automation-output-pre">
                      {automationOutput}
                    </pre>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Captured Saves &amp; Exports ({capturedExports.length})
                    </div>
                    {capturedExports.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        Supported editor bridges can send files to the file library. Recorder and Music Studio downloads are managed inside their workspaces.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {capturedExports.map((exp) => (
                          <div
                            key={exp.id}
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '11.5px'
                            }}
                          >
                            <div>
                              <strong>{exp.name}</strong> ({formatBytes(exp.size)})
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                              From {exp.appId} at {exp.timestamp}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="mf-scroll-page" data-testid="view-projects">
            <div className="mf-home-container">
              <div className="mf-section-header" style={{ marginTop: 0 }}>
                <div>
                  <h2>Local Studio Projects</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Model projects reopen from this library. Other editors keep their own native save/open controls. Download Capture takes separately.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="search"
                    className="mf-input"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    aria-label="Search local projects"
                  />
                  <button
                    type="button"
                    className="mf-btn"
                    onClick={handleExportFullBackup}
                    data-testid="export-backup-btn"
                  >
                    <Download size={14} />
                    <span>Back up library</span>
                  </button>
                  <label className="mf-btn" style={{ cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>Restore Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleImportFullBackup}
                    />
                  </label>
                </div>
              </div>

              <div className="mf-grid">
                {filteredProjects.map((proj) => {
                  const ws = WORKSPACES.find((w) => w.id === proj.workspaceId) || WORKSPACES[0];
                  const missingRefs = proj.mediaReferences.filter(
                    (ref) => !assets.some((a) => a.id === ref.assetId || a.name === ref.fileName)
                  );

                  return (
                    <article key={proj.id} className="mf-card" data-testid={`project-card-${proj.id}`}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className="mf-card-category" style={{ color: ws.accentColor }}>
                            {ws.name}
                          </span>
                          {proj.storedSnapshotFileId ? (
                            <span className="mf-badge tested">Snapshot Stored</span>
                          ) : (
                            <span className="mf-badge partial">Project setup</span>
                          )}
                        </div>
                        <h3 className="mf-card-title">{proj.name}</h3>
                        <p className="mf-card-desc">{proj.notes}</p>
                      </div>

                      <div>
                        <div className="mf-card-meta" style={{ marginBottom: '10px' }}>
                          <span>File: {proj.nativeFileName || 'n/a'}</span>
                          <span>Updated: {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        </div>

                        {proj.mediaReferences.length > 0 && (
                          <div style={{ fontSize: '11.5px', marginBottom: '10px' }}>
                            {missingRefs.length === 0 ? (
                              <span style={{ color: 'var(--status-tested-fg)' }}>
                                {proj.mediaReferences.length} referenced asset(s) available in the library
                              </span>
                            ) : (
                              <span style={{ color: 'var(--status-blocked-fg)' }}>
                                ⚠ Missing {missingRefs.length} referenced media file(s)
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="mf-btn mf-btn-primary mf-btn-sm"
                            onClick={() => openWorkspace(proj.workspaceId, proj.id)}
                          >
                            <span>Enter {ws.name}</span>
                            <ArrowRight size={12} />
                          </button>
                          <button
                            type="button"
                            className="mf-btn mf-btn-sm"
                            onClick={() => handleDownloadStoredSnapshot(proj)}
                          >
                            <Download size={12} />
                            <span>Export</span>
                          </button>
                          <button
                            type="button"
                            className="mf-btn mf-btn-sm"
                            onClick={async () => {
                              await deleteProject(proj.id);
                              await refreshLocalStores();
                            }}
                            aria-label={`Delete ${proj.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ASSET VAULT & CROSS-APP HANDOFF (Option 3 Bento Aesthetic) */}
        {activeTab === 'assets' && (
          <div className="mf-scroll-page" data-testid="view-assets">
            <div className="mf-home-container">
              <section className="oc-library-intro" aria-labelledby="library-title">
                <p className="oc-eyebrow">YOUR FILES</p>
                <h2 id="library-title">A library for your next project.</h2>
                <p>Keep source files and editor exports in this browser. Download a backup before clearing site data.</p>
                <p>Format suggestions are a starting point. Each editor has its own import controls; Capture takes and Music projects have separate save and export controls.</p>
                <span>{formatBytes(storageHealth.usageBytes)} used by this site · {storageHealth.persisted ? 'Persistent storage granted' : 'Browser-managed storage'}</span>
              </section>

              {/* Filter Bar & Category Pills */}
              <div className="mf-section-header" style={{ marginTop: 0, marginBottom: '16px' }}>
                <div className="mf-category-pills" role="tablist" aria-label="Filter Assets by Category">
                  {[
                    { id: 'all', label: `All Assets (${assetCounts.all})` },
                    { id: 'cad', label: `3D CAD & Mesh (${assetCounts.cad})` },
                    { id: 'video', label: `Video & ISOs (${assetCounts.video})` },
                    { id: 'audio', label: `Music & DAW (${assetCounts.audio})` },
                    { id: 'image', label: `Graphics & Photo (${assetCounts.image})` },
                    { id: 'docs', label: `Docs & Specs (${assetCounts.docs})` }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`mf-cat-pill ${assetCategoryFilter === cat.id ? 'active' : ''}`}
                      onClick={() => setAssetCategoryFilter(cat.id as any)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="search"
                    className="mf-input"
                    placeholder="Filter assets by name, studio or format..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    aria-label="Filter shared assets"
                    style={{ minWidth: '220px' }}
                  />
                  <label className="mf-btn mf-btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>Import file</span>
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      aria-label="Import library file"
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;
                        try {
                          if (file.size > 128 * 1024 * 1024) throw new Error('Use a file under 128 MB in the library. Open larger media directly in its editor.');
                          setStatusMessage(`Saving ${file.name} to the library…`);
                          const bytes = await file.arrayBuffer();
                          await saveSharedAsset({ id: `asset-${crypto.randomUUID()}`, name: file.name, mimeType: file.type || 'application/octet-stream', size: bytes.byteLength, bytes, sourceWorkspaceId: 'user-upload', isBuiltInSample: false, compatibleWorkspaces: inferCompatibleWorkspaces(file.name), createdAt: new Date().toISOString(), description: 'Imported source file' });
                          await refreshLocalStores();
                          setStatusMessage(`${file.name} saved in this browser.`);
                        } catch (error) { setStatusMessage(`File import failed: ${(error as Error).message}`); }
                        finally { input.value = ''; }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="mf-btn mf-btn-sm"
                    onClick={handleExportFullBackup}
                    title="Export all projects and shared vault assets as JSON backup"
                  >
                    <Download size={13} />
                    <span>Backup JSON</span>
                  </button>
                </div>
              </div>

              {/* Bento Cards Grid */}
              <div className="mf-grid">
                {filteredAssets.map((asset) => {
                  const sourceWs = WORKSPACES.find((w) => w.id === asset.sourceWorkspaceId);
                  const sourceLabel = asset.isBuiltInSample
                    ? 'Sample Asset'
                    : sourceWs
                    ? sourceWs.name
                    : asset.sourceWorkspaceId === 'user-upload' ? 'Imported file' : `From ${asset.sourceWorkspaceId}`;

                  return (
                    <article key={asset.id} className="mf-card" data-testid={`asset-card-${asset.id}`}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span
                            className="mf-card-category"
                            style={{
                              color: sourceWs?.accentColor || 'var(--text-secondary)',
                              fontWeight: 700
                            }}
                          >
                            {sourceLabel}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className="mf-badge tested" title="Local file handoff">
                              <Zap size={10} />
                              <span>Local files</span>
                            </span>
                            <span className="mf-badge">{formatBytes(asset.size)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          {getAssetIcon(asset.name)}
                          <h3 className="mf-card-title" style={{ margin: 0, wordBreak: 'break-all' }}>
                            {asset.name}
                          </h3>
                        </div>

                        <p className="mf-card-desc" style={{ marginBottom: '12px' }}>
                          {asset.description}
                        </p>
                      </div>

                      <div>
                        <div className="mf-card-meta" style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="mf-badge" style={{ fontSize: '10.5px' }}>
                            {asset.mimeType}
                          </span>
                          <span className="mf-badge tested" style={{ fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <HardDrive size={10} />
                            <span>Saved in this browser</span>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Format Compatibility Pills & Live Handoff */}
                        <div style={{ marginBottom: '12px' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              marginBottom: '6px'
                            }}
                          >
                            Suggested workspaces:
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {asset.compatibleWorkspaces.filter(id => id !== 'riverstudio').slice(0, 4).map((wsId) => {
                              const ws = WORKSPACES.find((w) => w.id === wsId);
                              if (!ws) return null;
                              return (
                                <button
                                  key={wsId}
                                  type="button"
                                  className="mf-compat-pill"
                                  onClick={() => handleHandoffToStudio(wsId, asset)}
                                  title={`Try importing ${asset.name} in ${ws.name}; support depends on the editor`}
                                  data-testid={`handoff-btn-${asset.id}-${wsId}`}
                                >
                                  <span>Open in {ws.name.split(' ')[0]}</span>
                                  <ArrowRight size={11} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <button
                            type="button"
                            className="mf-btn mf-btn-sm"
                            onClick={() => handleDownloadAsset(asset)}
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </button>
                          {!asset.isBuiltInSample && (
                            <button
                              type="button"
                              className="mf-btn mf-btn-sm"
                              onClick={async () => {
                                await deleteSharedAsset(asset.id);
                                await refreshLocalStores();
                              }}
                              aria-label={`Delete ${asset.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: SETTINGS, BRANDING, STORAGE, HARDWARE & UPSTREAM AUDIT */}
        {activeTab === 'settings' && (
          <div className="mf-scroll-page" data-testid="view-settings">
            <div className="mf-home-container">
              <div className="mf-grid" style={{ marginBottom: '28px' }}>
                <div className="mf-card">
                  <div>
                    <span className="mf-card-category">Centralized Product Identity</span>
                    <h3 className="mf-card-title">Branding &amp; Suite Customization</h3>
                    <p className="mf-card-desc">
                      Customize the suite name, tagline, or accent color in the OmniCraft shell.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      <label style={{ fontSize: '12px' }}>
                        Product Name
                        <input
                          type="text"
                          className="mf-input"
                          style={{ width: '100%', marginTop: '4px' }}
                          value={branding.productName}
                          onChange={(e) => setBranding(saveBrandingConfig({ productName: e.target.value }))}
                          data-testid="branding-name-input"
                        />
                      </label>
                      <label style={{ fontSize: '12px' }}>
                        Tagline
                        <input
                          type="text"
                          className="mf-input"
                          style={{ width: '100%', marginTop: '4px' }}
                          value={branding.tagline}
                          onChange={(e) => setBranding(saveBrandingConfig({ tagline: e.target.value }))}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px' }}>
                          Accent Color
                          <input
                            type="color"
                            value={branding.accentPrimary}
                            onChange={(e) =>
                              setBranding(saveBrandingConfig({ accentPrimary: e.target.value }))
                            }
                            style={{ display: 'block', marginTop: '4px' }}
                          />
                        </label>
                        <button
                          type="button"
                          className="mf-btn mf-btn-sm"
                          style={{ marginTop: '16px' }}
                          onClick={() => setBranding(resetBrandingConfig())}
                        >
                          Reset Default Branding
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mf-code-block" style={{ marginTop: '8px' }}>
                    {`Domain Checked: ${branding.domainCheck.domain}\nChecked At (UTC): ${branding.domainCheck.checkedAtUtc}\nMethod: ${branding.domainCheck.method}\nResult: ${branding.domainCheck.statusSummary}`}
                  </div>
                </div>

                <div className="mf-card">
                  <div>
                    <span className="mf-card-category">Local-First Storage &amp; Hardware</span>
                    <h3 className="mf-card-title">One active workspace</h3>
                    <p className="mf-card-desc">
                      Editors load when opened. Switching workspaces releases their interface; the browser controls when memory is reclaimed. Save your project before switching.
                    </p>
                  </div>

                  <div className="mf-code-block">
                    {`IndexedDB + OPFS Usage: ${formatBytes(storageHealth.usageBytes)}\nBrowser Quota Estimate: ${formatBytes(storageHealth.quotaBytes)}\nOPFS Directory API: ${storageHealth.opfsAvailable ? 'Available' : 'Unavailable'}\nPersistent Storage Grant: ${storageHealth.persisted ? 'Granted' : 'Best-Effort (Use JSON Backup)'}\nStored Snapshots/Exports: ${storedFiles.length}`}
                  </div>
                </div>
              </div>

              <div className="mf-section-header">
                <h2 id="upstream-table-heading">
                  Studio Engine Inventory &amp; Open-Source License Matrix
                </h2>
              </div>

              <div
                className="table-container deferred-section"
                tabIndex={0}
                role="region"
                aria-labelledby="upstream-table-heading"
              >
                <table
                  className="mf-table"
                  style={
                    {
                      '--label-1': '"Workspace / Repo"',
                      '--label-2': '"Pinned Commit"',
                      '--label-3': '"Upstream Status"',
                      '--label-4': '"Selected License"',
                      '--label-5': '"Verification"'
                    } as React.CSSProperties
                  }
                >
                  <thead>
                    <tr>
                      <th>Workspace / Repo</th>
                      <th>Pinned Commit</th>
                      <th>Upstream Status</th>
                      <th>Selected License</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WORKSPACES.map((ws) => {
                      const rep = upstreamReport?.results.find((r) => r.id === ws.id);
                      return (
                        <tr key={ws.id}>
                          <td>
                            <strong>{ws.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              <a
                                href={ws.upstreamRepo}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--mf-accent)' }}
                              >
                                {ws.upstreamRepo.replace('https://github.com/', '')}
                              </a>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--mf-font-mono)', fontSize: '11.5px' }}>
                            {ws.pinnedTag} ({ws.pinnedCommit.slice(0, 10)})
                          </td>
                          <td>
                            {rep?.pinnedCommit === ws.pinnedCommit && rep?.updateAvailable ? (
                              <span className="mf-badge partial">
                                Previous check: different ({rep.remoteHeadCommit?.slice(0, 8)})
                              </span>
                            ) : (
                              <span className="mf-badge untested">{ws.upstreamRepo ? 'Run upstream:check' : 'Local adapter'}</span>
                            )}
                          </td>
                          <td>{ws.licenseSelected}</td>
                          <td>
                            <span className={statusBadgeClass(ws.verificationStatus)}>
                              {ws.verificationStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {BLOCKED_REPOSITORIES.map((blk) => (
                      <tr key={blk.id}>
                        <td>
                          <strong>{blk.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{blk.upstreamRepo}</div>
                        </td>
                        <td>Excluded</td>
                        <td>
                          <span className="mf-badge blocked">Blocked</span>
                        </td>
                        <td>{blk.licenseDeclared}</td>
                        <td>{blk.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Studio Status Bar */}
      <footer className="mf-statusbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span role="status" aria-live="polite" data-testid="status-bar-message">{statusMessage}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>Vault: {formatBytes(storageHealth.usageBytes)}</span>
          <span>Development build · verify exports before use</span>
        </div>
      </footer>

      {/* Native Modal Dialog 1: Create New Project */}
      <dialog
        ref={newProjectDialogRef}
        className="mf-dialog"
        closedby="any"
        aria-labelledby="new-project-dialog-title"
        data-testid="new-project-dialog"
      >
        <form onSubmit={handleCreateProject}>
          <h2 id="new-project-dialog-title" style={{ marginTop: 0 }}>
            Create New Studio Project
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <label style={{ fontSize: '12.5px' }}>
              Project Name
              <input
                type="text"
                required
                className="mf-input"
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="e.g., Episode 14 Podcast ISO or Gearbox Rev B"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                data-testid="new-project-name-input"
              />
            </label>

            <label style={{ fontSize: '12.5px' }}>
              Target Application
              <select
                className="mf-select"
                style={{ width: '100%', marginTop: '4px' }}
                value={newProjectWorkspace}
                onChange={(e) => setNewProjectWorkspace(e.target.value)}
                data-testid="new-project-workspace-select"
              >
                {WORKSPACES.filter((w) => w.integrationLevel === 'integrated').map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.category}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: '12.5px' }}>
              Notes &amp; Specifications
              <input
                type="text"
                className="mf-input"
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="Optional project notes..."
                value={newProjectNotes}
                onChange={(e) => setNewProjectNotes(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="mf-btn"
              onClick={() => closeTopLayer(newProjectDialogRef.current)}
            >
              Cancel
            </button>
            <button type="submit" className="mf-btn mf-btn-primary" data-testid="create-project-submit">
              Create &amp; Enter Application
            </button>
          </div>
        </form>
      </dialog>

      {/* Native Modal Dialog 2: Quick Application Switcher (⌘K) */}
      <dialog
        ref={quickSwitchDialogRef}
        className="mf-dialog"
        closedby="any"
        aria-labelledby="quick-switch-dialog-title"
        data-testid="quick-switch-dialog"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="quick-switch-dialog-title" style={{ margin: 0, fontSize: '16px' }}>
              Jump to Application
            </h2>
            <button
              type="button"
              className="mf-btn mf-btn-sm"
              onClick={() => closeTopLayer(quickSwitchDialogRef.current)}
            >
              Esc
            </button>
          </div>

          <input
            type="search"
            className="mf-input"
            placeholder="Search workspaces by name, category, or file format…"
            value={quickSwitchQuery}
            onChange={(e) => setQuickSwitchQuery(e.target.value)}
            autoFocus
          />

          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {filteredQuickSwitch.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className="mf-nav-btn"
                onClick={() => {
                  closeTopLayer(quickSwitchDialogRef.current);
                  openWorkspace(ws.id);
                }}
                style={{ justifyContent: 'space-between', width: '100%' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AppIcon id={ws.id} size={28} />
                  <strong>{ws.name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>— {ws.category}</span>
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </dialog>

      {/* Native Modal Dialog 3: HyperFrames Launch Reel & 10-Min Master Showcase Cinema Player */}
      <dialog
        ref={showcaseDialogRef}
        className="mf-dialog mf-dialog-wide"
        closedby="any"
        aria-labelledby="showcase-dialog-title"
        data-testid="showcase-video-dialog"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span className="mf-badge tested">HyperFrames Motion Graphics + Live Screen Recording</span>
              <h2 id="showcase-dialog-title" style={{ margin: '6px 0 0', fontSize: '18px' }}>
                {showcaseVideoMode === 'brag'
                  ? 'OmniCraft OS — 20s HyperFrames Launch Reel'
                  : 'OmniCraft OS — 10-Minute Full-Suite Master Showcase (25 Chapters)'}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`mf-btn mf-btn-sm ${showcaseVideoMode === 'brag' ? 'mf-btn-primary' : ''}`}
                onClick={() => setShowcaseVideoMode('brag')}
                data-testid="showcase-mode-brag"
              >
                <span>20s Launch Reel</span>
              </button>
              <button
                type="button"
                className={`mf-btn mf-btn-sm ${showcaseVideoMode === 'master' ? 'mf-btn-primary' : ''}`}
                onClick={() => setShowcaseVideoMode('master')}
                data-testid="showcase-mode-master"
              >
                <span>10-Min Master Walkthrough</span>
              </button>
              <button
                type="button"
                className="mf-btn mf-btn-sm"
                onClick={() => closeTopLayer(showcaseDialogRef.current)}
                data-testid="close-showcase-dialog"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mf-video-player-shell">
            <video
              key={showcaseVideoMode}
              ref={showcaseVideoRef}
              controls
              playsInline
              poster="/media/brag.jpg"
              src={
                showcaseVideoMode === 'brag'
                  ? '/media/brag.mp4'
                  : '/media/mosaic-forge-10min-master-showcase.mp4'
              }
              data-testid="showcase-video-element"
            >
              {showcaseVideoMode === 'master' && (
                <track
                  kind="captions"
                  src="/media/mosaic-forge-10min-subtitles.vtt"
                  srcLang="en"
                  label="English Captions"
                  default
                />
              )}
            </video>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {showcaseVideoMode === 'brag'
                ? 'Jump to Scene in 20s HyperFrames Launch Reel:'
                : 'Jump to Chapter in 10-Minute Showcase:'}
            </div>
            <div className="mf-chapter-strip">
              {(showcaseVideoMode === 'brag'
                ? [
                    { label: '00:01 Home Launcher (18 Studios)', sec: 1.8 },
                    { label: '00:05 RiverCast ISO + Studio Cut NLE', sec: 5.2 },
                    { label: '00:09 BandForge + FruityForge 21 DAWs', sec: 9.5 },
                    { label: '00:14 SolidCraft 3D CAD + Asset Vault', sec: 14.5 },
                    { label: '00:18 OmniCraft OS End Card', sec: 18.5 }
                  ]
                : [
                    { label: '00:00 Home Launcher', sec: 0 },
                    { label: '00:48 RiverCast ISO', sec: 48 },
                    { label: '01:12 Studio Cut NLE', sec: 72 },
                    { label: '01:36 BandForge GarageBand', sec: 96 },
                    { label: '02:00 Tweed Amp Rig', sec: 120 },
                    { label: '02:24 FruityForge 21 FL Studio', sec: 144 },
                    { label: '02:48 SolidCraft 3D CAD', sec: 168 },
                    { label: '03:36 FilmCraft Video', sec: 216 },
                    { label: '04:00 PhotoCraft Layers', sec: 240 },
                    { label: '08:48 Asset Vault Handoff', sec: 528 }
                  ]
              ).map((ch) => (
                <button
                  key={ch.label}
                  type="button"
                  className="mf-btn mf-btn-sm"
                  onClick={() => {
                    if (showcaseVideoRef.current) {
                      showcaseVideoRef.current.currentTime = ch.sec;
                      showcaseVideoRef.current.play().catch(() => {});
                    }
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </dialog>

      {/* Persistent Toast Notification Popover (`popover="manual"`) per modern-web-guidance `persistent-toast-notifications` */}
      <div
        ref={toastPopoverRef}
        className="mf-toast-popover"
        role="status"
        aria-live="polite"
        data-testid="export-toast-popover"
        {...({ popover: 'manual' } as any)}
      >
        {latestToast && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <span className="mf-badge tested">✓ Saved to file library</span>
                <div style={{ fontWeight: 700, fontSize: '13.5px', marginTop: '4px' }}>
                  {latestToast.name} ({formatBytes(latestToast.size)})
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Captured from {latestToast.appId} at {latestToast.timestamp}
                </div>
              </div>
              <button
                type="button"
                className="mf-btn mf-btn-sm"
                onClick={() => closeTopLayer(toastPopoverRef.current)}
                aria-label="Close notification"
              >
                Dismiss
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mf-btn mf-btn-primary mf-btn-sm"
                onClick={() => {
                  closeTopLayer(toastPopoverRef.current);
                  returnToHome('assets');
                }}
              >
                <HardDrive size={12} />
                <span>Open file library</span>
              </button>
              {latestToast.appId === 'riverstudio' && (
                <button
                  type="button"
                  className="mf-btn mf-btn-sm"
                  onClick={() => {
                    closeTopLayer(toastPopoverRef.current);
                    openWorkspace('studiocut');
                  }}
                >
                  <Video size={12} />
                  <span>Edit in Studio Cut NLE</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
