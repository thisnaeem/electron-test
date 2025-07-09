import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import electronUpdater, { type AppUpdater } from 'electron-updater'
import electronLog from 'electron-log'
import fs from 'fs'
import path from 'path'


export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater
  return autoUpdater
}

// Configure auto-updater
const autoUpdater = getAutoUpdater()
let mainWindow: BrowserWindow | null = null

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
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../resources/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle window close - quit app normally
  mainWindow.on('close', () => {
    app.quit()
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
    // Quit app normally
    app.quit()
  })

  // Add IPC handler for proper app quit
  ipcMain.on('app-quit', () => {
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


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


