import { ElectronAPI } from '@electron-toolkit/preload'

// Update status event data types
type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available'; currentVersion: string }
  | { status: 'error'; error: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { status: 'downloaded'; version: string; releaseNotes?: string }

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      quitAndInstall: () => Promise<void>
      onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void
      getAppVersion: () => Promise<string>
    }
  }
}
