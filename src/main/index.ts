import { app, shell, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import electronLog from 'electron-log'
import fs from 'fs'
import path from 'path'
import keyAuthMainService from './keyauth'

// Enhanced error logging setup
electronLog.transports.file.level = 'debug'
electronLog.transports.console.level = 'debug'

// Create logs directory
const logsDir = path.join(app.getPath('userData'), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Setup error logging
const logError = (error: any, context: string) => {
  const errorMessage = `[${context}] ${error instanceof Error ? error.message : JSON.stringify(error)}`
  console.error(errorMessage)
  electronLog.error(errorMessage)
  
  // Write to a separate error log file
  const errorLogPath = path.join(logsDir, 'startup-errors.log')
  const timestamp = new Date().toISOString()
  const logEntry = `${timestamp} - ${errorMessage}\n`
  
  try {
    fs.appendFileSync(errorLogPath, logEntry)
  } catch (writeError) {
    console.error('Failed to write to error log:', writeError)
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  logError(error, 'UNCAUGHT_EXCEPTION')
  // Don't exit immediately, try to show error dialog
  dialog.showErrorBox('Unexpected Error', `An unexpected error occurred: ${error.message}`)
})

process.on('unhandledRejection', (reason, promise) => {
  logError(reason, 'UNHANDLED_REJECTION')
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})


let mainWindow: BrowserWindow | null = null

// Create app data directory for storing image previews
const appDataPath = app.getPath('userData')
const previewsDir = path.join(appDataPath, 'previews')
if (!fs.existsSync(previewsDir)) {
  fs.mkdirSync(previewsDir, { recursive: true })
}

// License window variable
let licenseWindow: BrowserWindow | null = null
let isAuthenticated = false



function createLicenseWindow(): void {
  try {
    console.log('Creating license window...')
    
    // Create the license window
    licenseWindow = new BrowserWindow({
      width: 500,
      height: 650,
      resizable: false,
      show: false,
      autoHideMenuBar: true,
      frame: true,
      center: true,
      icon: join(__dirname, '../../resources/app-logo.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        webSecurity: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Add timeout for window loading
    const showTimeout = setTimeout(() => {
      if (licenseWindow && !licenseWindow.isDestroyed()) {
        console.log('License window taking too long to load, showing anyway')
        licenseWindow.show()
      }
    }, 10000) // 10 second timeout

    licenseWindow.on('ready-to-show', () => {
      clearTimeout(showTimeout)
      console.log('License window ready to show')
      licenseWindow?.show()
    })

    // Handle window close - quit app
    licenseWindow.on('close', () => {
      clearTimeout(showTimeout)
      app.quit()
    })

    licenseWindow.on('closed', () => {
      clearTimeout(showTimeout)
      licenseWindow = null
    })

    licenseWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Add error handling for page load
    licenseWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      logError(`License window failed to load: ${errorCode} - ${errorDescription}`, 'LICENSE_WINDOW_LOAD')
    })

    // Load the license screen
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      licenseWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/license.html')
        .catch(error => logError(error, 'LICENSE_WINDOW_URL_LOAD'))
    } else {
      licenseWindow.loadFile(join(__dirname, '../renderer/license.html'))
        .catch(error => logError(error, 'LICENSE_WINDOW_FILE_LOAD'))
    }

    console.log('License window created successfully')
  } catch (error) {
    logError(error, 'LICENSE_WINDOW_CREATION')
    throw error
  }
}

function createMainWindow(): void {
  try {
    console.log('Creating main window...')
    
    // Create the main browser window
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 700,
      minWidth: 800,  // Minimum width to prevent UI from breaking
      minHeight: 600, // Minimum height to ensure proper layout
      show: false,
      autoHideMenuBar: true,
      frame: true, // Use default title bar
      icon: join(__dirname, '../../resources/app-logo.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        webSecurity: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Add timeout for window loading
    const showTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Main window taking too long to load, showing anyway')
        mainWindow.show()
      }
    }, 15000) // 15 second timeout

    mainWindow.on('ready-to-show', () => {
      clearTimeout(showTimeout)
      console.log('Main window ready to show')
      mainWindow?.show()
    })

    // Handle window close - quit app normally
    mainWindow.on('close', () => {
      clearTimeout(showTimeout)
      app.quit()
    })

    mainWindow.on('closed', () => {
      clearTimeout(showTimeout)
      mainWindow = null
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Add error handling for page load
    mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      logError(`Main window failed to load: ${errorCode} - ${errorDescription}`, 'MAIN_WINDOW_LOAD')
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        .catch(error => logError(error, 'MAIN_WINDOW_URL_LOAD'))
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
        .catch(error => logError(error, 'MAIN_WINDOW_FILE_LOAD'))
    }

    // Emit maximize/unmaximize events for renderer state sync
    mainWindow.on('maximize', () => {
      mainWindow?.webContents.send('window-maximized')
    })
    mainWindow.on('unmaximize', () => {
      mainWindow?.webContents.send('window-unmaximized')
    })

    console.log('Main window created successfully')
  } catch (error) {
    logError(error, 'MAIN_WINDOW_CREATION')
    throw error
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    console.log('App is ready, starting initialization...')
    
    // Set app user model id for windows
    electronApp.setAppUserModelId('StockMeta AI')

    // Set app icon for taskbar
    if (process.platform === 'win32') {
      app.setAppUserModelId('StockMeta AI')
    }

    console.log('App user model ID set successfully')
  } catch (error) {
    logError(error, 'APP_INITIALIZATION')
  }



  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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

  // IPC handler for showing native notifications
  ipcMain.handle('show-notification', (_, options: { title: string; body: string; icon?: string }) => {
    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: options.title,
          body: options.body,
          icon: options.icon || join(__dirname, '../../resources/app-logo.png'),
          silent: false
        })

        notification.show()
        
        // Optional: Handle notification click
        notification.on('click', () => {
          // Bring the main window to focus when notification is clicked
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.focus()
          }
        })

        return { success: true }
      } else {
        console.log('Notifications not supported on this system')
        return { success: false, error: 'Notifications not supported' }
      }
    } catch (error) {
      console.error('Error showing notification:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // KeyAuth IPC handlers
  ipcMain.handle('keyauth-initialize', async () => {
    try {
      return await keyAuthMainService.initialize()
    } catch (error) {
      console.error('KeyAuth initialization error:', error)
      return false
    }
  })

  ipcMain.handle('keyauth-login', async (_, username: string, password: string) => {
    try {
      return await keyAuthMainService.login(username, password)
    } catch (error) {
      console.error('KeyAuth login error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      }
    }
  })

  ipcMain.handle('keyauth-register', async (_, username: string, password: string, license: string) => {
    try {
      return await keyAuthMainService.register(username, password, license)
    } catch (error) {
      console.error('KeyAuth register error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  })

  ipcMain.handle('keyauth-license', async (_, licenseKey: string) => {
    try {
      return await keyAuthMainService.license(licenseKey)
    } catch (error) {
      console.error('KeyAuth license error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'License activation failed'
      }
    }
  })

  ipcMain.handle('keyauth-get-current-user', () => {
    return keyAuthMainService.getCurrentUser()
  })

  ipcMain.handle('keyauth-is-authenticated', () => {
    return keyAuthMainService.isAuthenticated()
  })

  ipcMain.handle('keyauth-is-subscription-valid', () => {
    return keyAuthMainService.isSubscriptionValid()
  })

  ipcMain.handle('keyauth-get-days-remaining', () => {
    return keyAuthMainService.getDaysRemaining()
  })

  ipcMain.handle('keyauth-logout', () => {
    keyAuthMainService.logout()
    return true
  })

  ipcMain.handle('keyauth-is-offline-mode', () => {
    return keyAuthMainService.isOfflineMode()
  })

  // Handle successful authentication from license window
  ipcMain.on('auth-success', (_, userInfo) => {
    console.log('Authentication successful:', userInfo)
    isAuthenticated = true

    // Close license window
    if (licenseWindow) {
      licenseWindow.close()
      licenseWindow = null
    }

    // Create and show main window
    createMainWindow()
  })



  // Initialize KeyAuth and show license window with better error handling
  try {
    console.log('Attempting to initialize KeyAuth...')
    await keyAuthMainService.initialize()
    console.log('KeyAuth initialized successfully, showing license window')
  } catch (error) {
    logError(error, 'KEYAUTH_INITIALIZATION')
    console.log('KeyAuth initialization failed, continuing without it')
  }

  // Always show license window, but with different behavior based on KeyAuth status
  try {
    createLicenseWindow()
    console.log('License window created successfully')
  } catch (error) {
    logError(error, 'LICENSE_WINDOW_CREATION')
    // If license window fails, show main window directly as fallback
    console.log('License window failed, showing main window as fallback')
    try {
      createMainWindow()
      isAuthenticated = true // Skip auth requirement as fallback
    } catch (mainWindowError) {
      logError(mainWindowError, 'MAIN_WINDOW_FALLBACK')
      // Last resort - show error dialog
      dialog.showErrorBox('Startup Error', 'Failed to create application window. Please check the logs and try again.')
    }
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isAuthenticated) {
        createMainWindow()
      } else {
        createLicenseWindow()
      }
    }
  })
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


