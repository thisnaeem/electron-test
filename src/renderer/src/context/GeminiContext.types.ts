export interface GeminiContextType {
  apiKey: string
  setApiKey: (key: string) => void
  isApiKeyValid: boolean
  validateApiKey: (key: string) => Promise<boolean>
  generateMetadata: (input: File | string) => Promise<{ title: string; keywords: string[] }>
  isLoading: boolean
}
