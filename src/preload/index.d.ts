import { ElectronAPI } from '@electron-toolkit/preload'

// Update status event data types
type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available'; currentVersion: string }
  | { status: 'error'; error: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { status: 'downloaded'; version: string; releaseNotes?: string }

// File API response types
interface SaveImagePreviewResponse {
  success: boolean
  path?: string
  id?: string
  error?: string
}

interface GetImagePreviewsResponse {
  success: boolean
  previews?: Record<string, string>
  error?: string
}

interface DownloadImageResponse {
  success: boolean
  path?: string
  filename?: string
  base64?: string
  error?: string
}

// KeyAuth API response types
interface KeyAuthResponse {
  success: boolean
  message: string
  info?: {
    username: string
    subscription: string
    subscriptionExpiry: string
    ip: string
    hwid: string
    createDate: string
    lastLogin: string
  }
}

interface LicenseInfo {
  username: string
  subscription: string
  subscriptionExpiry: string
  ip: string
  hwid: string
  createDate: string
  lastLogin: string
}



declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Auto-updater APIs
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      quitAndInstall: () => Promise<void>
      onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void
      getAppVersion: () => Promise<string>

      // External links
      openExternalLink: (url: string) => void

      // File operations
      readImageFile: (filePath: string) => Promise<any>
      saveImagePreview: (imageData: string, filename: string) => Promise<SaveImagePreviewResponse>
      getImagePreviews: () => Promise<GetImagePreviewsResponse>
      deleteImagePreview: (filename: string) => Promise<SaveImagePreviewResponse>
      clearAllPreviews: () => Promise<SaveImagePreviewResponse>
      downloadImageFromUrl: (imageUrl: string, filename: string) => Promise<DownloadImageResponse>

      // KeyAuth APIs
      keyauth: {
        initialize: () => Promise<boolean>
        login: (username: string, password: string) => Promise<KeyAuthResponse>
        register: (username: string, password: string, license: string) => Promise<KeyAuthResponse>
        license: (licenseKey: string) => Promise<KeyAuthResponse>
        getCurrentUser: () => Promise<LicenseInfo | null>
        isAuthenticated: () => Promise<boolean>
        isSubscriptionValid: () => Promise<boolean>
        getDaysRemaining: () => Promise<number>
        logout: () => Promise<boolean>
      }

      // Auth success notification
      authSuccess: (userInfo: LicenseInfo) => void

      // Window control
      onWindowMaximized: (callback: () => void) => () => void
      onWindowUnmaximized: (callback: () => void) => () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      unmaximizeWindow: () => void
      closeWindow: () => void
      quitApp: () => void
    }
  }
}
