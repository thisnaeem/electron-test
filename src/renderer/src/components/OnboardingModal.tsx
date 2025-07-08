import { useState, useCallback, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { addApiKey, completeOnboarding } from '../store/slices/settingsSlice'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface OnboardingModalProps {
  isOpen: boolean
  onClose?: () => void
}

const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps): React.JSX.Element | null => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)
  const [newApiKey, setNewApiKey] = useState('')
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  const validApiKeysCount = apiKeys.filter(key => key.isValid).length
  const isOnboardingComplete = validApiKeysCount >= 5

  // Auto-complete onboarding when 5 valid API keys are reached
  useEffect(() => {
    if (isOnboardingComplete) {
      dispatch(completeOnboarding())
    }
  }, [isOnboardingComplete, dispatch])

  const handleClose = useCallback(() => {
    if (isOnboardingComplete && onClose) {
      onClose()
    }
  }, [isOnboardingComplete, onClose])

  const handleAddApiKey = useCallback(async () => {
    if (!newApiKey.trim()) return

    // Clear previous errors
    setDuplicateError('')

    // Check for duplicates
    const isDuplicate = apiKeys.some(existingKey => existingKey.key === newApiKey.trim())
    if (isDuplicate) {
      setDuplicateError('This API key has already been added.')
      return
    }

    setIsValidating(true)

    try {
      // Test the API key before adding it
      const genAI = new GoogleGenerativeAI(newApiKey.trim())
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Create a small test image (1x1 pixel base64 encoded PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

      const testPrompt = 'Analyze this test image and respond with: "Test successful"'
      const content = [
        testPrompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: testImageBase64
          }
        }
      ]

      console.log('🧪 Testing API key before adding...')
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('API key validation failed: Empty response from Gemini')
      }

      console.log('✅ API key validation successful, adding to store')

      // Add the validated API key
      dispatch(addApiKey({
        key: newApiKey.trim(),
        name: newApiKeyName.trim() || `API Key ${apiKeys.length + 1}`,
        isValid: true // We already validated it
      }))

      // Clear form
      setNewApiKey('')
      setNewApiKeyName('')

    } catch (error) {
      console.error('Error processing API key:', error)
      setDuplicateError('Failed to validate API key. Please check the key and try again.')
    } finally {
      setIsValidating(false)
    }
  }, [newApiKey, newApiKeyName, apiKeys, dispatch])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating && newApiKey.trim()) {
      handleAddApiKey()
    }
  }, [handleAddApiKey, isValidating, newApiKey])

  const handleInputChange = useCallback((value: string) => {
    setNewApiKey(value)
    if (duplicateError) {
      setDuplicateError('')
    }
  }, [duplicateError])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2a2d3a] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-12 0v-3.5a3.5 3.5 0 117 0V9a6 6 0 010 12v-3.5a3.5 3.5 0 11-7 0V9" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to CSVGen PRO</h2>
                <p className="text-gray-600 dark:text-gray-400">Let's get you set up with your API keys</p>
              </div>
            </div>

            {/* Close button - only show when onboarding is complete */}
            {isOnboardingComplete && (
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close onboarding"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                API Keys Added: {validApiKeysCount}/5
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isOnboardingComplete ? 'Complete!' : `${5 - validApiKeysCount} more needed`}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(validApiKeysCount / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Why do we need 5 API keys?</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>Faster Processing:</strong> Multiple keys enable parallel processing</li>
              <li>• <strong>Rate Limit Management:</strong> Each key has 12 requests/minute limit</li>
              <li>• <strong>Reliability:</strong> Backup keys prevent interruptions</li>
              <li>• <strong>Optimal Performance:</strong> Process up to 60 images per minute</li>
            </ul>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Current API Keys */}
          {apiKeys.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your API Keys</h3>
              <div className="space-y-3">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between p-4 bg-[#f6f6f8] dark:bg-[#383b4a] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        apiKey.isValid
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : apiKey.isValidating
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {apiKey.isValidating ? (
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        ) : apiKey.isValid ? (
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{apiKey.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {apiKey.key.substring(0, 20)}...
                        </p>
                        {apiKey.validationError && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{apiKey.validationError}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        apiKey.isValid
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : apiKey.isValidating
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {apiKey.isValidating ? 'Validating...' : apiKey.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New API Key Form */}
          {!isOnboardingComplete && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add API Key {validApiKeysCount + 1}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder={`API Key ${validApiKeysCount + 1}`}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#383b4a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isValidating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gemini API Key *
                  </label>
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="AIzaSy..."
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-[#383b4a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      duplicateError
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isValidating}
                  />
                  {duplicateError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{duplicateError}</p>
                  )}
                </div>

                <button
                  onClick={handleAddApiKey}
                  disabled={isValidating || !newApiKey.trim()}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Validating API Key...
                    </>
                  ) : (
                    `Add API Key ${validApiKeysCount + 1}`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {isOnboardingComplete && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setup Complete!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You've successfully added {validApiKeysCount} valid API keys. Your app is now ready for optimal performance!
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 dark:text-green-300">
                  🚀 You can now process up to <strong>{validApiKeysCount * 12} images per minute</strong> with parallel processing!
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Get Started
              </button>
            </div>
          )}

          {/* Help Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="bg-gray-50 dark:bg-[#383b4a] rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Need help getting API keys?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Get your free Gemini API keys from Google AI Studio:
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Google AI Studio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
