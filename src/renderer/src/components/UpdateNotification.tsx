import { useState, useEffect } from 'react'

type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available'; currentVersion: string }
  | { status: 'error'; error: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { status: 'downloaded'; version: string; releaseNotes?: string }

const UpdateNotification = (): React.JSX.Element | null => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [dismissed, setDismissed] = useState<boolean>(false)

  useEffect(() => {
    // Get current app version
    window.api.getAppVersion().then(setAppVersion)

    // Listen for update status changes
    const removeListener = window.api.onUpdateStatus((data) => {
      setUpdateStatus(data)

      // Reset dismissed state when a new update is available
      if (data.status === 'available') {
        setDismissed(false)
      }
    })

    return () => {
      removeListener()
    }
  }, [])

  const handleDownload = (): void => {
    window.api.downloadUpdate()
  }

  const handleInstall = (): void => {
    window.api.quitAndInstall()
  }

  const handleDismiss = (): void => {
    setDismissed(true)
  }

  if (dismissed || !updateStatus) {
    return null
  }

  // Don't show notification for checking or not-available status
  if (updateStatus.status === 'checking' || updateStatus.status === 'not-available') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {updateStatus.status === 'error' ? (
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            ) : updateStatus.status === 'downloaded' ? (
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            ) : (
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            )}
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {updateStatus.status === 'available' && 'Update Available'}
                {updateStatus.status === 'downloading' && 'Downloading Update'}
                {updateStatus.status === 'downloaded' && 'Update Ready'}
                {updateStatus.status === 'error' && 'Update Error'}
              </h3>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {updateStatus.status === 'available' && (
                  <p>Version {updateStatus.version} is available</p>
                )}
                {updateStatus.status === 'downloading' && (
                  <>
                    <p>Downloading version {updateStatus.percent ? updateStatus.percent.toFixed(0) + '%' : '...'}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 dark:bg-gray-700">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${updateStatus.percent || 0}%` }}
                      ></div>
                    </div>
                  </>
                )}
                {updateStatus.status === 'downloaded' && (
                  <p>Version {updateStatus.version} is ready to install</p>
                )}
                {updateStatus.status === 'error' && (
                  <p>{updateStatus.error}</p>
                )}
                <p className="mt-1 text-xs">Current version: {appVersion}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            onClick={handleDismiss}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {updateStatus.status === 'available' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download Update
            </button>
          </div>
        )}

        {updateStatus.status === 'downloaded' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleInstall}
              className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Install and Restart
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdateNotification
