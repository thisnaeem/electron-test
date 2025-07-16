import { configureStore } from '@reduxjs/toolkit'
import settingsReducer from './slices/settingsSlice'
import filesReducer from './slices/filesSlice'
import chatReducer from './slices/chatSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    files: filesReducer,
    chat: chatReducer,
    auth: authReducer
  }
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
