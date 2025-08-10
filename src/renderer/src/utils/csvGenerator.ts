import { 
  selectDreamstimeCategories, 
  selectShutterstockCategories, 
  selectAdobeStockCategory
} from './platformCategories'
import { MetadataResult } from '../context/GeminiContext.types'

export interface ImageData {
  title: string
  keywords: string[]
  description: string
  filename: string
  categories?: {
    dreamstime?: number[]
    shutterstock?: number[]
    adobe?: number
  }
  platformOptions?: {
    dreamstime?: {
      isAiGenerated?: boolean
      isFree?: boolean
      isEditorial?: boolean
    }
    freepik?: {
      isAiGenerated?: boolean
      aiModel?: string
    }
    "123rf"?: {
      country?: string
    }
    canva?: {
      artistName?: string
    }
  }
}

interface PlatformCSVConfig {
  headers: string[] | ((data: ImageData) => string[])
  formatRow: (data: ImageData) => string[]
  separator?: string
}

// Platform-specific CSV configurations
const platformConfigs: Record<string, PlatformCSVConfig> = {
  '123rf': {
    headers: ['oldfilename', '123rf_filename', 'description', 'keywords', 'country'],
    formatRow: (data) => [
      data.filename,
      data.filename.replace(/\.[^/.]+$/, ''), // Remove extension
      data.description,
      data.keywords.join(','),
      data.platformOptions?.["123rf"]?.country || 'US'
    ]
  },
  'adobe-stock': {
    headers: ['Filename', 'Title', 'Keywords', 'Category'],
    formatRow: (data) => {
      // Convert ImageData to MetadataResult format for category selection
      const metadata: MetadataResult = {
        title: data.title,
        keywords: data.keywords,
        description: data.description,
        filename: data.filename
      }
      
      const categoryId = data.categories?.adobe || selectAdobeStockCategory(metadata)
      
      return [
        data.filename,
        data.title,
        data.keywords.join(","),
        categoryId.toString()
      ]
    }
  },
  'alamy': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join('; '),
      data.description,
      'Stock Photography'
    ]
  },
  'canva': {
    headers: ['filename', 'title', 'keywords', 'artist', 'locale', 'description'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(','),
      data.platformOptions?.canva?.artistName || 'Your Artist Name',
      'en',
      data.description
    ]
  },
  'depositphotos': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Stock Photos'
    ]
  },
  'dreamstime': {
    headers: [
      'Filename',
      'Image Name',
      'Description',
      'Category 1',
      'Category 2', 
      'Category 3',
      'Keywords',
      'Free',
      'W-EL',
      'P-EL',
      'SR-EL',
      'SR-Price',
      'Editorial',
      'MR doc Ids',
      'Pr Docs'
    ],
    formatRow: (data) => {
      // Convert ImageData to MetadataResult format for category selection
      const metadata: MetadataResult = {
        title: data.title,
        keywords: data.keywords,
        description: data.description,
        filename: data.filename
      }
      
      const categories = selectDreamstimeCategories({
        ...metadata,
        platformOptions: { dreamstime: data.platformOptions?.dreamstime }
      })
      
      const isFree = data.platformOptions?.dreamstime?.isFree === true ? "1" : "0"
      const isEditorial = data.platformOptions?.dreamstime?.isEditorial === true ? "1" : "0"
      
      return [
        data.filename,
        data.title,
        data.description,
        categories[0]?.toString() || "",
        categories[1]?.toString() || "",
        categories[2]?.toString() || "",
        data.keywords.join(","),
        isFree,
        "0",
        "0", 
        "0",
        "0",
        isEditorial,
        "",
        "0"
      ]
    }
  },
  'freepik': {
    headers: (data: ImageData) => {
      // Check if AI generated from platform options
      const isAiGenerated = data.platformOptions?.freepik?.isAiGenerated === true
      return isAiGenerated 
        ? ['File name', 'Title', 'Keywords', 'Prompt', 'Model']
        : ['File name', 'Title', 'Keywords']
    },
    formatRow: (data) => {
      const isAiGenerated = data.platformOptions?.freepik?.isAiGenerated === true
      const aiModel = data.platformOptions?.freepik?.aiModel || 'Midjourney 6'
      
      return isAiGenerated
        ? [
            `"${data.filename}"`,
            `"${data.title}"`,
            `"${data.keywords.join(",")}"`,
            `"${data.description}"`,
            `"${aiModel}"`
          ]
        : [
            `"${data.filename}"`,
            `"${data.title}"`,
            `"${data.keywords.join(",")}"`
          ]
    },
    separator: ';' // Freepik uses semicolon separator
  },
  'general': {
    headers: ['Filename', 'Title', 'Keywords', 'Description'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description
    ]
  },
  'istock': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Stock Photos'
    ]
  },
  'motion': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Type'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Motion Graphics'
    ]
  },
  'pond5': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Stock Media'
    ]
  },
  'shutterstock': {
    headers: [
      'Filename',
      'Title',
      'Description', 
      'Keywords',
      'Category 1',
      'Category 2'
    ],
    formatRow: (data) => {
      // Convert ImageData to MetadataResult format for category selection
      const metadata: MetadataResult = {
        title: data.title,
        keywords: data.keywords,
        description: data.description,
        filename: data.filename
      }
      
      const categories = data.categories?.shutterstock || selectShutterstockCategories(metadata)
      
      return [
        data.filename,
        data.title,
        data.description,
        data.keywords.join(","),
        categories[0]?.toString() || "1",
        categories[1]?.toString() || "2"
      ]
    }
  },
  'vecteezy': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Vector Graphics'
    ]
  }
}

// Escape CSV field if it contains special characters
function escapeCSVField(field: string): string {
  if (field.includes('"') || field.includes(',') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

// Generate CSV content for a specific platform
export function generatePlatformCSV(platform: string, imageDataList: ImageData[]): string {
  const config = platformConfigs[platform]
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`)
  }

  const lines: string[] = []
  const separator = config.separator || ','

  // Get headers (can be dynamic based on first data item)
  const headers = typeof config.headers === 'function' 
    ? config.headers(imageDataList[0] || {} as ImageData)
    : config.headers

  // Add headers
  if (platform === 'freepik') {
    // Freepik doesn't need escaping for headers and uses semicolon
    lines.push(headers.join(separator))
  } else {
    lines.push(headers.map(escapeCSVField).join(separator))
  }

  // Add data rows
  imageDataList.forEach(imageData => {
    const row = config.formatRow(imageData)
    if (platform === 'freepik') {
      // Freepik rows are already quoted in formatRow
      lines.push(row.join(separator))
    } else {
      lines.push(row.map(escapeCSVField).join(separator))
    }
  })

  return lines.join('\n')
}

// Generate CSV files for multiple platforms
export function generateMultiPlatformCSVs(platforms: string[], imageDataList: ImageData[]): Record<string, string> {
  const csvFiles: Record<string, string> = {}

  platforms.forEach(platform => {
    try {
      csvFiles[platform] = generatePlatformCSV(platform, imageDataList)
    } catch (error) {
      console.error(`Error generating CSV for ${platform}:`, error)
    }
  })

  return csvFiles
}

// Download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// Download multiple CSV files for selected platforms
export function downloadMultiPlatformCSVs(
  platforms: string[], 
  imageDataList: ImageData[], 
  platformOptions?: any
): void {
  // Update imageDataList with platform options
  const updatedImageDataList = imageDataList.map(data => ({
    ...data,
    platformOptions
  }))

  const csvFiles = generateMultiPlatformCSVs(platforms, updatedImageDataList)

  Object.entries(csvFiles).forEach(([platform, content]) => {
    const filename = `${platform}_export_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(content, filename)
  })
}
