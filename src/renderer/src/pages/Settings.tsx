import { useState } from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
import DarkModeToggle from '../components/DarkModeToggle'

const Settings = (): React.JSX.Element => {
  const [checkingForUpdate, setCheckingForUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)

  const checkForUpdates = async (): Promise<void> => {
    setCheckingForUpdate(true)
    setUpdateStatus(null)
    try {
      await window.electron.ipcRenderer.invoke('check-for-updates')
      setUpdateStatus('Check complete. See notifications for details.')
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateStatus('Error checking for updates.')
    } finally {
      setCheckingForUpdate(false)
    }
  }

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-full">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">Settings</h2>

        {/* API Key Management Section */}
        <div className="mb-10">
          <ApiKeyManager />
        </div>

        {/* Appearance Section */}
        <div className="mb-10 max-w-3xl">
          <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Appearance</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Customize the appearance of the application to match your preferences.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Switch between light and dark themes
                </p>
              </div>
              <DarkModeToggle showLabel={false} />
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className="mb-6 max-w-3xl">
          <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Application Updates</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Check if a new version of the application is available. Updates help you get the latest features and bug fixes.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={checkForUpdates}
              disabled={checkingForUpdate}
              className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-[#2a2d3a] dark:hover:bg-[#383b4a] text-gray-800 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {checkingForUpdate ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                  Check for Updates
                </>
              )}
            </button>

            {updateStatus && (
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {updateStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
