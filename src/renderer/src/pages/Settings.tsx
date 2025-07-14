import React, { useState, useEffect } from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
import DarkModeToggle from '../components/DarkModeToggle'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setTogetherApiKey, validateTogetherApiKey } from '../store/slices/settingsSlice'

type SettingsSection = 'api' | 'appearance' | 'updates'

const Settings = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const {
    togetherApiKey,
    isTogetherApiKeyValid,
    isValidatingTogetherApiKey,
    togetherApiKeyValidationError
  } = useAppSelector(state => state.settings)

  const [activeSection, setActiveSection] = useState<SettingsSection>('api')
  const [checkingForUpdate, setCheckingForUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string>('')

  const handleTogetherApiKeyChange = (value: string): void => {
    dispatch(setTogetherApiKey(value))
  }

  const handleValidateTogetherApiKey = (): void => {
    if (!togetherApiKey.trim()) return
    dispatch(validateTogetherApiKey(togetherApiKey))
  }

  const checkForUpdates = async (): Promise<void> => {
    setCheckingForUpdate(true)
    setUpdateStatus('')

    try {
      const result = await window.api.checkForUpdates()
      console.log('Update check result:', result)
      setUpdateStatus('Check completed. See update notification if available.')
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateStatus('Error checking for updates')
    } finally {
      setCheckingForUpdate(false)
    }
  }

  // Listen for update status events
  useEffect(() => {
    const removeListener = window.api.onUpdateStatus((data) => {
      console.log('Update status received:', data)
      switch (data.status) {
        case 'checking':
          setUpdateStatus('Checking for updates...')
          break
        case 'available':
          setUpdateStatus(`Update available: v${data.version}`)
          break
        case 'not-available':
          setUpdateStatus('You have the latest version')
          break
        case 'downloaded':
          setUpdateStatus(`Update downloaded: v${data.version}. Restart to install.`)
          break
        case 'error':
          setUpdateStatus(`Update error: ${data.error}`)
          break
        case 'downloading':
          setUpdateStatus(`Downloading update: ${Math.round(data.percent)}%`)
          break
        default:
          setUpdateStatus('Update status unknown')
      }
    })

    return removeListener
  }, [])

  const sidebarSections = [
    {
      id: 'api' as SettingsSection,
      name: 'API Keys',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    {
      id: 'appearance' as SettingsSection,
      name: 'Appearance',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      )
    },

    {
      id: 'updates' as SettingsSection,
      name: 'Updates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
  ]

  const renderApiContent = () => (
    <div className="space-y-8">
      {/* API Key Management Section */}
      <div>
        <ApiKeyManager />
      </div>

      {/* Together AI API Key Section */}
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Together AI API Key</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Add your Together AI API key to enable the image generator tool. You can get one from the Together AI platform.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  API Key
                </label>
                <div className="flex space-x-3">
                  <input
                    type="password"
                    value={togetherApiKey}
                    onChange={(e) => handleTogetherApiKeyChange(e.target.value)}
                    placeholder="Enter your Together AI API key"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1b23] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                  />
                  <button
                    onClick={handleValidateTogetherApiKey}
                    disabled={!togetherApiKey.trim() || isValidatingTogetherApiKey}
                    className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-[#383b4a] dark:hover:bg-[#4a4f5f] text-gray-800 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isValidatingTogetherApiKey ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Validating...
                      </>
                    ) : (
                      'Validate'
                    )}
                  </button>
                </div>
              </div>

              {/* Status Messages */}
              {isTogetherApiKeyValid && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  API key is valid and ready to use
                </div>
              )}

              {togetherApiKeyValidationError && (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{togetherApiKeyValidationError}</span>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-1">📋 <strong>How to get your API key:</strong></p>
                <p>1. Visit <a href="https://api.together.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline">Together AI Platform</a></p>
                <p>2. Sign up or log in to your account</p>
                <p>3. Navigate to API keys section and create a new key</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppearanceContent = () => (
    <div className="space-y-8">
      <div>
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

      {/* Additional section to maintain consistent height */}
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Theme Preferences</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Your appearance settings are automatically saved and applied across the application.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto Theme Detection</h4>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Automatically switch themes based on your system preferences
                </p>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Available</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 The app will follow your system's dark/light mode setting automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )



  const renderUpdatesContent = () => (
    <div className="space-y-8">
      <div>
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
  )

  const renderContent = () => {
          switch (activeSection) {
        case 'api':
          return renderApiContent()
        case 'appearance':
          return renderAppearanceContent()
        case 'updates':
          return renderUpdatesContent()
        default:
          return renderApiContent()
      }
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 flex bg-white dark:bg-[#101113] overflow-hidden z-10">
      {/* Secondary Sidebar */}
      <div className="w-52 flex-shrink-0 bg-white dark:bg-[#101113] relative z-10">
        <div className="p-4 pl-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-left">Settings</h2>
          <nav className="space-y-1">
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-all duration-200 text-left justify-start relative ${
                  activeSection === section.id
                    ? 'bg-[#f6f6f8] dark:bg-[#2a2d3a] text-gray-900 dark:text-white shadow-sm transform scale-[1.02]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:scale-[1.01]'
                }`}
              >
                <span className={`transition-colors duration-200 ${
                  activeSection === section.id
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {section.icon}
                </span>
                <span className="font-medium">{section.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#101113] relative z-0">
        <div className="p-6 pb-20">
          <div className="max-w-4xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
