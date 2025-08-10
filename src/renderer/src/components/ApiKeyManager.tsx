import { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  addApiKey,
  removeApiKey,
  validateMultipleApiKey,
  clearApiKeyError,
  ApiKeyInfo
} from '../store/slices/settingsSlice'
import { useToast } from '../hooks/useToast'


interface ApiKeyManagerProps {
  className?: string
}

// eslint-disable-next-line react/prop-types
const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)
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
    const isDuplicate = apiKeys.some(existingKey => existingKey.key === trimmedKey)
    if (isDuplicate) {
      showError('Duplicate API Key', 'This API key has already been added.')
      return
    }

    setIsValidating(true)

    try {
      // Generate auto name
      const name = `API Key ${apiKeys.length + 1}`
      
      // Generate a unique ID
      const newKeyId = `api-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      console.log('🔍 Validating API key before adding...', newKeyId)

      // Validate the API key first
      const validationResult = await dispatch(validateMultipleApiKey({ id: newKeyId, key: trimmedKey }))
      
      if (validateMultipleApiKey.fulfilled.match(validationResult)) {
        // Validation successful - add to store as valid
        dispatch(addApiKey({ key: trimmedKey, name, isValid: true }))
        
        // Reset form
        setNewApiKey('')
        setShowAddForm(false)
        
        showSuccess('API Key Added', `${name} has been validated and added successfully.`)
        console.log('✅ API key added and validated successfully')
      } else {
        // Validation failed - format the error message
        const errorPayload = validationResult.payload as { error: string }
        const rawError = errorPayload.error || 'Validation failed'
        
        // Parse and format the error message
        let friendlyMessage = 'Please check your API key and try again.'
        
        if (rawError.includes('API key not valid')) {
          friendlyMessage = 'The API key is invalid. Please check and try again.'
        } else if (rawError.includes('quota') || rawError.includes('QUOTA_EXCEEDED')) {
          friendlyMessage = 'API quota exceeded. Please check your Google Cloud billing.'
        } else if (rawError.includes('rate limit') || rawError.includes('RATE_LIMIT_EXCEEDED')) {
          friendlyMessage = 'Rate limit exceeded. Please wait a moment and try again.'
        } else if (rawError.includes('timeout') || rawError.includes('Timeout')) {
          friendlyMessage = 'Request timed out. Please check your internet connection.'
        } else if (rawError.includes('network') || rawError.includes('fetch')) {
          friendlyMessage = 'Network error. Please check your internet connection.'
        } else if (rawError.includes('model not found') || rawError.includes('MODEL_NOT_FOUND')) {
          friendlyMessage = 'API key does not have access to required models.'
        }
        
        showError('Validation Failed', friendlyMessage)
        console.log('❌ API key validation failed:', rawError)
      }

    } catch (error) {
      console.error('Error processing API key:', error)
      showError('Processing Error', 'Failed to process API key. Please try again.')
    }

    setIsValidating(false)
  }, [newApiKey, apiKeys, dispatch, showSuccess, showError])

  const handleRemoveApiKey = useCallback((id: string, name: string) => {
    setApiKeyToRemove({ id, name })
    setShowRemoveConfirmation(true)
  }, [])

  const confirmRemoveApiKey = useCallback(() => {
    if (apiKeyToRemove) {
      dispatch(removeApiKey(apiKeyToRemove.id))
      showSuccess('API Key Removed', `${apiKeyToRemove.name} has been removed from your collection.`)
      setShowRemoveConfirmation(false)
      setApiKeyToRemove(null)
    }
  }, [apiKeyToRemove, dispatch, showSuccess])

  const cancelRemoveApiKey = useCallback(() => {
    setShowRemoveConfirmation(false)
    setApiKeyToRemove(null)
  }, [])





  const formatApiKey = (key: string): string => {
    if (key.length <= 8) return key
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  const getValidKeysCount = (): number => {
    return apiKeys.filter(key => key.isValid).length
  }

  const getTotalRequests = (): number => {
    return apiKeys.reduce((sum, key) => sum + key.requestCount, 0)
  }

  const handleValidateAll = useCallback(async () => {
    const invalidKeys = apiKeys.filter(key => !key.isValid && !key.isValidating)
    
    if (invalidKeys.length === 0) {
      showInfo('No Keys to Validate', 'All API keys are already validated.')
      return
    }

    showInfo('Validating Keys', `Starting validation for ${invalidKeys.length} API key${invalidKeys.length > 1 ? 's' : ''}...`)

    // Validate all invalid keys
    const validationPromises = invalidKeys.map(apiKey => 
      dispatch(validateMultipleApiKey({ id: apiKey.id, key: apiKey.key }))
    )

    try {
      const results = await Promise.all(validationPromises)
      const successCount = results.filter(result => validateMultipleApiKey.fulfilled.match(result)).length
      const failedCount = results.length - successCount

      if (successCount > 0 && failedCount === 0) {
        showSuccess('All Keys Validated', `Successfully validated ${successCount} API key${successCount > 1 ? 's' : ''}.`)
      } else if (successCount > 0 && failedCount > 0) {
        showInfo('Partial Success', `Validated ${successCount} key${successCount > 1 ? 's' : ''}, ${failedCount} failed.`)
      } else {
        showError('Validation Failed', `Failed to validate ${failedCount} API key${failedCount > 1 ? 's' : ''}.`)
      }
    } catch (error) {
      showError('Validation Error', 'An error occurred while validating API keys.')
    }
  }, [apiKeys, dispatch, showSuccess, showError, showInfo])

  const handleValidateIndividual = useCallback(async (apiKey: ApiKeyInfo) => {
    const validationResult = await dispatch(validateMultipleApiKey({ id: apiKey.id, key: apiKey.key }))
    
    if (validateMultipleApiKey.fulfilled.match(validationResult)) {
      showSuccess('Validation Successful', `${apiKey.name} is now validated and ready to use.`)
    } else {
      const errorPayload = validationResult.payload as { error: string }
      const rawError = errorPayload.error || 'Failed to validate API key.'
      
      // Parse and format the error message
      let friendlyMessage = 'Failed to validate API key. Please try again.'
      
      if (rawError.includes('API key not valid')) {
        friendlyMessage = 'The API key is invalid. Please check and try again.'
      } else if (rawError.includes('quota') || rawError.includes('QUOTA_EXCEEDED')) {
        friendlyMessage = 'API quota exceeded. Please check your Google Cloud billing.'
      } else if (rawError.includes('rate limit') || rawError.includes('RATE_LIMIT_EXCEEDED')) {
        friendlyMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (rawError.includes('timeout') || rawError.includes('Timeout')) {
        friendlyMessage = 'Request timed out. Please check your internet connection.'
      } else if (rawError.includes('network') || rawError.includes('fetch')) {
        friendlyMessage = 'Network error. Please check your internet connection.'
      }
      
      showError('Validation Failed', friendlyMessage)
    }
  }, [dispatch, showSuccess, showError])

  const getInvalidKeysCount = (): number => {
    return apiKeys.filter(key => !key.isValid && !key.isValidating).length
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-medium text-[#1a1b1e] dark:text-white mb-2">API Key Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage API keys for parallel processing.
            {apiKeys.length > 0 && (
              <>
                {' '}{getValidKeysCount()}/{apiKeys.length} valid keys, {getTotalRequests()} total requests.
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
          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Add New API Key</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gemini API Key
              </label>
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 transition-all"
                disabled={isValidating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isValidating && newApiKey.trim()) {
                    handleAddApiKey()
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewApiKey('')
                }}
                disabled={isValidating}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApiKey}
                disabled={!newApiKey.trim() || isValidating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  'Add & Validate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Your API Keys</h4>

          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {/* API Key Name and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">{apiKey.name}</h5>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      apiKey.isValid
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : apiKey.isValidating
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {apiKey.isValidating ? (
                        <>
                          <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Validating
                        </>
                      ) : apiKey.isValid ? (
                        'Valid'
                      ) : (
                        'Invalid'
                      )}
                    </div>
                  </div>

                  {/* API Key Display */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Key: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{formatApiKey(apiKey.key)}</code>
                  </div>

                  {/* Usage Stats */}
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Requests made: {apiKey.requestCount} | Last used: {
                      apiKey.lastRequestTime > 0
                        ? new Date(apiKey.lastRequestTime).toLocaleString()
                        : 'Never'
                    }
                  </div>

                  {/* Error Message */}
                  {apiKey.validationError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      <span className="flex-1">{apiKey.validationError}</span>
                      <button
                        onClick={() => dispatch(clearApiKeyError(apiKey.id))}
                        className="text-red-500 hover:text-red-600 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {!apiKey.isValid && !apiKey.isValidating && (
                    <button
                      onClick={() => handleValidateIndividual(apiKey)}
                      className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveApiKey(apiKey.id, apiKey.name)}
                    className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {apiKeys.length === 0 && !showAddForm && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="max-w-sm mx-auto">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.243a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No API Keys</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add multiple API keys to enable faster parallel metadata generation.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Add Your First API Key
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirmation && apiKeyToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Remove API Key
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

export default ApiKeyManager
