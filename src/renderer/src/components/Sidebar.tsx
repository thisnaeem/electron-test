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
import ChatIcon from '../assets/icons/comment-02-stroke-rounded.svg'
import HelpIcon from '../assets/icons/help-square-stroke-rounded.svg'
import SaturnIcon from '../assets/icons/saturn-01-stroke-rounded.svg'

const SIDEBAR_WIDTH = 80

const Sidebar = (): React.JSX.Element => {
  const location = useLocation()
  const isActive = (path: string): boolean => location.pathname === path
  const [showNavigationPopup, setShowNavigationPopup] = useState(false)

  const navigationTools = [
    { name: 'Background Remover', icon: ImageIcon, route: 'background-remover' },
    { name: 'YouTube Transcriber', icon: YouTubeIcon, route: 'youtube-transcriber' },
    { name: 'File Converter', icon: DocumentIcon, route: 'file-converter' },
    { name: 'Prompt Generator', icon: PromptIcon, route: 'prompt-generator' },
    { name: 'File Processor', icon: FileIcon, route: 'file-processor' },
    { name: 'Media Upscaler', icon: ImageIcon, route: 'media-upscaler' },
    { name: 'Adobe Scrapper', icon: DocumentIcon, route: 'adobe-scrapper' }
  ]

  return (
    <div
      className="fixed left-0 top-0 h-screen w-20 bg-[#f6f6f8] dark:bg-[#141517] z-40 flex flex-col justify-between"
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
          className={`flex flex-col items-center w-16 h-16 justify-center rounded-xl transition-all duration-200 ${
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
          to="/chat"
          className={`flex flex-col items-center w-16 h-16 justify-center rounded-xl transition-all duration-200 ${
            isActive('/chat')
              ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
          }`}
        >
          <img
            src={ChatIcon}
            alt="AI Chat"
            className={`w-6 h-6 transition-all duration-200 ${
              isActive('/chat')
                ? 'opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            } ${
              isActive('/chat')
                ? 'dark:filter dark:invert'
                : 'dark:filter dark:invert dark:opacity-70'
            }`}
          />
          <span className="text-xs mt-1">Chat</span>
        </Link>

        <Link
          to="/image-generator"
          className={`flex flex-col items-center w-16 h-16 justify-center rounded-xl transition-all duration-200 ${
            isActive('/image-generator')
              ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
          }`}
        >
          <img
            src={ImageIcon}
            alt="AI Image Generator"
            className={`w-6 h-6 transition-all duration-200 ${
              isActive('/image-generator')
                ? 'opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            } ${
              isActive('/image-generator')
                ? 'dark:filter dark:invert'
                : 'dark:filter dark:invert dark:opacity-70'
            }`}
          />
          <span className="text-xs mt-1">Images</span>
        </Link>

        {/* Navigation with popup - Tools (moved above Settings/Help) */}
        <div
          className="relative"
          onMouseEnter={() => setShowNavigationPopup(true)}
          onMouseLeave={() => setShowNavigationPopup(false)}
        >
          <div className="flex flex-col items-center w-16 h-16 justify-center rounded-xl transition-all duration-200 text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white cursor-pointer">
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
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#383b4a] transition-colors text-left"
                    >
                      <img src={tool.icon} alt={tool.name} className="w-6 h-6" />
                      <span className="font-medium text-gray-900 dark:text-white">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings and Help moved below Tools */}
        <Link
          to="/settings"
          className={`flex flex-col items-center  w-16 h-16 justify-center rounded-xl transition-all duration-200 ${
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

        <Link
          to="/help"
          className={`flex flex-col items-center w-16 h-16 justify-center rounded-xl transition-all duration-200 ${
            isActive('/help')
              ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white'
              : 'text-gray-400 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
          }`}
        >
          <img
            src={HelpIcon}
            alt="Help"
            className={`w-6 h-6 transition-all duration-200 ${
              isActive('/help')
                ? 'opacity-100'
                : 'opacity-60 group-hover:opacity-100'
            } ${
              isActive('/help')
                ? 'dark:filter dark:invert'
                : 'dark:filter dark:invert dark:opacity-70'
            }`}
          />
          <span className="text-xs mt-1">Help</span>
        </Link>
      </nav>

      {/* Bottom buttons */}
      <div className="pb-4 flex flex-col items-center gap-2">
        {/* Website link */}
        <button
          onClick={() => window.open('https://csvgen.com', '_blank')}
          className="flex items-center justify-center w-12 h-12 rounded transition-all duration-200 text-gray-400 hover:bg-white/60 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-blue-400 group"
          title="Visit CSVGen.com"
        >
          <img
            src={SaturnIcon}
            alt="CSVGen Website"
            className="w-6 h-6 transition-all duration-200 opacity-60 group-hover:opacity-100 dark:filter dark:invert"
          />
        </button>

        {/* WhatsApp Channel */}
        <button
          onClick={() => window.open('https://whatsapp.com/channel/0029Vb6O7jG4NVipRzkr1w0A', '_blank')}
          className="flex items-center justify-center w-12 h-12 rounded transition-all duration-200 text-gray-400 hover:bg-white/60 hover:text-green-600 dark:text-gray-400 dark:hover:bg-[#383b4a]/60 dark:hover:text-green-400 group"
          title="Join our WhatsApp Channel"
        >
          <svg
            className="w-6 h-6 transition-all duration-200 opacity-60 group-hover:opacity-100"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
          </svg>
        </button>
      </div>

    </div>
  )
}

export default Sidebar
