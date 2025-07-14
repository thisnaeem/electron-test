import React from 'react'

const FileConverter = (): React.JSX.Element => {
  const openFileConverterWebsite = (): void => {
    // Open csvgen.com
    window.open('https://www.csvgen.com', '_blank')
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-4xl">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">File Converter</h2>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-800">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Professional File Conversion
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Use our recommended online tool for high-quality file conversion with AI-powered precision.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={openFileConverterWebsite}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open File Converter Tool
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileConverter
