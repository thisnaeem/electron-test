import React from 'react'

const FileProcessor = (): React.JSX.Element => {
  const openFileProcessorWebsite = (): void => {
    // Open csvgen.com
    window.open('https://www.csvgen.com/tools/filename-extractor', '_blank')
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-4xl">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">File Processor</h2>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-100 dark:border-green-800">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Professional File Processing
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Use our recommended online tool for high-quality file processing with AI-powered precision.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={openFileProcessorWebsite}
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open File Processor Tool
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileProcessor
