import React from 'react'

const BackgroundRemover = (): React.JSX.Element => {
  const openBackgroundRemoverWebsite = (): void => {
    // Open remove.bg or similar background removal service
    window.open('https://www.csvgen.com', '_blank')
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-4xl">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">Background Remover</h2>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-purple-100 dark:border-purple-800">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-6">

              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Professional Background Removal
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                We&apos;re launching pro bg remover tool on web stopGeneration
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={openBackgroundRemoverWebsite}
                className="inline-flex items-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Background Remover Tool
              </button>


            </div>
          </div>
        </div>


      </div>
    </div>
  )
}

export default BackgroundRemover
