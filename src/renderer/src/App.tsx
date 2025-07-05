import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Generator from './pages/Generator'

import { GeminiProvider } from './context/GeminiContext'
import Sidebar from './components/Sidebar'
import Settings from './pages/Settings'
import UpdateNotification from './components/UpdateNotification'
import TitleBar from './components/TitleBar'

// Separate component to use router hooks
function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isContentPage = location.pathname === '/generator' || location.pathname === '/settings'

  return (
    <div className="min-h-screen">
      <TitleBar />
      <div className="flex pt-10">
        <Sidebar />
        <div className={`flex-1 overflow-auto transition-all duration-200 ml-20 ${isContentPage ? 'bg-white dark:bg-gray-900' : ''}`}>
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
  return (
    <GeminiProvider>
      <Router>
        <AppContent />
      </Router>
    </GeminiProvider>
  )
}

export default App

