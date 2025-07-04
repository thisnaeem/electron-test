import { useState } from 'react'
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  const checkForUpdates = async (): Promise<void> => {
    setIsChecking(true)
    setUpdateStatus('Checking for updates...')

    try {
      const result = await window.api.checkForUpdates()
      setUpdateStatus('Update check completed. Check console for details.')
      console.log('Update check result:', result)
    } catch (error) {
      setUpdateStatus(`Error checking for updates: ${error}`)
      console.error('Update check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const downloadUpdate = async (): Promise<void> => {
    setUpdateStatus('Downloading update...')

    try {
      const result = await window.api.downloadUpdate()
      setUpdateStatus('Update download completed. Check console for details.')
      console.log('Download result:', result)
    } catch (error) {
      setUpdateStatus(`Error downloading update: ${error}`)
      console.error('Download error:', error)
    }
  }

  const quitAndInstall = async (): Promise<void> => {
    setUpdateStatus('Installing update...')

    try {
      await window.api.quitAndInstall()
    } catch (error) {
      setUpdateStatus(`Error installing update: ${error}`)
      console.error('Install error:', error)
    }
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Version 1.0.1</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>

      {/* Auto-update controls */}
      <div className="update-section">
        <h3>Auto-Update Controls</h3>
        <div className="update-actions">
          <button onClick={checkForUpdates} disabled={isChecking} className="update-button">
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </button>
          <button onClick={downloadUpdate} className="update-button">
            Download Update
          </button>
          <button onClick={quitAndInstall} className="update-button">
            Install & Restart
          </button>
        </div>
        {updateStatus && (
          <div className="update-status">
            <p>{updateStatus}</p>
          </div>
        )}
      </div>

      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
