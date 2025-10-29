/**
 * Generator Access Guard Component
 * 
 * This component provides a consistent way to check and display
 * generator access requirements using the ApiKeyValidationService.
 */

import React from 'react'
import { useAppSelector } from '../store/hooks'
import { apiKeyValidationService } from '../services/ApiKeyValidationService'

interface GeneratorAccessGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface AccessStatusDisplayProps {
  validKeyCount: number
  requiredKeyCount: number
  missingKeyCount: number
  message: string
  metadataProvider?: string
  onGoToSettings: () => void
}

const AccessStatusDisplay: React.FC<AccessStatusDisplayProps> = ({
  validKeyCount,
  requiredKeyCount,
  missingKeyCount,
  message,
  metadataProvider = 'gemini',
  onGoToSettings
}) => {
  // Get provider-specific information
  const getProviderInfo = () => {
    switch (metadataProvider) {
      case 'openai':
        return {
          name: 'OpenAI',
          description: 'Add a valid OpenAI API key in Settings to use the generator feature.',
          helpText: '💡 Tip: Get your OpenAI API key from platform.openai.com',
          keyType: 'OpenAI API key'
        }
      case 'groq':
        return {
          name: 'Groq',
          description: 'Add a valid Groq API key in Settings to use the generator feature.',
          helpText: '💡 Tip: Get your free Groq API key from console.groq.com',
          keyType: 'Groq API key'
        }
      case 'openrouter':
        return {
          name: 'OpenRouter',
          description: 'Add a valid OpenRouter API key in Settings to use the generator feature.',
          helpText: '💡 Tip: Get your OpenRouter API key from openrouter.ai',
          keyType: 'OpenRouter API key'
        }
      case 'gemini':
      default:
        return {
          name: 'Gemini',
          description: `Add ${requiredKeyCount} valid Gemini API keys in Settings to use the generator feature.`,
          helpText: '💡 Tip: You can get free Gemini API keys from Google AI Studio',
          keyType: 'Gemini API keys'
        }
    }
  }

  const providerInfo = getProviderInfo()
  return (
    <div className="w-full max-w-2xl p-12 bg-[#f3f4f6] dark:bg-[#2a2d3a] rounded-2xl text-center">
      <div className="space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-blue-600 dark:text-blue-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            Generator Requires {providerInfo.name} API Key{requiredKeyCount > 1 ? 's' : ''}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {providerInfo.description}
          </p>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Valid {providerInfo.keyType}
            </span>
            <span className={`text-sm font-semibold ${
              validKeyCount >= requiredKeyCount 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {validKeyCount}/{requiredKeyCount}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                validKeyCount >= requiredKeyCount 
                  ? 'bg-green-500' 
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min((validKeyCount / requiredKeyCount) * 100, 100)}%` }}
            />
          </div>
          
          {missingKeyCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {missingKeyCount} more key{missingKeyCount !== 1 ? 's' : ''} needed
            </p>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>

        {/* Action button */}
        <button
          onClick={onGoToSettings}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Go to Settings
        </button>

        {/* Help text */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>{providerInfo.helpText}</p>
          <p>🔄 Keys are automatically validated when added</p>
        </div>
      </div>
    </div>
  )
}

const GeneratorAccessGuard: React.FC<GeneratorAccessGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { 
    apiKeys, 
    metadataProvider, 
    openaiApiKey, 
    isOpenaiApiKeyValid
  } = useAppSelector(state => state.settings)
  
  // Use the validation service to check access with provider-specific logic
  const accessResult = apiKeyValidationService.checkGeneratorAccess(
    apiKeys,
    metadataProvider,
    {
      openaiApiKey,
      isOpenaiApiKeyValid
    }
  )
  
  const handleGoToSettings = () => {
    window.location.hash = '#/settings'
  }

  // If user has access, render children
  if (accessResult.hasAccess) {
    return <>{children}</>
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default fallback - show access status
  return (
    <div className="h-full flex items-center justify-center">
      <AccessStatusDisplay
        validKeyCount={accessResult.validKeyCount}
        requiredKeyCount={accessResult.requiredKeyCount}
        missingKeyCount={accessResult.missingKeyCount}
        message={accessResult.message}
        metadataProvider={metadataProvider}
        onGoToSettings={handleGoToSettings}
      />
    </div>
  )
}

export default GeneratorAccessGuard