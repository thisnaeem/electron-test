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
  incrementOpenrouterApiKeyUsage,
  ApiKeyInfo
} from '../store/slices/settingsSlice'
// Rate limiting imports removed since logic was reverted
import { compressImageForGemini, isImageWithinSizeLimit, getImageSize } from '../utils/imageCompression'
import { OpenAIMetadataService } from '../services/OpenAIMetadataService'
import { GroqMetadataService } from '../services/GroqMetadataService'
import { OpenRouterMetadataService } from '../services/OpenRouterMetadataService'
import { openrouterRateLimiter } from '../utils/openrouterRateLimiter'
import { rateLimiter } from '../utils/rateLimiter'

// Retry configuration - More aggressive retries, no fallback metadata
const MAX_RETRIES = 10 // Increased to 10 for more persistent retries
const RETRY_DELAY = 300 // Reduced to 300ms for faster retries
// Conservative parallel limit to avoid rate limiting
const getOptimalParallelLimit = (apiKeys: ApiKeyInfo[]): number => {
  const validApiKeys = apiKeys.filter(key => key.isValid)
  // Simple parallel limit based on available API keys
  return Math.min(validApiKeys.length, 5) // Max 5 concurrent requests
}

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

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
    groqApiKey,
    isGroqApiKeyValid,
    openrouterApiKey,
    isOpenrouterApiKeyValid,
    openrouterApiKeys,
    openrouterSelectedModel,
    metadataProvider
  } = useAppSelector(state => state.settings)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  // Use ref to track abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const stopRequestedRef = useRef<boolean>(false)

  const generateMetadataForSingleImage = useCallback(async (
    imageInput: ImageInput,
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
  ): Promise<MetadataResult> => {
    const { imageData, filename, fileType, originalData } = imageInput

    try {
      // Check if base64 data is valid
      if (!imageData || !imageData.includes(',')) {
        throw new Error('Invalid image data')
      }

      // Check image size and compress if necessary (Gemini has 4MB limit)
      const originalSize = getImageSize(imageData)
      console.log(`📏 Original image size: ${Math.round(originalSize / 1024)}KB`)

      let processedImageData = imageData
      if (!isImageWithinSizeLimit(imageData)) {
        console.log(`🗜️ Image ${filename} exceeds 4MB limit, compressing...`)
        try {
          const compressionResult = await compressImageForGemini(imageData)
          processedImageData = compressionResult.compressedData
          console.log(`✅ Compressed ${filename} from ${Math.round(compressionResult.originalSize / 1024)}KB to ${Math.round(compressionResult.compressedSize / 1024)}KB`)
        } catch (compressionError) {
          console.error(`❌ Failed to compress ${filename}:`, compressionError)
          throw new Error(`Image ${filename} is too large and could not be compressed for Gemini API`)
        }
      }

      // Special handling for SVG files - they might need additional processing
      if (filename.toLowerCase().endsWith('.svg') && fileType === 'vector') {
        console.log(`🎨 Processing SVG file: ${filename}`)

        // Ensure the SVG was properly converted to a raster image
        if (!imageData.includes('data:image/')) {
          throw new Error(`SVG file ${filename} was not properly converted to image format`)
        }

        // Log the conversion details for debugging
        const imageSizeKB = Math.round(imageData.length / 1024)
        console.log(`📏 SVG converted image size: ${imageSizeKB}KB`)
      }

      // Record API usage
      dispatch(incrementApiKeyUsage(apiKeyInfo.id))

      const genAI = new GoogleGenerativeAI(apiKeyInfo.key)
      const modelName = 'gemini-2.0-flash'
      const model = genAI.getGenerativeModel({ model: modelName })

      const titleMinWords = settings?.titleMinWords || 8
      const titleMaxWords = settings?.titleMaxWords || 15
      const keywordsMinCount = settings?.keywordsMinCount || 20
      const keywordsMaxCount = settings?.keywordsMaxCount || 35
      const descriptionMinWords = settings?.descriptionMinWords || 30
      const descriptionMaxWords = settings?.descriptionMaxWords || 40
      const keywordSettings = settings?.keywordSettings
      const customization = settings?.customization
      const titleCustomization = settings?.titleCustomization

      // Determine keyword instruction based on settings
      let keywordInstruction = 'Use single words or short phrases for keywords'
      if (keywordSettings?.singleWord) {
        keywordInstruction = 'Use ONLY single words for keywords (no phrases or compound words)'
      } else if (keywordSettings?.doubleWord) {
        keywordInstruction = 'Use ONLY two-word phrases for keywords (exactly 2 words each, no single words)'
      } else if (keywordSettings?.mixed) {
        keywordInstruction = 'Use a mix of single words and two-word phrases for keywords'
      }

      // Handle prohibited words
      let prohibitedWordsInstruction = ''
      if (customization?.prohibitedWords && customization.prohibitedWordsList.trim()) {
        const prohibitedList = customization.prohibitedWordsList.split(',').map(w => w.trim()).filter(w => w)
        if (prohibitedList.length > 0) {
          prohibitedWordsInstruction = `\n- NEVER use these prohibited words: ${prohibitedList.join(', ')}`
        }
      }

      // Handle transparent background and silhouette
      let titleSuffix = ''
      const additionalKeywords: string[] = []

      if (customization?.transparentBackground) {
        titleSuffix += ' on transparent background'
        additionalKeywords.push('transparent background')
      }

      if (customization?.silhouette) {
        titleSuffix += ' silhouette'
        additionalKeywords.push('silhouette')
      }

      // Get title style instruction
      let titleStyleInstruction = ''
      if (titleCustomization?.titleStyle) {
        switch (titleCustomization.titleStyle) {
          case 'seo-optimized':
            titleStyleInstruction = ' Focus on SEO-friendly, keyword-rich titles that would rank well in search engines.'
            break
          case 'descriptive':
            titleStyleInstruction = ' Create detailed, descriptive titles that focus on visual elements and specific details.'
            break
          case 'short-concise':
            titleStyleInstruction = ' Generate brief, punchy titles that are concise and to the point.'
            break
          case 'creative':
            titleStyleInstruction = ' Use artistic and imaginative language to create creative, engaging titles.'
            break
          case 'commercial':
            titleStyleInstruction = ' Focus on business and commercial aspects, suitable for professional use.'
            break
          case 'emotional':
            titleStyleInstruction = ' Create titles that evoke emotions and feelings, connecting with the viewer.'
            break
          default:
            titleStyleInstruction = ' Generate engaging, descriptive titles suitable for stock photography.'
        }
      }

      // Adjust keywords count if we need to add special keywords
      const adjustedKeywordsMinCount = Math.max(1, keywordsMinCount - additionalKeywords.length)
      const adjustedKeywordsMaxCount = Math.max(adjustedKeywordsMinCount, keywordsMaxCount - additionalKeywords.length)

      // Create file type specific prompt
      let mediaTypeDescription = 'image'
      let analysisInstructions = 'Focus on objects, colors, style, mood, and context visible in the image'

      if (fileType === 'video') {
        mediaTypeDescription = 'video frame (extracted from a video file)'
        analysisInstructions = `This is a frame extracted from the video file "${filename}". Analyze what you see in this frame and generate metadata that represents the overall video content. Focus on subjects, actions, setting, style, colors, mood, and cinematography visible in this frame. Consider this frame as representative of the video's content`
      } else if (fileType === 'vector') {
        mediaTypeDescription = 'vector graphic (SVG or EPS file)'
        analysisInstructions = 'Focus on the design elements, style, colors, shapes, and intended use of this vector graphic'

        // For vectors, also analyze original content if available
        if (originalData) {
          analysisInstructions += '. Consider the vector file content and design elements'
        }
      }

      let basePrompt = `Analyze this ${mediaTypeDescription} and provide metadata in the following exact format:

Title: [A descriptive title between ${titleMinWords} and ${titleMaxWords} words${titleSuffix ? `, ending with "${titleSuffix.trim()}"` : ''}]
Description: [A descriptive summary between ${descriptionMinWords} and ${descriptionMaxWords} words]
Keywords: [Between ${adjustedKeywordsMinCount} and ${adjustedKeywordsMaxCount} relevant keywords separated by commas]

STRICT REQUIREMENTS - MUST FOLLOW EXACTLY:
- Title must be between ${titleMinWords} and ${titleMaxWords} words (not exactly, but within this range), descriptive and engaging, no extra characters, must be one sentence only like most stock agency ${mediaTypeDescription}s has like adobe stock${titleSuffix ? ` and must end with "${titleSuffix.trim()}"` : ''}${titleStyleInstruction}
- Description must be between ${descriptionMinWords} and ${descriptionMaxWords} words (not exactly, but within this range), providing a comprehensive summary of the ${mediaTypeDescription} content
- Keywords must be between ${adjustedKeywordsMinCount} and ${adjustedKeywordsMaxCount} items (not exactly, but within this range), all relevant to the ${mediaTypeDescription} content
- ${analysisInstructions}
- ${keywordInstruction}
- Separate keywords with commas only${prohibitedWordsInstruction}
- CRITICAL: Respect the word/keyword count ranges - generate content within the specified minimum and maximum limits

Respond with only the title, description, and keywords in the specified format.`

      // Add custom prompt if enabled
      if (customization?.customPrompt && customization.customPromptText.trim()) {
        basePrompt += `\n\nAdditional instructions: ${customization.customPromptText.trim()}`
      }

      const prompt = basePrompt

      // For vector files, the imageData should already be the converted preview image
      // processedImageData was already set above during compression check

      // Enhanced validation for image data
      if (!processedImageData || !processedImageData.includes('data:image/')) {
        throw new Error(`Invalid image data format for ${filename}`)
      }

      // Validate base64 data structure
      const dataParts = processedImageData.split(',')
      if (dataParts.length !== 2 || !dataParts[1]) {
        throw new Error(`Malformed base64 image data for ${filename}`)
      }

      // Improved MIME type detection from data URI
      const headerPart = dataParts[0].toLowerCase()
      let mimeType = 'image/png' // Default to PNG since we convert SVGs to PNG

      if (headerPart.includes('image/png')) {
        mimeType = 'image/png'
      } else if (headerPart.includes('image/jpeg') || headerPart.includes('image/jpg')) {
        mimeType = 'image/jpeg'
      } else if (headerPart.includes('image/webp')) {
        mimeType = 'image/webp'
      }

      // For vector files that were converted, always use PNG
      if (fileType === 'vector') {
        mimeType = 'image/png'
        console.log(`🎨 Vector file ${filename} using PNG format after conversion`)
      }

      // Additional validation for base64 data quality
      const base64Data = dataParts[1]
      if (base64Data.length < 100) {
        throw new Error(`Image data too small for ${filename} - likely corrupted`)
      }

      // Test if base64 is valid
      try {
        atob(base64Data.substring(0, Math.min(100, base64Data.length)))
      } catch {
        throw new Error(`Invalid base64 encoding for ${filename}`)
      }

      console.log(`📸 Processing ${filename} with detected MIME type: ${mimeType}`)

      const content: (string | Part)[] = [
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ]

      // Add mandatory delay before API request to avoid rate limiting
      const delayMs = 1000 + Math.random() * 2000 // 1-3 second delay
      console.log(`⏳ Waiting ${delayMs.toFixed(0)}ms before API request for ${filename}`)
      await wait(delayMs)

      // Rate limiting removed

      console.log(`🚀 Making API request for ${filename} with key: ${apiKeyInfo.name}`)
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      // Parse the response
      const lines = text.split('\n').filter(line => line.trim())
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

      // Add additional keywords for special features
      if (additionalKeywords.length > 0) {
        keywords = [...keywords, ...additionalKeywords]
      }

      // Apply title customization (prefix/postfix)
      if (titleCustomization) {
        let finalTitle = title

        // Add prefix
        if (titleCustomization.customPrefix && titleCustomization.prefixText.trim()) {
          finalTitle = `${titleCustomization.prefixText.trim()} ${finalTitle}`
        }

        // Add postfix
        if (titleCustomization.customPostfix && titleCustomization.postfixText.trim()) {
          finalTitle = `${finalTitle} ${titleCustomization.postfixText.trim()}`
        }

        title = finalTitle
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
        description,
        keywords
      }

    } catch (error) {
      console.error(`Error generating metadata for ${filename} with API key ${apiKeyInfo.name}:`, error)

      // Always throw the error - let the outer retry logic handle it
      // This ensures we don't fall back to generated metadata too early
      throw error
    }
  }, [apiKeys, dispatch])

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
    setGenerationStartTime(Date.now())
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

  const generateMetadataWithGroq = useCallback(async (
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
    if (!groqApiKey || !isGroqApiKeyValid) {
      throw new Error('Groq API key is not valid. Please check your API key in Settings.')
    }

    setIsLoading(true)
    setError(null)
    setGenerationStartTime(Date.now())
    stopRequestedRef.current = false

    const results: MetadataResult[] = []
    const groqService = new GroqMetadataService(groqApiKey)

    // Initialize processing progress
    const initialProgress: ProcessingProgress = {
      total: input.length,
      completed: 0,
      currentFilename: null,
      currentApiKeyId: 'groq',
      processingStats: {
        'groq': {
          processed: 0,
          errors: 0,
          lastUsed: Date.now()
        }
      }
    }

    setProcessingProgress(initialProgress)

    try {
      console.log(`🚀 Starting Groq metadata generation for ${input.length} images`)

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
          currentApiKeyId: 'groq'
        } : null)

        try {
          const result = await groqService.generateMetadataForSingleImage(imageInput, settings)
          results.push(result)

          // Update progress
          setProcessingProgress(prev => prev ? {
            ...prev,
            completed: prev.completed + 1,
            processingStats: {
              ...prev.processingStats,
              'groq': {
                ...prev.processingStats['groq'],
                processed: prev.processingStats['groq'].processed + 1,
                lastUsed: Date.now()
              }
            }
          } : null)

          // Call the callback if provided
          if (onMetadataGenerated) {
            onMetadataGenerated(result)
          }

        } catch (error) {
          console.error(`❌ Groq generation failed for ${imageInput.filename}:`, error)

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
              'groq': {
                ...prev.processingStats['groq'],
                errors: prev.processingStats['groq'].errors + 1,
                lastUsed: Date.now()
              }
            }
          } : null)

          if (onMetadataGenerated) {
            onMetadataGenerated(failedResult)
          }
        }
      }

      console.log(`✅ Groq metadata generation completed. ${results.filter(r => !r.failed).length}/${results.length} successful`)

      setIsLoading(false)
      setError(null)

      return results

    } catch (error) {
      console.error('❌ Groq metadata generation error:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : 'Failed to generate metadata with Groq')
      throw error
    } finally {
      // Clear progress after a delay
      setTimeout(() => setProcessingProgress(null), 2000)
    }
  }, [groqApiKey, isGroqApiKeyValid])

  const generateMetadataWithOpenRouter = useCallback(async (
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
    if (!openrouterApiKey || !isOpenrouterApiKeyValid) {
      throw new Error('OpenRouter API key is not valid. Please check your API key in Settings.')
    }

    setIsLoading(true)
    setError(null)
    setGenerationStartTime(Date.now())
    stopRequestedRef.current = false

    const results: MetadataResult[] = []

    // Use multiple OpenRouter API keys if available, otherwise fall back to single key
    const validOpenrouterKeys = openrouterApiKeys.filter(key => key.isValid)
    const useMultipleKeys = validOpenrouterKeys.length > 0

    let openrouterService: OpenRouterMetadataService

    if (useMultipleKeys) {
      console.log(`🚀 Using ${validOpenrouterKeys.length} OpenRouter API keys for round-robin distribution`)
      openrouterService = new OpenRouterMetadataService(validOpenrouterKeys[0].key, openrouterSelectedModel)
    } else {
      console.log('🚀 Using single OpenRouter API key')
      openrouterService = new OpenRouterMetadataService(openrouterApiKey, openrouterSelectedModel)
    }

    // Initialize processing progress
    const initialProgress: ProcessingProgress = {
      total: input.length,
      completed: 0,
      currentFilename: null,
      currentApiKeyId: useMultipleKeys ? validOpenrouterKeys[0].id : 'openrouter',
      processingStats: useMultipleKeys
        ? validOpenrouterKeys.reduce((stats, key) => ({
            ...stats,
            [key.id]: {
              processed: 0,
              errors: 0,
              lastUsed: Date.now()
            }
          }), {})
        : {
            'openrouter': {
              processed: 0,
              errors: 0,
              lastUsed: Date.now()
            }
          }
    }

    setProcessingProgress(initialProgress)

    try {
      console.log(`🚀 Starting OpenRouter metadata generation for ${input.length} images`)

      if (useMultipleKeys) {
        console.log(`🔄 Using round-robin processing with ${validOpenrouterKeys.length} OpenRouter API keys`)
        let currentKeyIndex = 0

        // Process images sequentially with round-robin key selection
        for (let i = 0; i < input.length; i++) {
          if (stopRequestedRef.current) {
            console.log('🛑 Generation stopped by user')
            break
          }

          const imageInput = input[i]

          // Get next available API key using round-robin
          let currentKey = validOpenrouterKeys[currentKeyIndex]
          let attempts = 0

          // Find an available key (not rate limited)
          while (!openrouterRateLimiter.canMakeRequest(currentKey.id, openrouterSelectedModel) && attempts < validOpenrouterKeys.length) {
            currentKeyIndex = (currentKeyIndex + 1) % validOpenrouterKeys.length
            currentKey = validOpenrouterKeys[currentKeyIndex]
            attempts++
          }

          // If all keys are rate limited, wait for the current one
          if (!openrouterRateLimiter.canMakeRequest(currentKey.id, openrouterSelectedModel)) {
            console.log(`⏳ All OpenRouter keys rate limited, waiting for ${currentKey.name}...`)
            const waitTime = openrouterRateLimiter.getWaitTimeUntilNextAvailable([currentKey], openrouterSelectedModel)
            if (waitTime > 0) {
              await wait(waitTime)
            }
          }

          console.log(`📤 Using OpenRouter API key: ${currentKey.name} for ${imageInput.filename}`)

          // Move to next key for next request (round-robin)
          currentKeyIndex = (currentKeyIndex + 1) % validOpenrouterKeys.length

          // Update progress
          setProcessingProgress(prev => prev ? {
            ...prev,
            currentFilename: imageInput.filename,
            currentApiKeyId: currentKey.id
          } : null)

          try {
            // Record the request for rate limiting
            openrouterRateLimiter.recordRequest(currentKey.id, openrouterSelectedModel)

            // Update the service to use the current API key
            openrouterService.updateApiKey(currentKey.key)

            const result = await openrouterService.generateMetadataForSingleImage(imageInput, settings)
            results.push(result)

            // Update progress and API key usage
            setProcessingProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              processingStats: {
                ...prev.processingStats,
                [currentKey.id]: {
                  ...prev.processingStats[currentKey.id],
                  processed: prev.processingStats[currentKey.id].processed + 1,
                  lastUsed: Date.now()
                }
              }
            } : null)

            // Update API key usage in Redux store
            dispatch(incrementOpenrouterApiKeyUsage(currentKey.id))

            // Call the callback if provided
            if (onMetadataGenerated) {
              onMetadataGenerated(result)
            }

            console.log(`✅ Successfully generated metadata for ${imageInput.filename} using ${currentKey.name}`)

          } catch (error) {
            console.error(`❌ OpenRouter generation failed for ${imageInput.filename}:`, error)

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
                [currentKey.id]: {
                  ...prev.processingStats[currentKey.id],
                  errors: prev.processingStats[currentKey.id].errors + 1,
                  lastUsed: Date.now()
                }
              }
            } : null)

            if (onMetadataGenerated) {
              onMetadataGenerated(failedResult)
            }
          }
        }
      } else {
        // Single key processing (original logic)
        console.log('🚀 Using single OpenRouter API key')

        for (let i = 0; i < input.length; i++) {
          if (stopRequestedRef.current) {
            console.log('🛑 Generation stopped by user')
            break
          }

          const imageInput = input[i]

          // Check rate limiting for single key
          if (!openrouterRateLimiter.canMakeRequest('openrouter', openrouterSelectedModel)) {
            const waitTime = openrouterRateLimiter.getWaitTimeUntilNextAvailable([{ id: 'openrouter', key: '', isValid: true, isValidating: false, validationError: null, requestCount: 0, lastRequestTime: 0, name: 'OpenRouter' }], openrouterSelectedModel)
            if (waitTime > 0) {
              console.log(`⏳ OpenRouter rate limited, waiting ${waitTime}ms...`)
              await wait(waitTime)
            }
          }

          // Update progress
          setProcessingProgress(prev => prev ? {
            ...prev,
            currentFilename: imageInput.filename,
            currentApiKeyId: 'openrouter'
          } : null)

          try {
            // Record the request for rate limiting
            openrouterRateLimiter.recordRequest('openrouter', openrouterSelectedModel)

            const result = await openrouterService.generateMetadataForSingleImage(imageInput, settings)
            results.push(result)

            // Update progress
            setProcessingProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              processingStats: {
                ...prev.processingStats,
                'openrouter': {
                  ...prev.processingStats['openrouter'],
                  processed: prev.processingStats['openrouter'].processed + 1,
                  lastUsed: Date.now()
                }
              }
            } : null)

            // Call the callback if provided
            if (onMetadataGenerated) {
              onMetadataGenerated(result)
            }

          } catch (error) {
            console.error(`❌ OpenRouter generation failed for ${imageInput.filename}:`, error)

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
                'openrouter': {
                  ...prev.processingStats['openrouter'],
                  errors: prev.processingStats['openrouter'].errors + 1,
                  lastUsed: Date.now()
                }
              }
            } : null)

            if (onMetadataGenerated) {
              onMetadataGenerated(failedResult)
            }
          }
        }
      }

      console.log(`✅ OpenRouter metadata generation completed. ${results.filter(r => !r.failed).length}/${results.length} successful`)

      setIsLoading(false)
      setError(null)

      return results

    } catch (error) {
      console.error('❌ OpenRouter metadata generation error:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : 'Failed to generate metadata with OpenRouter')
      throw error
    } finally {
      // Clear progress after a delay
      setTimeout(() => setProcessingProgress(null), 2000)
    }
  }, [openrouterApiKey, isOpenrouterApiKeyValid])

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
    } else if (metadataProvider === 'groq') {
      return generateMetadataWithGroq(input, onMetadataGenerated, settings)
    } else if (metadataProvider === 'openrouter') {
      return generateMetadataWithOpenRouter(input, onMetadataGenerated, settings)
    }

    // Default to Gemini (existing logic)
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
    setGenerationStartTime(Date.now()) // Start timer
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

    console.log(`🚀 Starting metadata generation with ${validApiKeys.length} API keys:`, validApiKeys.map(k => k.name))
    const optimalParallelLimit = getOptimalParallelLimit(validApiKeys)
    console.log(`📊 Optimal parallel limit: ${optimalParallelLimit} (based on ${validApiKeys.length} keys with current capacity)`)

    console.log(`🚀 Starting metadata generation with ${validApiKeys.length} API keys:`, validApiKeys.map(k => k.name))

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

        // Create batch ensuring each request gets a different API key in round-robin order
        const parallelLimit = optimalParallelLimit

        // Process images with pre-assigned API keys for round-robin distribution
        for (let i = 0; i < parallelLimit && currentIndex < input.length; i++) {
          // Check if stop was requested before processing each image
          if (stopRequestedRef.current) {
            console.log('🛑 Stop detected - halting image processing loop')
            break
          }

          const imageIndex = currentIndex++
          const imageInput = input[imageIndex]

          // Get next available API key using round-robin
          const availableApiKey = validApiKeys[currentIndex % validApiKeys.length]

          if (availableApiKey) {
            console.log(`📤 Assigning ${imageInput.filename} to ${availableApiKey.name} (round-robin distribution)`)

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
                  const currentApiKey = availableApiKey

                  // If this is a retry, wait before retrying
                  if (retryCount > 0) {
                    console.log(`⏳ Retry ${retryCount} for ${imageInput.filename} - waiting before retry with ${currentApiKey.name}`)
                    await wait(RETRY_DELAY * retryCount)
                  }

                  // Update progress
                  setProcessingProgress(prev => prev ? {
                    ...prev,
                    currentFilename: imageInput.filename,
                    currentApiKeyId: currentApiKey.id
                  } : null)

                  // Generate metadata
                  const result = await generateMetadataForSingleImage(imageInput, currentApiKey, settings)
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

                  // Log specific error types for debugging
                  const errorMessage = lastError.message.toLowerCase()
                  const isImageValidationError = errorMessage.includes('provided image is not valid') ||
                    errorMessage.includes('invalid image') ||
                    errorMessage.includes('image format')

                  if (isImageValidationError) {
                    console.error(`🎨 Image validation issue for ${imageInput.filename}: ${lastError.message}`)
                    // Continue retrying - no fallback metadata
                  }

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

                  // If we've exhausted all retries, mark as failed (no fallback metadata)
                  if (retryCount > MAX_RETRIES) {
                    console.error(`❌ All retries exhausted for ${imageInput.filename} - marking as failed`)

                    // Don't add any result - let it remain undefined to indicate failure
                    // This will be filtered out later and the UI will show an error indicator

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
      setProcessingProgress(prev => {
        if (!prev) return null

        // Log final statistics for each API key
        const totalTime = generationStartTime ? Date.now() - generationStartTime : 0
        const totalTimeFormatted = totalTime > 0 ? `${(totalTime / 1000).toFixed(1)}s` : '0s'

        console.log('📈 Final API Key Usage Statistics:')
        console.log(`⏱️ Total generation time: ${totalTimeFormatted}`)
        Object.entries(prev.processingStats).forEach(([keyId, stats]) => {
          const keyName = validApiKeys.find(k => k.id === keyId)?.name || keyId
          console.log(`  ${keyName}: ${stats.processed} processed, ${stats.errors} errors`)
        })

        return {
          ...prev,
          currentFilename: null,
          currentApiKeyId: null
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
  }, [apiKeys, apiKey, isApiKeyValid, generateMetadataForSingleImage, metadataProvider, generateMetadataWithOpenAI, generateMetadataWithGroq, generateMetadataWithOpenRouter])

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
