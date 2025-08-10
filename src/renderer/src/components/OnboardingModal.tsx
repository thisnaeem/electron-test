import { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { addApiKey } from '../store/slices/settingsSlice'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface OnboardingModalProps {
  isOpen: boolean
  onClose?: () => void
}

const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps): React.JSX.Element | null => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)
  const [newApiKey, setNewApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')

  const validApiKeysCount = apiKeys.filter(key => key.isValid).length
  const isComplete = validApiKeysCount >= 5

  const handleAddApiKey = useCallback(async () => {
    if (!newApiKey.trim()) return

    setError('')
    setIsValidating(true)

    try {
      // Check for duplicates
      const isDuplicate = apiKeys.some(existingKey => existingKey.key === newApiKey.trim())
      if (isDuplicate) {
        setError('This API key has already been added.')
        setIsValidating(false)
        return
      }

      // Test the API key
      const genAI = new GoogleGenerativeAI(newApiKey.trim())
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Test with a small image
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      const content = [
        'Test API key',
        {
          inlineData: {
            mimeType: 'image/png',
            data: testImageBase64
          }
        }
      ]

      await model.generateContent(content)

      // Add the validated API key
      dispatch(addApiKey({
        key: newApiKey.trim(),
        name: `API Key ${apiKeys.length + 1}`,
        isValid: true
      }))

      setNewApiKey('')

      // Auto-close when complete
      if (validApiKeysCount + 1 >= 5 && onClose) {
        setTimeout(() => onClose(), 1000)
      }

    } catch (error) {
      console.error('Error validating API key:', error)
      setError('Invalid API key. Please check and try again.')
    } finally {
      setIsValidating(false)
    }
  }, [newApiKey, apiKeys, dispatch, validApiKeysCount, onClose])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating && newApiKey.trim()) {
      handleAddApiKey()
    }
  }, [handleAddApiKey, isValidating, newApiKey])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2a2d3a] rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add API Keys for Generator</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Add 5 Gemini API keys to use the generator feature
            </p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {validApiKeysCount}/5 API keys added
              </span>
              {isComplete && (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Complete!</span>
              )}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(validApiKeysCount / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Add API Key Form */}
          {!isComplete && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="AIzaSy..."
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-[#383b4a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isValidating}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    Validating...
                  </>
                ) : (
                  `Add API Key ${validApiKeysCount + 1}`
                )}
              </button>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ready to Generate!</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                You can now use the generator to create metadata for your images
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start Using Generator
                </button>
              )}
            </div>
          )}

          {/* Help Link */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Need API keys?{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Get them from Google AI Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
