import { useEffect, useState } from 'react'

interface StyleWithWebkitAppRegion extends React.CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag'
}

const TitleBar = (): React.JSX.Element => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    // Listen for maximize/unmaximize events from main process (optional, for state sync)
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('window-maximized', () => setIsMaximized(true))
      window.electron.ipcRenderer.on('window-unmaximized', () => setIsMaximized(false))

      // Get app version
      window.electron.ipcRenderer.invoke('get-app-version').then((version) => {
        setAppVersion(version)
      })
    }
    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('window-maximized')
        window.electron.ipcRenderer.removeAllListeners('window-unmaximized')
      }
    }
  }, [])

  const handleMinimize = (): void => {
    window.electron?.ipcRenderer?.send('window-minimize')
  }
  const handleMaximize = (): void => {
    window.electron?.ipcRenderer?.send('window-maximize')
  }
  const handleUnmaximize = (): void => {
    window.electron?.ipcRenderer?.send('window-unmaximize')
  }
  const handleClose = (): void => {
    window.electron?.ipcRenderer?.send('window-close')
  }

  const openHelp = (): void => {
    window.location.hash = '#/help'
  }

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 flex items-center h-10 bg-white/90 dark:bg-[#1a1b23]/95 backdrop-blur-sm select-none border-b border-gray-100 dark:border-[#383b4a]"
      style={{ WebkitAppRegion: 'drag' } as StyleWithWebkitAppRegion}
    >
      {/* App logo and title */}
      <div className="flex items-center h-full px-4 gap-2">
        <img src="icons/logo.png" alt="StockMeta AI" className="w-5 h-5" />
        <span className="text-sm font-medium text-gray-800 dark:text-white">
          StockMeta{' '}
          <span className="font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            AI
          </span>
        </span>
      </div>

      {/* Version indicator */}
      {appVersion && (
        <div className="hidden md:flex items-center ml-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
            v{appVersion}
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Help button */}
      <div
        className="flex items-center h-full mr-2"
        style={{ WebkitAppRegion: 'no-drag' } as StyleWithWebkitAppRegion}
      >
        <button
          onClick={openHelp}
          aria-label="Help"
          className="flex items-center justify-center w-10 h-10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#383b4a] rounded-full mx-1 transition-all duration-200"
          title="Help"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9C9 7.89543 9.89543 7 11 7H12C13.1046 7 14 7.89543 14 9C14 10.1046 13.1046 11 12 11H12V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Modern window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as StyleWithWebkitAppRegion}
      >
        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          className="flex items-center justify-center w-12 h-10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#383b4a] transition-all duration-200"
        >
          <svg width="12" height="1" viewBox="0 0 12 1">
            <path fill="currentColor" d="M0 0h12v1H0z"/>
          </svg>
        </button>

        <button
          onClick={isMaximized ? handleUnmaximize : handleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className="flex items-center justify-center w-12 h-10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#383b4a] transition-all duration-200"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 1H11V9M11 3L1 3V11H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          aria-label="Close"
          className="flex items-center justify-center w-12 h-10 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white transition-all duration-200"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
