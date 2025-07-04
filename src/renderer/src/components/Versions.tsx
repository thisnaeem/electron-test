import { useState } from 'react'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-md bg-gray-800 rounded-lg p-3 text-center">
      <div className="flex justify-center space-x-6 text-sm text-gray-300">
        <span>Electron v{versions.electron}</span>
        <span>Chromium v{versions.chrome}</span>
        <span>Node v{versions.node}</span>
      </div>
    </div>
  )
}

export default Versions
