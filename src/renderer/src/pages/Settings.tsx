import { useState, FormEvent, useEffect } from 'react'
import { useGemini } from '../context/GeminiContext'

const Settings = (): React.JSX.Element => {
  const { apiKey, setApiKey, validateApiKey, isApiKeyValid, isLoading } = useGemini()
  const [inputApiKey, setInputApiKey] = useState<string>(apiKey)
  const [showApiKey, setShowApiKey] = useState<boolean>(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false)

  useEffect(() => {
    // Get app version
    window.api.getAppVersion().then(setAppVersion)
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setValidationMessage(null)
    setValidationStatus(null)

    try {
      const isValid = await validateApiKey(inputApiKey)

      if (isValid) {
        setApiKey(inputApiKey)
        setValidationStatus('success')
        setValidationMessage('API key saved successfully!')
      } else {
        setValidationStatus('error')
        setValidationMessage('Invalid API key. Please check and try again.')
      }
    } catch (error) {
      setValidationStatus('error')
      setValidationMessage(`Error validating API key: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleClearApiKey = (): void => {
    setInputApiKey('')
    setApiKey('')
    localStorage.removeItem('geminiApiKey')
    setValidationStatus(null)
    setValidationMessage('API key cleared')
  }

  const handleCheckForUpdates = async (): Promise<void> => {
    setCheckingForUpdates(true)
    try {
      await window.api.checkForUpdates()
    } catch (error) {
      console.error('Error checking for updates:', error)
    } finally {
      setCheckingForUpdates(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Configure your application settings
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Gemini API Configuration</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              >
                {showApiKey ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get your API key from the <a href="https://makersuite.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a>
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Validating...' : 'Save API Key'}
            </button>
            <button
              type="button"
              onClick={handleClearApiKey}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear API Key
            </button>
          </div>
        </form>

        {validationMessage && (
          <div className={`mt-4 p-3 rounded-md ${
            validationStatus === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {validationMessage}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">API Status</h3>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isApiKeyValid ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-700 dark:text-gray-300">
              {isApiKeyValid ? 'API Key is valid' : 'No valid API key'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Application</h2>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Version</h3>
            <p className="text-gray-500 dark:text-gray-400">{appVersion}</p>
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={checkingForUpdates}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checkingForUpdates ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          The application automatically checks for updates when it starts. You can also check manually using the button above.
        </p>
      </div>
    </div>
  )
}

export default Settings
