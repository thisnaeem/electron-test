import React, { useEffect, useState } from 'react'
import appLogo from '../assets/app-logo.png'

interface SplashScreenProps {
  onComplete: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    // Get app version
    const getVersion = async (): Promise<void> => {
      try {
        const version = await window.api.getAppVersion()
        setAppVersion(version)
      } catch (error) {
        console.error('Failed to get app version:', error)
      }
    }

    getVersion()

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + Math.random() * 15 + 5 // Random progress increments
      })
    }, 100)

    // Complete splash screen after 3-4 seconds
    const completeTimer = setTimeout(() => {
      setProgress(100)
      setIsComplete(true)

      // Add a small delay for the completion animation
      setTimeout(() => {
        // Mark splash as shown for this session
        localStorage.setItem('splash-shown', Date.now().toString())
        onComplete()
      }, 500)
    }, 3500)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 splash-fade-in bg-white dark:bg-gray-900 ${
      isComplete ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
    }`}>
      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Logo container with animation */}
        <div className="mb-8 transform transition-all duration-1000 ease-out">
          <div className="relative">
            {/* App Logo */}
            <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <img
                src={appLogo}
                alt="CSVGen Pro"
                className="w-full h-full object-contain animate-pulse"
              />
            </div>
          </div>
        </div>

        {/* App name */}
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 tracking-wide splash-text-slide-up">
          CSVGen Pro
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 opacity-90 splash-text-slide-up" style={{ animationDelay: '0.4s' }}>
          AI-Powered Content Generation
        </p>

        {/* Loading progress */}
        <div className="w-64 mx-auto mb-4 splash-text-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-sm text-gray-500 dark:text-gray-400 opacity-75 animate-pulse splash-text-slide-up" style={{ animationDelay: '0.8s' }}>
          {progress < 30 ? 'Initializing...' :
           progress < 60 ? 'Loading components...' :
           progress < 90 ? 'Almost ready...' :
           'Ready!'}
        </p>

        {/* Spinning loader */}
        <div className="mt-6 splash-text-slide-up" style={{ animationDelay: '1s' }}>
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin opacity-60" />
        </div>
      </div>

      {/* Version info */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 splash-text-slide-up" style={{ animationDelay: '1.2s' }}>
        <p className="text-xs text-gray-400 dark:text-gray-500 opacity-50">
          Version {appVersion}
        </p>
      </div>
    </div>
  )
}

export default SplashScreen
