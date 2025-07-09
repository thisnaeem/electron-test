import React from 'react'
import { useAppSelector } from '../store/hooks'

const UploadProcessingModal: React.FC = () => {
  const { isUploadProcessing, uploadProgress } = useAppSelector(state => state.files)

  if (!isUploadProcessing) {
    return null
  }

  const progressPercentage = uploadProgress.total > 0
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-300 scale-100">
        <div className="text-center">
          {/* Enhanced Loading Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Outer rotating ring */}
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 dark:border-gray-600"></div>
              {/* Inner animated ring */}
              <div className="absolute top-0 left-0 animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-blue-500 border-r-blue-500" style={{ animationDuration: '1s' }}></div>
                            {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 2.5C5.3579 2.68817 4.53406 3.03797 3.89124 3.6882C2.5 5.09548 2.5 7.36048 2.5 11.8905C2.5 16.4204 2.5 18.6854 3.89124 20.0927C5.28249 21.5 7.52166 21.5 12 21.5C16.4783 21.5 18.7175 21.5 20.1088 20.0927C21.5 18.6854 21.5 16.4204 21.5 11.8905C21.5 7.36048 21.5 5.09548 20.1088 3.6882C19.4659 3.03797 18.6421 2.68817 17.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.5 5C9.99153 4.4943 11.2998 2.5 12 2.5M14.5 5C14.0085 4.4943 12.7002 2.5 12 2.5M12 2.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21.5 13.5H16.5743C15.7322 13.5 15.0706 14.2036 14.6995 14.9472C14.2963 15.7551 13.4889 16.5 12 16.5C10.5111 16.5 9.70373 15.7551 9.30054 14.9472C8.92942 14.2036 8.26777 13.5 7.42566 13.5H2.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Processing Images
          </h3>

                              {/* Progress Info */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {uploadProgress.current}
              </span>
              <span className="text-lg text-gray-500 dark:text-gray-400">/</span>
              <span className="text-lg text-gray-600 dark:text-gray-300">
                {uploadProgress.total}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                images
              </span>
            </div>

            {uploadProgress.current === uploadProgress.total ? (
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  All images processed successfully!
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 mb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                    <path d="M14.491 15.5H14.5M9.5 15.5H9.50897" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12105 13.2453 4 14.3624 4 15.5C4 16.6376 4.12105 17.7547 4.26781 18.8447Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Your data is safe</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                  Images are processed locally. No data is uploaded to any server. Files will be automatically removed after metadata generation.
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="flex items-center justify-center gap-2">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {progressPercentage}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              complete
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadProcessingModal
