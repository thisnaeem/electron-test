import { useState, useCallback, ReactNode } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GeminiContext } from './GeminiContext.context'

export function GeminiProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [apiKey, setApiKey] = useState<string>('')
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const validateApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!key) return false
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      await model.startChat()
      const isValid = true
      setIsApiKeyValid(isValid)
      return isValid
    } catch (error) {
      console.error('Error validating API key:', error)
      setIsApiKeyValid(false)
      return false
    }
  }, [])

  const generateMetadata = useCallback(async (input: File | string): Promise<{ title: string; keywords: string[] }> => {
    if (!apiKey || !isApiKeyValid) {
      throw new Error('Invalid or missing API key')
    }

    setIsLoading(true)
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Convert File to base64 if needed
      let base64Data: string
      if (input instanceof File) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(input)
        })
      } else {
        base64Data = input
      }

      const prompt = `Generate metadata for this image in the following format:
      1. A concise but descriptive title (max 20 words)
      2. A list of 50 relevant keywords separated by commas

      Format the response exactly like this, with a line break between title and keywords:
      Title: [your title here]
      Keywords: [comma-separated keywords]`

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data.split(',')[1]
          }
        }
      ])

      const response = result.response
      const text = response.text()

      // Parse the response
      const [titleLine, keywordsLine] = text.split('\n').filter(line => line.trim())

      const title = titleLine.replace('Title:', '').trim()
      const keywords = keywordsLine
        .replace('Keywords:', '')
        .split(',')
        .map(k => k.trim())
        .filter(k => k)

      return { title, keywords }
    } catch (error) {
      console.error('Error generating metadata:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, isApiKeyValid])

  const contextValue = {
    apiKey,
    setApiKey,
    isApiKeyValid,
    validateApiKey,
    generateMetadata,
    isLoading
  }

  return (
    <GeminiContext.Provider value={contextValue}>
      {children}
    </GeminiContext.Provider>
  )
}
