import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  name?: string
  email: string
  image?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

// Async thunk for Google login
export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (_, { rejectWithValue }) => {
    try {
      const result = await (window.api as any).googleLogin()
      if (result.success) {
        // Store user data in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(result.user))
        return result.user
      } else {
        return rejectWithValue(result.error || 'Login failed')
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed')
    }
  }
)

// Async thunk for logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const result = await (window.api as any).logout()
      if (result.success) {
        // Clear user data from localStorage
        localStorage.removeItem('user')
        return
      } else {
        return rejectWithValue(result.error || 'Logout failed')
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Logout failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action to restore user from localStorage on app start
    restoreUser: (state) => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          state.user = JSON.parse(storedUser)
          state.isAuthenticated = true
        } catch {
          // Invalid data in localStorage, clear it
          localStorage.removeItem('user')
        }
      }
    },
    // Action to clear any auth errors
    clearError: (state) => {
      state.error = null
    },
    // Action to manually set user (if needed)
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.error = null
    },
    // Action to clear user data
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Google login cases
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Logout cases
      .addCase(logout.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const { restoreUser, clearError, setUser, clearUser } = authSlice.actions
export default authSlice.reducer
