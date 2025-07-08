import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import AiGenerativeIcon from '../assets/ai-generative.svg'
import SettingsIcon from '../assets/settings.svg'
import NavigationIcon from '../assets/icons/navigation.svg'
import AppLogo from '../assets/app-logo.png'
import ImageIcon from '../assets/icons/image-02-stroke-rounded.svg'
import YouTubeIcon from '../assets/icons/youtube-stroke-rounded.svg'
import DocumentIcon from '../assets/icons/google-doc-stroke-rounded.svg'
import PromptIcon from '../assets/icons/ai-content-generator-01-stroke-rounded.svg'
import FileIcon from '../assets/icons/file-02-stroke-rounded.svg'

const SIDEBAR_WIDTH = 80

const Sidebar = (): React.JSX.Element => {
  const location = useLocation()
  const isActive = (path: string): boolean => location.pathname === path
  const [showNavigationPopup, setShowNavigationPopup] = useState(false)

  const navigationTools = [
    { name: 'AI Image Generator', icon: ImageIcon, route: 'image-generator' },
    { name: 'Background Remover', icon: ImageIcon, route: 'background-remover' },
    { name: 'YouTube Transcriber', icon: YouTubeIcon, route: 'youtube-transcriber' },
    { name: 'File Converter', icon: DocumentIcon, route: 'file-converter' },
    { name: 'Prompt Generator', icon: PromptIcon, route: 'prompt-generator' },
    { name: 'File Processor', icon: FileIcon, route: 'file-processor' }
  ]

  return (
    <div
      className="fixed left-0 top-8 h-[calc(100vh-2rem)] w-20 bg-[#f6f6f8] dark:bg-[#2a2d3a] z-40 flex flex-col justify-between"
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
              ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
          }`}
        >
          <img
            src={AiGenerativeIcon}
            alt="AI Generator"
            className={`w-6 h-6 transition-all duration-200 ${
              isActive('/generator')
                ? 'opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            } ${
              isActive('/generator')
                ? 'dark:filter dark:invert'
                : 'dark:filter dark:invert dark:opacity-70'
            }`}
          />
          <span className="text-xs mt-1">Generator</span>
        </Link>

        <Link
          to="/settings"
          className={`flex flex-col items-center  w-16 h-16 justify-center rounded transition-all duration-200 ${
            isActive('/settings')
              ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
          }`}
        >
          <img
            src={SettingsIcon}
            alt="Settings"
            className={`w-6 h-6 transition-all duration-200 ${
              isActive('/settings')
                ? 'opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            } ${
              isActive('/settings')
                ? 'dark:filter dark:invert'
                : 'dark:filter dark:invert dark:opacity-70'
            }`}
          />
          <span className="text-xs mt-1">Settings</span>
        </Link>

                {/* Navigation with popup */}
        <div
          className="relative"
          onMouseEnter={() => setShowNavigationPopup(true)}
          onMouseLeave={() => setShowNavigationPopup(false)}
        >
          <div className="flex flex-col items-center w-16 h-16 justify-center rounded transition-all duration-200 text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white cursor-pointer">
            <img
              src={NavigationIcon}
              alt="Navigation"
              className="w-6 h-6 transition-all duration-200 opacity-60 hover:opacity-100 dark:filter dark:invert dark:opacity-70"
            />
            <span className="text-xs mt-1">Tools</span>
          </div>

          {/* Popup with hover area */}
          {showNavigationPopup && (
            <div
              className="fixed left-16 top-32 z-[9999]"
              onMouseEnter={() => setShowNavigationPopup(true)}
              onMouseLeave={() => setShowNavigationPopup(false)}
            >
              {/* Invisible bridge to prevent gap issues */}
              <div className="absolute left-0 top-0 w-8 h-16 bg-transparent"></div>

              {/* Actual popup */}
              <div className="ml-4 w-96 bg-white dark:bg-[#2a2d3a] border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-6 transform transition-all duration-300 ease-out animate-in slide-in-from-left-2 fade-in max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {navigationTools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => {
                        window.location.hash = `#${tool.route}`
                        setShowNavigationPopup(false)
                      }}
                      className="flex items-center gap-2 p-2.5 text-left rounded-lg hover:bg-blue-50 dark:hover:bg-[#383b4a] transition-all duration-200 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 group"
                    >
                      <img
                        src={tool.icon}
                        alt={tool.name}
                        className="w-4 h-4 group-hover:scale-110 transition-transform duration-200 flex-shrink-0 opacity-70 group-hover:opacity-100 dark:filter dark:invert"
                      />
                      <span className="font-medium truncate">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

    </div>
  )
}

export default Sidebar
