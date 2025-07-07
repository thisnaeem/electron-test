import { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  addApiKey,
  removeApiKey,
  validateMultipleApiKey,
  updateApiKeyName,
  clearApiKeyError,
  ApiKeyInfo
} from '../store/slices/settingsSlice'

interface ApiKeyManagerProps {
  className?: string
}

// eslint-disable-next-line react/prop-types
const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)

  const [newApiKey, setNewApiKey] = useState('')
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  const [apiKeyToRemove, setApiKeyToRemove] = useState<{ id: string; name: string } | null>(null)

    const handleAddApiKey = useCallback(async () => {
    if (!newApiKey.trim()) return

    const trimmedKey = newApiKey.trim()

    // Clear any previous errors
    setDuplicateError('')

    // Check for duplicate API keys
    const isDuplicate = apiKeys.some(existingKey => existingKey.key === trimmedKey)
    if (isDuplicate) {
      setDuplicateError('This API key has already been added.')
      return
    }

    setIsValidating(true)

    try {
      const name = newApiKeyName.trim() || `API Key ${apiKeys.length + 1}`

      // Generate a unique ID that matches the pattern used in the slice
      const newKeyId = `api-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // First validate the API key with a test request before adding to store
      console.log('🔍 Validating new API key before adding to store...', newKeyId)

      try {
        // Validate the API key first
        await dispatch(validateMultipleApiKey({ id: newKeyId, key: trimmedKey }))
        console.log('✅ API key validation successful, now adding to store')

        // Only add to store if validation succeeds, mark as valid
        dispatch(addApiKey({ key: trimmedKey, name, isValid: true }))

        // Reset form on successful validation and addition
        setNewApiKey('')
        setNewApiKeyName('')
        setShowAddForm(false)

      } catch (validationError) {
        console.error('❌ API key validation failed:', validationError)
        setDuplicateError('API key validation failed. Please check your key and try again.')
      }

    } catch (error) {
      console.error('Error processing API key:', error)
      setDuplicateError('Failed to process API key. Please try again.')
    }

    setIsValidating(false)
  }, [newApiKey, newApiKeyName, apiKeys, dispatch])

  const handleRemoveApiKey = useCallback((id: string, name: string) => {
    setApiKeyToRemove({ id, name })
    setShowRemoveConfirmation(true)
  }, [])

  const confirmRemoveApiKey = useCallback(() => {
    if (apiKeyToRemove) {
      dispatch(removeApiKey(apiKeyToRemove.id))
      setShowRemoveConfirmation(false)
      setApiKeyToRemove(null)
    }
  }, [apiKeyToRemove, dispatch])

  const cancelRemoveApiKey = useCallback(() => {
    setShowRemoveConfirmation(false)
    setApiKeyToRemove(null)
  }, [])



  const handleStartNameEdit = useCallback((apiKey: ApiKeyInfo) => {
    setEditingName(apiKey.id)
    setEditingNameValue(apiKey.name)
  }, [])

  const handleSaveNameEdit = useCallback(() => {
    if (editingName && editingNameValue.trim()) {
      dispatch(updateApiKeyName({ id: editingName, name: editingNameValue.trim() }))
    }
    setEditingName(null)
    setEditingNameValue('')
  }, [editingName, editingNameValue, dispatch])

  const handleCancelNameEdit = useCallback(() => {
    setEditingName(null)
    setEditingNameValue('')
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-medium text-[#1a1b1e] dark:text-white mb-2">API Key Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage multiple Gemini API keys for faster parallel processing.
            {apiKeys.length > 0 && (
              <>
                {' '}You have {getValidKeysCount()} valid key{getValidKeysCount() !== 1 ? 's' : ''} out of {apiKeys.length} total.
                Total requests made: {getTotalRequests()}.
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Add API Key
        </button>
      </div>

      {/* Add API Key Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Add New API Key</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key Name (Optional)
              </label>
              <input
                type="text"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder={`API Key ${apiKeys.length + 1}`}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gemini API Key
              </label>
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => {
                  setNewApiKey(e.target.value)
                  if (duplicateError) setDuplicateError('') // Clear error when user starts typing
                }}
                placeholder="Enter your Gemini API key"
                className={`w-full px-3 py-2 rounded-lg border ${
                  duplicateError
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                } bg-white dark:bg-gray-700 focus:ring-2 transition-all`}
                disabled={isValidating}
              />
              {duplicateError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  {duplicateError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewApiKey('')
                  setNewApiKeyName('')
                  setDuplicateError('')
                }}
                disabled={isValidating}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApiKey}
                disabled={!newApiKey.trim() || isValidating || !!duplicateError}
                className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  {/* API Key Name */}
                  <div className="flex items-center gap-2 mb-2">
                    {editingName === apiKey.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNameEdit()
                            if (e.key === 'Escape') handleCancelNameEdit()
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveNameEdit}
                          className="text-green-600 hover:text-green-700 p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"></path>
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelNameEdit}
                          className="text-gray-500 hover:text-gray-600 p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">{apiKey.name}</h5>
                        <button
                          onClick={() => handleStartNameEdit(apiKey)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                          </svg>
                        </button>
                      </div>
                    )}

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
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {apiKey.validationError}
                      <button
                        onClick={() => dispatch(clearApiKeyError(apiKey.id))}
                        className="ml-2 text-red-500 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleRemoveApiKey(apiKey.id, apiKey.name)}
                    className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
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
              className="inline-flex items-center px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
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
