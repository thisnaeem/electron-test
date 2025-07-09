import React, { useState, useRef, useEffect } from 'react'
import { useAppSelector } from '../store/hooks'
import { downloadCSV, generatePlatformCSV, ImageData } from '../utils/csvGenerator'

interface ExportDropdownProps {
  onExportCSV: () => void
  disabled?: boolean
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExportCSV, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { generationSettings } = useAppSelector(state => state.settings)
  const { metadata } = useAppSelector(state => state.files)

  const selectedPlatforms = generationSettings.platforms || ['freepik']

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Platform name mapping for display
  const platformDisplayNames: Record<string, string> = {
    '123rf': '123RF',
    'adobe-stock': 'Adobe Stock',
    'alamy': 'Alamy',
    'canva': 'Canva',
    'depositphotos': 'Depositphotos',
    'dreamstime': 'Dreamstime',
    'freepik': 'Freepik',
    'general': 'General',
    'istock': 'iStock',
    'motion': 'Motion',
    'pond5': 'Pond5',
    'shutterstock': 'Shutterstock',
    'vecteezy': 'Vecteezy'
  }

  const handleSinglePlatformExport = (platform: string) => {
    if (metadata.length === 0) return

    // Convert MetadataResult to ImageData format
    const imageDataList: ImageData[] = metadata.map(result => ({
      filename: result.filename,
      title: result.title,
      keywords: result.keywords,
      description: result.description || ''
    }))

    try {
      const csvContent = generatePlatformCSV(platform, imageDataList)
      const filename = `${platform}_export_${new Date().toISOString().split('T')[0]}.csv`
      downloadCSV(csvContent, filename)
    } catch (error) {
      console.error(`Error generating CSV for ${platform}:`, error)
    }

    setIsOpen(false)
  }

  const handleAllPlatformsExport = () => {
    onExportCSV()
    setIsOpen(false)
  }

  // If only one platform is selected, show simple button
  if (selectedPlatforms.length === 1) {
    return (
      <button
        onClick={() => handleSinglePlatformExport(selectedPlatforms[0])}
        disabled={disabled}
        className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Export
      </button>
    )
  }

      return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="flex rounded-lg overflow-hidden">
        {/* Main Export Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="px-4 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          Export
        </button>

        {/* Separator */}
        <div className="w-px bg-gray-300"></div>

        {/* Dropdown Arrow Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="px-3 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            {/* Export All Option */}
            <button
              onClick={handleAllPlatformsExport}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export All ({selectedPlatforms.length} files)
            </button>

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

            {/* Individual Platform Options */}
            {selectedPlatforms.map((platform) => (
              <button
                key={platform}
                onClick={() => handleSinglePlatformExport(platform)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {platformDisplayNames[platform] || platform}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportDropdown
