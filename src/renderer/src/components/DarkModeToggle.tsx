import { useAppSelector, useAppDispatch } from '../store/hooks'
import { toggleDarkMode } from '../store/slices/settingsSlice'

interface DarkModeToggleProps {
  className?: string
  showLabel?: boolean
}

function DarkModeToggle({ className = '', showLabel = false }: DarkModeToggleProps): React.JSX.Element {
  const dispatch = useAppDispatch()
  const isDarkMode = useAppSelector(state => state.settings.isDarkMode)

  const handleToggle = (): void => {
    dispatch(toggleDarkMode())
  }

  return (
    <div className={`flex items-center ${className}`}>
      <button
        onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1b23] ${
          isDarkMode
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-200 hover:bg-gray-300 dark:bg-[#383b4a] dark:hover:bg-[#4a4f63]'
        }`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        role="switch"
        aria-checked={isDarkMode}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            isDarkMode ? 'translate-x-2.5' : '-translate-x-2.5'
          }`}
        />
        <span className="sr-only">Toggle dark mode</span>
      </button>

      {showLabel && (
        <div className="ml-3 flex items-center">
          {isDarkMode ? (
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Light Mode</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DarkModeToggle
