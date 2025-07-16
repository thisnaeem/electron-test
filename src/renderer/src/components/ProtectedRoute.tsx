import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { showAuthModal } from '../store/slices/authSlice'
import keyAuthService from '../services/keyauth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireValidSubscription?: boolean
}

const ProtectedRoute = ({ children, requireValidSubscription = true }: ProtectedRouteProps): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector(state => state.auth)

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      dispatch(showAuthModal())
      return
    }

    // Check if subscription is valid (if required)
    if (requireValidSubscription && !keyAuthService.isSubscriptionValidSync()) {
      dispatch(showAuthModal())
      return
    }
  }, [isAuthenticated, requireValidSubscription, dispatch])

  // Show loading or blocked content if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            License Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please activate your license to access this feature
          </p>
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  // Check subscription validity if required
  if (requireValidSubscription && !keyAuthService.isSubscriptionValidSync()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            License Expired
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your license has expired. Please renew to continue using this feature
          </p>
          <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute