import { useContext } from 'react'
import { GeminiContext } from './GeminiContext.context'
import { GeminiContextType } from './GeminiContext.types'

export const useGemini = (): GeminiContextType => {
  const context = useContext(GeminiContext)

  if (!context) {
    throw new Error('useGemini must be used within a GeminiProvider')
  }

  return context
}
