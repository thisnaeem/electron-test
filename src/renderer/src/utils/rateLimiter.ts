import { ApiKeyInfo } from '../store/slices/settingsSlice'
import { RateLimitInfo } from '../context/GeminiContext.types'

// Gemini API rate limit: 14 requests per minute per API key
const REQUESTS_PER_MINUTE = 14
const MINUTE_IN_MS = 60 * 1000
const SAFETY_BUFFER = 3 // Increased safety buffer to avoid hitting limits
const MIN_REQUEST_INTERVAL = 5000 // Minimum 5 seconds between requests from same key

export class RateLimiter {
  private rateLimitInfo: { [apiKeyId: string]: RateLimitInfo } = {}
  // private roundRobinIndex: number = 0 // For round-robin distribution (not used)
  private globalRequestCount: number = 0
  private globalWindowStart: number = Date.now()

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

    // Reset global window if minute has passed
    if (now - this.globalWindowStart >= MINUTE_IN_MS) {
      this.globalRequestCount = 0
      this.globalWindowStart = now
    }

    // Reset individual key window if minute has passed
    if (now - info.windowStartTime >= MINUTE_IN_MS) {
      info.requestsInCurrentMinute = 0
      info.windowStartTime = now
      info.isLimited = false
      info.nextAvailableTime = 0
    }

    // Check minimum interval between requests (increased to 10 seconds)
    if ((info as any).lastRequestTime && (now - (info as any).lastRequestTime) < (MIN_REQUEST_INTERVAL * 2)) {
      console.log(`🚫 API key ${apiKeyId} still in cooldown period`)
      return false
    }

    // Global rate limiting: max 5 requests per minute across ALL keys
    if (this.globalRequestCount >= 5) {
      console.log(`🚫 Global rate limit reached: ${this.globalRequestCount}/5 requests in current window`)
      return false
    }

    // Use safety buffer to avoid hitting exact rate limit
    const canMake = info.requestsInCurrentMinute < (REQUESTS_PER_MINUTE - SAFETY_BUFFER)
    if (!canMake) {
      console.log(`🚫 API key ${apiKeyId} rate limited: ${info.requestsInCurrentMinute}/${REQUESTS_PER_MINUTE - SAFETY_BUFFER}`)
    }
    return canMake
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
    ;(info as any).lastRequestTime = now

    // Check if we've hit the limit (with safety buffer)
    if (info.requestsInCurrentMinute >= (REQUESTS_PER_MINUTE - SAFETY_BUFFER)) {
      info.isLimited = true
      // Next available time is when the current window expires
      info.nextAvailableTime = info.windowStartTime + MINUTE_IN_MS
    }

    this.rateLimitInfo[apiKeyId] = info
    console.log(`📊 API Key ${apiKeyId}: ${info.requestsInCurrentMinute}/${REQUESTS_PER_MINUTE - SAFETY_BUFFER} requests in current window`)
  }

  /**
   * Get the next available API key that can make a request
   * Uses intelligent load balancing with round-robin fallback
   */
  getNextAvailableApiKey(apiKeys: ApiKeyInfo[]): ApiKeyInfo | null {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    if (validApiKeys.length === 0) return null

    // Get all available keys (not rate limited)
    const availableKeys = validApiKeys.filter(key => this.canMakeRequest(key.id))

    if (availableKeys.length > 0) {
      // Use load-balanced selection: prefer keys with fewer requests
      const keyWithLoads = availableKeys.map(key => ({
        key,
        load: this.getRateLimitInfo(key.id).requestsInCurrentMinute,
        remainingCapacity: (REQUESTS_PER_MINUTE - SAFETY_BUFFER) - this.getRateLimitInfo(key.id).requestsInCurrentMinute
      }))

      // Sort by remaining capacity (descending) then by load (ascending)
      keyWithLoads.sort((a, b) => {
        if (a.remainingCapacity !== b.remainingCapacity) {
          return b.remainingCapacity - a.remainingCapacity
        }
        return a.load - b.load
      })

      const selectedKey = keyWithLoads[0].key
      console.log(`🎯 Load-balanced selection: ${selectedKey.name} (load: ${keyWithLoads[0].load}/${REQUESTS_PER_MINUTE - SAFETY_BUFFER}, remaining: ${keyWithLoads[0].remainingCapacity})`)

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

    const waitTime = soonestTime - Date.now()
    console.log(`⏳ All keys rate limited, returning soonest available: ${soonestKey?.name} (available in ${Math.max(0, waitTime)}ms)`)
    return soonestKey
  }

  /**
   * Get a balanced distribution of API keys for batch processing
   * Optimally distributes requests to maximize throughput while respecting rate limits
   */
  getBalancedApiKeys(apiKeys: ApiKeyInfo[], batchSize: number): ApiKeyInfo[] {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    if (validApiKeys.length === 0) return []

    const result: ApiKeyInfo[] = []

    // Create a map of available capacity for each key
    const keyCapacities = validApiKeys.map(key => {
      const info = this.getRateLimitInfo(key.id)
      const remainingCapacity = Math.max(0, (REQUESTS_PER_MINUTE - SAFETY_BUFFER) - info.requestsInCurrentMinute)
      return {
        key,
        remainingCapacity,
        assigned: 0
      }
    })

    // Sort by remaining capacity (descending)
    keyCapacities.sort((a, b) => b.remainingCapacity - a.remainingCapacity)

    // Distribute requests optimally
    for (let i = 0; i < batchSize; i++) {
      // Find the key with the highest remaining capacity that hasn't been fully utilized
      const availableKey = keyCapacities.find(kc => kc.assigned < kc.remainingCapacity)

      if (availableKey) {
        result.push(availableKey.key)
        availableKey.assigned++
      } else {
        // If all keys are at capacity, use round-robin among all valid keys
        const keyIndex = i % validApiKeys.length
        result.push(validApiKeys[keyIndex])
      }
    }

    const distribution = keyCapacities
      .filter(kc => kc.assigned > 0)
      .map(kc => `${kc.key.name}:${kc.assigned}`)
      .join(', ')

    console.log(`📊 Optimally distributed ${batchSize} requests: ${distribution}`)
    return result
  }

  /**
   * Calculate wait time until next available request for any API key
   */
  getWaitTimeUntilNextAvailable(apiKeys: ApiKeyInfo[]): number {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    const now = Date.now()
    let minWaitTime = Infinity

    for (const apiKey of validApiKeys) {
      if (this.canMakeRequest(apiKey.id)) {
        return 0 // Can make request immediately
      }

      const info = this.getRateLimitInfo(apiKey.id)
      const waitTime = Math.max(0, info.nextAvailableTime - now)
      if (waitTime < minWaitTime) {
        minWaitTime = waitTime
      }
    }

    return minWaitTime === Infinity ? 0 : minWaitTime
  }

  /**
   * Get detailed availability forecast for all API keys
   */
  getAvailabilityForecast(apiKeys: ApiKeyInfo[]): Array<{
    key: ApiKeyInfo
    currentLoad: number
    remainingCapacity: number
    nextAvailableTime: number
    waitTimeMs: number
  }> {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    const now = Date.now()

    return validApiKeys.map(key => {
      const info = this.getRateLimitInfo(key.id)
      const remainingCapacity = Math.max(0, (REQUESTS_PER_MINUTE - SAFETY_BUFFER) - info.requestsInCurrentMinute)
      const waitTime = info.isLimited ? Math.max(0, info.nextAvailableTime - now) : 0

      return {
        key,
        currentLoad: info.requestsInCurrentMinute,
        remainingCapacity,
        nextAvailableTime: info.nextAvailableTime,
        waitTimeMs: waitTime
      }
    }).sort((a, b) => a.waitTimeMs - b.waitTimeMs) // Sort by availability
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
    // no-op: round-robin index not used currently
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
   * Calculate optimal batch size based on available API key capacity
   */
  getOptimalBatchSize(apiKeys: ApiKeyInfo[], maxBatchSize: number = 50): number {
    const validApiKeys = apiKeys.filter(key => key.isValid)
    if (validApiKeys.length === 0) return 0

    // Calculate total available capacity across all keys
    const totalCapacity = validApiKeys.reduce((sum, key) => {
      const info = this.getRateLimitInfo(key.id)
      const remainingCapacity = Math.max(0, (REQUESTS_PER_MINUTE - SAFETY_BUFFER) - info.requestsInCurrentMinute)
      return sum + remainingCapacity
    }, 0)

    // Return the minimum of total capacity and max batch size
    const optimalSize = Math.min(totalCapacity, maxBatchSize)
    console.log(`🎯 Optimal batch size: ${optimalSize} (total capacity: ${totalCapacity}, max: ${maxBatchSize})`)
    return optimalSize
  }

  /**
   * Get statistics for rate limiting
   */
  getStats(): {
    totalApiKeys: number
    limitedApiKeys: number
    totalRequestsInCurrentWindow: number
    averageRequestsPerKey: number
    totalCapacity: number
    utilizationPercentage: number
  } {
    const apiKeyIds = Object.keys(this.rateLimitInfo)
    const limitedKeys = apiKeyIds.filter(id => this.rateLimitInfo[id].isLimited)
    const totalRequests = apiKeyIds.reduce((sum, id) => sum + this.rateLimitInfo[id].requestsInCurrentMinute, 0)
    const totalCapacity = apiKeyIds.length * (REQUESTS_PER_MINUTE - SAFETY_BUFFER)
    const utilizationPercentage = totalCapacity > 0 ? (totalRequests / totalCapacity) * 100 : 0

    return {
      totalApiKeys: apiKeyIds.length,
      limitedApiKeys: limitedKeys.length,
      totalRequestsInCurrentWindow: totalRequests,
      averageRequestsPerKey: apiKeyIds.length > 0 ? totalRequests / apiKeyIds.length : 0,
      totalCapacity,
      utilizationPercentage
    }
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter()
