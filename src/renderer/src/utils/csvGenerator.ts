export interface ImageData {
  title: string
  keywords: string[]
  description: string
  filename: string
}

interface PlatformCSVConfig {
  headers: string[]
  formatRow: (data: ImageData) => string[]
}

// Platform-specific CSV configurations
const platformConfigs: Record<string, PlatformCSVConfig> = {
  '123rf': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Stock Photos'
    ]
  },
  'adobe-stock': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Creative'
    ]
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
    headers: ['File Name', 'Title', 'Tags', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Design Elements'
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
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Photography'
    ]
  },
  'freepik': {
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Vectors'
    ]
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
    headers: ['Filename', 'Title', 'Keywords', 'Description', 'Category'],
    formatRow: (data) => [
      data.filename,
      data.title,
      data.keywords.join(', '),
      data.description,
      'Editorial'
    ]
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

  // Add headers
  lines.push(config.headers.map(escapeCSVField).join(','))

  // Add data rows
  imageDataList.forEach(imageData => {
    const row = config.formatRow(imageData)
    lines.push(row.map(escapeCSVField).join(','))
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
export function downloadMultiPlatformCSVs(platforms: string[], imageDataList: ImageData[]): void {
  const csvFiles = generateMultiPlatformCSVs(platforms, imageDataList)

  Object.entries(csvFiles).forEach(([platform, content]) => {
    const filename = `${platform}_export_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(content, filename)
  })
}
