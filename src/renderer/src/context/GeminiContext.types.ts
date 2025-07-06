export interface MetadataResult {
  filename: string
  title: string
  keywords: string[]
}

export interface ImageInput {
  imageData: string
  filename: string
}

export interface GeminiContextType {
  apiKey: string
  isApiKeyValid: boolean
  generateMetadata: (input: ImageInput[]) => Promise<MetadataResult[]>
  isLoading: boolean
  error: string | null
}
