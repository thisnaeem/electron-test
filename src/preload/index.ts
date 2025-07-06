import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Auto-updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  // Event listeners
  onUpdateStatus: (callback: (data: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('update-status', listener)
    return () => {
      ipcRenderer.removeListener('update-status', listener)
    }
  },

  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Open external links
  openExternalLink: (url: string) => ipcRenderer.send('open-external-link', url),

  // File operations
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  saveImagePreview: (imageData: string, filename: string) =>
    ipcRenderer.invoke('save-image-preview', imageData, filename),
  getImagePreviews: () => ipcRenderer.invoke('get-image-previews'),
  deleteImagePreview: (filename: string) => ipcRenderer.invoke('delete-image-preview', filename),
  clearAllPreviews: () => ipcRenderer.invoke('clear-all-previews'),

  // Authentication
  googleLogin: () => ipcRenderer.invoke('google-login'),
  logout: () => ipcRenderer.invoke('logout'),

  // Window control
  onWindowMaximized: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('window-maximized', listener)
    return () => {
      ipcRenderer.removeListener('window-maximized', listener)
    }
  },
  onWindowUnmaximized: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('window-unmaximized', listener)
    return () => {
      ipcRenderer.removeListener('window-unmaximized', listener)
    }
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  unmaximizeWindow: () => ipcRenderer.send('window-unmaximize'),
  closeWindow: () => ipcRenderer.send('window-close')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
