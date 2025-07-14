import { ApiKeyInfo } from '../store/slices/settingsSlice'
import { RateLimitInfo } from '../context/GeminiContext.types'

// Gemini API rate limit: 12 requests per minute per API key
const REQUESTS_PER_MINUTE = 12
const MINUTE_IN_MS = 60 * 1000

export class RateLimiter {
  private rateLimitInfo: { [apiKeyId: string]: RateLimitInfo } = {}
  private roundRobinIndex: number = 0 // For round-robin distribution

  constructor() {
    // Clean up old rate limit data on initialization
    this.cleanupOldData()
  }

  /**
   * Check if an API key can make a request right now
   */
  canMakeRequest(apiKeyId: string): boolean {
    const info = this.getRateLimitInfo(apiKeyId)
    const now = Date.now()

    // Reset window if minute has passed
    if (now - info.windowStartTime >= MINUTE_IN_MS) {
      info.requestsInCurrentMinute = 0
      info.windowStartTime = now
      info.isLimited = false
      info.nextAvailableTime = 0
    }

    return info.requestsInCurrentMinute < REQUESTS_PER_MINUTE
  }

  /**
   * Record a request being made
   */
  recordRequest(apiKeyId: string): void {
    const info = this.getRateLimitInfo(apiKeyId)
    const now = Date.now()

    // Reset window if minute has passed
    if (now - info.windowStartTime >= MINUTE_IN_MS) {
      info.requestsInCurrentMinute = 0
      info.windowStartTime = now
    }

    info.requestsInCurrentMinute++

    // Check if we've hit the limit
    if (info.requestsInCurrentMinute >= REQUESTS_PER_MINUTE) {
      info.isLimited = true
      // Next available time is when the current window expires
      info.nextAvailableTime = info.windowStartTime + MINUTE_IN_MS
    }

    this.rateLimitInfo[apiKeyId] = info
  }

      /**
   * Get the next available API key that can make a request
   * Uses strict round-robin distribution: 1->2->3->...->N->1->2->3...
   */
  getNextAvailableApiKey(apiKeys: ApiKeyInfo[]): ApiKeyInfo | null {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    if (validApiKeys.length === 0) return null

    // Get all available keys (not rate limited)
    const availableKeys = validApiKeys.filter(key => this.canMakeRequest(key.id))

    if (availableKeys.length > 0) {
      // Strict round-robin: always use the next key in sequence
      // Reset index if it's out of bounds for available keys
      if (this.roundRobinIndex >= availableKeys.length) {
        this.roundRobinIndex = 0
      }

      const selectedKey = availableKeys[this.roundRobinIndex]

      // Move to next key for the next request
      this.roundRobinIndex = (this.roundRobinIndex + 1) % availableKeys.length

      const nextKey = availableKeys[this.roundRobinIndex] || availableKeys[0]
      console.log(`🔄 Round-robin: Selected ${selectedKey.name} (#${this.roundRobinIndex}/${availableKeys.length}) → Next will be: ${nextKey?.name}`)
      return selectedKey
    }

    // If no keys are available, find the one that will be available soonest
    let soonestKey: ApiKeyInfo | null = null
    let soonestTime = Infinity

    for (const apiKey of validApiKeys) {
      const info = this.getRateLimitInfo(apiKey.id)
      if (info.nextAvailableTime < soonestTime) {
        soonestTime = info.nextAvailableTime
        soonestKey = apiKey
      }
    }

    console.log(`⏳ All keys rate limited, returning soonest available: ${soonestKey?.name}`)
    return soonestKey
  }

  /**
   * Get a balanced distribution of API keys for batch processing
   */
  getBalancedApiKeys(apiKeys: ApiKeyInfo[], batchSize: number): ApiKeyInfo[] {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    if (validApiKeys.length === 0) return []

    const availableKeys = validApiKeys.filter(key => this.canMakeRequest(key.id))
    const result: ApiKeyInfo[] = []

    // Distribute batch among available keys
    for (let i = 0; i < batchSize; i++) {
      if (availableKeys.length > 0) {
        const keyIndex = i % availableKeys.length
        result.push(availableKeys[keyIndex])
      }
    }

    console.log(`📊 Distributed ${batchSize} requests across ${availableKeys.length} available API keys`)
    return result
  }

  /**
   * Calculate wait time until next available request for any API key
   */
  getWaitTimeUntilNextAvailable(apiKeys: ApiKeyInfo[]): number {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    const now = Date.now()
    let minWaitTime = 0

    for (const apiKey of validApiKeys) {
      if (this.canMakeRequest(apiKey.id)) {
        return 0 // Can make request immediately
      }

      const info = this.getRateLimitInfo(apiKey.id)
      const waitTime = Math.max(0, info.nextAvailableTime - now)
      if (minWaitTime === 0 || waitTime < minWaitTime) {
        minWaitTime = waitTime
      }
    }

    return minWaitTime
  }

  /**
   * Get rate limit info for all API keys
   */
  getAllRateLimitInfo(): { [apiKeyId: string]: RateLimitInfo } {
    return { ...this.rateLimitInfo }
  }

  /**
   * Get rate limit info for a specific API key
   */
  getRateLimitInfo(apiKeyId: string): RateLimitInfo {
    if (!this.rateLimitInfo[apiKeyId]) {
      this.rateLimitInfo[apiKeyId] = {
        requestsInCurrentMinute: 0,
        windowStartTime: Date.now(),
        isLimited: false,
        nextAvailableTime: 0
      }
    }
    return this.rateLimitInfo[apiKeyId]
  }

  /**
   * Reset rate limit info for a specific API key
   */
  resetApiKeyLimits(apiKeyId: string): void {
    delete this.rateLimitInfo[apiKeyId]
  }

  /**
   * Reset round-robin index to ensure fresh distribution when API keys change
   */
  resetRoundRobin(): void {
    this.roundRobinIndex = 0
    console.log('🔄 Reset round-robin index for fresh API key distribution')
  }

  /**
   * Clean up old rate limit data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const now = Date.now()
    const twoHoursAgo = now - (2 * 60 * 60 * 1000) // 2 hours

    for (const [apiKeyId, info] of Object.entries(this.rateLimitInfo)) {
      if (info.windowStartTime < twoHoursAgo) {
        delete this.rateLimitInfo[apiKeyId]
      }
    }
  }

  /**
   * Get statistics for rate limiting
   */
  getStats(): {
    totalApiKeys: number
    limitedApiKeys: number
    totalRequestsInCurrentWindow: number
    averageRequestsPerKey: number
  } {
    const apiKeyIds = Object.keys(this.rateLimitInfo)
    const limitedKeys = apiKeyIds.filter(id => this.rateLimitInfo[id].isLimited)
    const totalRequests = apiKeyIds.reduce((sum, id) => sum + this.rateLimitInfo[id].requestsInCurrentMinute, 0)

    return {
      totalApiKeys: apiKeyIds.length,
      limitedApiKeys: limitedKeys.length,
      totalRequestsInCurrentWindow: totalRequests,
      averageRequestsPerKey: apiKeyIds.length > 0 ? totalRequests / apiKeyIds.length : 0
    }
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter()
