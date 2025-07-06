import { FormEvent, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setApiKey, validateApiKey } from '../store/slices/settingsSlice'

const Settings = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { apiKey, isApiKeyValid, isValidating, validationError } = useAppSelector(state => state.settings)
  const [checkingForUpdate, setCheckingForUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [localApiKey, setLocalApiKey] = useState(apiKey)

  // Sync local state with Redux state
  useEffect(() => {
    setLocalApiKey(apiKey)
  }, [apiKey])

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (localApiKey) {
      dispatch(setApiKey(localApiKey))
      dispatch(validateApiKey(localApiKey))
    }
  }

  const handleApiKeyChange = (value: string): void => {
    setLocalApiKey(value)
  }

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
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-gray-900">
      <div className="p-6 max-w-full">
        <h2 className="text-3xl font-semibold mb-8">Settings</h2>

        {/* API Key Section */}
        <div className="mb-10 max-w-3xl">
          <h3 className="text-xl font-medium mb-4">Gemini API Key</h3>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={localApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {isApiKeyValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Get your Gemini API key here
              </a>

              <button
                onClick={handleSubmit}
                disabled={isValidating || !localApiKey}
                className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : 'Validate API Key'}
              </button>
            </div>

            {validationError && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {validationError}
              </div>
            )}

            {isApiKeyValid && !validationError && (
              <div className="text-green-500 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                API key is valid and ready to use!
              </div>
            )}
          </div>
        </div>

        {/* Updates Section */}
        <div className="mb-6 max-w-3xl">
          <h3 className="text-xl font-medium mb-4">Application Updates</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Check if a new version of the application is available. Updates help you get the latest features and bug fixes.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={checkForUpdates}
              disabled={checkingForUpdate}
              className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
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
