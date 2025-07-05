import React from 'react'

interface MetadataResult {
  title: string
  keywords: string[]
  filename: string
}

interface MetadataDisplayProps {
  results: MetadataResult[]
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ results = [] }) => {
  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-4">Generated Metadata</h2>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={`${result.filename}-${index}`} className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-medium text-lg">{result.filename}</h3>
            <p className="mt-2"><span className="font-medium">Title:</span> {result.title}</p>
            <div className="mt-2">
              <span className="font-medium">Keywords:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {result.keywords.map((keyword, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MetadataDisplay
