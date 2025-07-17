import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Together from 'together-ai'

export interface ApiKeyInfo {
  id: string
  key: string
  isValid: boolean
  isValidating: boolean
  validationError: string | null
  requestCount: number
  lastRequestTime: number
  name: string // User-friendly name like "API Key 1", "API Key 2", etc.
}

interface SettingsState {
  // Legacy single API key (kept for backward compatibility)
  apiKey: string
  isApiKeyValid: boolean
  isValidating: boolean
  validationError: string | null

  // Multiple API keys
  apiKeys: ApiKeyInfo[]
  isValidatingAny: boolean

  // Together AI API key
  togetherApiKey: string
  isTogetherApiKeyValid: boolean
  isValidatingTogetherApiKey: boolean
  togetherApiKeyValidationError: string | null

  // Theme settings
  isDarkMode: boolean
  themePreference: 'light' | 'dark' | 'system'

  // Onboarding
  hasCompletedOnboarding: boolean

  // Analytics
  analyticsEnabled: boolean

  // Auto-download settings
  autoDownloadCsv: boolean

  // Generation settings
  generationSettings: {
    titleWords: number
    titleMinWords: number
    titleMaxWords: number
    keywordsCount: number
    keywordsMinCount: number
    keywordsMaxCount: number
    descriptionWords: number
    descriptionMinWords: number
    descriptionMaxWords: number
    platforms: string[] // Array of selected platforms: 'freepik', 'shutterstock', 'adobe-stock'
    keywordSettings?: {
      singleWord: boolean
      doubleWord: boolean
      mixed: boolean
    }
    customization?: {
      customPrompt: boolean
      customPromptText: string
      prohibitedWords: boolean
      prohibitedWordsList: string
      transparentBackground: boolean
      silhouette: boolean
    }
    titleCustomization?: {
      titleStyle: string
      customPrefix: boolean
      prefixText: string
      customPostfix: boolean
      postfixText: string
    }
  }
}

// Helper function to safely load API keys from localStorage
const loadApiKeysFromStorage = (): ApiKeyInfo[] => {
  try {
    const stored = localStorage.getItem('geminiApiKeys')
    console.log('📱 Loading API keys from localStorage:', stored)
    if (!stored) {
      console.log('📱 No API keys found in localStorage')
      return []
    }
    const parsed = JSON.parse(stored)
    console.log('📱 Parsed API keys:', parsed.length, 'keys found')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('❌ Error loading API keys from localStorage:', error)
    return []
  }
}

// Helper function to safely save API keys to localStorage
const saveApiKeysToStorage = (apiKeys: ApiKeyInfo[]): void => {
  try {
    const serialized = JSON.stringify(apiKeys)
    localStorage.setItem('geminiApiKeys', serialized)
    console.log('💾 Saved API keys to localStorage:', apiKeys.length, 'keys')
  } catch (error) {
    console.error('❌ Error saving API keys to localStorage:', error)
  }
}

const initialState: SettingsState = {
  // Legacy fields
  apiKey: localStorage.getItem('geminiApiKey') || '',
  isApiKeyValid: localStorage.getItem('geminiApiKeyValid') === 'true',
  isValidating: false,
  validationError: null,

  // Multiple API keys
  apiKeys: loadApiKeysFromStorage(),
  isValidatingAny: false,

  // Together AI API key
  togetherApiKey: localStorage.getItem('togetherApiKey') || '',
  isTogetherApiKeyValid: localStorage.getItem('togetherApiKeyValid') === 'true',
  isValidatingTogetherApiKey: false,
  togetherApiKeyValidationError: null,

  // Theme settings
  isDarkMode: localStorage.getItem('darkMode') === 'true',
  themePreference: (localStorage.getItem('themePreference') as 'light' | 'dark' | 'system') || 'system',

  // Onboarding - check if user has at least 5 valid API keys
  hasCompletedOnboarding: localStorage.getItem('hasCompletedOnboarding') === 'true',

  // Analytics
  analyticsEnabled: localStorage.getItem('analyticsEnabled') !== 'false', // Default to true unless explicitly disabled

  // Auto-download settings
  autoDownloadCsv: localStorage.getItem('autoDownloadCsv') === 'true', // Default to false unless explicitly enabled

    // Generation settings - load from localStorage with proper defaults
  generationSettings: (() => {
    try {
      const savedTitleWords = localStorage.getItem('generationTitleWords')
      const savedKeywordsCount = localStorage.getItem('generationKeywordsCount')
      const savedDescriptionWords = localStorage.getItem('generationDescriptionWords')
      const savedPlatforms = localStorage.getItem('generationPlatforms')
      const savedKeywordSettings = localStorage.getItem('generationKeywordSettings')
      const savedCustomization = localStorage.getItem('generationCustomization')
      const savedTitleCustomization = localStorage.getItem('generationTitleCustomization')

      console.log('🔧 Loading generation settings from localStorage:', {
        savedTitleWords,
        savedKeywordsCount,
        savedDescriptionWords,
        savedPlatforms,
        savedKeywordSettings,
        savedCustomization,
        savedTitleCustomization
      })

      let platforms: string[] = []
      if (savedPlatforms) {
        try {
          platforms = JSON.parse(savedPlatforms)
          if (!Array.isArray(platforms)) platforms = []
        } catch {
          platforms = []
        }
      }

      let keywordSettings = {
        singleWord: true,
        doubleWord: false,
        mixed: false
      }
      if (savedKeywordSettings) {
        try {
          const parsed = JSON.parse(savedKeywordSettings)
          if (parsed && typeof parsed === 'object') {
            keywordSettings = {
              singleWord: parsed.singleWord ?? true,
              doubleWord: parsed.doubleWord ?? false,
              mixed: parsed.mixed ?? false
            }
          }
        } catch {
          // Use defaults
        }
      }

      let customization = {
        customPrompt: false,
        customPromptText: '',
        prohibitedWords: false,
        prohibitedWordsList: '',
        transparentBackground: false,
        silhouette: false
      }
      if (savedCustomization) {
        try {
          const parsed = JSON.parse(savedCustomization)
          if (parsed && typeof parsed === 'object') {
            customization = {
              customPrompt: parsed.customPrompt ?? false,
              customPromptText: parsed.customPromptText ?? '',
              prohibitedWords: parsed.prohibitedWords ?? false,
              prohibitedWordsList: parsed.prohibitedWordsList ?? '',
              transparentBackground: parsed.transparentBackground ?? false,
              silhouette: parsed.silhouette ?? false
            }
          }
        } catch {
          // Use defaults
        }
      }

      let titleCustomization = {
        titleStyle: 'seo-optimized',
        customPrefix: false,
        prefixText: '',
        customPostfix: false,
        postfixText: ''
      }
      if (savedTitleCustomization) {
        try {
          const parsed = JSON.parse(savedTitleCustomization)
          if (parsed && typeof parsed === 'object') {
            titleCustomization = {
              titleStyle: parsed.titleStyle ?? 'seo-optimized',
              customPrefix: parsed.customPrefix ?? false,
              prefixText: parsed.prefixText ?? '',
              customPostfix: parsed.customPostfix ?? false,
              postfixText: parsed.postfixText ?? ''
            }
          }
        } catch {
          // Use defaults
        }
      }

      return {
        titleWords: savedTitleWords ? Math.max(5, Math.min(20, parseInt(savedTitleWords))) : 15,
        titleMinWords: 8,
        titleMaxWords: 15,
        keywordsCount: savedKeywordsCount ? Math.max(10, Math.min(50, parseInt(savedKeywordsCount))) : 45,
        keywordsMinCount: 20,
        keywordsMaxCount: 35,
        descriptionWords: savedDescriptionWords ? Math.max(5, Math.min(20, parseInt(savedDescriptionWords))) : 12,
        descriptionMinWords: 30,
        descriptionMaxWords: 40,
        platforms: platforms.length > 0 ? platforms : ['freepik'], // Default to Freepik
        keywordSettings,
        customization,
        titleCustomization
      }
    } catch (error) {
      console.error('❌ Error loading generation settings from localStorage:', error)
      return {
        titleWords: 15,
        titleMinWords: 8,
        titleMaxWords: 15,
        keywordsCount: 45,
        keywordsMinCount: 20,
        keywordsMaxCount: 35,
        descriptionWords: 12,
        descriptionMinWords: 30,
        descriptionMaxWords: 40,
        platforms: ['freepik'],
        keywordSettings: {
          singleWord: true,
          doubleWord: false,
          mixed: false
        },
        customization: {
          customPrompt: false,
          customPromptText: '',
          prohibitedWords: false,
          prohibitedWordsList: '',
          transparentBackground: false,
          silhouette: false
        },
        titleCustomization: {
          titleStyle: 'seo-optimized',
          customPrefix: false,
          prefixText: '',
          customPostfix: false,
          postfixText: ''
        }
      }
    }
  })()
}

// Migrate legacy API key to new system if exists
if (initialState.apiKey && initialState.apiKeys.length === 0) {
  initialState.apiKeys.push({
    id: 'legacy-key',
    key: initialState.apiKey,
    isValid: initialState.isApiKeyValid,
    isValidating: false,
    validationError: null,
    requestCount: 0,
    lastRequestTime: 0,
    name: 'API Key 1'
  })
}

export const validateApiKey = createAsyncThunk(
  'settings/validateApiKey',
  async (key: string, { rejectWithValue }) => {
    if (!key) return rejectWithValue('API key is required')

    try {
      const genAI = new GoogleGenerativeAI(key)
      // Use gemini-2.0-flash as requested
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Create a small test image (1x1 pixel base64 encoded PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

      // Perform real validation with actual image analysis like in production
      const testPrompt = 'Analyze this test image and respond with: "Test successful"'

      const content = [
        testPrompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: testImageBase64
          }
        }
      ]

      console.log('🧪 Testing legacy API key with real Gemini request...')
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('API key validation failed: Empty response from Gemini')
      }

      console.log('✅ Legacy API key validation successful:', text.substring(0, 50) + '...')

      // Store in localStorage for persistence
      localStorage.setItem('geminiApiKey', key)
      localStorage.setItem('geminiApiKeyValid', 'true')

      return true
    } catch (error) {
      console.error('❌ Legacy API key validation error:', error)
      localStorage.setItem('geminiApiKeyValid', 'false')
      return rejectWithValue(
        error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Validation failed. Check your API key and internet connection.'
      )
    }
  }
)

export const validateMultipleApiKey = createAsyncThunk(
  'settings/validateMultipleApiKey',
  async ({ id, key }: { id: string; key: string }, { rejectWithValue }) => {
    if (!key) return rejectWithValue('API key is required')

    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Create a small test image (1x1 pixel base64 encoded PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

      // Perform real validation with actual image analysis like in production
      const testPrompt = 'Analyze this test image and respond with: "Test successful"'

      const content = [
        testPrompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: testImageBase64
          }
        }
      ]

      console.log(`🧪 Testing API key ${id} with real Gemini request...`)
      const result = await model.generateContent(content)
      const response = result.response
      const text = response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('API key validation failed: Empty response from Gemini')
      }

      console.log(`✅ API key ${id} validation successful: ${text.substring(0, 50)}...`)
      return { id, isValid: true }

    } catch (error) {
      console.error(`❌ API key validation error for ${id}:`, error)
      return rejectWithValue({
        id,
        error: error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Validation failed. Check your API key and internet connection.'
      })
    }
  }
)

export const validateTogetherApiKey = createAsyncThunk(
  'settings/validateTogetherApiKey',
  async (key: string, { rejectWithValue }) => {
    if (!key) return rejectWithValue('Together API key is required')

    try {
      const together = new Together({ apiKey: key })

      // Test the API key with a simple image generation request
      console.log('🧪 Testing Together API key...')
      const response = await together.images.create({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt: "A simple test image",
        steps: 1,
        n: 1
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('API key validation failed: No data returned from Together AI')
      }

      console.log('✅ Together API key validation successful')

      // Store in localStorage for persistence
      localStorage.setItem('togetherApiKey', key)
      localStorage.setItem('togetherApiKeyValid', 'true')

      return true
    } catch (error) {
      console.error('❌ Together API key validation error:', error)
      localStorage.setItem('togetherApiKeyValid', 'false')
      return rejectWithValue(
        error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Validation failed. Check your Together API key and internet connection.'
      )
    }
  }
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload
      localStorage.setItem('geminiApiKey', action.payload)
    },
    clearValidationError: (state) => {
      state.validationError = null
    },

    // Multiple API key actions
    addApiKey: (state, action: PayloadAction<{ key: string; name?: string; isValid?: boolean }>) => {
      const id = `api-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newKey: ApiKeyInfo = {
        id,
        key: action.payload.key,
        isValid: action.payload.isValid ?? false, // Use provided validity or default to false
        isValidating: false,
        validationError: null,
        requestCount: 0,
        lastRequestTime: 0,
        name: action.payload.name || `API Key ${state.apiKeys.length + 1}`
      }
      state.apiKeys.push(newKey)
      saveApiKeysToStorage(state.apiKeys)
    },

    removeApiKey: (state, action: PayloadAction<string>) => {
      state.apiKeys = state.apiKeys.filter(key => key.id !== action.payload)
      saveApiKeysToStorage(state.apiKeys)
    },

    updateApiKeyName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const key = state.apiKeys.find(k => k.id === action.payload.id)
      if (key) {
        key.name = action.payload.name
        saveApiKeysToStorage(state.apiKeys)
      }
    },

    incrementApiKeyUsage: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.requestCount++
        key.lastRequestTime = Date.now()
        saveApiKeysToStorage(state.apiKeys)
      }
    },

    resetApiKeyUsage: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.requestCount = 0
        saveApiKeysToStorage(state.apiKeys)
      }
    },

    clearApiKeyError: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.validationError = null
      }
    },

    // Together API key actions
    setTogetherApiKey: (state, action: PayloadAction<string>) => {
      state.togetherApiKey = action.payload
      localStorage.setItem('togetherApiKey', action.payload)
    },

    clearTogetherValidationError: (state) => {
      state.togetherApiKeyValidationError = null
    },

    // Theme actions
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode
      localStorage.setItem('darkMode', state.isDarkMode.toString())

      // Apply dark mode to document
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload
      localStorage.setItem('darkMode', action.payload.toString())

      // Apply dark mode to document
      if (action.payload) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    setThemePreference: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.themePreference = action.payload
      localStorage.setItem('themePreference', action.payload)

      // Apply theme based on preference
      if (action.payload === 'system') {
        // Detect system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        state.isDarkMode = systemPrefersDark
        if (systemPrefersDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      } else {
        const isDark = action.payload === 'dark'
        state.isDarkMode = isDark
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      localStorage.setItem('darkMode', state.isDarkMode.toString())
    },

    // Onboarding actions
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true
      localStorage.setItem('hasCompletedOnboarding', 'true')
    },

    // Helper to check if onboarding should be completed (5+ valid API keys)
    checkOnboardingCompletion: (state) => {
      const validApiKeys = state.apiKeys.filter(key => key.isValid).length
      if (validApiKeys >= 5 && !state.hasCompletedOnboarding) {
        state.hasCompletedOnboarding = true
        localStorage.setItem('hasCompletedOnboarding', 'true')
      }
    },

    // Analytics actions
    setAnalyticsEnabled: (state, action: PayloadAction<boolean>) => {
      state.analyticsEnabled = action.payload
      localStorage.setItem('analyticsEnabled', action.payload.toString())
    },

    // Auto-download actions
    setAutoDownloadCsv: (state, action: PayloadAction<boolean>) => {
      state.autoDownloadCsv = action.payload
      localStorage.setItem('autoDownloadCsv', action.payload.toString())
    },

    // Debug action to check localStorage
    debugGenerationSettings: (state) => {
      console.log('🔍 Debug Generation Settings:')
      console.log('- Redux state:', state.generationSettings)
      console.log('- localStorage generationTitleWords:', localStorage.getItem('generationTitleWords'))
      console.log('- localStorage generationKeywordsCount:', localStorage.getItem('generationKeywordsCount'))
      console.log('- localStorage generationDescriptionWords:', localStorage.getItem('generationDescriptionWords'))
      console.log('- localStorage generationPlatforms:', localStorage.getItem('generationPlatforms'))
    },

        // Generation settings actions
    updateGenerationSettings: (state, action: PayloadAction<{
      titleWords?: number
      titleMinWords?: number
      titleMaxWords?: number
      keywordsCount?: number
      keywordsMinCount?: number
      keywordsMaxCount?: number
      descriptionWords?: number
      descriptionMinWords?: number
      descriptionMaxWords?: number
      platforms?: string[]
      keywordSettings?: {
        singleWord: boolean
        doubleWord: boolean
        mixed: boolean
      }
      customization?: {
        customPrompt: boolean
        customPromptText: string
        prohibitedWords: boolean
        prohibitedWordsList: string
        transparentBackground: boolean
        silhouette: boolean
      }
      titleCustomization?: {
        titleStyle: string
        customPrefix: boolean
        prefixText: string
        customPostfix: boolean
        postfixText: string
      }
    }>) => {
      // Validate and clamp values to allowed ranges
      const titleWords = action.payload.titleWords !== undefined ? Math.max(5, Math.min(20, action.payload.titleWords)) : state.generationSettings.titleWords
      const titleMinWords = action.payload.titleMinWords !== undefined ? Math.max(5, Math.min(20, action.payload.titleMinWords)) : state.generationSettings.titleMinWords
      const titleMaxWords = action.payload.titleMaxWords !== undefined ? Math.max(5, Math.min(20, action.payload.titleMaxWords)) : state.generationSettings.titleMaxWords
      
      const keywordsCount = action.payload.keywordsCount !== undefined ? Math.max(10, Math.min(50, action.payload.keywordsCount)) : state.generationSettings.keywordsCount
      const keywordsMinCount = action.payload.keywordsMinCount !== undefined ? Math.max(10, Math.min(50, action.payload.keywordsMinCount)) : state.generationSettings.keywordsMinCount
      const keywordsMaxCount = action.payload.keywordsMaxCount !== undefined ? Math.max(10, Math.min(50, action.payload.keywordsMaxCount)) : state.generationSettings.keywordsMaxCount
      
      const descriptionWords = action.payload.descriptionWords !== undefined ? Math.max(5, Math.min(50, action.payload.descriptionWords)) : state.generationSettings.descriptionWords
      const descriptionMinWords = action.payload.descriptionMinWords !== undefined ? Math.max(5, Math.min(50, action.payload.descriptionMinWords)) : state.generationSettings.descriptionMinWords
      const descriptionMaxWords = action.payload.descriptionMaxWords !== undefined ? Math.max(5, Math.min(50, action.payload.descriptionMaxWords)) : state.generationSettings.descriptionMaxWords
      
      const platforms = action.payload.platforms || state.generationSettings.platforms
      const keywordSettings = action.payload.keywordSettings || state.generationSettings.keywordSettings
      const customization = action.payload.customization || state.generationSettings.customization
      const titleCustomization = action.payload.titleCustomization || state.generationSettings.titleCustomization

      console.log('💾 Saving generation settings:', { 
        titleWords, titleMinWords, titleMaxWords,
        keywordsCount, keywordsMinCount, keywordsMaxCount,
        descriptionWords, descriptionMinWords, descriptionMaxWords,
        platforms, keywordSettings, customization, titleCustomization 
      })

      // Update Redux state
      state.generationSettings = { 
        titleWords, titleMinWords, titleMaxWords,
        keywordsCount, keywordsMinCount, keywordsMaxCount,
        descriptionWords, descriptionMinWords, descriptionMaxWords,
        platforms, keywordSettings, customization, titleCustomization 
      }

      // Save to localStorage for persistence
      try {
        localStorage.setItem('generationTitleWords', titleWords.toString())
        localStorage.setItem('generationTitleMinWords', titleMinWords.toString())
        localStorage.setItem('generationTitleMaxWords', titleMaxWords.toString())
        localStorage.setItem('generationKeywordsCount', keywordsCount.toString())
        localStorage.setItem('generationKeywordsMinCount', keywordsMinCount.toString())
        localStorage.setItem('generationKeywordsMaxCount', keywordsMaxCount.toString())
        localStorage.setItem('generationDescriptionWords', descriptionWords.toString())
        localStorage.setItem('generationDescriptionMinWords', descriptionMinWords.toString())
        localStorage.setItem('generationDescriptionMaxWords', descriptionMaxWords.toString())
        localStorage.setItem('generationPlatforms', JSON.stringify(platforms))
        if (keywordSettings) {
          localStorage.setItem('generationKeywordSettings', JSON.stringify(keywordSettings))
        }
        if (customization) {
          localStorage.setItem('generationCustomization', JSON.stringify(customization))
        }
        if (titleCustomization) {
          localStorage.setItem('generationTitleCustomization', JSON.stringify(titleCustomization))
        }
        console.log('✅ Generation settings saved to localStorage successfully')
      } catch (error) {
        console.error('❌ Error saving generation settings to localStorage:', error)
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateApiKey.pending, (state) => {
        state.isValidating = true
        state.validationError = null
      })
      .addCase(validateApiKey.fulfilled, (state) => {
        state.isValidating = false
        state.isApiKeyValid = true
        state.validationError = null
      })
      .addCase(validateApiKey.rejected, (state, action) => {
        state.isValidating = false
        state.isApiKeyValid = false
        state.validationError = action.payload as string
      })

      // Multiple API key validation
      .addCase(validateMultipleApiKey.pending, (state, action) => {
        const key = state.apiKeys.find(k => k.id === action.meta.arg.id)
        if (key) {
          key.isValidating = true
          key.validationError = null
        }
        state.isValidatingAny = true
      })
      .addCase(validateMultipleApiKey.fulfilled, (state, action) => {
        const key = state.apiKeys.find(k => k.id === action.payload.id)
        if (key) {
          key.isValidating = false
          key.isValid = true
          key.validationError = null
        }

        // Check if any keys are still validating
        state.isValidatingAny = state.apiKeys.some(k => k.isValidating)
        saveApiKeysToStorage(state.apiKeys)

        // Check if onboarding should be completed (5+ valid keys)
        const validApiKeys = state.apiKeys.filter(k => k.isValid).length
        if (validApiKeys >= 5 && !state.hasCompletedOnboarding) {
          state.hasCompletedOnboarding = true
          localStorage.setItem('hasCompletedOnboarding', 'true')
        }
      })
      .addCase(validateMultipleApiKey.rejected, (state, action) => {
        const payload = action.payload as { id: string; error: string }
        const key = state.apiKeys.find(k => k.id === payload.id)
        if (key) {
          key.isValidating = false
          key.isValid = false
          key.validationError = payload.error
        }

        // Check if any keys are still validating
        state.isValidatingAny = state.apiKeys.some(k => k.isValidating)
        saveApiKeysToStorage(state.apiKeys)
      })

      // Together API key validation
      .addCase(validateTogetherApiKey.pending, (state) => {
        state.isValidatingTogetherApiKey = true
        state.togetherApiKeyValidationError = null
      })
      .addCase(validateTogetherApiKey.fulfilled, (state) => {
        state.isValidatingTogetherApiKey = false
        state.isTogetherApiKeyValid = true
        state.togetherApiKeyValidationError = null
      })
      .addCase(validateTogetherApiKey.rejected, (state, action) => {
        state.isValidatingTogetherApiKey = false
        state.isTogetherApiKeyValid = false
        state.togetherApiKeyValidationError = action.payload as string
      })
  }
})

export const {
  setApiKey,
  clearValidationError,
  addApiKey,
  removeApiKey,
  updateApiKeyName,
  incrementApiKeyUsage,
  resetApiKeyUsage,
  clearApiKeyError,
  setTogetherApiKey,
  clearTogetherValidationError,
  toggleDarkMode,
  setDarkMode,
  setThemePreference,
  completeOnboarding,
  checkOnboardingCompletion,
  setAnalyticsEnabled,
  setAutoDownloadCsv,
  debugGenerationSettings,
  updateGenerationSettings
} = settingsSlice.actions

export default settingsSlice.reducer
