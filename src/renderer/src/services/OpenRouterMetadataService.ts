import OpenAI from 'openai'
import { MetadataResult, ImageInput } from '../context/GeminiContext.types'
import { openrouterRateLimiter } from '../utils/openrouterRateLimiter'

export class OpenRouterMetadataService {
  private openrouter: OpenAI
  private selectedModel: string

  constructor(apiKey: string, selectedModel: string = 'google/gemini-2.0-flash-exp:free') {
    this.openrouter = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'HTTP-Referer': 'https://csvgen-pro.com',
        'X-Title': 'CSVGen Pro'
      }
    })
    this.selectedModel = selectedModel
  }

  /**
   * Update the API key for this service instance
   */
  updateApiKey(apiKey: string): void {
    this.openrouter = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'HTTP-Referer': 'https://csvgen-pro.com',
        'X-Title': 'CSVGen Pro'
      }
    })
  }

  /**
   * Check if this service can make a request (rate limiting)
   */
  canMakeRequest(apiKeyId: string): boolean {
    return openrouterRateLimiter.canMakeRequest(apiKeyId, this.selectedModel)
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(apiKeyId: string): void {
    openrouterRateLimiter.recordRequest(apiKeyId, this.selectedModel)
  }

  async generateMetadataForSingleImage(
    imageInput: ImageInput,
    settings?: {
      titleWords: number;
      titleMinWords?: number;
      titleMaxWords?: number;
      keywordsCount: number;
      keywordsMinCount?: number;
      keywordsMaxCount?: number;
      descriptionWords: number;
      descriptionMinWords?: number;
      descriptionMaxWords?: number;
      keywordSettings?: {
        singleWord: boolean;
        doubleWord: boolean;
        mixed: boolean;
      }
      customization?: {
        customPrompt: boolean;
        customPromptText: string;
        prohibitedWords: boolean;
        prohibitedWordsList: string;
        transparentBackground: boolean;
        silhouette: boolean;
      }
      titleCustomization?: {
        titleStyle: string;
        customPrefix: boolean;
        prefixText: string;
        customPostfix: boolean;
        postfixText: string;
      }
    }
  ): Promise<MetadataResult> {
    const { imageData, filename, fileType, originalData } = imageInput

    try {
      // Check if base64 data is valid
      if (!imageData || !imageData.includes(',')) {
        throw new Error('Invalid image data')
      }

      const titleMinWords = settings?.titleMinWords || 8
      const titleMaxWords = settings?.titleMaxWords || 15
      const keywordsMinCount = settings?.keywordsMinCount || 20
      const keywordsMaxCount = settings?.keywordsMaxCount || 35
      const descriptionMinWords = settings?.descriptionMinWords || 30
      const descriptionMaxWords = settings?.descriptionMaxWords || 40
      const keywordSettings = settings?.keywordSettings
      const customization = settings?.customization
      const titleCustomization = settings?.titleCustomization

      // Determine keyword instruction based on settings
      let keywordInstruction = 'Use single words or short phrases for keywords'
      if (keywordSettings?.singleWord) {
        keywordInstruction = 'Use ONLY single words for keywords (no phrases or compound words)'
      } else if (keywordSettings?.doubleWord) {
        keywordInstruction = 'Use ONLY two-word phrases for keywords (exactly 2 words each, no single words)'
      } else if (keywordSettings?.mixed) {
        keywordInstruction = 'Use a mix of single words and two-word phrases for keywords'
      }

      // Handle prohibited words
      let prohibitedWordsInstruction = ''
      if (customization?.prohibitedWords && customization.prohibitedWordsList.trim()) {
        const prohibitedList = customization.prohibitedWordsList.split(',').map(w => w.trim()).filter(w => w)
        if (prohibitedList.length > 0) {
          prohibitedWordsInstruction = `\n- NEVER use these prohibited words: ${prohibitedList.join(', ')}`
        }
      }

      // Handle transparent background and silhouette
      let titleSuffix = ''
      const additionalKeywords: string[] = []

      if (customization?.transparentBackground) {
        titleSuffix += ' on transparent background'
        additionalKeywords.push('transparent background')
      }

      if (customization?.silhouette) {
        titleSuffix += ' silhouette'
        additionalKeywords.push('silhouette')
      }

      // Get title style instruction
      let titleStyleInstruction = ''
      if (titleCustomization?.titleStyle) {
        switch (titleCustomization.titleStyle) {
          case 'seo-optimized':
            titleStyleInstruction = ' Focus on SEO-friendly, keyword-rich titles that would rank well in search engines.'
            break
          case 'descriptive':
            titleStyleInstruction = ' Create detailed, descriptive titles that focus on visual elements and specific details.'
            break
          case 'short-concise':
            titleStyleInstruction = ' Generate brief, punchy titles that are concise and to the point.'
            break
          case 'creative':
            titleStyleInstruction = ' Use artistic and imaginative language to create creative, engaging titles.'
            break
          case 'commercial':
            titleStyleInstruction = ' Focus on business and commercial aspects, suitable for professional use.'
            break
          case 'emotional':
            titleStyleInstruction = ' Create titles that evoke emotions and feelings, connecting with the viewer.'
            break
          default:
            titleStyleInstruction = ' Generate engaging, descriptive titles suitable for stock photography.'
        }
      }

      // Adjust keywords count if we need to add special keywords
      const adjustedKeywordsMinCount = Math.max(1, keywordsMinCount - additionalKeywords.length)
      const adjustedKeywordsMaxCount = Math.max(adjustedKeywordsMinCount, keywordsMaxCount - additionalKeywords.length)

      // Create file type specific prompt
      let mediaTypeDescription = 'image'
      let analysisInstructions = 'Focus on objects, colors, style, mood, and context visible in the image'

      if (fileType === 'video') {
        mediaTypeDescription = 'video frame (extracted from a video file)'
        analysisInstructions = `This is a frame extracted from the video file "${filename}". Analyze what you see in this frame and generate metadata that represents the overall video content. Focus on subjects, actions, setting, style, colors, mood, and cinematography visible in this frame. Consider this frame as representative of the video's content`
      } else if (fileType === 'vector') {
        mediaTypeDescription = 'vector graphic (SVG or EPS file)'
        analysisInstructions = 'Focus on the design elements, style, colors, shapes, and intended use of this vector graphic'

        // For vectors, also analyze original content if available
        if (originalData) {
          analysisInstructions += '. Consider the vector file content and design elements'
        }
      }

      let basePrompt = `Analyze this ${mediaTypeDescription} and provide metadata in the following exact format:

Title: [A descriptive title between ${titleMinWords} and ${titleMaxWords} words${titleSuffix ? `, ending with "${titleSuffix.trim()}"` : ''}]
Description: [A descriptive summary between ${descriptionMinWords} and ${descriptionMaxWords} words]
Keywords: [Between ${adjustedKeywordsMinCount} and ${adjustedKeywordsMaxCount} relevant keywords separated by commas]

STRICT REQUIREMENTS - MUST FOLLOW EXACTLY:
- Title must be between ${titleMinWords} and ${titleMaxWords} words (not exactly, but within this range), descriptive and engaging, no extra characters, must be one sentence only like most stock agency ${mediaTypeDescription}s has like adobe stock${titleSuffix ? ` and must end with "${titleSuffix.trim()}"` : ''}${titleStyleInstruction}
- Description must be between ${descriptionMinWords} and ${descriptionMaxWords} words (not exactly, but within this range), providing a comprehensive summary of the ${mediaTypeDescription} content
- Keywords must be between ${adjustedKeywordsMinCount} and ${adjustedKeywordsMaxCount} items (not exactly, but within this range), all relevant to the ${mediaTypeDescription} content
- ${analysisInstructions}
- ${keywordInstruction}
- Separate keywords with commas only${prohibitedWordsInstruction}
- CRITICAL: Respect the word/keyword count ranges - generate content within the specified minimum and maximum limits

Respond with only the title, description, and keywords in the specified format.`

      // Add custom prompt if enabled
      if (customization?.customPrompt && customization.customPromptText.trim()) {
        basePrompt += `\n\nAdditional instructions: ${customization.customPromptText.trim()}`
      }

      console.log(`📸 Processing ${filename} with OpenRouter ${this.selectedModel}`)

      const response = await this.openrouter.chat.completions.create({
        model: this.selectedModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: basePrompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenRouter')
      }

      console.log(`📝 OpenRouter response for ${filename}:`, content.substring(0, 200) + '...')

      // Parse the response
      const lines = content.split('\n').filter(line => line.trim())
      let title = ''
      let description = ''
      let keywords: string[] = []

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.toLowerCase().startsWith('title:')) {
          title = trimmedLine.substring(6).trim()
        } else if (trimmedLine.toLowerCase().startsWith('description:')) {
          description = trimmedLine.substring(12).trim()
        } else if (trimmedLine.toLowerCase().startsWith('keywords:')) {
          const keywordString = trimmedLine.substring(9).trim()
          keywords = keywordString.split(',').map(k => k.trim()).filter(k => k)
        }
      }

      // Add additional keywords if specified
      if (additionalKeywords.length > 0) {
        keywords = [...keywords, ...additionalKeywords]
      }

      // Validate the parsed content
      if (!title || !description || keywords.length === 0) {
        throw new Error('Failed to parse OpenRouter response - missing required fields')
      }

      // Apply title customization
      if (titleCustomization?.customPrefix && titleCustomization.prefixText.trim()) {
        title = `${titleCustomization.prefixText.trim()} ${title}`
      }
      if (titleCustomization?.customPostfix && titleCustomization.postfixText.trim()) {
        title = `${title} ${titleCustomization.postfixText.trim()}`
      }

      console.log(`✅ OpenRouter metadata generated for ${filename}:`, {
        title: title.substring(0, 50) + '...',
        description: description.substring(0, 50) + '...',
        keywordCount: keywords.length
      })

      return {
        filename,
        title,
        description,
        keywords,
        failed: false
      }

    } catch (error) {
      console.error(`❌ OpenRouter metadata generation failed for ${filename}:`, error)
      return {
        filename,
        title: '',
        description: '',
        keywords: [],
        failed: true
      }
    }
  }

  /**
   * Validate OpenRouter API key by making a simple test request
   */
  async validateApiKey(): Promise<{ isValid: boolean; error?: string; modelUsed?: string }> {
    try {
      console.log('🔍 Validating OpenRouter API key...')

      const response = await this.openrouter.chat.completions.create({
        model: this.selectedModel,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message to validate the API key. Please respond with "API key is valid".'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })

      const content = response.choices[0]?.message?.content?.trim()

      if (content && content.length > 0) {
        console.log('✅ OpenRouter API key validation successful')
        return {
          isValid: true,
          modelUsed: this.selectedModel
        }
      } else {
        console.log('❌ OpenRouter API key validation failed: Empty response')
        return {
          isValid: false,
          error: 'Empty response from OpenRouter API'
        }
      }
    } catch (error) {
      console.error('❌ OpenRouter API key validation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      return {
        isValid: false,
        error: errorMessage
      }
    }
  }
}
