import React, { useState, useEffect } from 'react'
import ApiKeyManager from '../components/ApiKeyManager'

// import DarkModeToggle from '../components/DarkModeToggle' // Unused import
import LicenseStatus from '../components/LicenseStatus'

import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setTogetherApiKey, validateTogetherApiKey, setOpenaiApiKey, validateOpenaiApiKey, setOpenaiSelectedModel, setMetadataProvider, setThemePreference, setAutoDownloadCsv } from '../store/slices/settingsSlice'
import geminiLogo from '../assets/icons/gemini.webp'
import openaiLogo from '../assets/icons/openai.png'


type SettingsSection = 'license' | 'api' | 'appearance'

const Settings = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const {
    togetherApiKey,
    isTogetherApiKeyValid,
    isValidatingTogetherApiKey,
    togetherApiKeyValidationError,
    openaiApiKey,
    isOpenaiApiKeyValid,
    isValidatingOpenaiApiKey,
    openaiApiKeyValidationError,
    openaiSelectedModel,
    metadataProvider,
    themePreference,
    isDarkMode,
    autoDownloadCsv
  } = useAppSelector(state => state.settings)

  const [activeSection, setActiveSection] = useState<SettingsSection>('api')

  const handleTogetherApiKeyChange = (value: string): void => {
    dispatch(setTogetherApiKey(value))
  }

  const handleValidateTogetherApiKey = (): void => {
    if (!togetherApiKey.trim()) return
    dispatch(validateTogetherApiKey(togetherApiKey))
  }

  const handleOpenaiApiKeyChange = (value: string): void => {
    dispatch(setOpenaiApiKey(value))
  }

  const handleValidateOpenaiApiKey = (): void => {
    if (!openaiApiKey.trim()) return
    dispatch(validateOpenaiApiKey(openaiApiKey))
  }

  const handleOpenaiModelChange = (model: string): void => {
    dispatch(setOpenaiSelectedModel(model))
  }

  const handleMetadataProviderChange = (provider: 'gemini' | 'openai'): void => {
    dispatch(setMetadataProvider(provider))
  }

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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
        </svg>
      )
    },
    {
      id: 'appearance' as SettingsSection,
      name: 'Appearance',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      )
    },
    {
      id: 'license' as SettingsSection,
      name: 'License Status',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ]

  const renderApiContent = () => (
    <div className="space-y-8">
      {/* Metadata Provider Selection - Moved to top */}
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Metadata Generation Provider</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Choose which AI provider to use for generating image metadata. Each provider has different strengths and pricing.
        </p>

        <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Select Provider</h4>
          <div className="space-y-3">
            {/* Gemini Option */}
            <div className={`rounded-xl transition-all ${metadataProvider === 'gemini'
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'bg-white dark:bg-gray-700/50'
              }`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/30 rounded-t-xl"
                onClick={() => handleMetadataProviderChange('gemini')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
                    <img src={geminiLogo} alt="Google Gemini" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">Gemini</h5>
                      <div className="relative group">
                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            <div className="font-medium mb-1">Get your Gemini API key:</div>
                            <div>1. Visit ai.google.dev</div>
                            <div>2. Sign in with Google account</div>
                            <div>3. Click "Get API key"</div>
                            <div>4. Create new project or select existing</div>
                            <div>5. Copy your API key</div>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Advanced vision AI with multiple API key support</p>
                  </div>
                </div>
                {metadataProvider === 'gemini' && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Gemini Settings - Inline */}
              {metadataProvider === 'gemini' && (
                <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800 bg-blue-25 dark:bg-blue-950/30">
                  <div className="pt-4">
                    <ApiKeyManager />
                  </div>
                </div>
              )}
            </div>

            {/* OpenAI Option */}
            <div className={`rounded-xl transition-all ${metadataProvider === 'openai'
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'bg-white dark:bg-gray-700/50'
              }`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/30 rounded-t-xl"
                onClick={() => handleMetadataProviderChange('openai')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
                    <img src={openaiLogo} alt="OpenAI" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">OpenAI</h5>
                      <div className="relative group">
                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            <div className="font-medium mb-1">Get your OpenAI API key:</div>
                            <div>1. Visit platform.openai.com</div>
                            <div>2. Sign up or log in</div>
                            <div>3. Go to API Keys section</div>
                            <div>4. Click "Create new secret key"</div>
                            <div>5. Copy and save your key securely</div>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fast and cost-effective vision model</p>
                  </div>
                </div>
                {metadataProvider === 'openai' && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* OpenAI Settings - Inline */}
              {metadataProvider === 'openai' && (
                <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800 bg-blue-25 dark:bg-blue-950/30">
                  <div className="pt-4 space-y-4">
                    <div>
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">API Key</h6>
                      <div className="flex space-x-3">
                        <input
                          type="password"
                          value={openaiApiKey}
                          onChange={(e) => handleOpenaiApiKeyChange(e.target.value)}
                          placeholder="Enter your OpenAI API key"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1b23] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleValidateOpenaiApiKey}
                          disabled={!openaiApiKey.trim() || isValidatingOpenaiApiKey}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isValidatingOpenaiApiKey ? (
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

                      {/* Status Messages */}
                      {isOpenaiApiKeyValid && openaiApiKey.trim() && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mt-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          API key is valid and ready to use
                        </div>
                      )}

                      {openaiApiKeyValidationError && (
                        <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm mt-2">
                          <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>{openaiApiKeyValidationError}</span>
                        </div>
                      )}
                    </div>

                    {/* Model Selection */}
                    {isOpenaiApiKeyValid && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select Model</h6>
                        <select
                          value={openaiSelectedModel}
                          onChange={(e) => handleOpenaiModelChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1b23] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="gpt-4o-mini">GPT-4o-mini (Cost-effective)</option>
                          <option value="gpt-4o">GPT-4o (High performance)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo (Balanced)</option>
                          <option value="gpt-4">GPT-4 (Premium)</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget - Text only)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {openaiSelectedModel === 'gpt-4o-mini' && '• Most cost-effective vision model with good performance'}
                          {openaiSelectedModel === 'gpt-4o' && '• Latest and most capable vision model with excellent accuracy'}
                          {openaiSelectedModel === 'gpt-4-turbo' && '• Fast and capable model with vision support'}
                          {openaiSelectedModel === 'gpt-4' && '• Premium model with excellent reasoning and vision capabilities'}
                          {openaiSelectedModel === 'gpt-3.5-turbo' && '• Budget option - Text only, no vision support'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Provider Status */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className={`w-3 h-3 rounded-full ${metadataProvider === 'gemini' ? 'bg-blue-500' : 'bg-black'}`}></div>
              <span>
                Currently using {
                  metadataProvider === 'gemini' ? 'Google Gemini' : `OpenAI ${openaiSelectedModel}`
                } for metadata generation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Together AI API Key Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Together AI API Key</h3>
          <div className="relative group">
            <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="text-center">
                <div className="font-medium mb-1">Get your Together AI API key:</div>
                <div>1. Visit api.together.xyz</div>
                <div>2. Sign up or log in</div>
                <div>3. Go to API Keys section</div>
                <div>4. Click "Create new key"</div>
                <div>5. Copy your API key</div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </div>
        </div>
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
              {isTogetherApiKeyValid && togetherApiKey.trim() && (
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
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-600/30 ${themePreference === 'light'
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-gray-700/50'
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
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-600/30 ${themePreference === 'dark'
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-gray-700/50'
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
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-600/30 ${themePreference === 'system'
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-gray-700/50'
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
              className={`relative inline-flex h-6 w-11 items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#2a2d3a] ${autoDownloadCsv
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500'
                }`}
              aria-label={autoDownloadCsv ? 'Disable auto-download CSV' : 'Enable auto-download CSV'}
              role="switch"
              aria-checked={autoDownloadCsv}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoDownloadCsv ? 'translate-x-2.5' : '-translate-x-2.5'
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
                className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-all duration-200 text-left justify-start relative ${activeSection === section.id
                  ? 'bg-[#f6f6f8] dark:bg-[#2a2d3a] text-gray-900 dark:text-white shadow-sm transform scale-[1.02]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:scale-[1.01]'
                  }`}
              >
                <span className={`transition-colors duration-200 ${activeSection === section.id
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
