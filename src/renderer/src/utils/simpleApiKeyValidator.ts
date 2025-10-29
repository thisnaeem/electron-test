/**
 * Simple API Key Validator
 * 
 * A fallback validator that uses a simpler approach for testing API keys
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface SimpleValidationResult {
  isValid: boolean
  error?: string
  modelUsed?: string
}

export async function validateGeminiApiKey(apiKey: string): Promise<SimpleValidationResult> {
  console.log('🔍 Simple validation starting...')
  console.log('🔍 API key length:', apiKey?.length)
  console.log('🔍 API key starts with:', apiKey?.substring(0, 10))
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.log('❌ API key is empty')
    return { isValid: false, error: 'API key is required' }
  }

  const trimmedKey = apiKey.trim()
  console.log('🔍 Trimmed key length:', trimmedKey.length)
  console.log('🔍 Trimmed key starts with:', trimmedKey.substring(0, 10))
  
  // Basic format check
  if (!trimmedKey.startsWith('AIza')) {
    console.log('❌ API key does not start with AIza')
    return { isValid: false, error: 'API key must start with "AIza"' }
  }
  
  if (trimmedKey.length < 15) {
    console.log('❌ API key too short:', trimmedKey.length)
    return { isValid: false, error: 'API key too short' }
  }

  const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`🧪 Testing with ${modelName}...`)
      
      const genAI = new GoogleGenerativeAI(trimmedKey)
      const model = genAI.getGenerativeModel({ model: modelName })

      // Use a simple text prompt instead of image
      const result = await Promise.race([
        model.generateContent('Say "Hello" if you can read this.'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]) as any

      const response = result.response
      const text = response.text()

      if (text && text.trim().length > 0) {
        console.log(`✅ Simple validation successful with ${modelName}`)
        return { isValid: true, modelUsed: modelName }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.log(`❌ ${modelName} failed:`, errorMsg)
      console.log('🔍 Full error object:', error)
      
      // If it's an auth error, the key is definitely invalid
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        
        if (msg.includes('api_key_invalid') || 
            msg.includes('invalid api key') || 
            msg.includes('api key not valid') ||
            msg.includes('invalid_argument')) {
          console.log('❌ Definitive auth error - key is invalid')
          return { isValid: false, error: 'Invalid API key - please check your key' }
        }
        
        if (msg.includes('quota') || msg.includes('billing')) {
          console.log('❌ Quota/billing error')
          return { isValid: false, error: 'API quota exceeded - check your Google Cloud billing' }
        }
        
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
          console.log('❌ Rate limit error')
          return { isValid: false, error: 'Rate limit exceeded - please wait and try again' }
        }
      }
      
      continue
    }
  }

  return { isValid: false, error: 'All validation attempts failed' }
}