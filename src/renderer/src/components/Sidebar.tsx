import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/app-logo.png'

interface SidebarProps {
  collapsed: boolean
  toggleSidebar: () => void
}

const Sidebar = ({ collapsed, toggleSidebar }: SidebarProps): React.JSX.Element => {
  const location = useLocation()

  const isActive = (path: string): boolean => {
    return location.pathname === path
  }

  return (
    <div
      className={`fixed h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out z-10 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logo} alt="App Logo" className="h-8 w-8 rounded" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Image Metadata</h1>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      <nav className="mt-6">
        <ul>
          <li>
            <Link
              to="/generator"
              className={`flex items-center px-4 py-3 ${
                isActive('/generator')
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 dark:bg-gray-700 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {!collapsed && <span className="ml-3">Generator</span>}
            </Link>
          </li>
          <li className="mt-2">
            <Link
              to="/settings"
              className={`flex items-center px-4 py-3 ${
                isActive('/settings')
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 dark:bg-gray-700 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!collapsed && <span className="ml-3">Settings</span>}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            A
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">App Version</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">v1.0.1</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
