import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

import Generator from './pages/Generator'
import ImageGenerator from './pages/tools/ImageGenerator'
import BackgroundRemover from './pages/tools/BackgroundRemover'
import YouTubeTranscriber from './pages/tools/YouTubeTranscriber'
import FileConverter from './pages/tools/FileConverter'
import PromptGenerator from './pages/tools/PromptGenerator'
import FileProcessor from './pages/tools/FileProcessor'
import MediaUpscaler from './pages/tools/MediaUpscaler'
import AdobeScrapper from './pages/tools/AdobeScrapper'

import { GeminiProvider } from './context/GeminiContext'
import Sidebar from './components/Sidebar'
import Settings from './pages/Settings'
import Help from './pages/Help'
import UpdateNotification from './components/UpdateNotification'
import TitleBar from './components/TitleBar'
import SplashScreen from './components/SplashScreen'
import { useAppSelector, useAppDispatch } from './store/hooks'
import { setDarkMode } from './store/slices/settingsSlice'
import analytics from './services/analytics'

// Separate component to use router hooks
function AppContent(): React.JSX.Element {
  const location = useLocation()
  const { analyticsEnabled } = useAppSelector(state => state.settings)
  const isContentPage = location.pathname === '/generator' || location.pathname === '/settings' || location.pathname === '/help' || location.pathname === '/image-generator' || location.pathname === '/background-remover' || location.pathname === '/youtube-transcriber' || location.pathname === '/file-converter' || location.pathname === '/prompt-generator' || location.pathname === '/file-processor' || location.pathname === '/media-upscaler' || location.pathname === '/adobe-scrapper'

  // Track page views when location changes
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
    if (analyticsEnabled && measurementId) {
      const pageName = location.pathname.replace('/', '') || 'home'
      analytics.trackPageView(pageName)
    }
  }, [location.pathname, analyticsEnabled])

  // Listen for navigation commands from tray menu
  useEffect(() => {
    const handleNavigateTo = (_event: Electron.IpcRendererEvent, route: string): void => {
      console.log('Navigating to:', route)
      window.location.hash = `#${route}`
    }

    const handleSetProcessingMode = (_event: Electron.IpcRendererEvent, mode: string): void => {
      console.log('Setting processing mode:', mode)
      // Store mode in localStorage for FileProcessor to pick up
      localStorage.setItem('fileProcessorMode', mode)
      // Dispatch custom event to notify FileProcessor component
      window.dispatchEvent(new CustomEvent('setProcessingMode', { detail: mode }))
    }

    const handleClearAllPreviewsRequest = async (): Promise<void> => {
      try {
        const result = await window.api.clearAllPreviews()
        window.electron.ipcRenderer.send('clear-all-previews-response', result)
      } catch (error) {
        window.electron.ipcRenderer.send('clear-all-previews-response', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Add IPC listeners
    window.electron.ipcRenderer.on('navigate-to', handleNavigateTo)
    window.electron.ipcRenderer.on('set-processing-mode', handleSetProcessingMode)
    window.electron.ipcRenderer.on('clear-all-previews-request', handleClearAllPreviewsRequest)

    // Cleanup listeners on unmount
    return () => {
      window.electron.ipcRenderer.removeListener('navigate-to', handleNavigateTo)
      window.electron.ipcRenderer.removeListener('set-processing-mode', handleSetProcessingMode)
      window.electron.ipcRenderer.removeListener('clear-all-previews-request', handleClearAllPreviewsRequest)
    }
  }, [])

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
              <Route path="/image-generator" element={<ImageGenerator />} />
              <Route path="/background-remover" element={<BackgroundRemover />} />
              <Route path="/youtube-transcriber" element={<YouTubeTranscriber />} />
              <Route path="/file-converter" element={<FileConverter />} />
              <Route path="/prompt-generator" element={<PromptGenerator />} />
              <Route path="/file-processor" element={<FileProcessor />} />
              <Route path="/media-upscaler" element={<MediaUpscaler />} />
              <Route path="/adobe-scrapper" element={<AdobeScrapper />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
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
  const { isDarkMode, analyticsEnabled } = useAppSelector(state => state.settings)
  const [showSplash, setShowSplash] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize analytics
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
    if (analyticsEnabled && measurementId) {
      // Update the analytics instance with the measurement ID
      analytics.updateMeasurementId(measurementId)
      analytics.init()
      analytics.setEnabled(true)
      analytics.trackAppEvent('startup', {
        version: '1.0.10',
        platform: 'electron'
      })
    } else {
      analytics.setEnabled(false)
    }
  }, [analyticsEnabled])

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

