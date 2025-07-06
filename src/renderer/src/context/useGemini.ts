import { useContext } from 'react'
import { GeminiContext } from './GeminiContext.context'
import { GeminiContextType } from './GeminiContext.types'
import { useAppDispatch } from '../store/hooks'
import { setApiKey, validateApiKey } from '../store/slices/settingsSlice'

export const useGemini = (): GeminiContextType & {
  setApiKey: (key: string) => void;
  validateApiKey: (key: string) => Promise<void>;
} => {
  const context = useContext(GeminiContext)
  const dispatch = useAppDispatch()

  if (!context) {
    throw new Error('useGemini must be used within a GeminiProvider')
  }

  // Add the Redux actions to the context
  return {
    ...context,
    setApiKey: (key: string) => dispatch(setApiKey(key)),
    validateApiKey: async (key: string) => {
      await dispatch(validateApiKey(key))
    }
  }
}
