const { contextBridge } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-electron', 'true');
  document.documentElement.setAttribute('data-platform', process.platform);
});

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform
});
