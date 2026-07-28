const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const {
  checkForUpdates,
  scheduleStartupCheck,
  isAutoCheckEnabled,
  setAutoCheckEnabled
} = require('./updater.cjs');

function setupAboutPanelAndMenu() {
  const iconPath = path.join(__dirname, 'assets/icon.png');
  const applicationVersion = app.getVersion();

  app.setAboutPanelOptions({
    applicationName: 'ATO Lens',
    applicationVersion,
    version: applicationVersion,
    copyright: 'Copyright © 2026 Bakari Mustafa',
    credits: 'Local-first Australian tax, income, super and HELP workspace.',
    website: 'https://github.com/realbakari/ATO-Lens',
    iconPath: iconPath
  });

  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'ATO Lens',
            submenu: [
              { role: 'about', label: 'About ATO Lens' },
              {
                label: 'Check for Updates…',
                click: () => void checkForUpdates(true)
              },
              { type: 'separator' },
              {
                label: 'GitHub Repository',
                click: async () => {
                  await shell.openExternal('https://github.com/realbakari/ATO-Lens');
                }
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        ...(isMac ? [] : [{ label: 'Check for Updates…', click: () => void checkForUpdates(true) }]),
        {
          // Update checks are the app's only unprompted network request, so
          // they are switchable from the menu rather than being unavoidable.
          label: 'Check for Updates Automatically',
          type: 'checkbox',
          checked: isAutoCheckEnabled(),
          click: (menuItem) => setAutoCheckEnabled(menuItem.checked)
        },
        { type: 'separator' },
        {
          label: 'Privacy & Security',
          click: async () => {
            await shell.openExternal('https://github.com/realbakari/ATO-Lens#readme');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'ATO Lens',
    icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#0a0a0a',
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Avoid a flash of the OS's default blank/white window before the renderer
  // has actually painted the app - only reveal the window once it's ready.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keep the window/taskbar/dock title as just "ATO Lens" - don't let it be
  // overwritten by the page's <title> (which includes a longer description
  // for browser tabs/SEO).
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // BrowserWindow's `icon` option is ignored on macOS - the Dock icon has to
  // be set explicitly, otherwise it falls back to Electron's default icon.
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, 'assets/icon.png'));
  }

  setupAboutPanelAndMenu();
  createWindow();
  scheduleStartupCheck();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
