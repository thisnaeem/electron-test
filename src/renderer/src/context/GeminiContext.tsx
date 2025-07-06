import { useCallback, ReactNode, useState } from 'react'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { GeminiContext } from './GeminiContext.context'
import { useAppSelector } from '../store/hooks'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export function GeminiProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { apiKey, isApiKeyValid } = useAppSelector(state => state.settings)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const generateMetadata = useCallback(async (input: { imageData: string; filename: string }[]): Promise<{ filename: string; title: string; keywords: string[] }[]> => {
    if (!apiKey || !isApiKeyValid) {
      throw new Error('Invalid or missing API key. Please check your API key in Settings.')
    }

    setIsLoading(true)
    setError(null)

    const results: { filename: string; title: string; keywords: string[] }[] = []

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const modelName = 'gemini-2.0-flash'
      const model = genAI.getGenerativeModel({ model: modelName })

      // Process each image individually
      for (let i = 0; i < input.length; i++) {
        const { imageData, filename } = input[i]
        let retries = 0
        let lastError: Error | null = null

        while (retries < MAX_RETRIES) {
          try {
            console.log(`Processing image ${i + 1}/${input.length}: ${filename}, attempt ${retries + 1}`)

            // Check if base64 data is valid
            if (!imageData || !imageData.includes(',')) {
              throw new Error('Invalid image data')
            }

            const prompt = `Analyze this image and provide metadata in the following exact format:

Title: [A descriptive title in exactly 15 words]
Keywords: [Exactly 45-50 relevant keywords separated by commas]

Requirements:
- Title must be exactly 15 words, descriptive and engaging
- Keywords must be 45-50 items, relevant to the image content
- Focus on objects, colors, style, mood, and context visible in the image
- Use single words or short phrases for keywords
- Separate keywords with commas only

Respond with only the title and keywords in the specified format.`

            const content: (string | Part)[] = [
              prompt,
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageData.split(',')[1]
                }
              }
            ]

            const result = await model.generateContent(content)
            const response = result.response
            const text = response.text()

            if (!text || text.trim().length === 0) {
              throw new Error('Empty response from Gemini API')
            }

            // Parse the response
            const lines = text.split('\n').filter(line => line.trim())
            let title = ''
            let keywords: string[] = []

            for (const line of lines) {
              if (line.toLowerCase().includes('title:')) {
                title = line.replace(/title:/i, '').trim()
              } else if (line.toLowerCase().includes('keywords:')) {
                keywords = line
                  .replace(/keywords:/i, '')
                  .split(',')
                  .map(k => k.trim())
                  .filter(k => k)
              }
            }

            // Fallback if parsing failed
            if (!title) {
              title = `Generated title for ${filename}`
            }
            if (keywords.length === 0) {
              keywords = ['image', 'photo', 'picture']
            }

            results.push({
              filename,
              title,
              keywords
            })

            break // Success, exit retry loop

          } catch (error) {
            console.error(`Image ${i + 1} (${filename}), attempt ${retries + 1} failed:`, error)
            lastError = error instanceof Error ? error : new Error('Unknown error occurred')
            setError(lastError.message)

            retries++
            if (retries < MAX_RETRIES) {
              console.log(`Retrying in ${RETRY_DELAY}ms...`)
              await wait(RETRY_DELAY * retries)
            }
          }
        }

        // If all retries failed for this image
        if (retries >= MAX_RETRIES) {
          results.push({
            filename,
            title: `Failed to generate title for ${filename}`,
            keywords: ['error', 'failed', 'generation']
          })
        }
      }

      setIsLoading(false)
      return results

    } catch (error) {
      console.error('Error in generateMetadata:', error)
      setIsLoading(false)
      throw error instanceof Error ? error : new Error('Failed to generate metadata')
    }
  }, [apiKey, isApiKeyValid])

  const contextValue = {
    apiKey,
    isApiKeyValid,
    generateMetadata,
    isLoading,
    error
  }

  return (
    <GeminiContext.Provider value={contextValue}>
      {children}
    </GeminiContext.Provider>
  )
}
