import { ApiKeyInfo } from '../store/slices/settingsSlice'

export interface MetadataResult {
  filename: string
  title: string
  description: string
  keywords: string[]
}

export interface ImageInput {
  imageData: string
  filename: string
  fileType?: 'image' | 'video' | 'vector'
  originalData?: string // For vector files (SVG/EPS content)
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

// New interfaces for prompt generation
export interface PromptGenerationRequest {
  input: string
  inputType: 'text' | 'image'
  platform: string
  style: string
  promptType: 'image' | 'video'
  count: number
  imageData?: string // For image-to-prompt
}

export interface PromptGenerationResult {
  prompts: string[]
  platform: string
  style: string
  promptType: 'image' | 'video'
  success: boolean
  error?: string
}

export interface GeminiContextType {
  // Legacy single API key support
  apiKey: string
  isApiKeyValid: boolean

  // Multiple API keys
  apiKeys: ApiKeyInfo[]
  isValidatingAny: boolean

  // Chat functionality
  chat: (message: string, images?: string[], conversationHistory?: Array<{role: 'user' | 'assistant', content: string, images?: string[]}>) => Promise<string>
  isLoading: boolean
  error: string | null

  // Enhanced metadata generation with parallel processing
  generateMetadata: (input: ImageInput[], onMetadataGenerated?: (result: MetadataResult) => void, settings?: {
    titleWords: number;
    keywordsCount: number;
    descriptionWords: number;
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
  }) => Promise<MetadataResult[]>

  // New prompt generation functionality
  generatePrompts: (request: PromptGenerationRequest) => Promise<PromptGenerationResult>

  // Prompt enhancement functionality
  enhancePrompt: (originalPrompt: string) => Promise<string>

  // Stop metadata generation
  stopGeneration: () => void

  // Progress tracking
  processingProgress: ProcessingProgress | null
  generationStartTime: number | null

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
