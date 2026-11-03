/** Tauri injects this runtime marker before loading the frontend. */
export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
