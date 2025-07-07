import { ProcessingProgress as ProcessingProgressType } from '../context/GeminiContext.types'
import { useAppSelector } from '../store/hooks'

interface ProcessingProgressProps {
  progress: ProcessingProgressType
  className?: string
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progress, className = '' }) => {
  const { apiKeys } = useAppSelector(state => state.settings)

  const progressPercentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  // Get API key info for current processing
  const currentApiKey = progress.currentApiKeyId
    ? apiKeys.find(key => key.id === progress.currentApiKeyId)
    : null

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">Processing Images</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {progress.completed} / {progress.total} completed ({progressPercentage}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Current Processing Info */}
      {progress.currentFilename && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Currently Processing
            </span>
          </div>

          <div className="text-sm text-blue-700 dark:text-blue-300">
            <div className="font-medium truncate mb-1">{progress.currentFilename}</div>
            {currentApiKey && (
              <div className="text-xs">
                Using: <span className="font-medium">{currentApiKey.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Key Statistics */}
      {Object.keys(progress.processingStats).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">API Key Usage</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(progress.processingStats).map(([apiKeyId, stats]) => {
              const apiKey = apiKeys.find(key => key.id === apiKeyId)
              if (!apiKey) return null

              return (
                <div
                  key={apiKeyId}
                  className={`p-3 rounded-lg border ${
                    progress.currentApiKeyId === apiKeyId
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {apiKey.name}
                    </span>
                    {progress.currentApiKeyId === apiKeyId && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Processed:</span>
                      <span className="font-medium">{stats.processed}</span>
                    </div>

                    {stats.errors > 0 && (
                      <div className="flex justify-between">
                        <span>Errors:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">{stats.errors}</span>
                      </div>
                    )}

                    {stats.lastUsed > 0 && (
                      <div className="text-xs text-gray-500">
                        Last used: {new Date(stats.lastUsed).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Processing Complete Message */}
      {progress.completed === progress.total && progress.total > 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              All images processed successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProcessingProgress
