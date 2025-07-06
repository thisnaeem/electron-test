import React from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { googleLogin, clearError } from '../store/slices/authSlice'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector(state => state.auth)

  if (!isOpen) return null

  const handleGoogleLogin = async () => {
    try {
      const result = await dispatch(googleLogin())
      if (googleLogin.fulfilled.match(result)) {
        onClose()
      }
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleClose = () => {
    dispatch(clearError())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sign In
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Sign in with your Google account to access all features and sync your data.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
