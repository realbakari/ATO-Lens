const { app, dialog, shell, Notification } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Update checking against the project's GitHub releases.
 *
 * This is the only network request ATO Lens makes on its own - everything else
 * is triggered by the user. It is disclosed in the privacy panel and can be
 * turned off from the Help menu, in which case nothing is contacted unless the
 * user explicitly chooses "Check for Updates".
 */

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');
const RELEASES_URL = 'https://github.com/realbakari/ATO-Lens/releases';

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(next) {
  try {
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify({ ...readSettings(), ...next }, null, 2));
  } catch (err) {
    console.error('[ATO Lens] Could not persist settings:', err);
  }
}

function isAutoCheckEnabled() {
  const stored = readSettings().automaticUpdateChecks;
  return stored === undefined ? true : Boolean(stored);
}

function setAutoCheckEnabled(enabled) {
  writeSettings({ automaticUpdateChecks: Boolean(enabled) });
}

let autoUpdater = null;
let isChecking = false;

function getAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    console.error('[ATO Lens] electron-updater unavailable:', err);
    return null;
  }

  autoUpdater.autoDownload = false; // ask before pulling ~100 MB
  autoUpdater.autoInstallOnAppQuit = true;
  // Keep electron-updater's own logging. Silencing it makes a failed update
  // impossible to diagnose from a user's machine.
  autoUpdater.logger = console;

  autoUpdater.on('error', (err) => {
    console.error('[ATO Lens] Updater error:', err);
    setProgress(-1);
  });

  // A ~95 MB download over a slow link takes minutes. Without feedback the app
  // looks frozen after the user agrees to update, so report progress on the
  // dock/taskbar icon.
  autoUpdater.on('download-progress', ({ percent, transferred, total }) => {
    setProgress(percent / 100);
    console.log(
      `[ATO Lens] Downloading update: ${Math.round(percent)}% ` +
        `(${(transferred / 1048576).toFixed(1)} of ${(total / 1048576).toFixed(1)} MB)`
    );
  });

  autoUpdater.on('update-downloaded', () => setProgress(-1));

  return autoUpdater;
}

/** Drives the dock progress indicator; -1 clears it. */
function setProgress(fraction) {
  const { BrowserWindow } = require('electron');
  for (const win of BrowserWindow.getAllWindows()) {
    win.setProgressBar(fraction);
  }
}

/**
 * @param {boolean} manual - true when the user chose "Check for Updates", which
 *   means "no updates" and errors deserve a dialog. Background checks stay quiet.
 */
async function checkForUpdates(manual = false) {
  if (isChecking) return;

  // A packaged, signed build is the only thing that can install an update;
  // in development electron-updater would just throw.
  if (!app.isPackaged) {
    if (manual) {
      dialog.showMessageBox({
        type: 'info',
        message: 'Updates are not available in development',
        detail: 'Run a packaged build to test the updater.',
        buttons: ['OK']
      });
    }
    return;
  }

  const updater = getAutoUpdater();
  if (!updater) return;

  isChecking = true;
  try {
    const result = await updater.checkForUpdates();
    const version = result?.updateInfo?.version;

    if (!version || version === app.getVersion()) {
      if (manual) {
        await dialog.showMessageBox({
          type: 'info',
          message: 'ATO Lens is up to date',
          detail: `You are running version ${app.getVersion()}.`,
          buttons: ['OK']
        });
      }
      return;
    }

    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: `ATO Lens ${version} is available`,
      detail: `You are running ${app.getVersion()}. Download the update now? It installs the next time you quit.`,
      buttons: ['Download', 'Release Notes', 'Not Now'],
      defaultId: 0,
      cancelId: 2
    });

    if (response === 1) {
      await shell.openExternal(RELEASES_URL);
      return;
    }
    if (response !== 0) return;

    // An app still running from the mounted DMG cannot be replaced in place,
    // and the failure message from that is not obvious.
    if (process.platform === 'darwin' && app.getPath('exe').startsWith('/Volumes/')) {
      await dialog.showMessageBox({
        type: 'warning',
        message: 'Move ATO Lens to Applications first',
        detail:
          'The app is running from the mounted disk image, which cannot be updated in place. Drag ATO Lens to your Applications folder, open it from there, and check again.',
        buttons: ['OK']
      });
      return;
    }

    new Notification({
      title: `Downloading ATO Lens ${version}`,
      body: 'Progress is shown on the app icon. You can keep working.'
    }).show();

    await updater.downloadUpdate();
    const { response: installNow } = await dialog.showMessageBox({
      type: 'info',
      message: `ATO Lens ${version} is ready to install`,
      detail: 'Restart now to finish, or it will be applied the next time you quit.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (installNow === 0) {
      updater.quitAndInstall();
    }
  } catch (err) {
    console.error('[ATO Lens] Update check failed:', err);
    if (manual) {
      await dialog.showMessageBox({
        type: 'error',
        message: 'Could not check for updates',
        detail: `${err?.message || err}\n\nYou can download the latest version manually from GitHub.`,
        buttons: ['OK']
      });
    }
  } finally {
    isChecking = false;
  }
}

/** Background check shortly after launch, so it never delays the first paint. */
function scheduleStartupCheck() {
  if (!isAutoCheckEnabled()) return;
  setTimeout(() => void checkForUpdates(false), 8000);
}

module.exports = {
  checkForUpdates,
  scheduleStartupCheck,
  isAutoCheckEnabled,
  setAutoCheckEnabled,
  RELEASES_URL
};
