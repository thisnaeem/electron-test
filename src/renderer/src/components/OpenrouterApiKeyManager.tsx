import { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  addOpenrouterApiKey,
  removeOpenrouterApiKey,
  validateMultipleOpenrouterApiKey,
  ApiKeyInfo
} from '../store/slices/settingsSlice'
import { useToast } from '../hooks/useToast'

interface OpenrouterApiKeyManagerProps {
  className?: string
}

const OpenrouterApiKeyManager: React.FC<OpenrouterApiKeyManagerProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch()
  const { openrouterApiKeys, openrouterSelectedModel } = useAppSelector(state => state.settings)
  const { showSuccess, showError, showInfo } = useToast()

  const [newApiKey, setNewApiKey] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  const [apiKeyToRemove, setApiKeyToRemove] = useState<{ id: string; name: string } | null>(null)

  const handleAddApiKey = useCallback(async () => {
    if (!newApiKey.trim()) return

    const trimmedKey = newApiKey.trim()

    // Check for duplicate API keys
    const isDuplicate = openrouterApiKeys.some(existingKey => existingKey.key === trimmedKey)
    if (isDuplicate) {
      showError('Duplicate API Key', 'This OpenRouter API key has already been added.')
      return
    }

    setIsValidating(true)

    try {
      // Generate auto name
      const name = `OpenRouter Key ${openrouterApiKeys.length + 1}`

      // Generate a unique ID
      const newKeyId = `openrouter-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      console.log('🔍 Validating OpenRouter API key before adding...', newKeyId)

      // Add the key first (will be marked as invalid initially)
      dispatch(addOpenrouterApiKey({
        key: trimmedKey,
        name,
        isValid: false
      }))

      // Then validate it
      const result = await dispatch(validateMultipleOpenrouterApiKey({
        id: newKeyId,
        key: trimmedKey,
        selectedModel: openrouterSelectedModel
      }))

      if (validateMultipleOpenrouterApiKey.fulfilled.match(result)) {
        showSuccess('API Key Added', `OpenRouter API key "${name}" has been added and validated successfully.`)

        // Update key information for rate limiting
        try {
          const { openrouterRateLimiter } = await import('../utils/openrouterRateLimiter')
          await openrouterRateLimiter.updateKeyInfo(newKeyId, trimmedKey)
        } catch (error) {
          console.warn('Failed to update OpenRouter key info:', error)
        }

        setNewApiKey('')
        setShowAddForm(false)
      } else {
        showError('Validation Failed', 'The OpenRouter API key was added but validation failed. Please check the key and try validating again.')
      }
    } catch (error) {
      console.error('❌ Error adding OpenRouter API key:', error)
      showError('Error', 'Failed to add OpenRouter API key. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }, [newApiKey, openrouterApiKeys, openrouterSelectedModel, dispatch, showSuccess, showError])

  const handleValidateApiKey = useCallback(async (id: string, key: string) => {
    try {
      const result = await dispatch(validateMultipleOpenrouterApiKey({
        id,
        key,
        selectedModel: openrouterSelectedModel
      }))

      if (validateMultipleOpenrouterApiKey.fulfilled.match(result)) {
        showSuccess('Validation Successful', 'OpenRouter API key is valid and working.')
      } else {
        // Error details will be shown in the UI via the validation error state
        showError('Validation Failed', 'OpenRouter API key validation failed. Please check the key.')
      }
    } catch (error) {
      console.error('❌ Error validating OpenRouter API key:', error)
      showError('Validation Error', 'An error occurred while validating the OpenRouter API key.')
    }
  }, [dispatch, openrouterSelectedModel, showSuccess, showError])

  const handleRemoveApiKey = useCallback((id: string, name: string) => {
    setApiKeyToRemove({ id, name })
    setShowRemoveConfirmation(true)
  }, [])

  const confirmRemoveApiKey = useCallback(() => {
    if (apiKeyToRemove) {
      dispatch(removeOpenrouterApiKey(apiKeyToRemove.id))
      showInfo('API Key Removed', `OpenRouter API key "${apiKeyToRemove.name}" has been removed.`)
      setApiKeyToRemove(null)
      setShowRemoveConfirmation(false)
    }
  }, [apiKeyToRemove, dispatch, showInfo])

  const cancelRemoveApiKey = useCallback(() => {
    setApiKeyToRemove(null)
    setShowRemoveConfirmation(false)
  }, [])

  const handleValidateAll = useCallback(async () => {
    const invalidKeys = openrouterApiKeys.filter(key => !key.isValid && !key.isValidating)

    if (invalidKeys.length === 0) {
      showInfo('No Keys to Validate', 'All OpenRouter API keys are already valid or currently being validated.')
      return
    }

    showInfo('Validating Keys', `Starting validation for ${invalidKeys.length} OpenRouter API key(s)...`)

    // Validate all invalid keys
    for (const key of invalidKeys) {
      try {
        await dispatch(validateMultipleOpenrouterApiKey({
          id: key.id,
          key: key.key,
          selectedModel: openrouterSelectedModel
        }))
      } catch (error) {
        console.error(`❌ Error validating OpenRouter API key ${key.id}:`, error)
      }
    }
  }, [openrouterApiKeys, openrouterSelectedModel, dispatch, showInfo])

  const getValidKeysCount = (): number => {
    return openrouterApiKeys.filter(key => key.isValid).length
  }

  const getInvalidKeysCount = (): number => {
    return openrouterApiKeys.filter(key => !key.isValid && !key.isValidating).length
  }

  const getTotalRequests = (): number => {
    return openrouterApiKeys.reduce((total, key) => total + key.requestCount, 0)
  }

  const formatLastUsed = (timestamp: number): string => {
    if (timestamp === 0) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (key: ApiKeyInfo): string => {
    if (key.isValidating) return 'text-blue-600 dark:text-blue-400'
    if (key.isValid) return 'text-green-600 dark:text-green-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusIcon = (key: ApiKeyInfo): React.ReactNode => {
    if (key.isValidating) {
      return (
        <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )
    }
    if (key.isValid) {
      return (
        <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    return (
      <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-medium text-[#1a1b1e] dark:text-white mb-2">OpenRouter API Key Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage OpenRouter API keys for round-robin request distribution.
            {openrouterApiKeys.length > 0 && (
              <>
                {' '}{getValidKeysCount()}/{openrouterApiKeys.length} valid keys, {getTotalRequests()} total requests.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {getInvalidKeysCount() > 0 && (
            <button
              onClick={handleValidateAll}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Validate All ({getInvalidKeysCount()})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            Add API Key
          </button>
        </div>
      </div>

      {/* Add API Key Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Add New OpenRouter API Key</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OpenRouter API Key
              </label>
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Enter your OpenRouter API key"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 transition-all"
                disabled={isValidating}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddApiKey}
                disabled={!newApiKey.trim() || isValidating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding & Validating...
                  </>
                ) : (
                  'Add & Validate'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewApiKey('')
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {openrouterApiKeys.length > 0 ? (
        <div className="space-y-3">
          {openrouterApiKeys.map((apiKey) => (
            <div key={apiKey.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(apiKey)}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{apiKey.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {apiKey.key.substring(0, 8)}...{apiKey.key.substring(apiKey.key.length - 4)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-sm">
                    <div className={`font-medium ${getStatusColor(apiKey)}`}>
                      {apiKey.isValidating ? 'Validating...' : apiKey.isValid ? 'Valid' : 'Invalid'}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {apiKey.requestCount} requests
                    </div>
                  </div>

                  {!apiKey.isValid && !apiKey.isValidating && (
                    <button
                      onClick={() => handleValidateApiKey(apiKey.id, apiKey.key)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium transition-colors text-sm"
                    >
                      Validate
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveApiKey(apiKey.id, apiKey.name)}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-medium transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {apiKey.validationError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">{apiKey.validationError}</p>
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Last used: {formatLastUsed(apiKey.lastRequestTime)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No OpenRouter API Keys</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add multiple OpenRouter API keys to enable round-robin request distribution.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Add Your First OpenRouter API Key
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirmation && apiKeyToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Remove OpenRouter API Key
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to remove &quot;{apiKeyToRemove.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelRemoveApiKey}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveApiKey}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OpenrouterApiKeyManager
