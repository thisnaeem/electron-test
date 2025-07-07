import { ApiKeyInfo } from '../store/slices/settingsSlice'

export interface MetadataResult {
  filename: string
  title: string
  keywords: string[]
}

export interface ImageInput {
  imageData: string
  filename: string
}

export interface ProcessingProgress {
  total: number
  completed: number
  currentFilename: string | null
  currentApiKeyId: string | null
  processingStats: {
    [apiKeyId: string]: {
      processed: number
      errors: number
      lastUsed: number
    }
  }
}

export interface RateLimitInfo {
  requestsInCurrentMinute: number
  windowStartTime: number
  isLimited: boolean
  nextAvailableTime: number
}

export interface GeminiContextType {
  // Legacy single API key support
  apiKey: string
  isApiKeyValid: boolean

  // Multiple API keys
  apiKeys: ApiKeyInfo[]
  isValidatingAny: boolean

  // Enhanced metadata generation with parallel processing
  generateMetadata: (input: ImageInput[], onMetadataGenerated?: (result: MetadataResult) => void) => Promise<MetadataResult[]>

  // Stop metadata generation
  stopGeneration: () => void

  // Processing state
  isLoading: boolean
  error: string | null
  processingProgress: ProcessingProgress | null

  // Rate limiting info
  rateLimitInfo: { [apiKeyId: string]: RateLimitInfo }

  // API key management
  addApiKey: (key: string, name?: string) => void
  removeApiKey: (id: string) => void
  validateApiKey: (id: string, key: string) => Promise<void>

  // Statistics
  getApiKeyStats: () => {
    totalKeys: number
    validKeys: number
    totalRequests: number
    requestsPerMinute: number
  }
}
