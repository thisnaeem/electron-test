import React, { useState, useEffect } from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
// import DarkModeToggle from '../components/DarkModeToggle' // Unused import
import LicenseStatus from '../components/LicenseStatus'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setTogetherApiKey, validateTogetherApiKey, setThemePreference, setAutoDownloadCsv } from '../store/slices/settingsSlice'

type SettingsSection = 'license' | 'api' | 'appearance' | 'updates'

const Settings = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const {
    togetherApiKey,
    isTogetherApiKeyValid,
    isValidatingTogetherApiKey,
    togetherApiKeyValidationError,
    themePreference,
    isDarkMode,
    autoDownloadCsv
  } = useAppSelector(state => state.settings)

  const [activeSection, setActiveSection] = useState<SettingsSection>('api')
  const [checkingForUpdate, setCheckingForUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string
    downloadProgress: number
    lastChecked: Date | null
    updateError: string | null
  }>({
    hasUpdate: false,
    currentVersion: '',
    latestVersion: '',
    downloadProgress: 0,
    lastChecked: null,
    updateError: null
  })

  const handleTogetherApiKeyChange = (value: string): void => {
    dispatch(setTogetherApiKey(value))
  }

  const handleValidateTogetherApiKey = (): void => {
    if (!togetherApiKey.trim()) return
    dispatch(validateTogetherApiKey(togetherApiKey))
  }

  const checkForUpdates = async (): Promise<void> => {
    setCheckingForUpdate(true)
    setUpdateStatus('Checking for updates...')
    setUpdateInfo(prev => ({ ...prev, updateError: null, lastChecked: new Date() }))

    try {
      const result = await window.api.checkForUpdates()
      console.log('Update check result:', result)
      setUpdateStatus('Check completed. See update notification if available.')
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateStatus('Error checking for updates')
      setUpdateInfo(prev => ({ ...prev, updateError: 'Failed to check for updates' }))
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
          setCheckingForUpdate(true)
          break
        case 'available':
          setUpdateStatus(`Update available: v${data.version}`)
          setUpdateInfo(prev => ({
            ...prev,
            hasUpdate: true,
            latestVersion: data.version,
            updateError: null
          }))
          setCheckingForUpdate(false)
          break
        case 'not-available':
          setUpdateStatus('You have the latest version')
          setUpdateInfo(prev => ({
            ...prev,
            hasUpdate: false,
            updateError: null
          }))
          setCheckingForUpdate(false)
          break
        case 'downloaded':
          setUpdateStatus(`Update downloaded: v${data.version}. Restart to install.`)
          setUpdateInfo(prev => ({
            ...prev,
            downloadProgress: 100
          }))
          setCheckingForUpdate(false)
          break
        case 'error':
          setUpdateStatus(`Update error: ${data.error}`)
          setUpdateInfo(prev => ({
            ...prev,
            updateError: data.error,
            hasUpdate: false
          }))
          setCheckingForUpdate(false)
          break
        case 'downloading':
          setUpdateStatus(`Downloading update: ${Math.round(data.percent)}%`)
          setUpdateInfo(prev => ({
            ...prev,
            downloadProgress: data.percent
          }))
          break
        default:
          setUpdateStatus('Update status unknown')
          setCheckingForUpdate(false)
      }
    })

    return removeListener
  }, [])

  // Listen for system theme changes when using system preference
  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleSystemThemeChange = (_e: MediaQueryListEvent) => {
        dispatch(setThemePreference('system')) // This will trigger the system detection logic
      }

      mediaQuery.addEventListener('change', handleSystemThemeChange)
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }
    // Return undefined explicitly for other branches
    return undefined
  }, [themePreference, dispatch])

  const sidebarSections = [
    {
      id: 'api' as SettingsSection,
      name: 'API Keys',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
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
    },
    {
      id: 'license' as SettingsSection,
      name: 'License Status',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    dispatch(setThemePreference(theme))
  }

  const renderAppearanceContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Theme Preferences</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Your appearance settings are automatically saved and applied across the application.
        </p>

        <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Choose Theme</h4>
          <div className="space-y-3">
            {/* Light Theme Option */}
            <div 
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                themePreference === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
              }`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Light</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Always use light theme</p>
                </div>
              </div>
              {themePreference === 'light' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Dark Theme Option */}
            <div 
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                themePreference === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
              }`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Dark</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Always use dark theme</p>
                </div>
              </div>
              {themePreference === 'dark' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* System Theme Option */}
            <div 
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                themePreference === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
              }`}
              onClick={() => handleThemeChange('system')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-gray-800 border-2 border-gray-400 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">System</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Follow system preference</p>
                </div>
              </div>
              {themePreference === 'system' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Current Theme Status */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-yellow-500'}`}></div>
              <span>
                Currently using {isDarkMode ? 'dark' : 'light'} theme
                {themePreference === 'system' && ' (detected from system)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Export Settings</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Configure how exports are handled in the metadata generator.
        </p>

        <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto-Download CSV</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Automatically download CSV file after generating metadata instead of requiring manual export
              </p>
            </div>
            <button
              onClick={() => dispatch(setAutoDownloadCsv(!autoDownloadCsv))}
              className={`relative inline-flex h-6 w-11 items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#2a2d3a] ${
                autoDownloadCsv
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500'
              }`}
              aria-label={autoDownloadCsv ? 'Disable auto-download CSV' : 'Enable auto-download CSV'}
              role="switch"
              aria-checked={autoDownloadCsv}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoDownloadCsv ? 'translate-x-2.5' : '-translate-x-2.5'
                }`}
              />
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className={`w-3 h-3 rounded-full ${autoDownloadCsv ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>
                Auto-download is {autoDownloadCsv ? 'enabled' : 'disabled'}
                {autoDownloadCsv && ' - CSV files will download automatically after generation'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )



  const renderUpdatesContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Application Updates</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Check if a new version of the application is available. Updates help you get the latest features and bug fixes.
        </p>

        {/* Update Check Section */}
        <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={checkForUpdates}
              disabled={checkingForUpdate}
              className="px-6 py-3 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {checkingForUpdate ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Check for Updates
                </>
              )}
            </button>

            {updateStatus && (
              <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                {updateInfo.hasUpdate ? (
                  <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                ) : updateInfo.updateError ? (
                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{updateStatus}</span>
              </div>
            )}
          </div>

          {/* Update Information Display */}
          {(updateInfo.hasUpdate || updateInfo.updateError || updateInfo.lastChecked) && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Version */}
                <div className="bg-white dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Version</h4>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {updateInfo.currentVersion || 'v1.1.3'}
                  </p>
                </div>

                {/* Latest Version */}
                {updateInfo.hasUpdate && updateInfo.latestVersion && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Latest Version</h4>
                    <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      {updateInfo.latestVersion}
                    </p>
                  </div>
                )}

                {/* Last Checked */}
                {updateInfo.lastChecked && (
                  <div className="bg-white dark:bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Checked</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {updateInfo.lastChecked.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Download Progress */}
                {updateInfo.downloadProgress > 0 && updateInfo.downloadProgress < 100 && (
                  <div className="bg-white dark:bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Download Progress</h4>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${updateInfo.downloadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(updateInfo.downloadProgress)}% complete
                    </p>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {updateInfo.updateError && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Update Error</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{updateInfo.updateError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Update Available Actions */}
              {updateInfo.hasUpdate && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Update Available</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        A new version ({updateInfo.latestVersion}) is available for download.
                      </p>
                      <button className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                        Download Update
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  )

  const renderLicenseContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">License Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Manage your application license and view subscription details.
        </p>
        <LicenseStatus />
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'license':
        return renderLicenseContent()
      case 'api':
        return renderApiContent()
      case 'appearance':
        return renderAppearanceContent()
      case 'updates':
        return renderUpdatesContent()
      default:
        return renderLicenseContent()
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
            {/* Dynamic Content Based on Sidebar Selection */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
