import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/ChatGPT Image Jun 29, 2025, 02_45_50 AM.png?asset'
import electronUpdater, { type AppUpdater } from 'electron-updater'
import electronLog from 'electron-log'
import fs from 'fs'
import path from 'path'
import AutoLaunch from 'auto-launch'

export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater
  return autoUpdater
}

// Configure auto-updater
const autoUpdater = getAutoUpdater()
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Configure auto-launch
const autoLauncher = new AutoLaunch({
  name: 'CSV Gen Pro',
  path: app.getPath('exe')
})

// Create app data directory for storing image previews
const appDataPath = app.getPath('userData')
const previewsDir = path.join(appDataPath, 'previews')
if (!fs.existsSync(previewsDir)) {
  fs.mkdirSync(previewsDir, { recursive: true })
}

// Enable logging for debugging
if (is.dev) {
  autoUpdater.logger = electronLog
  electronLog.transports.file.level = 'debug'
  // Force dev update config for development testing
  autoUpdater.forceDevUpdateConfig = true
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...')
  mainWindow?.webContents.send('update-status', { status: 'checking' })
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info)
  mainWindow?.webContents.send('update-status', {
    status: 'available',
    version: info.version,
    releaseNotes: info.releaseNotes
  })

  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is available. Downloading...`,
    buttons: ['OK']
  })
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info)
  mainWindow?.webContents.send('update-status', {
    status: 'not-available',
    currentVersion: app.getVersion()
  })
})

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err)
  mainWindow?.webContents.send('update-status', {
    status: 'error',
    error: err.message
  })

  dialog.showErrorBox('Update Error', `Error: ${err.message}`)
})

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj)
  mainWindow?.webContents.send('update-status', {
    status: 'downloading',
    percent: progressObj.percent,
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total
  })
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info)
  mainWindow?.webContents.send('update-status', {
    status: 'downloaded',
    version: info.version,
    releaseNotes: info.releaseNotes
  })

  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart the application to apply the update.`,
      buttons: ['Restart', 'Later']
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
})

function createTray(): void {
  try {
        // In development, log icon information for debugging
    if (is.dev) {
      console.log('Creating tray in development mode')
      console.log('Icon path:', icon)
    }

    tray = new Tray(icon)
    console.log('System tray created successfully')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.show()
            mainWindow.focus()
          } else {
            createWindow()
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quick Tools',
        submenu: [
          {
            label: '🖼️ AI Image Generator',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                // Navigate to image generator
                mainWindow.webContents.send('navigate-to', '/generator')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '🎨 Background Remover',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('navigate-to', '/background-remover')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '📄 File Processor',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('navigate-to', '/file-processor')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '🔄 File Converter',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('navigate-to', '/file-converter')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '✨ Prompt Generator',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('navigate-to', '/prompt-generator')
              } else {
                createWindow()
              }
            }
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        label: 'Quick Actions',
        submenu: [
          {
            label: '📊 Generate File Metadata',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                // Navigate to file processor with metadata extraction mode
                mainWindow.webContents.send('navigate-to', '/file-processor')
                mainWindow.webContents.send('set-processing-mode', 'extract')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '🧹 Clean Filenames',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) {
                  mainWindow.restore()
                }
                mainWindow.show()
                mainWindow.focus()
                // Navigate to file processor with cleaning mode
                mainWindow.webContents.send('navigate-to', '/file-processor')
                mainWindow.webContents.send('set-processing-mode', 'clean')
              } else {
                createWindow()
              }
            }
          },
          {
            label: '📋 Clear All Previews',
            click: async () => {
              try {
                // Clear all image previews
                const result = await new Promise((resolve) => {
                  if (mainWindow) {
                    mainWindow.webContents.send('clear-all-previews-request')
                    ipcMain.once('clear-all-previews-response', (_, response) => {
                      resolve(response)
                    })
                  } else {
                    resolve({ success: false, error: 'App not running' })
                  }
                })
                console.log('Clear previews result:', result)
              } catch (error) {
                console.error('Error clearing previews:', error)
              }
            }
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        label: '⚙️ Settings',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('navigate-to', '/settings')
          } else {
            createWindow()
          }
        }
      },
      {
        label: '🔄 Check for Updates',
        click: async () => {
          try {
            await autoUpdater.checkForUpdatesAndNotify()
          } catch (error) {
            console.error('Error checking for updates:', error)
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'About CSV Gen Pro',
            message: 'CSV Gen Pro',
            detail: `Version: ${app.getVersion()}\n\nA powerful desktop application for AI image generation, file processing, and productivity tools.\n\nDeveloped with Electron + React + TypeScript`,
            buttons: ['OK']
          })
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('CSV Gen Pro')
    tray.setContextMenu(contextMenu)

    // Double-click to show/hide window
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
        }
      } else {
        createWindow()
      }
    })

    // Add click event for single click behavior
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus()
        } else {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
        }
      } else {
        createWindow()
      }
    })
  } catch (error) {
    console.error('Failed to create system tray:', error)
    // If tray creation fails, still allow the app to work normally
    // but log the error for debugging
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,  // Minimum width to prevent UI from breaking
    minHeight: 600, // Minimum height to ensure proper layout
    show: false,
    autoHideMenuBar: true,
    frame: false, // Custom title bar
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle window close - minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    console.log('Window close event triggered. isQuitting:', isQuitting)
    if (!isQuitting) {
      console.log('Preventing default close and hiding to tray')
      event.preventDefault()
      mainWindow?.hide()

      // Show notification in development mode
      if (is.dev) {
        console.log('App minimized to system tray. Look for the tray icon to restore.')
      }
    } else {
      console.log('App is quitting normally')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('CSV Gen Pro')

  // Enable auto-launch at startup (only in production)
  if (!is.dev) {
    try {
      const isEnabled = await autoLauncher.isEnabled()
      if (!isEnabled) {
        await autoLauncher.enable()
        console.log('Auto-launch enabled')
      }
    } catch (error) {
      console.error('Failed to enable auto-launch:', error)
    }
  } else {
    console.log('Skipping auto-launch setup in development mode')
  }

  // Create system tray
  createTray()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // IPC handlers for auto-updater
  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('download-update', () => {
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // IPC handler for opening external links
  ipcMain.on('open-external-link', (_, url) => {
    shell.openExternal(url)
  })

  // IPC handlers for file operations - Optimized for performance
  ipcMain.handle('save-image-preview', async (_, imageData, filename) => {
    try {
      // Remove header from base64 data
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

      // Create a unique filename based on the original name
      const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_')
      const uniqueFilename = `${safeFilename}_${Date.now()}.png`
      const filePath = path.join(previewsDir, uniqueFilename)

      // Use async file operations for better performance with many files
      await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))

      return {
        success: true,
        path: filePath,
        id: uniqueFilename
      }
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error saving image preview:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('get-image-previews', async () => {
    try {
      const files = await fs.promises.readdir(previewsDir)
      const previews: Record<string, string> = {}

      // Process files in batches to prevent memory issues with large numbers of files
      const batchSize = 10
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        await Promise.all(batch.map(async (file) => {
          try {
            const filePath = path.join(previewsDir, file)
            const data = await fs.promises.readFile(filePath)
            const base64 = `data:image/png;base64,${data.toString('base64')}`
            previews[file] = base64
          } catch (fileError) {
            console.error(`Error reading file ${file}:`, fileError)
            // Continue with other files even if one fails
          }
        }))

        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      return {
        success: true,
        previews
      }
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error getting image previews:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('delete-image-preview', async (_, filename) => {
    try {
      const filePath = path.join(previewsDir, filename)

      // Use async file operations for better performance
      try {
        await fs.promises.access(filePath, fs.constants.F_OK)
        await fs.promises.unlink(filePath)
      } catch {
        // File doesn't exist, which is fine
        console.log(`File ${filename} doesn't exist, skipping deletion`)
      }

      return {
        success: true
      }
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error deleting image preview:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('clear-all-previews', async () => {
    try {
      const files = await fs.promises.readdir(previewsDir)

      // Process deletions in batches for better performance with many files
      const batchSize = 20
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        await Promise.all(batch.map(async (file) => {
          try {
            const filePath = path.join(previewsDir, file)
            await fs.promises.unlink(filePath)
          } catch (fileError) {
            console.error(`Error deleting file ${file}:`, fileError)
            // Continue with other files even if one fails
          }
        }))

        // Small delay between batches
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 5))
        }
      }

      return {
        success: true
      }
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error clearing all previews:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

    // IPC handler for background removal using Python rembg
  ipcMain.handle('remove-background', async (_, base64Data) => {
    try {
      const { spawn } = await import('child_process')
      const os = await import('os')
      const pythonScript = path.join(__dirname, '../../scripts/bg_remover.py')

                  interface BackgroundRemovalResult {
        success: boolean
        error?: string
        processedImage?: string
        details?: unknown
      }

      // Create helper function to handle file operations
      const processWithTempFile = async (): Promise<BackgroundRemovalResult> => {
        // Remove data URI prefix if present
        const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')

        // Create temporary file to avoid command line length limits
        const tempDir = os.tmpdir()
        const tempInputFile = path.join(tempDir, `bg_input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`)

        // Write base64 data to temporary file
        await fs.promises.writeFile(tempInputFile, cleanBase64, 'utf8')

        return new Promise<BackgroundRemovalResult>((resolve) => {
          const pythonProcess = spawn('python', [pythonScript, 'file-base64', tempInputFile], {
            stdio: ['pipe', 'pipe', 'pipe']
          })

          let stdout = ''
          let stderr = ''

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString()
          })

          const cleanup = async (): Promise<void> => {
            try {
              await fs.promises.unlink(tempInputFile)
            } catch (cleanupError) {
              console.warn('Failed to clean up temporary file:', cleanupError)
            }
          }

          pythonProcess.on('close', async (code) => {
            await cleanup()

            if (code === 0) {
              try {
                const result = JSON.parse(stdout)
                resolve(result)
              } catch (parseError) {
                resolve({
                  success: false,
                  error: 'Failed to parse Python script output',
                  details: { stdout, stderr, parseError: parseError instanceof Error ? parseError.message : String(parseError) }
                })
              }
            } else {
              resolve({
                success: false,
                error: `Python script exited with code ${code}`,
                details: { stdout, stderr }
              })
            }
          })

          pythonProcess.on('error', async (error) => {
            await cleanup()

            resolve({
              success: false,
              error: 'Failed to start Python process',
              details: error.message
            })
          })
        })
      }

      return processWithTempFile().catch((fileError) => ({
        success: false,
        error: 'Failed to create temporary file',
        details: fileError instanceof Error ? fileError.message : String(fileError)
      }))
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error in background removal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // IPC handler for YouTube transcription
  ipcMain.handle('youtube-transcript', async (_, youtubeUrl, languageCodes) => {
    try {
      const { spawn } = await import('child_process')
      const pythonScript = path.join(__dirname, '../../scripts/youtube_transcriber.py')

      interface YouTubeTranscriptResult {
        success: boolean
        error?: string
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
        available_languages?: Array<{
          language: string
          language_code: string
          is_generated: boolean
        }>
        details?: unknown
      }

      return new Promise<YouTubeTranscriptResult>((resolve) => {
        const args = [pythonScript, youtubeUrl]
        if (languageCodes && Array.isArray(languageCodes)) {
          args.push(...languageCodes)
        }

        const pythonProcess = spawn('python', args, {
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout)
              resolve(result)
            } catch (parseError) {
              resolve({
                success: false,
                error: 'Failed to parse Python script output',
                details: { stdout, stderr, parseError: parseError instanceof Error ? parseError.message : String(parseError) }
              })
            }
          } else {
            resolve({
              success: false,
              error: `Python script exited with code ${code}`,
              details: { stdout, stderr }
            })
          }
        })

        pythonProcess.on('error', (error) => {
          resolve({
            success: false,
            error: 'Failed to start Python process',
            details: error.message
          })
        })
      })
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error in YouTube transcription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // IPC handler for file conversion
  ipcMain.handle('convert-file', async (_, inputFormat, outputFormat, base64Data, quality = 85) => {
    try {
      const { spawn } = await import('child_process')
      const fs = await import('fs/promises')
      const os = await import('os')
      const pythonScript = path.join(__dirname, '../../scripts/file_converter.py')

      interface FileConversionResult {
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

      const processWithTempFile = async (): Promise<FileConversionResult> => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-converter-'))
        const inputFile = path.join(tempDir, 'input.json')

        const cleanup = async (): Promise<void> => {
          try {
            await fs.rm(tempDir, { recursive: true, force: true })
          } catch (cleanupError) {
            console.warn('Failed to clean up temp directory:', cleanupError)
          }
        }

        try {
          // Write input data to temporary file
          const inputData = {
            inputFormat,
            outputFormat,
            base64Data,
            quality
          }
          await fs.writeFile(inputFile, JSON.stringify(inputData))

          return new Promise<FileConversionResult>((resolve) => {
            const args = [pythonScript, inputFile]

            const pythonProcess = spawn('python', args, {
              stdio: ['pipe', 'pipe', 'pipe']
            })

            let stdout = ''
            let stderr = ''

            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString()
            })

            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString()
            })

            pythonProcess.on('close', async (code) => {
              await cleanup()

              if (code === 0) {
                try {
                  const result = JSON.parse(stdout)
                  resolve(result)
                } catch (parseError) {
                  resolve({
                    success: false,
                    error: 'Failed to parse Python script output',
                    traceback: `stdout: ${stdout}\nstderr: ${stderr}\nparseError: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                  })
                }
              } else {
                resolve({
                  success: false,
                  error: `Python script exited with code ${code}`,
                  traceback: `stdout: ${stdout}\nstderr: ${stderr}`
                })
              }
            })

            pythonProcess.on('error', async (error) => {
              await cleanup()
              resolve({
                success: false,
                error: 'Failed to start Python process',
                traceback: error.message
              })
            })
          })
        } catch (fileError) {
          await cleanup()
          throw fileError
        }
      }

      return processWithTempFile().catch((fileError) => ({
        success: false,
        error: 'Failed to create temporary file',
        traceback: fileError instanceof Error ? fileError.message : String(fileError)
      }))
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error in file conversion:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // IPC handler for file processing (extract and clean filenames)
  ipcMain.handle('process-files', async (_, operation, data) => {
    try {
      const { spawn } = await import('child_process')
      const fs = await import('fs/promises')
      const os = await import('os')
      const pythonScript = path.join(__dirname, '../../scripts/file_processor.py')

      interface FileProcessingResult {
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

      const processWithTempFile = async (): Promise<FileProcessingResult> => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-processor-'))
        const inputFile = path.join(tempDir, 'input.json')

        const cleanup = async (): Promise<void> => {
          try {
            await fs.rm(tempDir, { recursive: true, force: true })
          } catch (cleanupError) {
            console.warn('Failed to clean up temp directory:', cleanupError)
          }
        }

        try {
          // Write input data to temporary file
          const inputData = {
            operation,
            ...data
          }
          await fs.writeFile(inputFile, JSON.stringify(inputData))

          return new Promise<FileProcessingResult>((resolve) => {
            const args = [pythonScript, inputFile]

            const pythonProcess = spawn('python', args, {
              stdio: ['pipe', 'pipe', 'pipe']
            })

            let stdout = ''
            let stderr = ''

            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString()
            })

            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString()
            })

            pythonProcess.on('close', async (code) => {
              await cleanup()

              if (code === 0) {
                try {
                  const result = JSON.parse(stdout)
                  resolve(result)
                } catch (parseError) {
                  resolve({
                    success: false,
                    error: 'Failed to parse Python script output',
                    traceback: `stdout: ${stdout}\nstderr: ${stderr}\nparseError: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                  })
                }
              } else {
                resolve({
                  success: false,
                  error: `Python script exited with code ${code}`,
                  traceback: `stdout: ${stdout}\nstderr: ${stderr}`
                })
              }
            })

            pythonProcess.on('error', async (error) => {
              await cleanup()
              resolve({
                success: false,
                error: 'Failed to start Python process',
                traceback: error.message
              })
            })
          })
        } catch (fileError) {
          await cleanup()
          throw fileError
        }
      }

      return processWithTempFile().catch((fileError) => ({
        success: false,
        error: 'Failed to create temporary file',
        traceback: fileError instanceof Error ? fileError.message : String(fileError)
      }))
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error in file processing:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // IPC handler for downloading images from URLs (bypasses CORS)
  ipcMain.handle('download-image-from-url', async (_, imageUrl, filename) => {
    try {
      const https = await import('https')
      const http = await import('http')
      const { URL } = await import('url')

      interface DownloadResult {
        success: boolean
        path?: string
        filename?: string
        base64?: string
        error?: string
      }

      const downloadFromUrl = (url: string, redirectCount = 0): Promise<DownloadResult> => {
        const maxRedirects = 5

        if (redirectCount > maxRedirects) {
          return Promise.reject(new Error('Too many redirects'))
        }

        return new Promise((resolve, reject) => {
          const parsedUrl = new URL(url)
          const client = parsedUrl.protocol === 'https:' ? https : http

          client.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
              const redirectUrl = response.headers.location
              if (redirectUrl) {
                console.log(`Following redirect from ${url} to ${redirectUrl}`)
                downloadFromUrl(redirectUrl, redirectCount + 1).then(resolve).catch(reject)
                return
              } else {
                reject(new Error(`Redirect response missing location header`))
                return
              }
            }

            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
              return
            }

            const chunks: Buffer[] = []

            response.on('data', (chunk) => {
              chunks.push(chunk)
            })

            response.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks)
                const base64Data = buffer.toString('base64')

                // Create a unique filename
                const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_')
                const uniqueFilename = `${safeFilename}_${Date.now()}.png`
                const filePath = path.join(previewsDir, uniqueFilename)

                // Save the file
                fs.promises.writeFile(filePath, buffer).then(() => {
                  resolve({
                    success: true,
                    path: filePath,
                    filename: uniqueFilename,
                    base64: `data:image/png;base64,${base64Data}`
                  })
                }).catch((error) => {
                  reject(error)
                })
              } catch (error) {
                reject(error)
              }
            })

            response.on('error', (error) => {
              reject(error)
            })
          }).on('error', (error) => {
            reject(error)
          })
        })
      }

      return await downloadFromUrl(imageUrl)
    } catch (error: Error | NodeJS.ErrnoException | unknown) {
      console.error('Error downloading image from URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // IPC handlers for window controls
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.on('window-maximize', () => {
    mainWindow?.maximize()
  })
  ipcMain.on('window-unmaximize', () => {
    mainWindow?.unmaximize()
  })
  ipcMain.on('window-close', () => {
    // Hide to tray instead of closing
    mainWindow?.hide()
  })

  // Add IPC handler for proper app quit
  ipcMain.on('app-quit', () => {
    isQuitting = true
    app.quit()
  })

  // Emit maximize/unmaximize events for renderer state sync
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized')
  })
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized')
  })

  createWindow()

  // Check for updates on app start (with a small delay to ensure window is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 3000)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Handle app quit
app.on('before-quit', () => {
  isQuitting = true
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep running in tray
  // Only quit if explicitly requested
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
