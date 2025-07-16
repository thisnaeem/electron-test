import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setUnauthenticated, showAuthModal } from '../store/slices/authSlice'
import keyAuthService from '../services/keyauth'

const LicenseStatus = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector(state => state.auth)

  const handleLogout = () => {
    keyAuthService.logout()
    localStorage.removeItem('keyauth_user')
    dispatch(setUnauthenticated())
  }

  const handleShowAuth = () => {
    dispatch(showAuthModal())
  }

  const getDaysRemaining = () => {
    return keyAuthService.getDaysRemainingSync()
  }

  const isSubscriptionValid = () => {
    return keyAuthService.isSubscriptionValidSync()
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
            onClick={handleShowAuth}
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
              onClick={handleShowAuth}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              Renew
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default LicenseStatus