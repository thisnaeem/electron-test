import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface SettingsState {
  apiKey: string
  isApiKeyValid: boolean
  isValidating: boolean
  validationError: string | null
}

const initialState: SettingsState = {
  apiKey: localStorage.getItem('geminiApiKey') || '',
  isApiKeyValid: localStorage.getItem('geminiApiKeyValid') === 'true',
  isValidating: false,
  validationError: null
}

export const validateApiKey = createAsyncThunk(
  'settings/validateApiKey',
  async (key: string, { rejectWithValue }) => {
    if (!key) return rejectWithValue('API key is required')

    try {
      const genAI = new GoogleGenerativeAI(key)
      // Use gemini-2.0-flash as requested
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Simple validation - just try to start a chat
      await model.startChat()

      // Store in localStorage for persistence
      localStorage.setItem('geminiApiKey', key)
      localStorage.setItem('geminiApiKeyValid', 'true')

      return true
    } catch (error) {
      console.error('API key validation error:', error)
      localStorage.setItem('geminiApiKeyValid', 'false')
      return rejectWithValue(
        error instanceof Error
          ? `Failed to validate API key: ${error.message}`
          : 'Failed to validate API key. Check your internet connection and API key.'
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
  }
})

export const { setApiKey, clearValidationError } = settingsSlice.actions
export default settingsSlice.reducer
