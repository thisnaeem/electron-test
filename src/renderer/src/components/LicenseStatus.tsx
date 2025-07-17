import { useState, useEffect } from 'react'

interface UserInfo {
  username: string
  subscription: string
  subscriptionExpiry: string
  ip: string
  hwid: string
  createDate: string
  lastLogin: string
}

const LicenseStatus = (): React.JSX.Element => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status from localStorage
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const storedAuth = localStorage.getItem('keyauth_user')
        if (!storedAuth) {
          setIsAuthenticated(false)
          setUser(null)
          setIsLoading(false)
          return
        }

        const authData = JSON.parse(storedAuth)
        
        // Check if stored credentials are not too old (30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        if (authData.timestamp < thirtyDaysAgo) {
          localStorage.removeItem('keyauth_user')
          setIsAuthenticated(false)
          setUser(null)
          setIsLoading(false)
          return
        }

        // Set user data
        setUser(authData.userInfo)
        setIsAuthenticated(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking auth status:', error)
        localStorage.removeItem('keyauth_user')
        setIsAuthenticated(false)
        setUser(null)
        setIsLoading(false)
      }
    }

    checkAuthStatus()

    // Listen for storage changes (in case user logs out from another window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'keyauth_user') {
        checkAuthStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLogout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('keyauth_user')
      
      // Call logout API
      await window.api.keyauth.logout()
      
      // Update local state
      setIsAuthenticated(false)
      setUser(null)
      
      // Restart the app to show license screen
      window.location.reload()
    } catch (error) {
      console.error('Error during logout:', error)
      // Still clear local state even if API call fails
      localStorage.removeItem('keyauth_user')
      setIsAuthenticated(false)
      setUser(null)
      window.location.reload()
    }
  }

  const handleActivate = () => {
    // Restart the app to show license screen
    window.location.reload()
  }

  const getDaysRemaining = () => {
    if (!user) return 0
    
    const expiryDate = new Date(user.subscriptionExpiry)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  const isSubscriptionValid = () => {
    if (!user) return false
    
    const expiryDate = new Date(user.subscriptionExpiry)
    const now = new Date()
    
    return expiryDate > now
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Checking license status...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                License Required
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Please activate your license to use this application
              </p>
            </div>
          </div>
          <button
            onClick={handleActivate}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Activate
          </button>
        </div>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining()
  const isValid = isSubscriptionValid()

  return (
    <div className={`border rounded-lg p-4 ${
      isValid 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg 
            className={`w-5 h-5 mr-2 ${
              isValid ? 'text-green-500' : 'text-red-500'
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isValid ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <div>
            <p className={`text-sm font-medium ${
              isValid 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {isValid ? 'License Active' : 'License Expired'}
            </p>
            <div className={`text-xs ${
              isValid 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              <p>User: {user.username}</p>
              <p>Plan: {user.subscription}</p>
              {isValid ? (
                <p>{daysRemaining} days remaining</p>
              ) : (
                <p>Expired on {new Date(user.subscriptionExpiry).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isValid && (
            <button
              onClick={handleActivate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              Renew
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default LicenseStatus