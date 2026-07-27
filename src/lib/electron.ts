export type ElectronPlatform = 'darwin' | 'win32' | 'linux' | string;

export function isElectron(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window.electronAPI?.isElectron ||
        navigator.userAgent.toLowerCase().includes('electron'))
  );
}

export function getElectronPlatform(): ElectronPlatform | null {
  if (typeof window !== 'undefined' && window.electronAPI?.platform) {
    return window.electronAPI.platform;
  }
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')) {
    return 'darwin';
  }
  return null;
}

export function isMacElectron(): boolean {
  return isElectron() && getElectronPlatform() === 'darwin';
}

export function applyElectronDocumentAttributes(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isElectron()) {
    root.setAttribute('data-electron', 'true');
    root.dataset.electron = 'true';
    const platform = getElectronPlatform() || 'darwin';
    root.setAttribute('data-platform', platform);
    root.dataset.platform = platform;
  }
}
