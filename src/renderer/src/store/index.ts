import { configureStore } from '@reduxjs/toolkit'
import settingsReducer from './slices/settingsSlice'
import filesReducer from './slices/filesSlice'

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    files: filesReducer
  }
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
