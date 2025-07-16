import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import Generator from './pages/Generator'
import ImageGenerator from './pages/tools/ImageGenerator'
import BackgroundRemover from './pages/tools/BackgroundRemover'
import YouTubeTranscriber from './pages/tools/YouTubeTranscriber'
import FileConverter from './pages/tools/FileConverter'
import PromptGenerator from './pages/tools/PromptGenerator'
import FileProcessor from './pages/tools/FileProcessor'
import MediaUpscaler from './pages/tools/MediaUpscaler'
import AdobeScrapper from './pages/tools/AdobeScrapper'
import ChatInterface from './pages/tools/ChatInterface'

import { GeminiProvider } from './context/GeminiContext'
import Sidebar from './components/Sidebar'
import Settings from './pages/Settings'
import Help from './pages/Help'
import UpdateNotification from './components/UpdateNotification'

import { useAppSelector, useAppDispatch } from './store/hooks'
import { setDarkMode } from './store/slices/settingsSlice'
import analytics from './services/analytics'

// Separate component to use router hooks
function AppContent(): React.JSX.Element {
  const location = useLocation()
  const { analyticsEnabled } = useAppSelector(state => state.settings)
  const isContentPage = location.pathname === '/generator' || location.pathname === '/settings' || location.pathname === '/help' || location.pathname === '/image-generator' || location.pathname === '/background-remover' || location.pathname === '/youtube-transcriber' || location.pathname === '/file-converter' || location.pathname === '/prompt-generator' || location.pathname === '/file-processor' || location.pathname === '/media-upscaler' || location.pathname === '/adobe-scrapper' || location.pathname === '/chat'

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
    <div className="min-h-screen bg-white dark:bg-[#101113]">
      <div className="flex h-screen">
        <Sidebar />
            <Routes>
              <Route path="/" element={<Navigate to="/generator" replace />} />
          <Route path="/generator" element={
              <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
                <div className="py-8"><Generator /></div>
              </div>
          } />
              <Route path="/chat" element={<ChatInterface />} />
          <Route path="/image-generator" element={
              <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
                <div className="py-8"><ImageGenerator /></div>
              </div>
          } />
          <Route path="/background-remover" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><BackgroundRemover /></div>
            </div>
          } />
          <Route path="/youtube-transcriber" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><YouTubeTranscriber /></div>
            </div>
          } />
          <Route path="/file-converter" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><FileConverter /></div>
            </div>
          } />
          <Route path="/prompt-generator" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><PromptGenerator /></div>
            </div>
          } />
          <Route path="/file-processor" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><FileProcessor /></div>
            </div>
          } />
          <Route path="/media-upscaler" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><MediaUpscaler /></div>
            </div>
          } />
          <Route path="/adobe-scrapper" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><AdobeScrapper /></div>
            </div>
          } />
          <Route path="/settings" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><Settings /></div>
          </div>
          } />
          <Route path="/help" element={
            <div className={`flex-1 overflow-auto transition-all duration-200 ${isContentPage ? 'bg-white dark:bg-[#101113]' : ''}`}>
              <div className="py-8"><Help /></div>
        </div>
          } />
        </Routes>
        <UpdateNotification />
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { isDarkMode, analyticsEnabled } = useAppSelector(state => state.settings)



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
  }, [dispatch, isDarkMode])

  return (
    <GeminiProvider>
        <Router>
          <AppContent />
        </Router>
    </GeminiProvider>
  )
}

export default App

