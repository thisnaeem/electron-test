import React, { useState, useCallback, useEffect } from 'react'
import uploadIcon from '../../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../../assets/icons/add-square-stroke-rounded.svg'

interface CleaningOptions {
  remove_numbers: boolean
  remove_extra_dashes: boolean
  remove_underscores: boolean
  remove_special_chars: boolean
  preserve_extension: boolean
  remove_leading_numbers: boolean
  normalize_spaces: boolean
}

const FileProcessor: React.FC = () => {
  const [mode, setMode] = useState<'extract' | 'clean'>('extract')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  // Extract mode state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedFilenames, setExtractedFilenames] = useState<string[]>([])

  // Clean mode state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [cleanedResults, setCleanedResults] = useState<Array<{ original: string; cleaned: string }>>([])
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    remove_numbers: true,
    remove_extra_dashes: true,
    remove_underscores: false,
    remove_special_chars: true,
    preserve_extension: true,
    remove_leading_numbers: true,
    normalize_spaces: true
  })

  const supportedFileTypes = {
    'Archive Files': ['.zip', '.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tbz2', '.rar', '.7z'],
    'Text Files': ['.txt', '.log', '.list', '.lst', '.names'],
    'CSV Files': ['.csv', '.tsv'],
    'Image Files': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.svg', '.ico', '.heic', '.raw', '.cr2', '.nef', '.arw'],
    'Video Files': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv'],
    'Audio Files': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.aiff'],
    'Document Files': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.rtf'],
    'Other Files': ['.exe', '.msi', '.deb', '.rpm', '.dmg', '.iso', '.bin', '.apk', '.ipa']
  }

  // Listen for processing mode changes from tray menu
  useEffect(() => {
    // Check localStorage on component mount
    const savedMode = localStorage.getItem('fileProcessorMode')
    if (savedMode === 'extract' || savedMode === 'clean') {
      setMode(savedMode)
      localStorage.removeItem('fileProcessorMode') // Clean up after use
    }

    // Listen for custom events from tray menu
    const handleSetProcessingMode = (event: CustomEvent) => {
      const newMode = event.detail
      if (newMode === 'extract' || newMode === 'clean') {
        setMode(newMode)
      }
    }

    window.addEventListener('setProcessingMode', handleSetProcessingMode as EventListener)

    return () => {
      window.removeEventListener('setProcessingMode', handleSetProcessingMode as EventListener)
    }
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isSupported = Object.values(supportedFileTypes).flat().includes(fileExtension)

    if (!isSupported) {
      setError(`Unsupported file type: ${fileExtension}. Please upload a supported file.`)
      return
    }

    setUploadedFile(file)
    setError(null)
  }, [])

  const handleClick = useCallback(() => {
    if (isLoading) return

    const input = document.getElementById('file-upload') as HTMLInputElement
    if (input) {
      input.click()
    }
  }, [isLoading])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      if (mode === 'extract') {
        handleFileUpload(files[0])
      } else {
        // Clean mode - allow multiple files
        setUploadedFiles(Array.from(files))
        setError(null)
      }
    }
  }, [handleFileUpload, mode])

  const handleMultipleFileUpload = useCallback((fileList: FileList) => {
    const files = Array.from(fileList)
    setUploadedFiles(files)
    setError(null)
  }, [])

  const handleCleanModeClick = useCallback(() => {
    if (isLoading) return

    const input = document.getElementById('clean-file-upload') as HTMLInputElement
    if (input) {
      input.click()
    }
  }, [isLoading])

  const handleCleanModeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleMultipleFileUpload(files)
    }
  }, [handleMultipleFileUpload])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const extractFilenames = async () => {
    if (!uploadedFile) {
      setError('Please upload a file first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string
        const fileType = uploadedFile.name.split('.').pop()?.toLowerCase() || ''

        const result = await window.api.extractFilenames(base64Data, fileType, uploadedFile.name)

        if (result.success && result.filenames) {
          setExtractedFilenames(result.filenames)
        } else {
          setError(result.error || 'Failed to extract filenames')
        }

        setIsLoading(false)
      }
      reader.readAsDataURL(uploadedFile)
    } catch (error) {
      console.error('Error extracting filenames:', error)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const cleanFilenames = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload some files first')
      return
    }

    const filenames = uploadedFiles.map(file => file.name)

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.cleanFilenames(filenames, cleaningOptions)

      if (result.success && result.cleaned_filenames) {
        setCleanedResults(result.cleaned_filenames)
      } else {
        setError(result.error || 'Failed to clean filenames')
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error cleaning filenames:', error)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const downloadAsText = (filenames: string[], filename: string = 'filenames.txt') => {
    const content = filenames.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAsCSV = (data: string[] | Array<{ original: string; cleaned: string }>, filename: string = 'filenames.csv') => {
    let content: string

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      // Cleaned filenames format
      const cleanedData = data as Array<{ original: string; cleaned: string }>
      content = 'Original,Cleaned\n' + cleanedData.map(item => `"${item.original}","${item.cleaned}"`).join('\n')
    } else {
      // Simple filenames format
      const filenamesData = data as string[]
      content = 'Filename\n' + filenamesData.map(name => `"${name}"`).join('\n')
    }

    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCleaningOptionChange = (option: keyof CleaningOptions, value: boolean) => {
    setCleaningOptions(prev => ({ ...prev, [option]: value }))
  }

  return (
    <div
      className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]"
      style={{ padding: '2rem 0' }}
    >
      <div className="px-8">
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
          File Processor
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Extract filenames from archives and text files, or simply get the filename of individual files (images, videos, documents). You can also clean existing filenames by removing unwanted characters.
        </p>

        {/* Mode Selection */}
        <div className="max-w-4xl mb-8">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Processing Mode</h3>
          <div className="flex gap-3 max-w-2xl">
            <button
              onClick={() => setMode('extract')}
              className={`px-6 py-3 rounded-xl transition-all duration-200 text-left ${
                mode === 'extract'
                  ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-sm font-medium">Filename Extractor</div>
              <div className="text-sm opacity-75 mt-1">Extract filenames from file paths</div>
            </button>

            <button
              onClick={() => setMode('clean')}
              className={`px-6 py-3 rounded-xl transition-all duration-200 text-left ${
                mode === 'clean'
                  ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-sm font-medium">Filename Cleaner</div>
              <div className="text-sm opacity-75 mt-1">Clean and format filenames</div>
            </button>
          </div>
        </div>

        {/* Extract Mode */}
        {mode === 'extract' && (
          <>
            {/* File Upload */}
            <div className="max-w-4xl mb-8">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Upload File</h3>


              {!uploadedFile ? (
                <div
                  className={`
                    rounded-2xl p-8 transition-all duration-200 ease-in-out bg-[#f9fafb] text-center cursor-pointer
                    ${isDragOver ? 'bg-violet-50' : 'hover:bg-gray-100'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={handleClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={isHovering ? addSquareIcon : uploadIcon}
                      alt="Upload"
                      className="w-16 h-16 mb-4 transition-all duration-200"
                      draggable="false"
                    />
                    <div>
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {isDragOver ? 'Drop a file here' : 'Drop a file here or click to browse'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports archives, images, videos, documents, and text files
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".zip,.tar,.gz,.tgz,.bz2,.tbz2,.rar,.7z,.txt,.log,.list,.lst,.names,.csv,.tsv,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp,.svg,.ico,.heic,.raw,.cr2,.nef,.arw,.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.m4v,.mpg,.mpeg,.3gp,.ogv,.mp3,.wav,.flac,.aac,.ogg,.wma,.m4a,.opus,.aiff,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.exe,.msi,.deb,.rpm,.dmg,.iso,.bin,.apk,.ipa"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 mr-3 text-blue-600">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={extractFilenames}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    style={{ borderRadius: '0.5rem', backgroundColor: '#f5f5f5', color: '#333' }}
                  >
                    {isLoading ? 'Extracting...' : 'Extract Filenames'}
                  </button>
                </div>
              )}
            </div>

            {/* Extracted Results */}
            {extractedFilenames.length > 0 && (
              <div className="max-w-4xl mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Extracted Filenames ({extractedFilenames.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadAsText(extractedFilenames)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      style={{ borderRadius: '0.375rem', backgroundColor: '#f5f5f5', color: '#333' }}
                    >
                      Download TXT
                    </button>
                    <button
                      onClick={() => downloadAsCSV(extractedFilenames)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      style={{ borderRadius: '0.375rem', backgroundColor: '#f5f5f5', color: '#333' }}
                    >
                      Download CSV
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {extractedFilenames.map((filename, index) => (
                    <div key={index} className="py-1 text-sm text-gray-900 dark:text-white font-mono">
                      {filename}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Clean Mode */}
        {mode === 'clean' && (
          <>
            {/* File Upload for Clean Mode */}
            <div className="max-w-4xl mb-8">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Upload Files</h3>

              {uploadedFiles.length === 0 ? (
                <div
                  className={`
                    rounded-2xl p-8 transition-all duration-200 ease-in-out bg-[#f9fafb] text-center cursor-pointer
                    ${isDragOver ? 'bg-violet-50' : 'hover:bg-gray-100'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={handleCleanModeClick}
                  onDrop={handleCleanModeDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={isHovering ? addSquareIcon : uploadIcon}
                      alt="Upload"
                      className="w-16 h-16 mb-4 transition-all duration-200"
                      draggable="false"
                    />
                    <div>
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Upload multiple files to clean their filenames
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="clean-file-upload"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setUploadedFiles([])}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 mr-3 text-blue-600">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={handleCleanModeClick}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Add more files
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cleaning Options */}
            <div className="max-w-4xl mb-8">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Cleaning Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  remove_numbers: 'Remove all numbers',
                  remove_leading_numbers: 'Remove leading numbers',
                  remove_extra_dashes: 'Remove extra dashes',
                  remove_underscores: 'Replace underscores with spaces',
                  remove_special_chars: 'Remove special characters',
                  preserve_extension: 'Preserve file extension',
                  normalize_spaces: 'Normalize spaces'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cleaningOptions[key as keyof CleaningOptions]}
                      onChange={(e) => handleCleaningOptionChange(key as keyof CleaningOptions, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clean Button */}
            <div className="max-w-4xl mb-8">
              <button
                onClick={cleanFilenames}
                disabled={isLoading || uploadedFiles.length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                style={{ borderRadius: '0.5rem', backgroundColor: '#f5f5f5', color: '#333' }}
              >
                {isLoading ? 'Cleaning...' : 'Clean Filenames'}
              </button>
            </div>

            {/* Cleaned Results */}
            {cleanedResults.length > 0 && (
              <div className="max-w-4xl mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Cleaned Results ({cleanedResults.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadAsText(cleanedResults.map(r => r.cleaned), 'cleaned_filenames.txt')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      style={{ borderRadius: '0.375rem', backgroundColor: '#f5f5f5', color: '#333' }}
                    >
                      Download TXT
                    </button>
                    <button
                      onClick={() => downloadAsCSV(cleanedResults, 'cleaned_filenames.csv')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      style={{ borderRadius: '0.375rem', backgroundColor: '#f5f5f5', color: '#333' }}
                    >
                      Download CSV
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-600">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-semibold text-gray-900 dark:text-white text-sm">
                      Original
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-semibold text-gray-900 dark:text-white text-sm">
                      Cleaned
                    </div>
                    {cleanedResults.map((result, index) => (
                      <React.Fragment key={index}>
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white font-mono">
                          {result.original}
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white font-mono">
                          {result.cleaned}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileProcessor
