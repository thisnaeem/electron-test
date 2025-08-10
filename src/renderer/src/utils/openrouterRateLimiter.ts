/**
 * OpenRouter Rate Limiter
 * Implements OpenRouter-specific rate limiting based on their API documentation
 */

import { ApiKeyInfo } from '../store/slices/settingsSlice'

interface OpenRouterKeyInfo {
  label: string
  usage: number // Number of credits used
  limit: number | null // Credit limit for the key, or null if unlimited
  is_free_tier: boolean // Whether the user has paid for credits before
}

interface OpenRouterRateLimitInfo {
  requestsInCurrentMinute: number
  requestsToday: number
  windowStartTime: number
  dayStartTime: number
  isLimited: boolean
  nextAvailableTime: number
  lastRequestTime?: number
  keyInfo?: OpenRouterKeyInfo
  isFreeModel: boolean
  hasCredits: boolean // Whether user has purchased at least 10 credits
}

// OpenRouter Rate Limits
const FREE_MODEL_RPM = 20 // 20 requests per minute for free models
const FREE_MODEL_DAILY_LIMIT_LOW = 50 // Daily limit if < 10 credits purchased
const FREE_MODEL_DAILY_LIMIT_HIGH = 1000 // Daily limit if >= 10 credits purchased
const PAID_MODEL_CREDITS_THRESHOLD = 10 // Credits needed for higher daily limits

const MINUTE_IN_MS = 60 * 1000
const DAY_IN_MS = 24 * 60 * 60 * 1000
const SAFETY_BUFFER = 2 // Leave 2 requests as buffer

export class OpenRouterRateLimiter {
  private rateLimitInfo: { [apiKeyId: string]: OpenRouterRateLimitInfo } = {}
  // private roundRobinIndex: number = 0 // reserved for future balancing

  constructor() {
    this.cleanupOldData()
  }

  /**
   * Check if an API key can make a request right now
   */
  canMakeRequest(apiKeyId: string, modelId: string): boolean {
    const info = this.getRateLimitInfo(apiKeyId, modelId)
    const now = Date.now()

    // Reset minute window if needed
    if (now - info.windowStartTime >= MINUTE_IN_MS) {
      info.requestsInCurrentMinute = 0
      info.windowStartTime = now
    }

    // Reset daily window if needed
    if (now - info.dayStartTime >= DAY_IN_MS) {
      info.requestsToday = 0
      info.dayStartTime = now
    }

    // Check minimum interval between requests (3 seconds for safety)
    if (info.lastRequestTime && (now - info.lastRequestTime) < 3000) {
      return false
    }

    // For free models, check both RPM and daily limits
    if (info.isFreeModel) {
      // Check RPM limit
      if (info.requestsInCurrentMinute >= (FREE_MODEL_RPM - SAFETY_BUFFER)) {
        console.log(`🚫 OpenRouter API key ${apiKeyId} hit RPM limit: ${info.requestsInCurrentMinute}/${FREE_MODEL_RPM}`)
        return false
      }

      // Check daily limit
      const dailyLimit = info.hasCredits ? FREE_MODEL_DAILY_LIMIT_HIGH : FREE_MODEL_DAILY_LIMIT_LOW
      if (info.requestsToday >= (dailyLimit - SAFETY_BUFFER)) {
        console.log(`🚫 OpenRouter API key ${apiKeyId} hit daily limit: ${info.requestsToday}/${dailyLimit}`)
        return false
      }
    }

    // For paid models, mainly check credit balance (handled by API)
    // We still apply a conservative RPM limit to avoid overwhelming
    if (!info.isFreeModel && info.requestsInCurrentMinute >= 50) {
      console.log(`🚫 OpenRouter API key ${apiKeyId} hit conservative RPM limit for paid model`)
      return false
    }

    return true
  }

  /**
   * Record a request being made
   */
  recordRequest(apiKeyId: string, modelId: string): void {
    const info = this.getRateLimitInfo(apiKeyId, modelId)
    const now = Date.now()

    // Reset windows if needed
    if (now - info.windowStartTime >= MINUTE_IN_MS) {
      info.requestsInCurrentMinute = 0
      info.windowStartTime = now
    }

    if (now - info.dayStartTime >= DAY_IN_MS) {
      info.requestsToday = 0
      info.dayStartTime = now
    }

    info.requestsInCurrentMinute++
    info.requestsToday++
    info.lastRequestTime = now

    // Update rate limiting status
    if (info.isFreeModel) {
      const dailyLimit = info.hasCredits ? FREE_MODEL_DAILY_LIMIT_HIGH : FREE_MODEL_DAILY_LIMIT_LOW

      if (info.requestsInCurrentMinute >= (FREE_MODEL_RPM - SAFETY_BUFFER) ||
          info.requestsToday >= (dailyLimit - SAFETY_BUFFER)) {
        info.isLimited = true

        // Next available time is either next minute or next day
        const nextMinute = info.windowStartTime + MINUTE_IN_MS
        const nextDay = info.dayStartTime + DAY_IN_MS
        info.nextAvailableTime = Math.min(nextMinute, nextDay)
      }
    }

    this.rateLimitInfo[apiKeyId] = info

    const dailyLimit = info.isFreeModel ? (info.hasCredits ? FREE_MODEL_DAILY_LIMIT_HIGH : FREE_MODEL_DAILY_LIMIT_LOW) : 'unlimited'
    console.log(`📊 OpenRouter API Key ${apiKeyId}: ${info.requestsInCurrentMinute}/${FREE_MODEL_RPM} RPM, ${info.requestsToday}/${dailyLimit} daily`)
  }

  /**
   * Get the next available API key for a request
   */
  getNextAvailableApiKey(apiKeys: ApiKeyInfo[], modelId: string): ApiKeyInfo | null {
    const validKeys = apiKeys.filter(key => key.isValid)
    if (validKeys.length === 0) return null

    // Get available keys (not rate limited)
    const availableKeys = validKeys.filter(key => this.canMakeRequest(key.id, modelId))

    if (availableKeys.length > 0) {
      // Use load-balanced selection: prefer keys with fewer requests
      const keyWithLoads = availableKeys.map(key => {
        const info = this.getRateLimitInfo(key.id, modelId)
        return {
          key,
          load: info.requestsInCurrentMinute + (info.requestsToday / 100), // Weight daily usage less
          remainingRPM: (FREE_MODEL_RPM - SAFETY_BUFFER) - info.requestsInCurrentMinute
        }
      })

      // Sort by remaining capacity (descending) then by load (ascending)
      keyWithLoads.sort((a, b) => {
        if (a.remainingRPM !== b.remainingRPM) {
          return b.remainingRPM - a.remainingRPM
        }
        return a.load - b.load
      })

      const selectedKey = keyWithLoads[0].key
      console.log(`🎯 OpenRouter load-balanced selection: ${selectedKey.name} (RPM remaining: ${keyWithLoads[0].remainingRPM})`)

      return selectedKey
    }

    // If no keys are available, find the one that will be available soonest
    let soonestKey: ApiKeyInfo | null = null
    let soonestTime = Infinity

    for (const apiKey of validKeys) {
      const info = this.getRateLimitInfo(apiKey.id, modelId)
      if (info.nextAvailableTime < soonestTime) {
        soonestTime = info.nextAvailableTime
        soonestKey = apiKey
      }
    }

    const waitTime = soonestTime - Date.now()
    console.log(`⏳ All OpenRouter keys rate limited, returning soonest available: ${soonestKey?.name} (available in ${Math.max(0, waitTime)}ms)`)
    return soonestKey
  }

  /**
   * Calculate wait time until next available request for any API key
   */
  getWaitTimeUntilNextAvailable(apiKeys: ApiKeyInfo[], modelId: string): number {
    const validKeys = apiKeys.filter(key => key.isValid)
    const now = Date.now()
    let minWaitTime = Infinity

    for (const apiKey of validKeys) {
      if (this.canMakeRequest(apiKey.id, modelId)) {
        return 0 // Can make request immediately
      }

      const info = this.getRateLimitInfo(apiKey.id, modelId)
      const waitTime = Math.max(0, info.nextAvailableTime - now)
      if (waitTime < minWaitTime) {
        minWaitTime = waitTime
      }
    }

    return minWaitTime === Infinity ? 0 : minWaitTime
  }

  /**
   * Update key information from OpenRouter API
   */
  async updateKeyInfo(apiKeyId: string, apiKey: string): Promise<void> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/key', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const keyInfo: OpenRouterKeyInfo = data.data

        // Update rate limit info with key details
        const existingInfo = this.rateLimitInfo[apiKeyId]
        if (existingInfo) {
          existingInfo.keyInfo = keyInfo
          existingInfo.hasCredits = keyInfo.usage >= PAID_MODEL_CREDITS_THRESHOLD || !keyInfo.is_free_tier
        }

        console.log(`📊 Updated OpenRouter key info for ${apiKeyId}:`, {
          usage: keyInfo.usage,
          limit: keyInfo.limit,
          is_free_tier: keyInfo.is_free_tier,
          hasCredits: existingInfo?.hasCredits
        })
      }
    } catch (error) {
      console.error(`❌ Failed to update OpenRouter key info for ${apiKeyId}:`, error)
    }
  }

  /**
   * Get rate limit info for a specific API key
   */
  getRateLimitInfo(apiKeyId: string, modelId: string): OpenRouterRateLimitInfo {
    if (!this.rateLimitInfo[apiKeyId]) {
      const isFreeModel = modelId.endsWith(':free')

      this.rateLimitInfo[apiKeyId] = {
        requestsInCurrentMinute: 0,
        requestsToday: 0,
        windowStartTime: Date.now(),
        dayStartTime: Date.now(),
        isLimited: false,
        nextAvailableTime: 0,
        isFreeModel,
        hasCredits: false // Will be updated when key info is fetched
      }
    }
    return this.rateLimitInfo[apiKeyId]
  }

  /**
   * Get optimal batch size based on available capacity
   */
  getOptimalBatchSize(apiKeys: ApiKeyInfo[], modelId: string, maxBatchSize: number = 20): number {
    const validKeys = apiKeys.filter(key => key.isValid)
    if (validKeys.length === 0) return 0

    // Calculate total available capacity across all keys
    const totalCapacity = validKeys.reduce((sum, key) => {
      const info = this.getRateLimitInfo(key.id, modelId)

      if (info.isFreeModel) {
        const rpmRemaining = Math.max(0, (FREE_MODEL_RPM - SAFETY_BUFFER) - info.requestsInCurrentMinute)
        const dailyLimit = info.hasCredits ? FREE_MODEL_DAILY_LIMIT_HIGH : FREE_MODEL_DAILY_LIMIT_LOW
        const dailyRemaining = Math.max(0, (dailyLimit - SAFETY_BUFFER) - info.requestsToday)
        return sum + Math.min(rpmRemaining, dailyRemaining)
      } else {
        // For paid models, use conservative estimate
        const rpmRemaining = Math.max(0, 50 - info.requestsInCurrentMinute)
        return sum + rpmRemaining
      }
    }, 0)

    const optimalSize = Math.min(totalCapacity, maxBatchSize)
    console.log(`🎯 OpenRouter optimal batch size: ${optimalSize} (total capacity: ${totalCapacity}, max: ${maxBatchSize})`)
    return optimalSize
  }

  /**
   * Get statistics for rate limiting
   */
  getStats(): {
    totalApiKeys: number
    limitedApiKeys: number
    totalRequestsInCurrentWindow: number
    totalRequestsToday: number
    averageRequestsPerKey: number
  } {
    const apiKeyIds = Object.keys(this.rateLimitInfo)
    const limitedKeys = apiKeyIds.filter(id => this.rateLimitInfo[id].isLimited)
    const totalRequestsRPM = apiKeyIds.reduce((sum, id) => sum + this.rateLimitInfo[id].requestsInCurrentMinute, 0)
    const totalRequestsDaily = apiKeyIds.reduce((sum, id) => sum + this.rateLimitInfo[id].requestsToday, 0)

    return {
      totalApiKeys: apiKeyIds.length,
      limitedApiKeys: limitedKeys.length,
      totalRequestsInCurrentWindow: totalRequestsRPM,
      totalRequestsToday: totalRequestsDaily,
      averageRequestsPerKey: apiKeyIds.length > 0 ? totalRequestsRPM / apiKeyIds.length : 0
    }
  }

  /**
   * Reset rate limit info for a specific API key
   */
  resetApiKeyLimits(apiKeyId: string): void {
    delete this.rateLimitInfo[apiKeyId]
  }

  /**
   * Clean up old rate limit data
   */
  private cleanupOldData(): void {
    const now = Date.now()
    const twoHoursAgo = now - (2 * 60 * 60 * 1000)

    for (const [apiKeyId, info] of Object.entries(this.rateLimitInfo)) {
      if (info.windowStartTime < twoHoursAgo) {
        delete this.rateLimitInfo[apiKeyId]
      }
    }
  }

  /**
   * Get all rate limit info
   */
  getAllRateLimitInfo(): { [apiKeyId: string]: OpenRouterRateLimitInfo } {
    return { ...this.rateLimitInfo }
  }
}

// Create singleton instance
export const openrouterRateLimiter = new OpenRouterRateLimiter()
