import { useEffect, useState } from 'react'

interface StyleWithWebkitAppRegion extends React.CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag'
}

const TitleBar = (): React.JSX.Element => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Listen for maximize/unmaximize events from main process (optional, for state sync)
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('window-maximized', () => setIsMaximized(true))
      window.electron.ipcRenderer.on('window-unmaximized', () => setIsMaximized(false))
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

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 flex items-center h-8 bg-white dark:bg-gray-900 select-none"
      style={{ WebkitAppRegion: 'drag' } as StyleWithWebkitAppRegion}
    >
      {/* App title - Windows 11 style left-aligned */}
      <div className="flex items-center h-full px-3">
        <span className="text-sm text-gray-900 dark:text-white">CSVGen Pro</span>
      </div>

      {/* Windows 11 style controls - right aligned */}
      <div
        className="flex items-center ml-auto h-full"
        style={{ WebkitAppRegion: 'no-drag' } as StyleWithWebkitAppRegion}
      >
        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          className="flex items-center justify-center w-11 h-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="11" height="1" viewBox="0 0 11 1">
            <path fill="currentColor" d="M0 0h11v1H0z"/>
          </svg>
        </button>

        <button
          onClick={isMaximized ? handleUnmaximize : handleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className="flex items-center justify-center w-11 h-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path fill="currentColor" d="M2.1 0v2H0v8.1h8.2v-2h2V0H2.1zm5.1 9.2H1.1V3h6.1v6.2zm2-2.1h-1V2H3.1V1h6.1v6.1z"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path fill="currentColor" d="M0 0v10h10V0H0zm9 9H1V1h8v8z"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          aria-label="Close"
          className="flex items-center justify-center w-11 h-8 hover:bg-red-500 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="currentColor" d="M6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.4.3.7.3.3 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
