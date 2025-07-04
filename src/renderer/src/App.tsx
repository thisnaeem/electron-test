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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <img
              src={electronLogo}
              alt="Electron Logo"
              className="h-24 w-24"
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-blue-600">Version 1.0.1</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Electron with <span className="text-blue-600">Tailwind CSS</span>
            </h1>
            <p className="mt-2 text-gray-600">
              A modern desktop application with React, TypeScript, and Tailwind CSS
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Auto-Update Controls</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={checkForUpdates}
                disabled={isChecking}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isChecking ? 'Checking...' : 'Check for Updates'}
              </button>
              <button
                onClick={downloadUpdate}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700"
              >
                Download Update
              </button>
              <button
                onClick={quitAndInstall}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded hover:bg-purple-700"
              >
                Install & Restart
              </button>
            </div>

            {updateStatus && (
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                {updateStatus}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="https://electron-vite.org/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300"
            >
              Documentation
            </a>
            <button
              onClick={ipcHandle}
              className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300"
            >
              Send IPC
            </button>
          </div>
        </div>
      </div>

      <Versions />
    </div>
  )
}

export default App

