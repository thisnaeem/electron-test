import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface GeminiContextType {
  apiKey: string
  setApiKey: (key: string) => void
  isApiKeyValid: boolean
  validateApiKey: (key: string) => Promise<boolean>
  generateMetadata: (imageUrl: string) => Promise<{ title: string; tags: string[] }>
  isLoading: boolean
}

const GeminiContext = createContext<GeminiContextType | undefined>(undefined)

interface GeminiProviderProps {
  children: ReactNode
}

export const GeminiProvider = ({ children }: GeminiProviderProps): React.JSX.Element => {
  const [apiKey, setApiKey] = useState<string>('')
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    // Load API key from localStorage on component mount
    const savedApiKey = localStorage.getItem('geminiApiKey')
    if (savedApiKey) {
      setApiKey(savedApiKey)
      validateApiKey(savedApiKey)
    }
  }, [])

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key) {
      setIsApiKeyValid(false)
      return false
    }

    setIsLoading(true)
    try {
      // Simple validation - in a real app, you would make an actual API call to validate
      // For demo purposes, we'll just check if the key is at least 20 characters long
      const isValid = key.length >= 20
      setIsApiKeyValid(isValid)

      if (isValid) {
        localStorage.setItem('geminiApiKey', key)
      }

      return isValid
    } catch (error) {
      console.error('Error validating API key:', error)
      setIsApiKeyValid(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const generateMetadata = async (_imageUrl: string): Promise<{ title: string; tags: string[] }> => {
    if (!apiKey || !isApiKeyValid) {
      throw new Error('Valid API key is required')
    }

    setIsLoading(true)
    try {
      // In a real app, you would make an actual API call to Gemini
      // For demo purposes, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call delay

      // Mock response based on image URL
      const mockResponses: Record<string, { title: string; tags: string[] }> = {
        default: {
          title: 'Beautiful landscape with mountains',
          tags: ['nature', 'landscape', 'mountains', 'scenic', 'outdoors']
        }
      }

      return mockResponses.default
    } catch (error) {
      console.error('Error generating metadata:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GeminiContext.Provider
      value={{
        apiKey,
        setApiKey,
        isApiKeyValid,
        validateApiKey,
        generateMetadata,
        isLoading
      }}
    >
      {children}
    </GeminiContext.Provider>
  )
}

export const useGemini = (): GeminiContextType => {
  const context = useContext(GeminiContext)
  if (context === undefined) {
    throw new Error('useGemini must be used within a GeminiProvider')
  }
  return context
}
