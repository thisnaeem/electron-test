import { createContext } from 'react'
import { GeminiContextType } from './GeminiContext.types'

export const GeminiContext = createContext<GeminiContextType | undefined>(undefined)
