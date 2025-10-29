/**
 * API Key Validation Service
 * 
 * This service provides a consistent and reliable way to validate API keys
 * and determine generator access permissions using OOP principles.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ApiKeyInfo {
  id: string
  key: string
  name: string
  isValid: boolean
  isValidating: boolean
  lastValidated?: number
  requestCount: number
  lastUsed?: number
  error?: string
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  modelUsed?: string
  timestamp: number
}

export interface GeneratorAccessResult {
  hasAccess: boolean
  validKeyCount: number
  requiredKeyCount: number
  missingKeyCount: number
  message: string
}

export class ApiKeyValidationService {
  private static instance: ApiKeyValidationService
  private readonly REQUIRED_KEYS = 5
  private readonly VALIDATION_TIMEOUT = 15000
  private readonly MODELS_TO_TRY = ['gemini-1.5-flash', 'gemini-2.0-flash']
  private readonly TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  private constructor() {}

  public static getInstance(): ApiKeyValidationService {
    if (!ApiKeyValidationService.instance) {
      ApiKeyValidationService.instance = new ApiKeyValidationService()
    }
    return ApiKeyValidationService.instance
  }

  /**
   * Validates a single API key with comprehensive error handling
   */
  public async validateApiKey(key: string): Promise<ValidationResult> {
    console.log('🔍 Starting API key validation...')
    
    if (!key || key.trim().length === 0) {
      console.log('❌ API key validation failed: Key is empty')
      return {
        isValid: false,
        error: 'API key is required',
        timestamp: Date.now()
      }
    }

    const trimmedKey = key.trim()
    console.log(`🔍 Validating API key: ${this.sanitizeKeyForLogging(trimmedKey)}`)
    
    // Basic format validation
    if (!this.isValidKeyFormat(trimmedKey)) {
      console.log('❌ API key validation failed: Invalid format')
      return {
        isValid: false,
        error: 'Invalid API key format - should start with "AIza" and be 20-50 characters',
        timestamp: Date.now()
      }
    }

    let lastError: Error | null = null

    // Try each model until one works
    for (const modelName of this.MODELS_TO_TRY) {
      try {
        console.log(`🧪 Testing API key with model ${modelName}...`)
        
        const genAI = new GoogleGenerativeAI(trimmedKey)
        const model = genAI.getGenerativeModel({ model: modelName })

        const testPrompt = 'Analyze this test image and respond with: "Test successful"'
        const content = [
          testPrompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: this.TEST_IMAGE_BASE64
            }
          }
        ]

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Validation timeout after 15 seconds')), this.VALIDATION_TIMEOUT)
        })

        console.log(`⏳ Making request to ${modelName}...`)
        const validationPromise = model.generateContent(content)
        const result = await Promise.race([validationPromise, timeoutPromise])

        console.log(`📝 Received response from ${modelName}`)
        const response = result.response
        const text = response.text()

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API')
        }

        console.log(`✅ API key validation successful with ${modelName}: "${text.substring(0, 30)}..."`)
        return {
          isValid: true,
          modelUsed: modelName,
          timestamp: Date.now()
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.log(`❌ API key failed with model ${modelName}: ${errorMsg}`)
        
        // Log more details for debugging
        if (error instanceof Error) {
          console.log(`🔍 Error details:`, {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 200)
          })
        }
        
        lastError = error instanceof Error ? error : new Error('Unknown validation error')
        continue
      }
    }

    // All models failed
    return {
      isValid: false,
      error: lastError?.message || 'API key validation failed',
      timestamp: Date.now()
    }
  }

  /**
   * Validates multiple API keys in parallel with proper error handling
   */
  public async validateMultipleApiKeys(keys: string[]): Promise<ValidationResult[]> {
    const validationPromises = keys.map(key => this.validateApiKey(key))
    
    try {
      return await Promise.all(validationPromises)
    } catch (error) {
      console.error('Error validating multiple API keys:', error)
      // Return failed results for all keys if Promise.all fails
      return keys.map(() => ({
        isValid: false,
        error: 'Batch validation failed',
        timestamp: Date.now()
      }))
    }
  }

  /**
   * Determines if user has access to generator based on selected provider and API keys
   */
  public checkGeneratorAccess(
    apiKeys: ApiKeyInfo[], 
    metadataProvider?: string,
    providerApiKeys?: {
      openaiApiKey?: string
      isOpenaiApiKeyValid?: boolean
    }
  ): GeneratorAccessResult {
    // Provider-specific validation
    if (metadataProvider && providerApiKeys) {
      switch (metadataProvider) {
        case 'openai':
          const hasValidOpenAI = providerApiKeys.openaiApiKey && providerApiKeys.isOpenaiApiKeyValid
          return {
            hasAccess: !!hasValidOpenAI,
            validKeyCount: hasValidOpenAI ? 1 : 0,
            requiredKeyCount: 1,
            missingKeyCount: hasValidOpenAI ? 0 : 1,
            message: hasValidOpenAI 
              ? 'Generator access granted with valid OpenAI API key'
              : 'OpenAI API key required for metadata generation'
          }



        case 'gemini':
        default:
          // Fall through to Gemini logic below
          break
      }
    }

    // Gemini provider logic (requires 5 keys)
    const validKeys = this.getValidApiKeys(apiKeys)
    const validKeyCount = validKeys.length
    const missingKeyCount = Math.max(0, this.REQUIRED_KEYS - validKeyCount)
    
    const hasAccess = validKeyCount >= this.REQUIRED_KEYS
    
    let message: string
    if (hasAccess) {
      message = `Generator access granted with ${validKeyCount} valid Gemini API keys`
    } else {
      message = `Gemini requires ${this.REQUIRED_KEYS} valid API keys. You have ${validKeyCount}. Add ${missingKeyCount} more keys.`
    }

    return {
      hasAccess,
      validKeyCount,
      requiredKeyCount: this.REQUIRED_KEYS,
      missingKeyCount,
      message
    }
  }

  /**
   * Gets only the truly valid API keys with strict validation
   */
  public getValidApiKeys(apiKeys: ApiKeyInfo[]): ApiKeyInfo[] {
    const now = Date.now()
    const MAX_VALIDATION_AGE = 24 * 60 * 60 * 1000 // 24 hours

    return apiKeys.filter(key => {
      // Must be marked as valid
      if (!key.isValid) return false
      
      // Must not be currently validating
      if (key.isValidating) return false
      
      // Must not have validation errors
      if (key.error) return false
      
      // Must have been validated recently (optional check)
      if (key.lastValidated && (now - key.lastValidated) > MAX_VALIDATION_AGE) {
        console.warn(`API key ${key.name} validation is stale, may need revalidation`)
      }
      
      // Must have valid key format
      if (!this.isValidKeyFormat(key.key)) return false
      
      return true
    })
  }

  /**
   * Validates API key format (basic checks)
   */
  private isValidKeyFormat(key: string): boolean {
    if (!key || typeof key !== 'string') {
      console.log('❌ Format check failed: Key is not a string')
      return false
    }
    
    const trimmed = key.trim()
    console.log(`🔍 Format check: Key length = ${trimmed.length}`)
    
    // Basic length check (Gemini API keys are typically 39 characters, but allow some flexibility)
    if (trimmed.length < 15 || trimmed.length > 60) {
      console.log(`❌ Format check failed: Invalid length ${trimmed.length} (expected 15-60)`)
      return false
    }
    
    // Should start with expected prefix (but be flexible)
    if (!trimmed.startsWith('AIza')) {
      console.log(`❌ Format check failed: Does not start with "AIza"`)
      return false
    }
    
    // Should only contain valid characters (allow more characters for flexibility)
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      console.log(`❌ Format check failed: Contains invalid characters`)
      return false
    }
    
    console.log('✅ Format check passed')
    return true
  }

  /**
   * Sanitizes API key for logging (shows only first/last few characters)
   */
  public sanitizeKeyForLogging(key: string): string {
    if (!key || key.length < 8) return '[INVALID_KEY]'
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  /**
   * Gets validation statistics
   */
  public getValidationStats(apiKeys: ApiKeyInfo[]): {
    total: number
    valid: number
    invalid: number
    validating: number
    errorCount: number
  } {
    const total = apiKeys.length
    const valid = this.getValidApiKeys(apiKeys).length
    const validating = apiKeys.filter(k => k.isValidating).length
    const errorCount = apiKeys.filter(k => k.error).length
    const invalid = total - valid - validating

    return {
      total,
      valid,
      invalid,
      validating,
      errorCount
    }
  }
}

// Export singleton instance
export const apiKeyValidationService = ApiKeyValidationService.getInstance()