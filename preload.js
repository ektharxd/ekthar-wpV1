const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  connectWhatsApp: () => ipcRenderer.invoke('connect-whatsapp'),
  startSession: (data) => ipcRenderer.invoke('start-session', data),

  // From Backend to UI: This is how your UI listens for real-time updates.
  onUpdate: (callback) => ipcRenderer.on('update', (_event, value) => callback(value))
});