import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { restoreUser, logout } from '../store/slices/authSlice'
import AiGenerativeIcon from '../assets/ai-generative.svg'
import SettingsIcon from '../assets/settings.svg'
import AppLogo from '../assets/app-logo.png'
import LoginModal from './LoginModal'

const SIDEBAR_WIDTH = 80

const Sidebar = (): React.JSX.Element => {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector(state => state.auth)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (path: string): boolean => location.pathname === path

  // Restore user from localStorage on component mount
  useEffect(() => {
    dispatch(restoreUser())
  }, [dispatch])

  const handleLogin = (): void => {
    setShowLoginModal(true)
  }

  const handleLogout = async (): Promise<void> => {
    await dispatch(logout())
    setShowUserMenu(false)
  }

  const handleUserMenuToggle = (): void => {
    setShowUserMenu(!showUserMenu)
  }

  return (
    <div
      className="fixed left-0 top-8 h-[calc(100vh-2rem)] w-20 bg-[#f6f6f8] dark:bg-gray-800 z-40 flex flex-col justify-between"
      style={{ minWidth: SIDEBAR_WIDTH }}
    >
      <nav className="flex-1 flex flex-col items-center pt-4">
        <div className="mb-4">
          <img
            src={AppLogo}
            alt="App Logo"
            className="w-8 h-8 transition-all duration-300 hover:scale-110 hover:rotate-12 cursor-pointer"
          />
        </div>
        <Link
          to="/generator"
          className={`flex flex-col items-center w-16 h-16 justify-center rounded transition-all duration-200 ${
            isActive('/generator')
              ? 'bg-white text-[#1a1b1e] dark:bg-gray-700 dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-white'
          }`}
        >
          <img
            src={AiGenerativeIcon}
            alt="AI Generator"
            className={`w-6 h-6 transition-opacity duration-200 ${
              isActive('/generator') ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
            }`}
          />
          <span className="text-xs mt-1">Generator</span>
        </Link>

        <Link
          to="/settings"
          className={`flex flex-col items-center w-16 h-16 justify-center rounded transition-all duration-200 ${
            isActive('/settings')
              ? 'bg-white text-[#1a1b1e] dark:bg-gray-700 dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-white'
          }`}
        >
          <img
            src={SettingsIcon}
            alt="Settings"
            className={`w-6 h-6 transition-opacity duration-200 ${
              isActive('/settings') ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
            }`}
          />
          <span className="text-xs mt-1">Settings</span>
        </Link>
      </nav>
      <div className="w-full py-4 flex flex-col items-center border-t border-gray-200 dark:border-gray-700">
        {/* User Profile Section */}
        {isAuthenticated && user ? (
          <div className="relative mb-3">
            <button
              onClick={handleUserMenuToggle}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-full ml-2 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="mb-3 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        )}

        <span className="text-[10px] text-gray-400 dark:text-gray-500">v1.0.1</span>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}

export default Sidebar
