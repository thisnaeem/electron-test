import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LicenseInfo } from '../../services/keyauth'

interface AuthState {
  isAuthenticated: boolean
  user: LicenseInfo | null
  isLoading: boolean
  error: string | null
  showAuthModal: boolean
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  showAuthModal: false
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setAuthenticated: (state, action: PayloadAction<{ user: LicenseInfo }>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.error = null
      state.showAuthModal = false
    },
    setUnauthenticated: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.error = null
    },
    showAuthModal: (state) => {
      state.showAuthModal = true
    },
    hideAuthModal: (state) => {
      state.showAuthModal = false
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setLoading,
  setError,
  setAuthenticated,
  setUnauthenticated,
  showAuthModal,
  hideAuthModal,
  clearError
} = authSlice.actions

export default authSlice.reducer