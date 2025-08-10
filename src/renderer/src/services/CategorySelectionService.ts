/**
 * AI-Powered Category Selection Service
 * 
 * Uses AI to analyze images and automatically select appropriate categories
 * for different stock photo platforms
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { 
  DREAMSTIME_CATEGORIES, 
  ADOBE_STOCK_CATEGORIES, 
  SHUTTERSTOCK_CATEGORIES,
  DreamstimeCategory,
  AdobeStockCategory,
  ShutterstockCategory
} from '../utils/platformCategories'

export interface CategorySuggestion {
  platform: 'dreamstime' | 'shutterstock' | 'adobe'
  categories: number[]
  confidence: number
  reasoning: string
}

export interface ImageAnalysisResult {
  suggestions: CategorySuggestion[]
  primarySubjects: string[]
  visualElements: string[]
  mood: string
  style: string
}

export class CategorySelectionService {
  private static instance: CategorySelectionService
  private apiKey: string | null = null

  private constructor() {}

  public static getInstance(): CategorySelectionService {
    if (!CategorySelectionService.instance) {
      CategorySelectionService.instance = new CategorySelectionService()
    }
    return CategorySelectionService.instance
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Analyze image and suggest categories for all platforms
   */
  public async analyzeImageForCategories(
    imageData: string,
    filename: string,
    existingMetadata?: {
      title?: string
      description?: string
      keywords?: string[]
    }
  ): Promise<ImageAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('API key not set for category analysis')
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Create comprehensive prompt for category analysis
      const prompt = this.createCategoryAnalysisPrompt(filename, existingMetadata)

      const content = [
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(imageData),
            data: imageData.split(',')[1] // Remove data URL prefix
          }
        }
      ]

      console.log('🔍 Analyzing image for category suggestions...')
      const result = await model.generateContent(content)
      const response = result.response.text()

      return this.parseAnalysisResponse(response)

    } catch (error) {
      console.error('❌ Category analysis failed:', error)
      // Return fallback suggestions
      return this.getFallbackSuggestions()
    }
  }

  /**
   * Create a comprehensive prompt for category analysis
   */
  private createCategoryAnalysisPrompt(
    filename: string,
    existingMetadata?: {
      title?: string
      description?: string
      keywords?: string[]
    }
  ): string {
    const dreamstimeCategoriesText = this.formatCategoriesForPrompt(DREAMSTIME_CATEGORIES, 'dreamstime')
    const shutterstockCategoriesText = this.formatCategoriesForPrompt(SHUTTERSTOCK_CATEGORIES, 'shutterstock')
    const adobeCategoriesText = this.formatCategoriesForPrompt(ADOBE_STOCK_CATEGORIES, 'adobe')

    return `Analyze this image and suggest the most appropriate categories for stock photo platforms.

FILENAME: ${filename}
${existingMetadata?.title ? `TITLE: ${existingMetadata.title}` : ''}
${existingMetadata?.description ? `DESCRIPTION: ${existingMetadata.description}` : ''}
${existingMetadata?.keywords ? `KEYWORDS: ${existingMetadata.keywords.join(', ')}` : ''}

Please analyze the image and provide category suggestions for these platforms:

DREAMSTIME CATEGORIES (select up to 3):
${dreamstimeCategoriesText}

SHUTTERSTOCK CATEGORIES (select up to 2):
${shutterstockCategoriesText}

ADOBE STOCK CATEGORIES (select 1):
${adobeCategoriesText}

INSTRUCTIONS:
1. Carefully examine the image content, subjects, style, mood, and composition
2. Consider the existing metadata if provided
3. Select the most relevant categories for each platform
4. Provide confidence scores (0-100) for your selections
5. Explain your reasoning

RESPONSE FORMAT (JSON):
{
  "primarySubjects": ["subject1", "subject2"],
  "visualElements": ["element1", "element2"],
  "mood": "description of mood/atmosphere",
  "style": "description of visual style",
  "suggestions": [
    {
      "platform": "dreamstime",
      "categories": [id1, id2, id3],
      "confidence": 85,
      "reasoning": "explanation of why these categories were selected"
    },
    {
      "platform": "shutterstock", 
      "categories": [id1, id2],
      "confidence": 90,
      "reasoning": "explanation of why these categories were selected"
    },
    {
      "platform": "adobe",
      "categories": [id1],
      "confidence": 88,
      "reasoning": "explanation of why this category was selected"
    }
  ]
}

Respond ONLY with valid JSON.`
  }

  /**
   * Format categories for the AI prompt
   */
  private formatCategoriesForPrompt(
    categories: (DreamstimeCategory | AdobeStockCategory | ShutterstockCategory)[],
    platform: string
  ): string {
    if (platform === 'dreamstime') {
      const dreamstimeCategories = categories as DreamstimeCategory[]
      const grouped = dreamstimeCategories.reduce((acc, cat) => {
        if (!acc[cat.parent]) acc[cat.parent] = []
        acc[cat.parent].push(`${cat.id}: ${cat.name}`)
        return acc
      }, {} as Record<string, string[]>)

      return Object.entries(grouped)
        .map(([parent, cats]) => `${parent}: ${cats.join(', ')}`)
        .join('\n')
    } else {
      return categories
        .map(cat => `${cat.id}: ${cat.name}`)
        .join(', ')
    }
  }

  /**
   * Parse the AI response and extract category suggestions
   */
  private parseAnalysisResponse(response: string): ImageAnalysisResult {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate the structure
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response structure')
      }

      return {
        primarySubjects: parsed.primarySubjects || [],
        visualElements: parsed.visualElements || [],
        mood: parsed.mood || '',
        style: parsed.style || '',
        suggestions: parsed.suggestions.map((suggestion: any) => ({
          platform: suggestion.platform,
          categories: suggestion.categories || [],
          confidence: suggestion.confidence || 0,
          reasoning: suggestion.reasoning || ''
        }))
      }

    } catch (error) {
      console.error('❌ Failed to parse AI response:', error)
      return this.getFallbackSuggestions()
    }
  }

  /**
   * Get fallback suggestions when AI analysis fails
   */
  private getFallbackSuggestions(): ImageAnalysisResult {
    return {
      primarySubjects: ['Unknown'],
      visualElements: ['General'],
      mood: 'Neutral',
      style: 'Standard',
      suggestions: [
        {
          platform: 'dreamstime',
          categories: [141, 112, 164], // Textures, Backgrounds, Colors
          confidence: 50,
          reasoning: 'Fallback categories due to analysis failure'
        },
        {
          platform: 'shutterstock',
          categories: [1, 4], // Abstract, Backgrounds/Textures
          confidence: 50,
          reasoning: 'Fallback categories due to analysis failure'
        },
        {
          platform: 'adobe',
          categories: [8], // Graphic Resources
          confidence: 50,
          reasoning: 'Fallback category due to analysis failure'
        }
      ]
    }
  }

  /**
   * Get MIME type from image data
   */
  private getMimeType(imageData: string): string {
    if (imageData.startsWith('data:image/png')) return 'image/png'
    if (imageData.startsWith('data:image/jpeg')) return 'image/jpeg'
    if (imageData.startsWith('data:image/jpg')) return 'image/jpeg'
    if (imageData.startsWith('data:image/webp')) return 'image/webp'
    return 'image/jpeg' // Default fallback
  }

  /**
   * Get category name by ID for a specific platform
   */
  public getCategoryName(platform: 'dreamstime' | 'shutterstock' | 'adobe', categoryId: number): string {
    let categories: any[]
    
    switch (platform) {
      case 'dreamstime':
        categories = DREAMSTIME_CATEGORIES
        break
      case 'shutterstock':
        categories = SHUTTERSTOCK_CATEGORIES
        break
      case 'adobe':
        categories = ADOBE_STOCK_CATEGORIES
        break
      default:
        return 'Unknown'
    }

    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  /**
   * Validate category selections for a platform
   */
  public validateCategorySelection(
    platform: 'dreamstime' | 'shutterstock' | 'adobe',
    categoryIds: number[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    let maxCategories: number

    switch (platform) {
      case 'dreamstime':
        maxCategories = 3
        break
      case 'shutterstock':
        maxCategories = 2
        break
      case 'adobe':
        maxCategories = 1
        break
    }

    if (categoryIds.length > maxCategories) {
      errors.push(`${platform} allows maximum ${maxCategories} categories, but ${categoryIds.length} were provided`)
    }

    if (categoryIds.length === 0) {
      errors.push(`At least one category must be selected for ${platform}`)
    }

    // Validate that category IDs exist
    let validCategories: any[]
    switch (platform) {
      case 'dreamstime':
        validCategories = DREAMSTIME_CATEGORIES
        break
      case 'shutterstock':
        validCategories = SHUTTERSTOCK_CATEGORIES
        break
      case 'adobe':
        validCategories = ADOBE_STOCK_CATEGORIES
        break
    }

    const validIds = validCategories.map(cat => cat.id)
    const invalidIds = categoryIds.filter(id => !validIds.includes(id))
    
    if (invalidIds.length > 0) {
      errors.push(`Invalid category IDs for ${platform}: ${invalidIds.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const categorySelectionService = CategorySelectionService.getInstance()