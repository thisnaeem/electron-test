import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
}

const initialState: SettingsState = {
  // Legacy fields
  apiKey: localStorage.getItem('geminiApiKey') || '',
  isApiKeyValid: localStorage.getItem('geminiApiKeyValid') === 'true',
  isValidating: false,
  validationError: null,

  // Multiple API keys
  apiKeys: JSON.parse(localStorage.getItem('geminiApiKeys') || '[]'),
  isValidatingAny: false
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
      localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
    },

    removeApiKey: (state, action: PayloadAction<string>) => {
      state.apiKeys = state.apiKeys.filter(key => key.id !== action.payload)
      localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
    },

    updateApiKeyName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const key = state.apiKeys.find(k => k.id === action.payload.id)
      if (key) {
        key.name = action.payload.name
        localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
      }
    },

    incrementApiKeyUsage: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.requestCount++
        key.lastRequestTime = Date.now()
        localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
      }
    },

    resetApiKeyUsage: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.requestCount = 0
        localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
      }
    },

    clearApiKeyError: (state, action: PayloadAction<string>) => {
      const key = state.apiKeys.find(k => k.id === action.payload)
      if (key) {
        key.validationError = null
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
        localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
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
        localStorage.setItem('geminiApiKeys', JSON.stringify(state.apiKeys))
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
  clearApiKeyError
} = settingsSlice.actions

export default settingsSlice.reducer
