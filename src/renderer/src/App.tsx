import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

import Generator from './pages/Generator'

import { GeminiProvider } from './context/GeminiContext'
import Sidebar from './components/Sidebar'
import Settings from './pages/Settings'
import UpdateNotification from './components/UpdateNotification'
import TitleBar from './components/TitleBar'
import SplashScreen from './components/SplashScreen'
import { useAppSelector, useAppDispatch } from './store/hooks'
import { setDarkMode } from './store/slices/settingsSlice'

// Separate component to use router hooks
function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isContentPage = location.pathname === '/generator' || location.pathname === '/settings'

  return (
    <div className="min-h-screen">
      <TitleBar />
      <div className="flex pt-10">
        <Sidebar />
        <div className={`flex-1 overflow-auto transition-all duration-200 ml-20 ${isContentPage ? 'bg-white dark:bg-[#1a1b23]' : ''}`}>
          <div className="px-8 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/generator" replace />} />
              <Route path="/generator" element={<Generator />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
        <UpdateNotification />
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const isDarkMode = useAppSelector(state => state.settings.isDarkMode)
  const [showSplash, setShowSplash] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'

    // Apply dark mode class immediately
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Update Redux state if different from saved preference
    if (isDarkMode !== savedDarkMode) {
      dispatch(setDarkMode(savedDarkMode))
    }

    // Check if splash screen should be shown
    const shouldShowSplash = (): boolean => {
      // Force show splash in development if URL contains ?splash=true
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('splash') === 'true') {
        return true
      }

      const lastShown = localStorage.getItem('splash-shown')

      if (!lastShown) {
        // First time - show splash
        return true
      }

      // Show splash if it's been more than 1 minute since last shown (for development)
      const oneMinute = 60 * 1000
      const timeSinceLastShown = Date.now() - parseInt(lastShown)

      return timeSinceLastShown > oneMinute
    }

    setShowSplash(shouldShowSplash())
    setIsInitialized(true)
  }, [dispatch, isDarkMode])

  const handleSplashComplete = (): void => {
    setShowSplash(false)
  }

  // Don't render anything until we've determined whether to show splash
  if (!isInitialized) {
    return <div className="fixed inset-0 bg-gray-900" />
  }

  return (
    <GeminiProvider>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <Router>
          <AppContent />
        </Router>
      )}
    </GeminiProvider>
  )
}

export default App

