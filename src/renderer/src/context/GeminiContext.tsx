import { useCallback, ReactNode, useState, useRef } from 'react'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { GeminiContext } from './GeminiContext.context'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  ProcessingProgress,
  MetadataResult,
  ImageInput,
  GeminiContextType,
  PromptGenerationRequest,
  PromptGenerationResult
} from './GeminiContext.types'
import {
  addApiKey,
  removeApiKey,
  validateMultipleApiKey,
  incrementApiKeyUsage,
  ApiKeyInfo
} from '../store/slices/settingsSlice'
// Rate limiting imports removed since logic was reverted
// Image compression utilities removed - not needed for batch processing
import { OpenAIMetadataService } from '../services/OpenAIMetadataService'
import { rateLimiter } from '../utils/rateLimiter'

// Retry configuration - More aggressive retries, no fallback metadata
const MAX_RETRIES = 10 // Increased to 10 for more persistent retries
const RETRY_DELAY = 300 // Reduced to 300ms for faster retries
// Conservative parallel limit to avoid rate limiting
// Note: getOptimalParallelLimit function removed as it was unused

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Performance optimization for low-end devices
const isLowEndDevice = () => {
  // Detect low-end devices based on available memory and CPU cores
  const memory = (navigator as any).deviceMemory || 4 // Default to 4GB if not available
  const cores = navigator.hardwareConcurrency || 4 // Default to 4 cores if not available
  return memory <= 4 || cores <= 2
}

// Adaptive batch size based on device capabilities
const getOptimalBatchSize = () => {
  if (isLowEndDevice()) {
    return 2 // Smaller batches for low-end devices
  }
  return 6 // Standard batch size for capable devices
}

// Adaptive delay for UI responsiveness
const getProcessingDelay = () => {
  if (isLowEndDevice()) {
    return 2000 + Math.random() * 1000 // 2-3 second delay for low-end devices
  }
  return 1000 + Math.random() * 1000 // 1-2 second delay for capable devices
}

// Exponential backoff for rate limit handling
const getExponentialBackoffDelay = (retryCount: number, baseDelay: number = 1000) => {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount)
  const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd
  return Math.min(exponentialDelay + jitter, 30000) // Cap at 30 seconds
}

// Check if error is rate limit related
const isRateLimitError = (error: any) => {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorStatus = error?.status || error?.code
  return errorStatus === 429 || 
         errorMessage.includes('rate limit') || 
         errorMessage.includes('quota') || 
         errorMessage.includes('too many requests')
}

export function GeminiProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const {
    apiKey,
    isApiKeyValid,
    apiKeys,
    isValidatingAny,
    openaiApiKey,
    isOpenaiApiKeyValid,
    openaiSelectedModel,
    metadataProvider
  } = useAppSelector(state => state.settings)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  // Use ref to track abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const stopRequestedRef = useRef<boolean>(false)

  const generateMetadataForBatch = useCallback(async (
    batch: ImageInput[],
    apiKeyInfo: ApiKeyInfo,
    settings?: {
      titleWords: number;
      titleMinWords?: number;
      titleMaxWords?: number;
      keywordsCount: number;
      keywordsMinCount?: number;
      keywordsMaxCount?: number;
      descriptionWords: number;
      descriptionMinWords?: number;
      descriptionMaxWords?: number;
      keywordSettings?: {
        singleWord: boolean;
        doubleWord: boolean;
        mixed: boolean;
      }
      customization?: {
        customPrompt: boolean;
        customPromptText: string;
        prohibitedWords: boolean;
        prohibitedWordsList: string;
        transparentBackground: boolean;
        silhouette: boolean;
      }
      titleCustomization?: {
        titleStyle: string;
        customPrefix: boolean;
        prefixText: string;
        customPostfix: boolean;
        postfixText: string;
      }
    }
  ): Promise<MetadataResult[]> => {
    const genAI = new GoogleGenerativeAI(apiKeyInfo.key)
    const modelName = 'gemini-2.0-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    // Create batch prompt for multiple images
    const batchPrompt = `Generate metadata for ${batch.length} images. For each image, provide:
- Title: ${settings?.titleWords || 8} words
- Description: ${settings?.descriptionWords || 25} words  
- Keywords: ${settings?.keywordsCount || 15} relevant keywords

Format your response as:
IMAGE 1:
Title: [title]
Description: [description]
Keywords: [keyword1, keyword2, ...]

IMAGE 2:
Title: [title]
Description: [description]
Keywords: [keyword1, keyword2, ...]

(Continue for all images)`

    // Prepare content with all images
    const content: (string | Part)[] = [batchPrompt]
    
    for (const imageInput of batch) {
      const { filename, imageData } = imageInput
      let processedImageData = imageData
      
      // Process image data similar to single image processing
      if (!processedImageData || !processedImageData.includes('data:image/')) {
        throw new Error(`Invalid image data format for ${filename}`)
      }
      
      const dataParts = processedImageData.split(',')
      if (dataParts.length !== 2 || !dataParts[1]) {
        throw new Error(`Malformed base64 image data for ${filename}`)
      }
      
      const headerPart = dataParts[0].toLowerCase()
      let mimeType = 'image/png'
      
      if (headerPart.includes('image/jpeg') || headerPart.includes('image/jpg')) {
        mimeType = 'image/jpeg'
      } else if (headerPart.includes('image/webp')) {
        mimeType = 'image/webp'
      }
      
      content.push({
        inlineData: {
          mimeType: mimeType,
          data: dataParts[1]
        }
      })
    }

    // Add adaptive delay and rate limiting
     const delayMs = getProcessingDelay()
     console.log(`⏳ Waiting ${delayMs.toFixed(0)}ms before batch API request for ${batch.length} images (${isLowEndDevice() ? 'low-end optimized' : 'standard'})`)
     await wait(delayMs)
     
     // Additional yield for low-end devices to prevent UI blocking
     if (isLowEndDevice()) {
       await new Promise(resolve => setTimeout(resolve, 0))
     }

    const canMakeRequest = rateLimiter.canMakeRequest(apiKeyInfo.id)
    console.log(`🔍 Rate limiter check for ${apiKeyInfo.name}: ${canMakeRequest ? 'ALLOWED' : 'BLOCKED'}`)
    if (!canMakeRequest) {
      throw new Error('Rate limit exceeded - waiting for next available slot')
    }

    rateLimiter.recordRequest(apiKeyInfo.id)

    console.log(`🚀 Making batch API request for ${batch.length} images with key: ${apiKeyInfo.name}`)
    const result = await model.generateContent(content)
    const response = result.response
    const text = response.text()

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API')
    }

    // Parse batch response
    const results: MetadataResult[] = []
    const imageBlocks = text.split(/IMAGE \d+:/i).filter(block => block.trim())
    
    for (let i = 0; i < batch.length; i++) {
      const imageInput = batch[i]
      const blockText = imageBlocks[i] || ''
      
      const lines = blockText.split('\n').filter(line => line.trim())
      let title = ''
      let description = ''
      let keywords: string[] = []

      for (const line of lines) {
        if (line.toLowerCase().includes('title:')) {
          title = line.replace(/title:/i, '').trim()
        } else if (line.toLowerCase().includes('description:')) {
          description = line.replace(/description:/i, '').trim()
        } else if (line.toLowerCase().includes('keywords:')) {
          keywords = line
            .replace(/keywords:/i, '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k)
        }
      }

      // Fallback if parsing failed
      if (!title && !description && keywords.length === 0) {
        title = `Image ${i + 1}`
        description = `Generated description for ${imageInput.filename}`
        keywords = ['image', 'generated', 'content']
      }

      results.push({
           title: title || `Generated title for ${imageInput.filename}`,
           description: description || `Generated description for ${imageInput.filename}`,
           keywords: keywords.length > 0 ? keywords : ['image', 'generated'],
           filename: imageInput.filename
         })
    }

    return results
  }, [apiKeys, dispatch])

  // generateMetadataForSingleImage function removed - now using batch processing only



  const generateMetadataWithOpenAI = useCallback(async (
    input: ImageInput[],
    onMetadataGenerated?: (result: MetadataResult) => void,
    settings?: {
      titleWords: number;
      titleMinWords?: number;
      titleMaxWords?: number;
      keywordsCount: number;
      keywordsMinCount?: number;
      keywordsMaxCount?: number;
      descriptionWords: number;
      descriptionMinWords?: number;
      descriptionMaxWords?: number;
      keywordSettings?: {
        singleWord: boolean;
        doubleWord: boolean;
        mixed: boolean;
      }
      customization?: {
        customPrompt: boolean;
        customPromptText: string;
        prohibitedWords: boolean;
        prohibitedWordsList: string;
        transparentBackground: boolean;
        silhouette: boolean;
      }
      titleCustomization?: {
        titleStyle: string;
        customPrefix: boolean;
        prefixText: string;
        customPostfix: boolean;
        postfixText: string;
      }
    }
  ): Promise<MetadataResult[]> => {
    if (!openaiApiKey || !isOpenaiApiKeyValid) {
      throw new Error('OpenAI API key is not valid. Please check your API key in Settings.')
    }

    setIsLoading(true)
    setError(null)
    setGenerationStartTime(null) // Will be set when first metadata is generated
    stopRequestedRef.current = false

    const results: MetadataResult[] = []
    const openaiService = new OpenAIMetadataService(openaiApiKey, openaiSelectedModel)

    // Initialize processing progress
    const initialProgress: ProcessingProgress = {
      total: input.length,
      completed: 0,
      currentFilename: null,
      currentApiKeyId: 'openai',
      processingStats: {
        'openai': {
          processed: 0,
          errors: 0,
          lastUsed: Date.now()
        }
      }
    }

    setProcessingProgress(initialProgress)

    try {
      console.log(`🚀 Starting OpenAI metadata generation for ${input.length} images`)

      for (let i = 0; i < input.length; i++) {
        if (stopRequestedRef.current) {
          console.log('🛑 Generation stopped by user')
          break
        }

        const imageInput = input[i]

        // Update progress
        setProcessingProgress(prev => prev ? {
          ...prev,
          currentFilename: imageInput.filename,
          currentApiKeyId: 'openai'
        } : null)

        try {
          const result = await openaiService.generateMetadataForSingleImage(imageInput, settings)
          results.push(result)

          // Start timer on first successful metadata generation
          setGenerationStartTime(prev => {
            if (prev === null) {
              console.log('⏱️ Starting timer - first metadata generated (OpenAI)')
              return Date.now()
            }
            return prev
          })

          // Update progress
          setProcessingProgress(prev => prev ? {
            ...prev,
            completed: prev.completed + 1,
            processingStats: {
              ...prev.processingStats,
              'openai': {
                ...prev.processingStats['openai'],
                processed: prev.processingStats['openai'].processed + 1,
                lastUsed: Date.now()
              }
            }
          } : null)

          // Call the callback if provided
          if (onMetadataGenerated) {
            onMetadataGenerated(result)
          }

        } catch (error) {
          console.error(`❌ OpenAI generation failed for ${imageInput.filename}:`, error)

          const failedResult: MetadataResult = {
            filename: imageInput.filename,
            title: '',
            description: '',
            keywords: [],
            failed: true
          }

          results.push(failedResult)

          // Update error stats
          setProcessingProgress(prev => prev ? {
            ...prev,
            completed: prev.completed + 1,
            processingStats: {
              ...prev.processingStats,
              'openai': {
                ...prev.processingStats['openai'],
                errors: prev.processingStats['openai'].errors + 1,
                lastUsed: Date.now()
              }
            }
          } : null)

          if (onMetadataGenerated) {
            onMetadataGenerated(failedResult)
          }
        }
      }

      console.log(`✅ OpenAI metadata generation completed. ${results.filter(r => !r.failed).length}/${results.length} successful`)

      setIsLoading(false)
      setError(null)

      return results

    } catch (error) {
      console.error('❌ OpenAI metadata generation error:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : 'Failed to generate metadata with OpenAI')
      throw error
    } finally {
      // Clear progress after a delay
      setTimeout(() => setProcessingProgress(null), 2000)
    }
  }, [openaiApiKey, isOpenaiApiKeyValid])





  const generateMetadata = useCallback(async (
    input: ImageInput[],
    onMetadataGenerated?: (result: MetadataResult) => void,
    settings?: {
      titleWords: number;
      titleMinWords?: number;
      titleMaxWords?: number;
      keywordsCount: number;
      keywordsMinCount?: number;
      keywordsMaxCount?: number;
      descriptionWords: number;
      descriptionMinWords?: number;
      descriptionMaxWords?: number;
      keywordSettings?: {
        singleWord: boolean;
        doubleWord: boolean;
        mixed: boolean;
      }
      customization?: {
        customPrompt: boolean;
        customPromptText: string;
        prohibitedWords: boolean;
        prohibitedWordsList: string;
        transparentBackground: boolean;
        silhouette: boolean;
      }
      titleCustomization?: {
        titleStyle: string;
        customPrefix: boolean;
        prefixText: string;
        customPostfix: boolean;
        postfixText: string;
      }
    }
  ): Promise<MetadataResult[]> => {
    // Check which provider to use
    if (metadataProvider === 'openai') {
      return generateMetadataWithOpenAI(input, onMetadataGenerated, settings)
    }

    // Default to Gemini (existing logic)
    const validApiKeys = apiKeys.filter(key => key.isValid)
    console.log(`🔍 Found ${validApiKeys.length} valid API keys out of ${apiKeys.length} total keys`)
    console.log('Valid API keys:', validApiKeys.map(k => ({ name: k.name, id: k.id, isValid: k.isValid })))
    
    // Reset rate limiter to clear any stuck states
    rateLimiter.resetRoundRobin()
    console.log('🔄 Rate limiter reset completed')

    if (validApiKeys.length === 0) {
      // Fallback to legacy single API key if no valid multiple keys
      if (!apiKey || !isApiKeyValid) {
        throw new Error('No valid API keys available. Please add and validate API keys in Settings.')
      }

      // Use legacy single key processing
      const legacyKey: ApiKeyInfo = {
        id: 'legacy',
        key: apiKey,
        name: 'Legacy API Key',
        isValid: true,
        isValidating: false,
        validationError: null,
        requestCount: 0,
        lastRequestTime: 0
      }
      validApiKeys.push(legacyKey)
    }

    setIsLoading(true)
    setError(null)
    setGenerationStartTime(null) // Will be set when first metadata is generated
    stopRequestedRef.current = false // Reset stop flag for new generation

    // Initialize processing progress with stats for each API key
    const initialProgress: ProcessingProgress = {
      total: input.length,
      completed: 0,
      currentFilename: null,
      currentApiKeyId: null,
      processingStats: {}
    }

    validApiKeys.forEach(apiKey => {
      initialProgress.processingStats[apiKey.id] = {
        processed: 0,
        errors: 0,
        lastUsed: 0
      }
    })

    console.log(`🚀 Starting parallel metadata generation with ${validApiKeys.length} API keys:`, validApiKeys.map(k => k.name))
    console.log(`📊 Processing ${input.length} images total`)
    console.log('🎯 Current metadata provider:', metadataProvider)
    
    // Use parallel processing with all available API keys
    const BATCH_SIZE = getOptimalBatchSize() // Adaptive batch size based on device capabilities
    const MAX_PARALLEL_BATCHES = isLowEndDevice() ? Math.min(validApiKeys.length, 2) : validApiKeys.length // Limit concurrent batches on low-end devices
    
    console.log(`⚡ Using adaptive batch processing: ${MAX_PARALLEL_BATCHES} concurrent batches of ${BATCH_SIZE} images each`)
    console.log(`🖥️ Device capabilities: ${isLowEndDevice() ? 'Low-end (optimized)' : 'High-end (standard)'}`)
    console.log(`💾 Memory: ${(navigator as any).deviceMemory || 'unknown'}GB, CPU cores: ${navigator.hardwareConcurrency || 'unknown'}`)

    setProcessingProgress(initialProgress)

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController()

    const results: MetadataResult[] = new Array(input.length).fill(null)
    
    try {
      // Create batches of images
      const imageBatches: ImageInput[][] = []
      for (let i = 0; i < input.length; i += BATCH_SIZE) {
        imageBatches.push(input.slice(i, i + BATCH_SIZE))
      }
      
      console.log(`📦 Created ${imageBatches.length} batches for processing`)
      
      // Process all batches in parallel using all available API keys
      const batchPromises: Promise<void>[] = []
      
      for (let batchIndex = 0; batchIndex < imageBatches.length; batchIndex++) {
        const batch = imageBatches[batchIndex]
        const apiKey = validApiKeys[batchIndex % validApiKeys.length] // Round-robin API key assignment
        
        const processBatchWithRetry = async (): Promise<void> => {
          if (stopRequestedRef.current) return
          
          console.log(`📸 Processing batch ${batchIndex + 1}/${imageBatches.length} with ${batch.length} images using ${apiKey.name}`)
          
          // Update progress
          setProcessingProgress(prev => prev ? {
            ...prev,
            currentFilename: `Batch ${batchIndex + 1} (${batch.length} images)`,
            currentApiKeyId: apiKey.id
          } : null)
          
          let retryCount = 0
          
          while (retryCount <= MAX_RETRIES) {
            if (stopRequestedRef.current) return
            
            try {
              console.log(`🔄 Batch ${batchIndex + 1} attempt ${retryCount + 1} with ${apiKey.name}`)
              
              const batchResults = await generateMetadataForBatch(batch, apiKey, settings)
              
              // Store results
               batch.forEach((_, localIndex) => {
                 const globalIndex = batchIndex * BATCH_SIZE + localIndex
                 if (globalIndex < input.length) {
                   results[globalIndex] = batchResults[localIndex]
                   
                   // Call real-time callback
                   if (onMetadataGenerated) {
                     onMetadataGenerated(batchResults[localIndex])
                   }
                 }
               })
              
              // Start timer on first successful metadata generation
              setGenerationStartTime(prev => {
                if (prev === null) {
                  console.log('⏱️ Starting timer - first batch processed')
                  return Date.now()
                }
                return prev
              })
              
              // Update success stats for the entire batch with throttling for low-end devices
              const shouldUpdateProgress = !isLowEndDevice() || (Date.now() - (window as any).lastProgressUpdate || 0) > 1000
              if (shouldUpdateProgress) {
                (window as any).lastProgressUpdate = Date.now()
                
                setProcessingProgress(prev => {
                  if (!prev) return null
                  
                  const newStats = { ...prev.processingStats }
                  newStats[apiKey.id] = {
                    ...newStats[apiKey.id],
                    processed: newStats[apiKey.id].processed + batch.length,
                    lastUsed: Date.now()
                  }
                  
                  return {
                    ...prev,
                    completed: prev.completed + batch.length,
                    processingStats: newStats
                  }
                })
              }
              
              // Force garbage collection on low-end devices
              if (isLowEndDevice() && (window as any).gc) {
                (window as any).gc()
              }
              
              console.log(`✅ SUCCESS: Batch ${batchIndex + 1} (${batch.length} images) processed with ${apiKey.name}`)
              return // Success - exit retry loop
              
            } catch (error) {
              retryCount++
              console.error(`❌ Batch ${batchIndex + 1} attempt ${retryCount} failed with ${apiKey.name}:`, error)
              
              // Update error stats
              setProcessingProgress(prev => {
                if (!prev) return null
                
                const newStats = { ...prev.processingStats }
                newStats[apiKey.id] = {
                  ...newStats[apiKey.id],
                  errors: newStats[apiKey.id].errors + 1
                }
                
                return {
                  ...prev,
                  processingStats: newStats
                }
              })
              
              if (retryCount <= MAX_RETRIES) {
                let waitTime: number
                
                if (isRateLimitError(error)) {
                  // Use exponential backoff for rate limit errors
                  waitTime = getExponentialBackoffDelay(retryCount - 1)
                  console.log(`⏳ Rate limit detected - waiting ${waitTime.toFixed(0)}ms before batch retry ${retryCount} (exponential backoff)`)
                } else {
                  // Use standard delay for other errors
                  waitTime = RETRY_DELAY * retryCount
                  console.log(`⏳ Waiting ${waitTime}ms before batch retry ${retryCount}`)
                }
                
                await wait(waitTime)
              }
            }
          }
          
          console.error(`❌ CRITICAL: All retries exhausted for batch ${batchIndex + 1} with ${apiKey.name}`)
          
          // Try with other API keys if this one failed completely
          for (let fallbackKeyIndex = 0; fallbackKeyIndex < validApiKeys.length; fallbackKeyIndex++) {
            const fallbackKey = validApiKeys[fallbackKeyIndex]
            if (fallbackKey.id === apiKey.id) continue // Skip the already failed key
            
            console.log(`🔄 Trying batch ${batchIndex + 1} with fallback API key: ${fallbackKey.name}`)
            
            try {
              const fallbackResults = await generateMetadataForBatch(batch, fallbackKey, settings)
              
              // Store results from fallback key
              batch.forEach((_, localIndex) => {
                const globalIndex = batchIndex * BATCH_SIZE + localIndex
                if (globalIndex < input.length) {
                  results[globalIndex] = fallbackResults[localIndex]
                  
                  // Call real-time callback
                  if (onMetadataGenerated) {
                    onMetadataGenerated(fallbackResults[localIndex])
                  }
                }
              })
              
              // Update success stats for fallback key
              setProcessingProgress(prev => {
                if (!prev) return null
                
                const newStats = { ...prev.processingStats }
                newStats[fallbackKey.id] = {
                  ...newStats[fallbackKey.id],
                  processed: newStats[fallbackKey.id].processed + batch.length,
                  lastUsed: Date.now()
                }
                
                return {
                  ...prev,
                  completed: prev.completed + batch.length,
                  processingStats: newStats
                }
              })
              
              console.log(`✅ FALLBACK SUCCESS: Batch ${batchIndex + 1} processed with ${fallbackKey.name}`)
              return // Success with fallback key
              
            } catch (fallbackError) {
               console.error(`❌ Fallback failed for batch ${batchIndex + 1} with ${fallbackKey.name}:`, fallbackError)
               
               // Add delay for rate limit errors even in fallback
               if (isRateLimitError(fallbackError)) {
                 const backoffDelay = getExponentialBackoffDelay(fallbackKeyIndex)
                 console.log(`⏳ Rate limit in fallback - waiting ${backoffDelay.toFixed(0)}ms before next fallback key`)
                 await wait(backoffDelay)
               }
             }
          }
          
          console.error(`❌ FINAL FAILURE: Batch ${batchIndex + 1} failed with all ${validApiKeys.length} API keys`)
        }
        
        batchPromises.push(processBatchWithRetry())
        
        // Adaptive delay between batch starts to avoid overwhelming the API and maintain UI responsiveness
         if (batchIndex < imageBatches.length - 1) {
           const delay = isLowEndDevice() ? 1000 : 500 // Longer delay for low-end devices
           await wait(delay)
           
           // Yield to main thread for UI updates on low-end devices
           if (isLowEndDevice() && batchIndex % 2 === 0) {
             await new Promise(resolve => setTimeout(resolve, 0)) // Yield to event loop
           }
         }
      }
      
      // Wait for all batches to complete
      await Promise.all(batchPromises)
      
      console.log(`🎉 All batch processing completed - ${imageBatches.length} batches processed`)
       
       // Check for any failed images and retry them individually with all API keys
       const failedIndices: number[] = []
       for (let i = 0; i < results.length; i++) {
         if (!results[i]) {
           failedIndices.push(i)
         }
       }
       
       if (failedIndices.length > 0) {
         console.log(`🔄 Found ${failedIndices.length} failed images, retrying individually with all API keys`)
         
         for (const failedIndex of failedIndices) {
            const imageInput = input[failedIndex]
            console.log(`🔄 Retrying individual image: ${imageInput.filename}`)
            
            // Yield to main thread before processing each failed image on low-end devices
            if (isLowEndDevice()) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            // Try each API key for this individual image
            for (const retryApiKey of validApiKeys) {
              try {
                console.log(`🔄 Individual retry for ${imageInput.filename} with ${retryApiKey.name}`)
                
                // Create single-image batch
                const singleImageBatch = [imageInput]
                const singleResults = await generateMetadataForBatch(singleImageBatch, retryApiKey, settings)
               
               if (singleResults && singleResults[0]) {
                 results[failedIndex] = singleResults[0]
                 
                 // Call real-time callback
                 if (onMetadataGenerated) {
                   onMetadataGenerated(singleResults[0])
                 }
                 
                 // Update progress
                 setProcessingProgress(prev => {
                   if (!prev) return null
                   
                   const newStats = { ...prev.processingStats }
                   newStats[retryApiKey.id] = {
                     ...newStats[retryApiKey.id],
                     processed: newStats[retryApiKey.id].processed + 1,
                     lastUsed: Date.now()
                   }
                   
                   return {
                     ...prev,
                     completed: prev.completed + 1,
                     processingStats: newStats
                   }
                 })
                 
                 console.log(`✅ Individual retry SUCCESS: ${imageInput.filename} with ${retryApiKey.name}`)
                 break // Success - move to next failed image
               }
             } catch (retryError) {
                 console.error(`❌ Individual retry failed for ${imageInput.filename} with ${retryApiKey.name}:`, retryError)
                 
                 // Add exponential backoff for rate limit errors in individual retries
                 if (isRateLimitError(retryError)) {
                   const backoffDelay = getExponentialBackoffDelay(validApiKeys.indexOf(retryApiKey))
                   console.log(`⏳ Rate limit in individual retry - waiting ${backoffDelay.toFixed(0)}ms before next API key`)
                   await wait(backoffDelay)
                 }
               }
           }
           
           // If still failed after all API keys, create a fallback result
           if (!results[failedIndex]) {
             console.log(`⚠️ Creating fallback metadata for ${imageInput.filename}`)
             results[failedIndex] = {
               title: `Generated title for ${imageInput.filename}`,
               description: `Generated description for ${imageInput.filename}`,
               keywords: ['image', 'generated', 'fallback'],
               filename: imageInput.filename,
               failed: true
             }
             
             if (onMetadataGenerated) {
               onMetadataGenerated(results[failedIndex])
             }
           }
         }
       }

      // Final progress update
      setProcessingProgress(prev => {
        if (!prev) return null

        // Log final statistics for each API key
        const totalTime = generationStartTime ? Date.now() - generationStartTime : 0
        const totalTimeFormatted = totalTime > 0 ? `${(totalTime / 1000).toFixed(1)}s` : '0s'

        console.log('📈 Final API Key Usage Statistics:')
        console.log(`⏱️ Total generation time: ${totalTimeFormatted}`)
        Object.entries(prev.processingStats).forEach(([keyId, stats]) => {
          const apiKeyName = validApiKeys.find(k => k.id === keyId)?.name || keyId
          console.log(`  ${apiKeyName}: ${stats.processed} processed, ${stats.errors} errors`)
        })

        return {
          ...prev,
          completed: input.length // Mark all as completed
        }
      })

      setIsLoading(false)
      setGenerationStartTime(null) // Clear timer
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
  }, [apiKeys, apiKey, isApiKeyValid, generateMetadataForBatch, metadataProvider, generateMetadataWithOpenAI])

  // API key management functions
  const handleAddApiKey = useCallback((key: string, name?: string) => {
    dispatch(addApiKey({ key, name }))
  }, [dispatch])

  const handleRemoveApiKey = useCallback((id: string) => {
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

  // Prompt generation function
  const generatePrompts = useCallback(async (request: PromptGenerationRequest): Promise<PromptGenerationResult> => {
    const validApiKeys = apiKeys.filter(key => key.isValid)

    if (validApiKeys.length === 0) {
      // Fallback to legacy single API key if no valid multiple keys
      if (!apiKey || !isApiKeyValid) {
        return {
          prompts: [],
          platform: request.platform,
          style: request.style,
          promptType: request.promptType,
          success: false,
          error: 'No valid API keys available. Please add and validate API keys in Settings.'
        }
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      // Use the first available valid API key
      const apiKeyToUse = validApiKeys.length > 0 ? validApiKeys[0] : {
        id: 'legacy',
        key: apiKey,
        isValid: isApiKeyValid,
        name: 'Legacy API Key'
      } as ApiKeyInfo

      const genAI = new GoogleGenerativeAI(apiKeyToUse.key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Create platform-specific prompt templates
      const platformPrompts = {
        'midjourney': {
          image: `Create ${request.count} detailed Midjourney prompts for generating images. Each prompt should be optimized for Midjourney's AI and include specific style parameters, aspect ratios, and quality settings.`,
          video: `Create ${request.count} detailed Midjourney prompts for generating video content. Include camera movements, lighting, and cinematic elements.`
        },
        'recraft': {
          image: `Create ${request.count} detailed Recraft AI prompts for generating images. Focus on precise style descriptions, color palettes, and artistic techniques that work well with Recraft.`,
          video: `Create ${request.count} detailed Recraft AI prompts for generating video content. Include animation style, transitions, and visual effects.`
        },
        'ideogram': {
          image: `Create ${request.count} detailed Ideogram prompts for generating images. Include specific art styles, composition details, and visual elements that work well with Ideogram.`,
          video: `Create ${request.count} detailed Ideogram prompts for generating video content. Focus on motion, timing, and visual storytelling elements.`
        },
        'dalle': {
          image: `Create ${request.count} detailed DALL-E prompts for generating images. Use clear, descriptive language that works well with DALL-E's image generation capabilities.`,
          video: `Create ${request.count} detailed prompts for video generation. Include scene descriptions, movement, and visual composition.`
        },
        'leonardo': {
          image: `Create ${request.count} detailed Leonardo AI prompts for generating images. Include artistic styles, lighting, and composition details optimized for Leonardo.`,
          video: `Create ${request.count} detailed Leonardo AI prompts for generating video content. Focus on cinematic quality and visual storytelling.`
        },
        'stable-diffusion': {
          image: `Create ${request.count} detailed Stable Diffusion prompts for generating images. Include specific style tags, quality modifiers, and technical parameters.`,
          video: `Create ${request.count} detailed prompts for video generation using Stable Diffusion. Include motion descriptions and temporal consistency elements.`
        }
      }

      // Build the main prompt
      const platformTemplate = platformPrompts[request.platform]?.[request.promptType] ||
        `Create ${request.count} detailed AI prompts for generating ${request.promptType} content.`

      let mainPrompt = `${platformTemplate}

Base concept: "${request.input}"
Style preference: ${request.style}
Platform: ${request.platform}

Requirements:
- Each prompt should be unique and creative
- Include specific style, mood, and technical details
- Optimize for ${request.platform} platform capabilities
- Make prompts detailed enough to generate high-quality results
- Return exactly ${request.count} prompts
- Number each prompt (1., 2., 3., etc.)
- Focus on ${request.style} style elements

`

      // Add image analysis for image-to-prompt
      if (request.inputType === 'image' && request.imageData) {
        mainPrompt += `\nAnalyze the provided image and create prompts that would generate similar ${request.promptType} content with the specified style variations.`
      }

      const content: (string | { inlineData: { mimeType: string; data: string } })[] = [mainPrompt]

      // Add image data if provided
      if (request.inputType === 'image' && request.imageData) {
        content.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: request.imageData.split(',')[1]
          }
        })
      }

      // Rate limiting removed

      console.log(`🚀 Making prompt generation API request with key: ${apiKeyToUse.name}`)
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      // Parse the response to extract numbered prompts
      const lines = text.split('\n').filter(line => line.trim())
      const prompts: string[] = []

      for (const line of lines) {
        // Look for numbered prompts (1., 2., 3., etc.)
        const match = line.match(/^\d+\.\s*(.+)/)
        if (match) {
          prompts.push(match[1].trim())
        }
      }

      // If numbered parsing failed, try to split by lines and clean up
      if (prompts.length === 0) {
        const cleanedLines = lines
          .filter(line => line.length > 20) // Filter out short lines
          .slice(0, request.count) // Take only requested count
        prompts.push(...cleanedLines)
      }

      // Record API usage
      rateLimiter.recordRequest(apiKeyToUse.id)
      if (validApiKeys.length > 0) {
        dispatch(incrementApiKeyUsage(apiKeyToUse.id))
      }

      setIsLoading(false)

      return {
        prompts: prompts.slice(0, request.count), // Ensure we don't exceed requested count
        platform: request.platform,
        style: request.style,
        promptType: request.promptType,
        success: true
      }

    } catch (error) {
      console.error('Error generating prompts:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : 'Failed to generate prompts')

      return {
        prompts: [],
        platform: request.platform,
        style: request.style,
        promptType: request.promptType,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate prompts'
      }
    }
  }, [apiKeys, apiKey, isApiKeyValid, dispatch])

  // Prompt enhancement function
  const enhancePrompt = useCallback(async (originalPrompt: string): Promise<string> => {
    const validApiKeys = apiKeys.filter(key => key.isValid)

    if (validApiKeys.length === 0) {
      // Fallback to legacy single API key if no valid multiple keys
      if (!apiKey || !isApiKeyValid) {
        throw new Error('No valid API keys available. Please add and validate API keys in Settings.')
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      // Use the first available valid API key
      const apiKeyToUse = validApiKeys.length > 0 ? validApiKeys[0] : {
        id: 'legacy',
        key: apiKey,
        isValid: isApiKeyValid,
        name: 'Legacy API Key'
      } as ApiKeyInfo

      const genAI = new GoogleGenerativeAI(apiKeyToUse.key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const enhancementPrompt = `Enhance this image generation prompt to make it more detailed and effective for AI image generation:

Original prompt: "${originalPrompt}"

Please improve it by:
- Adding specific visual details (lighting, composition, style)
- Including quality modifiers (high resolution, detailed, professional)
- Enhancing artistic direction (mood, atmosphere, color palette)
- Adding technical parameters that improve image quality
- Keeping the core concept but making it much more descriptive

Return only the enhanced prompt, nothing else. Make it concise but highly detailed.`

      // Add mandatory delay before API request to avoid rate limiting
      const delayMs = 1000 + Math.random() * 2000 // 1-3 second delay
      console.log(`⏳ Waiting ${delayMs.toFixed(0)}ms before prompt enhancement API request`)
      await wait(delayMs)

      // Double-check rate limiting before making request
      if (!rateLimiter.canMakeRequest(apiKeyToUse.id)) {
        const waitTime = rateLimiter.getWaitTimeUntilNextAvailable([apiKeyToUse])
        if (waitTime > 0) {
          console.log(`🚫 Rate limit check failed, waiting additional ${waitTime}ms`)
          await wait(waitTime)
        }
      }

      console.log(`🚀 Making prompt enhancement API request with key: ${apiKeyToUse.name}`)
      const result = await model.generateContent(enhancementPrompt)
      const response = result.response
      const enhancedText = response.text()

      if (!enhancedText || enhancedText.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      // Record API usage
      rateLimiter.recordRequest(apiKeyToUse.id)
      if (validApiKeys.length > 0) {
        dispatch(incrementApiKeyUsage(apiKeyToUse.id))
      }

      setIsLoading(false)
      return enhancedText.trim()

    } catch (error) {
      console.error('Error enhancing prompt:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : 'Failed to enhance prompt')
      throw error
    }
  }, [apiKeys, apiKey, isApiKeyValid, dispatch])

  // Chat functionality
  const chat = useCallback(async (message: string, images?: string[], conversationHistory?: Array<{ role: 'user' | 'assistant', content: string, images?: string[] }>): Promise<string> => {
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

    try {
      // Get next available API key
      const availableApiKey = rateLimiter.getNextAvailableApiKey(validApiKeys)
      if (!availableApiKey) {
        throw new Error('No API keys available. Please try again later.')
      }

      // Record API usage for rate limiting
      rateLimiter.recordRequest(availableApiKey.id)
      dispatch(incrementApiKeyUsage(availableApiKey.id))

      const genAI = new GoogleGenerativeAI(availableApiKey.key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Build conversation context if history is provided
      let conversationContext = ''
      if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = 'Previous conversation context:\n'

        // Include last 10 messages for context (to avoid token limits)
        const recentHistory = conversationHistory.slice(-10)

        for (const historyItem of recentHistory) {
          if (historyItem.role === 'user') {
            conversationContext += `User: ${historyItem.content}\n`
            if (historyItem.images && historyItem.images.length > 0) {
              conversationContext += `[User uploaded ${historyItem.images.length} image(s)]\n`
            }
          } else {
            conversationContext += `Assistant: ${historyItem.content}\n`
          }
        }
        conversationContext += '\nCurrent message:\n'
      }

      // Prepare content array with conversation context, current message, and images
      const content: (string | Part)[] = []

      // Add conversation context and current message
      const fullMessage = conversationContext ? `${conversationContext}${message}` : message
      content.push(fullMessage)

      // Add images if provided
      if (images && images.length > 0) {
        for (const imageData of images) {
          // Validate image data
          if (!imageData || !imageData.includes(',')) {
            console.warn('Invalid image data provided to chat, skipping')
            continue
          }

          // Extract base64 data and determine MIME type
          const dataParts = imageData.split(',')
          if (dataParts.length !== 2) {
            console.warn('Malformed image data provided to chat, skipping')
            continue
          }

          const headerPart = dataParts[0].toLowerCase()
          let mimeType = 'image/png' // Default

          if (headerPart.includes('image/png')) {
            mimeType = 'image/png'
          } else if (headerPart.includes('image/jpeg') || headerPart.includes('image/jpg')) {
            mimeType = 'image/jpeg'
          } else if (headerPart.includes('image/webp')) {
            mimeType = 'image/webp'
          } else if (headerPart.includes('image/gif')) {
            mimeType = 'image/gif'
          }

          const base64Data = dataParts[1]

          // Validate base64 data
          if (base64Data.length < 100) {
            console.warn('Image data too small, likely corrupted, skipping')
            continue
          }

          // Test if base64 is valid
          try {
            atob(base64Data.substring(0, Math.min(100, base64Data.length)))
          } catch {
            console.warn('Invalid base64 encoding in image, skipping')
            continue
          }

          // Add image to content
          content.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          })

          console.log(`📸 Added image to chat with MIME type: ${mimeType}`)
        }
      }

      // Add mandatory delay before API request to avoid rate limiting
      const delayMs = 1000 + Math.random() * 2000 // 1-3 second delay
      console.log(`⏳ Waiting ${delayMs.toFixed(0)}ms before chat API request`)
      await wait(delayMs)

      // Double-check rate limiting before making request
      const apiKeyToUse = validApiKeys.length > 0 ? validApiKeys[0] : {
        id: 'legacy',
        key: apiKey,
        isValid: isApiKeyValid,
        name: 'Legacy API Key'
      } as ApiKeyInfo

      if (!rateLimiter.canMakeRequest(apiKeyToUse.id)) {
        const waitTime = rateLimiter.getWaitTimeUntilNextAvailable([apiKeyToUse])
        if (waitTime > 0) {
          console.log(`🚫 Rate limit check failed, waiting additional ${waitTime}ms`)
          await wait(waitTime)
        }
      }

      console.log(`🚀 Making chat API request with key: ${apiKeyToUse.name}`)
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      return text

    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'Failed to get response')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [apiKeys, apiKey, isApiKeyValid, dispatch])

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

    // Prompt generation
    generatePrompts,

    // Prompt enhancement
    enhancePrompt,

    stopGeneration,

    // Processing state
    isLoading,
    error,
    processingProgress,
    generationStartTime,

    // Rate limiting (basic support only)
    rateLimitInfo: {},

    // API key management
    addApiKey: handleAddApiKey,
    removeApiKey: handleRemoveApiKey,
    validateApiKey: handleValidateApiKey,

    // Statistics
    getApiKeyStats,

    // Chat
    chat
  }

  return (
    <GeminiContext.Provider value={contextValue}>
      {children}
    </GeminiContext.Provider>
  )
}

