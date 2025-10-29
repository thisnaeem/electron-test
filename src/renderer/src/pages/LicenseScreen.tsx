import { useState, useEffect } from 'react'
import AppLogo from '../../../../public/icons/logo.png'

const LicenseScreen = (): React.JSX.Element => {
  const [formData, setFormData] = useState({
    license: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for stored credentials on component mount
  useEffect(() => {
    const checkStoredCredentials = async () => {
      try {
        const storedAuth = localStorage.getItem('keyauth_user')
        if (!storedAuth) {
          return // No stored credentials
        }

        const authData = JSON.parse(storedAuth)

        // Check if stored credentials are not too old (30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        if (authData.timestamp < thirtyDaysAgo) {
          console.log('Stored credentials are too old, removing them')
          localStorage.removeItem('keyauth_user')
          return
        }

        // Check if subscription is still valid
        const expiryDate = new Date(authData.userInfo.subscriptionExpiry)
        const now = new Date()
        if (expiryDate <= now) {
          console.log('Stored credentials expired, removing them')
          localStorage.removeItem('keyauth_user')
          return
        }

        console.log('Found valid stored credentials, attempting auto-login')
        setIsLoading(true)

        // Attempt to re-authenticate with stored credentials
        const result = await window.api.keyauth.license(authData.credentials.license)

        if (result.success) {
          console.log('Auto-login successful')
          // Update stored credentials with fresh data
          localStorage.setItem('keyauth_user', JSON.stringify({
            ...authData,
            userInfo: result.info,
            timestamp: Date.now()
          }))

          // Notify main process that authentication was successful
          window.api.authSuccess(result.info)
        } else {
          console.log('Auto-login failed:', result.message)
          localStorage.removeItem('keyauth_user')
          setError('Stored credentials are no longer valid. Please login again.')
        }
      } catch (error) {
        console.error('Error during auto-login:', error)
        localStorage.removeItem('keyauth_user')
        setError('Error during automatic login. Please login manually.')
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredCredentials()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.keyauth.license(formData.license)

      if (result.success) {
        // Save user credentials to localStorage for future auto-login
        localStorage.setItem('keyauth_user', JSON.stringify({
          userInfo: result.info,
          timestamp: Date.now(),
          authMode: 'license',
          credentials: { license: formData.license }
        }))

        // Notify main process that authentication was successful
        window.api.authSuccess(result.info)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101113] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <img src={AppLogo} alt="StockMeta AI" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            License Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please activate your license to access this application
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              License Key
            </label>
            <input
              type="text"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              placeholder="Enter your license key"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              required
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Activate License'
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter your license key to activate the application
          </p>
        </div>
      </div>
    </div>
  )
}

export default LicenseScreen