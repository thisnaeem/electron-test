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

      // Authentication
      googleLogin: () => Promise<{ success: boolean; user?: any; error?: string }>
      logout: () => Promise<{ success: boolean; error?: string }>

      // Window control
      onWindowMaximized: (callback: () => void) => () => void
      onWindowUnmaximized: (callback: () => void) => () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      unmaximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
