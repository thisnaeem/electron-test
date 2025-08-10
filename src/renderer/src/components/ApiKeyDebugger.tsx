/**
 * API Key Debugger Component
 * 
 * A simple component to test API key validation
 */

import React, { useState } from 'react'
import { validateGeminiApiKey } from '../utils/simpleApiKeyValidator'
import { apiKeyValidationService } from '../services/ApiKeyValidationService'

const ApiKeyDebugger: React.FC = () => {
  const [testKey, setTestKey] = useState('')
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testSimpleValidation = async () => {
    if (!testKey.trim()) return
    
    setIsLoading(true)
    setResult('Testing simple validation...')
    
    try {
      const result = await validateGeminiApiKey(testKey)
      setResult(`Simple validation result: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      setResult(`Simple validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testComprehensiveValidation = async () => {
    if (!testKey.trim()) return
    
    setIsLoading(true)
    setResult('Testing comprehensive validation...')
    
    try {
      const result = await apiKeyValidationService.validateApiKey(testKey)
      setResult(`Comprehensive validation result: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      setResult(`Comprehensive validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">API Key Validation Debugger</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test API Key:</label>
          <input
            type="text"
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter API key to test..."
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={testSimpleValidation}
            disabled={isLoading || !testKey.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Test Simple
          </button>
          <button
            onClick={testComprehensiveValidation}
            disabled={isLoading || !testKey.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Test Comprehensive
          </button>
        </div>
        
        {result && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Result:</label>
            <pre className="p-3 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiKeyDebugger