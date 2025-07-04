import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Generator from './pages/Generator'

import { GeminiProvider } from './context/GeminiContext'
import Sidebar from './components/Sidebar'
import Settings from './pages/Settings'
import UpdateNotification from './components/UpdateNotification'

function App(): React.JSX.Element {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = (): void => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <GeminiProvider>
      <Router>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
          <Sidebar collapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

          <div className={`flex-1 overflow-auto transition-all duration-200 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
            <div className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Navigate to="/generator" replace />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>

          <UpdateNotification />
        </div>
      </Router>
    </GeminiProvider>
  )
}

export default App

