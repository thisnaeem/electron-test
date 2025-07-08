import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import uploadIcon from '../../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../../assets/icons/add-square-stroke-rounded.svg'

interface ConversionResult {
  success: boolean
  error?: string
  base64?: string
  format?: string
  original_size?: number
  converted_size?: number
  dimensions?: [number, number]
  quality?: number
  traceback?: string
}

interface UploadedFile {
  file: File
  base64: string
  format: string
  preview: string
}

const FileConverter = (): React.JSX.Element => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState('')
  const [outputFormat, setOutputFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)
  const [isHovering, setIsHovering] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.split(',')[1] // Remove data URL prefix
      const format = file.name.split('.').pop()?.toLowerCase() || ''

      setUploadedFile({
        file,
        base64: base64Data,
        format,
        preview: result
      })
      setConversionResult(null)
      setError('')
    }

    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']
    },
    multiple: false,
    disabled: isProcessing
  })

  const handleConvert = async (): Promise<void> => {
    if (!uploadedFile) return

    setIsProcessing(true)
    setError('')
    setConversionResult(null)

    try {
      const result = await window.api.convertFile(
        uploadedFile.format,
        outputFormat,
        uploadedFile.base64,
        quality
      )

      setConversionResult(result)

      if (!result.success) {
        setError(result.error || 'Conversion failed')
      }
    } catch (apiError) {
      console.error('File conversion API error:', apiError)
      setError('Failed to process request. Please check if Python and required packages are installed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadFile = (base64Data: string, filename: string, format: string): void => {
    try {
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: `image/${format}` })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error('Download error:', downloadError)
      setError('Failed to download converted file')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const supportedConversions = [
    {
      from: 'PNG',
      to: 'JPG',
      description: 'Convert PNG images to JPEG format'
    },
    {
      from: 'WebP',
      to: 'JPG',
      description: 'Convert WebP images to JPEG format'
    },
    {
      from: 'GIF',
      to: 'JPG',
      description: 'Convert GIF images to JPEG format'
    },
    {
      from: 'BMP',
      to: 'JPG',
      description: 'Convert BMP images to JPEG format'
    },
    {
      from: 'PNG',
      to: 'WebP',
      description: 'Convert PNG images to WebP format'
    },
    {
      from: 'JPG',
      to: 'PNG',
      description: 'Convert JPEG images to PNG format'
    }
  ]

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-full">
        {/* Header */}
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">File Converter</h2>

        {/* Supported Conversions Info */}
        <div className="mb-8 max-w-4xl">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
            Supported Conversions
          </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supportedConversions.map((conversion, index) => (
            <div key={index} className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium">
                  {conversion.from}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                  {conversion.to}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{conversion.description}</p>
            </div>
          ))}
                  </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8 max-w-4xl">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
            Upload File
          </h3>
        <div
          {...getRootProps()}
          className={`
            rounded-2xl py-16 px-8 transition-all duration-200 ease-in-out bg-[#f9fafb] text-center cursor-pointer
            ${isDragActive ? 'bg-violet-50' : 'hover:bg-gray-100'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <img
              src={isHovering ? addSquareIcon : uploadIcon}
              alt="Upload"
              className="w-16 h-16 mb-4 transition-all duration-200"
              draggable="false"
            />
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop the file here' : 'Drop a file here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports PNG, JPG, JPEG, WebP, GIF, BMP
              </p>
            </div>
          </div>
                  </div>
        </div>

        {/* Uploaded File Preview */}
        {uploadedFile && (
          <div className="mb-8 max-w-4xl">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
              Uploaded File
            </h3>
          <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={uploadedFile.preview}
                  alt={uploadedFile.file.name}
                  className="max-w-xs max-h-48 rounded-lg border border-gray-200 dark:border-gray-600"
                  style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}
                />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  {uploadedFile.file.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Format: </span>
                    <span className="font-medium text-gray-900 dark:text-white uppercase">
                      {uploadedFile.format}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Size: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatBytes(uploadedFile.file.size)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
                      </div>
          </div>
        )}

        {/* Conversion Settings */}
        {uploadedFile && (
          <div className="mb-8 max-w-4xl">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
              Conversion Settings
            </h3>
          <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Output Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Output Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1d29] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="jpg">JPEG (.jpg)</option>
                  <option value="png">PNG (.png)</option>
                  <option value="webp">WebP (.webp)</option>
                  <option value="bmp">BMP (.bmp)</option>
                </select>
              </div>

              {/* Quality Setting (for JPEG) */}
              {outputFormat === 'jpg' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    JPEG Quality: {quality}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Lower size</span>
                    <span>Higher quality</span>
                  </div>
                </div>
              )}
            </div>

            {/* Convert Button */}
            <div className="mt-6">
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                style={{ borderRadius: '8px', backgroundColor: isProcessing ? '#9CA3AF' : '#2563EB' }}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Converting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Convert File
                  </>
                )}
              </button>
            </div>
                      </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 max-w-4xl">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-medium">Conversion Error</h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
                          </div>
            </div>
          </div>
        )}

        {/* Conversion Result */}
        {conversionResult?.success && (
          <div className="mb-8 max-w-4xl">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
              Conversion Result
            </h3>
          <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Converted Image Preview */}
              <div className="flex-shrink-0">
                <img
                  src={`data:image/${conversionResult.format};base64,${conversionResult.base64}`}
                  alt="Converted file"
                  className="max-w-xs max-h-48 rounded-lg border border-gray-200 dark:border-gray-600"
                  style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}
                />
              </div>

              {/* Conversion Info */}
              <div className="flex-grow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Conversion Successful
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Output Format: </span>
                    <span className="font-medium text-gray-900 dark:text-white uppercase">
                      {conversionResult.format}
                    </span>
                  </div>
                  {conversionResult.dimensions && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dimensions: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {conversionResult.dimensions[0]} × {conversionResult.dimensions[1]}
                      </span>
                    </div>
                  )}
                  {conversionResult.original_size && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Original Size: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatBytes(conversionResult.original_size)}
                      </span>
                    </div>
                  )}
                  {conversionResult.converted_size && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Converted Size: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatBytes(conversionResult.converted_size)}
                      </span>
                    </div>
                  )}
                  {conversionResult.quality && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Quality: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {conversionResult.quality}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Download Button */}
                <button
                  onClick={() => {
                    if (conversionResult.base64 && uploadedFile) {
                      const filename = `${uploadedFile.file.name.split('.')[0]}_converted.${conversionResult.format}`
                      downloadFile(conversionResult.base64, filename, conversionResult.format || 'jpg')
                    }
                  }}
                  className="px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                  style={{ borderRadius: '8px', backgroundColor: '#f5f5f5', color: '#374151' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Converted File
                </button>
              </div>
            </div>
                      </div>
          </div>
        )}


      </div>
    </div>
  )
}

export default FileConverter
