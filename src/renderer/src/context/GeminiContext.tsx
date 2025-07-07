import { useCallback, ReactNode, useState, useRef } from 'react'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { GeminiContext } from './GeminiContext.context'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  ProcessingProgress,
  MetadataResult,
  ImageInput,
  GeminiContextType
} from './GeminiContext.types'
import {
  addApiKey,
  removeApiKey,
  validateMultipleApiKey,
  incrementApiKeyUsage,
  ApiKeyInfo
} from '../store/slices/settingsSlice'
import { rateLimiter } from '../utils/rateLimiter'

// Retry configuration
const MAX_RETRIES = 5 // Increased from 3 to 5 for more aggressive retries
const RETRY_DELAY = 500 // Reduced from 1000ms to 500ms for faster retries
const PARALLEL_LIMIT = 5 // Maximum concurrent requests

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export function GeminiProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { apiKey, isApiKeyValid, apiKeys, isValidatingAny } = useAppSelector(state => state.settings)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  // Use ref to track abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const stopRequestedRef = useRef<boolean>(false)

  const generateMetadataForSingleImage = useCallback(async (
    imageInput: ImageInput,
    apiKeyInfo: ApiKeyInfo
  ): Promise<MetadataResult> => {
    const { imageData, filename } = imageInput

    try {
      // Check if base64 data is valid
      if (!imageData || !imageData.includes(',')) {
        throw new Error('Invalid image data')
      }

      // Record API usage for rate limiting
      rateLimiter.recordRequest(apiKeyInfo.id)
      dispatch(incrementApiKeyUsage(apiKeyInfo.id))

      const genAI = new GoogleGenerativeAI(apiKeyInfo.key)
      const modelName = 'gemini-2.0-flash'
      const model = genAI.getGenerativeModel({ model: modelName })

      const prompt = `Analyze this image and provide metadata in the following exact format:

Title: [A descriptive title in exactly 15 words]
Keywords: [Exactly 45-46 relevant keywords separated by commas]

Requirements:
- Title must be exactly 15 words, descriptive and engaging, no extra characters must be one sentence only like most stock agency images has like adobe stock
- Keywords must be 45-46 items, relevant to the image content
- Focus on objects, colors, style, mood, and context visible in the image
- Use single words or short phrases for keywords
- Separate keywords with commas only

Respond with only the title and keywords in the specified format.`

      const content: (string | Part)[] = [
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData.split(',')[1]
          }
        }
      ]

      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      // Parse the response
      const lines = text.split('\n').filter(line => line.trim())
      let title = ''
      let keywords: string[] = []

      for (const line of lines) {
        if (line.toLowerCase().includes('title:')) {
          title = line.replace(/title:/i, '').trim()
        } else if (line.toLowerCase().includes('keywords:')) {
          keywords = line
            .replace(/keywords:/i, '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k)
        }
      }

      // Validate response quality - if parsing failed or response is poor, throw error to retry
      if (!title || title.includes('Generated title for')) {
        throw new Error('Failed to generate proper title from API response')
      }
      if (keywords.length < 10) { // Expect at least 10 keywords for quality
        throw new Error('Generated keywords are insufficient - likely poor API response')
      }

      return {
        filename,
        title,
        keywords
      }

    } catch (error) {
      console.error(`Error generating metadata for ${filename} with API key ${apiKeyInfo.name}:`, error)

      // Always throw the error - let the outer retry logic handle it
      // This ensures we don't fall back to generated metadata too early
      throw error
    }
  }, [apiKeys, dispatch])

  const generateMetadata = useCallback(async (
    input: ImageInput[],
    onMetadataGenerated?: (result: MetadataResult) => void
  ): Promise<MetadataResult[]> => {
    const validApiKeys = apiKeys.filter(key => key.isValid)

    if (validApiKeys.length === 0) {
      // Fallback to legacy single API key if no valid multiple keys
      if (!apiKey || !isApiKeyValid) {
        throw new Error('No valid API keys available. Please add and validate API keys in Settings.')
      }

      // Use legacy single key processing
      const legacyKey: ApiKeyInfo = {
        id: 'legacy',
        key: apiKey,
        isValid: isApiKeyValid,
        isValidating: false,
        validationError: null,
        requestCount: 0,
        lastRequestTime: Date.now(),
        name: 'Legacy API Key'
      }
      validApiKeys.push(legacyKey)
    }

    setIsLoading(true)
    setError(null)
    stopRequestedRef.current = false // Reset stop flag for new generation

    // Initialize processing progress
    const initialProgress: ProcessingProgress = {
      total: input.length,
      completed: 0,
      currentFilename: null,
      currentApiKeyId: null,
      processingStats: {}
    }

    // Initialize stats for each API key
    validApiKeys.forEach(apiKey => {
      initialProgress.processingStats[apiKey.id] = {
        processed: 0,
        errors: 0,
        lastUsed: 0
      }
    })

    setProcessingProgress(initialProgress)

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController()

    const results: MetadataResult[] = []
    let currentIndex = 0

    try {
      // Process images with controlled concurrency
      const processNextBatch = async (): Promise<void> => {
        // Check if stop was requested
        if (stopRequestedRef.current) {
          console.log('🛑 Stop detected - halting batch processing')
          return
        }

        const batch: Promise<void>[] = []

        // Create batch of up to PARALLEL_LIMIT concurrent requests
        for (let i = 0; i < PARALLEL_LIMIT && currentIndex < input.length; i++) {
          // Check if stop was requested before processing each image
          if (stopRequestedRef.current) {
            console.log('🛑 Stop detected - halting image processing loop')
            break
          }

          const imageIndex = currentIndex++
          const imageInput = input[imageIndex]

          // Get next available API key
          const availableApiKey = rateLimiter.getNextAvailableApiKey(validApiKeys)

          if (!availableApiKey) {
            // Wait until an API key becomes available
            const waitTime = rateLimiter.getWaitTimeUntilNextAvailable(validApiKeys)
            if (waitTime > 0) {
              console.log(`All API keys rate limited. Waiting ${waitTime}ms...`)
              await wait(waitTime)
              // Try again after waiting
              i-- // Retry this slot
              currentIndex-- // Reset index
              continue
            }
          }

          if (availableApiKey) {
            const processPromise = (async () => {
              let retryCount = 0
              let lastError: Error | null = null

              while (retryCount <= MAX_RETRIES) {
                // Check if stop was requested before each retry
                if (stopRequestedRef.current) {
                  console.log(`🛑 Stop detected - halting processing for ${imageInput.filename}`)
                  return
                }

                try {
                  // Get current API key (might change on retry)
                  let currentApiKey = availableApiKey

                  // If this is a retry, try to get a different API key
                  if (retryCount > 0) {
                    const otherApiKeys = validApiKeys.filter(key => key.id !== currentApiKey.id)
                    const nextApiKey = rateLimiter.getNextAvailableApiKey(otherApiKeys)
                    if (nextApiKey) {
                      currentApiKey = nextApiKey
                      console.log(`🔄 Retry ${retryCount} for ${imageInput.filename} with ${nextApiKey.name}`)
                    } else {
                      // If no other API keys available, wait and use the same one
                      console.log(`⏳ Retry ${retryCount} for ${imageInput.filename} - waiting before retry with ${currentApiKey.name}`)
                      await wait(RETRY_DELAY * retryCount)
                    }
                  }

                  // Update progress
                  setProcessingProgress(prev => prev ? {
                    ...prev,
                    currentFilename: imageInput.filename,
                    currentApiKeyId: currentApiKey.id
                  } : null)

                  // Generate metadata
                  const result = await generateMetadataForSingleImage(imageInput, currentApiKey)
                  results[imageIndex] = result

                  // Call the real-time callback immediately when metadata is generated
                  if (onMetadataGenerated) {
                    onMetadataGenerated(result)
                  }

                  // Update success stats
                  setProcessingProgress(prev => {
                    if (!prev) return null

                    const newStats = { ...prev.processingStats }
                    newStats[currentApiKey.id] = {
                      ...newStats[currentApiKey.id],
                      processed: newStats[currentApiKey.id].processed + 1,
                      lastUsed: Date.now()
                    }

                    return {
                      ...prev,
                      completed: prev.completed + 1,
                      processingStats: newStats
                    }
                  })

                  console.log(`✅ Successfully generated metadata for ${imageInput.filename} using ${currentApiKey.name}`)
                  return // Success - exit retry loop

                } catch (error) {
                  lastError = error instanceof Error ? error : new Error(String(error))
                  retryCount++

                  console.error(`❌ Attempt ${retryCount} failed for ${imageInput.filename}:`, lastError.message)

                  // Update error stats only for the API key that actually failed
                  setProcessingProgress(prev => {
                    if (!prev) return null

                    const newStats = { ...prev.processingStats }
                    if (newStats[availableApiKey.id]) {
                      newStats[availableApiKey.id] = {
                        ...newStats[availableApiKey.id],
                        errors: newStats[availableApiKey.id].errors + 1
                      }
                    }

                    return {
                      ...prev,
                      processingStats: newStats
                    }
                  })

                  // If we've exhausted all retries, only then use fallback
                  if (retryCount > MAX_RETRIES) {
                    console.warn(`⚠️ All retries exhausted for ${imageInput.filename}, using fallback`)
                    results[imageIndex] = {
                      filename: imageInput.filename,
                      title: `Generated title for ${imageInput.filename}`,
                      keywords: ['image', 'photo', 'picture', 'metadata', 'generated']
                    }

                    // Update completed count for fallback
                    setProcessingProgress(prev => prev ? {
                      ...prev,
                      completed: prev.completed + 1
                    } : null)

                    return
                  }

                  // Wait before next retry (progressive backoff)
                  if (retryCount <= MAX_RETRIES) {
                    const waitTime = RETRY_DELAY * Math.pow(2, retryCount - 1) // Exponential backoff
                    console.log(`⏳ Waiting ${waitTime}ms before retry ${retryCount}`)
                    await wait(waitTime)
                  }
                }
              }
            })()

            batch.push(processPromise)
          }
        }

        // Wait for current batch to complete
        if (batch.length > 0) {
          await Promise.all(batch)
        }

        // Continue with next batch if there are more images
        if (currentIndex < input.length) {
          await processNextBatch()
        }
      }

      // Start processing
      await processNextBatch()

      // Final progress update
      setProcessingProgress(prev => prev ? {
        ...prev,
        currentFilename: null,
        currentApiKeyId: null
      } : null)

      setIsLoading(false)
      return results.filter(result => result) // Filter out any undefined results

    } catch (error) {
      // Don't log error if it was a stop request
      if (!stopRequestedRef.current) {
        console.error('Error in generateMetadata:', error)
        setIsLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to generate metadata')
      }

      if (!stopRequestedRef.current) {
        throw error
      }

      // Return empty array if stopped
      return []
    } finally {
      // Clean up
      abortControllerRef.current = null
      // Keep progress for a moment to show completion, then clear
      setTimeout(() => setProcessingProgress(null), 2000)
    }
  }, [apiKeys, apiKey, isApiKeyValid, generateMetadataForSingleImage])

  // API key management functions
  const handleAddApiKey = useCallback((key: string, name?: string) => {
    dispatch(addApiKey({ key, name }))
  }, [dispatch])

  const handleRemoveApiKey = useCallback((id: string) => {
    rateLimiter.resetApiKeyLimits(id)
    dispatch(removeApiKey(id))
  }, [dispatch])

  const handleValidateApiKey = useCallback(async (id: string, key: string) => {
    await dispatch(validateMultipleApiKey({ id, key }))
  }, [dispatch])

  // Stop generation function
  const stopGeneration = useCallback(() => {
    console.log('🛑 Stop requested - halting metadata generation')
    stopRequestedRef.current = true

    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Reset loading state
    setIsLoading(false)
    setError('Generation stopped by user')

    // Clear processing progress after a brief delay to show the stop
    setTimeout(() => {
      setProcessingProgress(null)
      setError(null)
    }, 1000)
  }, [])

  // Statistics function
  const getApiKeyStats = useCallback(() => {
    const totalKeys = apiKeys.length
    const validKeys = apiKeys.filter(key => key.isValid).length
    const totalRequests = apiKeys.reduce((sum, key) => sum + key.requestCount, 0)

    // Calculate requests per minute based on recent activity
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRequests = apiKeys
      .filter(key => key.lastRequestTime > oneMinuteAgo)
      .reduce((sum, key) => sum + key.requestCount, 0)

    return {
      totalKeys,
      validKeys,
      totalRequests,
      requestsPerMinute: recentRequests
    }
  }, [apiKeys])

  const contextValue: GeminiContextType = {
    // Legacy support
    apiKey,
    isApiKeyValid,

    // Multiple API keys
    apiKeys,
    isValidatingAny,

    // Enhanced metadata generation
    generateMetadata,
    stopGeneration,

    // Processing state
    isLoading,
    error,
    processingProgress,

    // Rate limiting
    rateLimitInfo: rateLimiter.getAllRateLimitInfo(),

    // API key management
    addApiKey: handleAddApiKey,
    removeApiKey: handleRemoveApiKey,
    validateApiKey: handleValidateApiKey,

    // Statistics
    getApiKeyStats
  }

  return (
    <GeminiContext.Provider value={contextValue}>
      {children}
    </GeminiContext.Provider>
  )
}
