import { ApiKeyInfo } from '../store/slices/settingsSlice'
import { RateLimitInfo } from '../context/GeminiContext.types'

// Gemini API rate limit: 12 requests per minute per API key
const REQUESTS_PER_MINUTE = 12
const MINUTE_IN_MS = 60 * 1000

export class RateLimiter {
  private rateLimitInfo: { [apiKeyId: string]: RateLimitInfo } = {}

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
   */
  getNextAvailableApiKey(apiKeys: ApiKeyInfo[]): ApiKeyInfo | null {
    const validApiKeys = apiKeys.filter(key => key.isValid)

    // First, try to find a key that's not rate limited
    for (const apiKey of validApiKeys) {
      if (this.canMakeRequest(apiKey.id)) {
        return apiKey
      }
    }

    // If all keys are rate limited, find the one that will be available soonest
    let soonestKey: ApiKeyInfo | null = null
    let soonestTime = Infinity

    for (const apiKey of validApiKeys) {
      const info = this.getRateLimitInfo(apiKey.id)
      if (info.nextAvailableTime < soonestTime) {
        soonestTime = info.nextAvailableTime
        soonestKey = apiKey
      }
    }

    return soonestKey
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
