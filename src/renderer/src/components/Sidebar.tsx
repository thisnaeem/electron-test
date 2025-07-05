import { Link, useLocation } from 'react-router-dom'
import AiGenerativeIcon from '../assets/ai-generative.svg'
import SettingsIcon from '../assets/settings.svg'

const SIDEBAR_WIDTH = 80

const Sidebar = (): React.JSX.Element => {
  const location = useLocation()
  const isActive = (path: string): boolean => location.pathname === path

  return (
    <div
      className="fixed left-0 top-8 h-[calc(100vh-2rem)] w-20 bg-[#f6f6f8] dark:bg-gray-800 shadow-lg z-40 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700"
      style={{ minWidth: SIDEBAR_WIDTH }}
    >
      <nav className="flex-1 flex flex-col items-center pt-8 ">
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
        <span className="text-[10px] text-gray-400 dark:text-gray-500">v1.0.1</span>
      </div>
    </div>
  )
}

export default Sidebar
