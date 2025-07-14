import React from 'react'

const AdobeScrapper = (): React.JSX.Element => {
  const handleRedirect = (): void => {
    window.open('https://www.csvgen.com/tools/adobe-stock-scraper', '_blank')
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Adobe Scrapper
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Extract and organize content from Adobe Stock for your creative projects
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-2xl p-8 text-center">
            <div className="mb-6">

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Adobe Stock Content Extraction
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Efficiently extract metadata, keywords, and content information from Adobe Stock for your creative workflow. Streamline your asset management and content discovery process.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-left max-w-md mx-auto space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Extract metadata and keywords automatically
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Bulk content analysis and organization
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Export data in multiple formats
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Content trending and analytics insights
                </li>
              </ul>
            </div>

            <button
              onClick={handleRedirect}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Access Adobe Scrapper
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdobeScrapper
