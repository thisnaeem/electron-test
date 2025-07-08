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

interface BackgroundRemovalResponse {
  success: boolean
  base64?: string
  original_size?: [number, number]
  processed_size?: [number, number]
  format?: string
  error?: string
  details?: any
}

interface YouTubeVideoInfo {
  success: boolean
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  video_url?: string
  video_id?: string
  error?: string
}

interface YouTubeTranscriptResult {
  success: boolean
  transcript?: string
  timestamped_transcript?: Array<{
    start: number
    duration: number
    text: string
  }>
  language?: string
  language_code?: string
  is_auto_generated?: boolean
  video_id?: string
  total_entries?: number
  error?: string
  available_languages?: Array<{
    language: string
    language_code: string
    is_generated: boolean
  }>
  traceback?: string
}

interface YouTubeTranscriptResponse {
  video_info: YouTubeVideoInfo
  transcript_result: YouTubeTranscriptResult
}

interface FileConversionResponse {
  success: boolean
  error?: string
  base64?: string
  format?: string
  original_size?: number
  converted_size?: number
  dimensions?: [number, number]
  quality?: number
  traceback?: string
}

interface FileProcessingResponse {
  success: boolean
  error?: string
  filenames?: string[]
  cleaned_filenames?: Array<{
    original: string
    cleaned: string
  }>
  count?: number
  source_file?: string
  traceback?: string
}

interface CleaningOptions {
  remove_numbers?: boolean
  remove_extra_dashes?: boolean
  remove_underscores?: boolean
  remove_special_chars?: boolean
  preserve_extension?: boolean
  remove_leading_numbers?: boolean
  normalize_spaces?: boolean
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

      // Background removal
      removeBackground: (base64Data: string) => Promise<BackgroundRemovalResponse>

      // YouTube transcription
      getYouTubeTranscript: (youtubeUrl: string, languageCodes?: string[]) => Promise<YouTubeTranscriptResponse>

      // File conversion
      convertFile: (inputFormat: string, outputFormat: string, base64Data: string, quality?: number) => Promise<FileConversionResponse>

      // File processing
      extractFilenames: (fileData: string, fileType: string, filename: string) => Promise<FileProcessingResponse>
      cleanFilenames: (filenames: string[], options?: CleaningOptions) => Promise<FileProcessingResponse>

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
