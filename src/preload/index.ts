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
    downloadImageFromUrl: (imageUrl: string, filename: string) =>
    ipcRenderer.invoke('download-image-from-url', imageUrl, filename),



  // KeyAuth APIs
  keyauth: {
    initialize: () => ipcRenderer.invoke('keyauth-initialize'),
    login: (username: string, password: string) => ipcRenderer.invoke('keyauth-login', username, password),
    register: (username: string, password: string, license: string) => ipcRenderer.invoke('keyauth-register', username, password, license),
    license: (licenseKey: string) => ipcRenderer.invoke('keyauth-license', licenseKey),
    getCurrentUser: () => ipcRenderer.invoke('keyauth-get-current-user'),
    isAuthenticated: () => ipcRenderer.invoke('keyauth-is-authenticated'),
    isSubscriptionValid: () => ipcRenderer.invoke('keyauth-is-subscription-valid'),
    getDaysRemaining: () => ipcRenderer.invoke('keyauth-get-days-remaining'),
    logout: () => ipcRenderer.invoke('keyauth-logout'),
    isOfflineMode: () => ipcRenderer.invoke('keyauth-is-offline-mode')
  },

  // Auth success notification
  authSuccess: (userInfo: any) => ipcRenderer.send('auth-success', userInfo),

  // Native notifications
  showNotification: (options: { title: string; body: string; icon?: string }) =>
    ipcRenderer.invoke('show-notification', options),

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
  closeWindow: () => ipcRenderer.send('window-close'),
  quitApp: () => ipcRenderer.send('app-quit')
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
