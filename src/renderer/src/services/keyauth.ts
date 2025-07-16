// KeyAuth service using IPC communication with main process

export interface LicenseInfo {
  username: string
  subscription: string
  subscriptionExpiry: string
  ip: string
  hwid: string
  createDate: string
  lastLogin: string
}

export interface AuthResponse {
  success: boolean
  message: string
  info?: LicenseInfo
}

class KeyAuthService {
  private currentUser: LicenseInfo | null = null

  async initialize(): Promise<boolean> {
    try {
      return await window.api.keyauth.initialize()
    } catch (error) {
      console.error('KeyAuth initialization failed:', error)
      return false
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const result = await window.api.keyauth.login(username, password)
      if (result.success && result.info) {
        this.currentUser = result.info
      }
      return result
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed'
      }
    }
  }

  async register(username: string, password: string, license: string): Promise<AuthResponse> {
    try {
      return await window.api.keyauth.register(username, password, license)
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed'
      }
    }
  }

  async license(licenseKey: string): Promise<AuthResponse> {
    try {
      const result = await window.api.keyauth.license(licenseKey)
      if (result.success && result.info) {
        this.currentUser = result.info
      }
      return result
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'License activation failed'
      }
    }
  }

  async getCurrentUser(): Promise<LicenseInfo | null> {
    try {
      const user = await window.api.keyauth.getCurrentUser()
      this.currentUser = user
      return user
    } catch (error) {
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      return await window.api.keyauth.isAuthenticated()
    } catch (error) {
      return false
    }
  }

  async logout(): Promise<void> {
    try {
      await window.api.keyauth.logout()
      this.currentUser = null
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Check if subscription is still valid
  async isSubscriptionValid(): Promise<boolean> {
    try {
      return await window.api.keyauth.isSubscriptionValid()
    } catch (error) {
      return false
    }
  }

  // Get days remaining in subscription
  async getDaysRemaining(): Promise<number> {
    try {
      return await window.api.keyauth.getDaysRemaining()
    } catch (error) {
      return 0
    }
  }

  // Sync methods for backward compatibility (using cached data)
  getCurrentUserSync(): LicenseInfo | null {
    return this.currentUser
  }

  isAuthenticatedSync(): boolean {
    return this.currentUser !== null
  }

  isSubscriptionValidSync(): boolean {
    if (!this.currentUser) return false
    
    const expiryDate = new Date(this.currentUser.subscriptionExpiry)
    const now = new Date()
    
    return expiryDate > now
  }

  getDaysRemainingSync(): number {
    if (!this.currentUser) return 0
    
    const expiryDate = new Date(this.currentUser.subscriptionExpiry)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }
}

export const keyAuthService = new KeyAuthService()
export default keyAuthService