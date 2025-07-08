import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import uploadIcon from '../../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../../assets/icons/add-square-stroke-rounded.svg'

interface ProcessedImage {
  id: string
  originalBase64: string
  processedBase64: string
  originalSize: [number, number]
  processedSize: [number, number]
  filename: string
  timestamp: number
  processing: boolean
}

const BackgroundRemover = (): React.JSX.Element => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [isHovering, setIsHovering] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('Please drop valid image files (PNG, JPG, JPEG, WEBP)')
      setTimeout(() => setError(''), 3000)
      return
    }

    for (const file of imageFiles) {
      await processImage(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']
    },
    multiple: true,
    disabled: isProcessing
  })

  const processImage = async (file: File) => {
    try {
      setIsProcessing(true)
      setError('')

      // Create file reader to convert to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string

        // Create temporary processed image entry
        const tempImage: ProcessedImage = {
          id: `${Date.now()}-${Math.random()}`,
          originalBase64: base64Data,
          processedBase64: '',
          originalSize: [0, 0],
          processedSize: [0, 0],
          filename: file.name,
          timestamp: Date.now(),
          processing: true
        }

        setProcessedImages(prev => [tempImage, ...prev])

        try {
          // Call background removal API
          const result = await window.api.removeBackground(base64Data)

          if (result.success && result.base64) {
            // Update the image with processed results
            setProcessedImages(prev => prev.map(img =>
              img.id === tempImage.id ? {
                ...img,
                processedBase64: `data:image/png;base64,${result.base64}`,
                originalSize: result.original_size || [0, 0],
                processedSize: result.processed_size || [0, 0],
                processing: false
              } : img
            ))
          } else {
            // Remove failed image and show error
            setProcessedImages(prev => prev.filter(img => img.id !== tempImage.id))
            setError(result.error || 'Background removal failed')
            setTimeout(() => setError(''), 5000)
          }
        } catch (apiError) {
          console.error('Background removal API error:', apiError)
          setProcessedImages(prev => prev.filter(img => img.id !== tempImage.id))
          setError('Failed to process image. Please check if Python and rembg are installed.')
          setTimeout(() => setError(''), 5000)
        }
      }

      reader.readAsDataURL(file)
    } catch (fileError) {
      console.error('File reading error:', fileError)
      setError('Failed to read the image file')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = (image: ProcessedImage, type: 'original' | 'processed') => {
    const dataUrl = type === 'original' ? image.originalBase64 : image.processedBase64
    const suffix = type === 'original' ? 'original' : 'no-bg'
    const filename = `${image.filename.split('.')[0]}-${suffix}.png`

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearImages = () => {
    setProcessedImages([])
  }

  const hasAnyProcessing = processedImages.some(img => img.processing)

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-full">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">Background Remover</h2>

        {/* Upload Area */}
        <div className="mb-8 max-w-4xl">
          <div
            {...getRootProps()}
            className={`
              rounded-2xl p-12 transition-all duration-200 ease-in-out bg-[#f9fafb] text-center cursor-pointer
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
                  {isDragActive ? 'Drop images here' : 'Drop images to remove backgrounds'}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports PNG, JPG, JPEG, WEBP, BMP, TIFF
                </p>
              </div>
              {hasAnyProcessing && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing images...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 max-w-4xl">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">Error</h3>
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processed Images */}
        {processedImages.length > 0 && (
          <div className="max-w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Processed Images ({processedImages.length})
              </h3>
              <button
                onClick={clearImages}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {processedImages.map((image) => (
                <div key={image.id} className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {image.filename}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(image.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Original Image */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original</span>
                          <button
                            onClick={() => downloadImage(image, 'original')}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title="Download original"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <img
                            src={image.originalBase64}
                            alt="Original"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {image.originalSize[0]} × {image.originalSize[1]}
                        </p>
                      </div>

                      {/* Processed Image */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">No Background</span>
                          {!image.processing && (
                            <button
                              onClick={() => downloadImage(image, 'processed')}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                              title="Download processed"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                          {image.processing ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Processing...</p>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={image.processedBase64}
                              alt="No background"
                              className="w-full h-full object-cover"
                              style={{
                                background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                              }}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {image.processing ? 'Processing...' : `${image.processedSize[0]} × ${image.processedSize[1]}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Instructions */}
        <div className="mt-12 max-w-4xl">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Setup Required
                </h3>
                <div className="text-blue-700 dark:text-blue-400 space-y-2">
                  <p>To use background removal, you need to install Python and the rembg package:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Install Python 3.7+ from <a href="https://python.org" className="underline hover:no-underline">python.org</a></li>
                    <li>Install the required packages by running: <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-sm">pip install rembg Pillow numpy</code></li>
                    <li>Make sure Python is available in your system PATH</li>
                  </ol>
                  <p className="text-sm mt-3">💡 <strong>Tip:</strong> The first time you process an image, rembg will download AI models (~170MB). This may take a few minutes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackgroundRemover
