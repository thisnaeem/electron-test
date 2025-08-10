import { useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { addFile, saveImagePreview, removeFile, clearFiles } from '../../store/slices/filesSlice'
import uploadIcon from '../../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../../assets/icons/add-square-stroke-rounded.svg'

interface UpscaleSettings {
  scale: 2 | 4 | 6 | 8
  format: 'png' | 'jpg' | 'webp'
}

const MediaUpscaler = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { files } = useAppSelector(state => state.files)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [processedResults, setProcessedResults] = useState<Array<{ fileId: string; original: string; upscaled: string }>>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<UpscaleSettings>({
    scale: 2,
    format: 'png'
  })

  const processFiles = useCallback(async (incomingFiles: File[]) => {
    try {
      setError(null)

      const validFiles = incomingFiles.filter(file => {
        if (!file.type.startsWith('image/')) {
          setError('Only image files are supported for upscaling')
          return false
        }
        return true
      })

      if (validFiles.length === 0) return

      for (const file of validFiles) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const fileData = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          previewPath: '',
          previewData: imageData,
          fileType: 'image' as const
        }

        const filename = `${fileId}.png`
        await dispatch(saveImagePreview({ filename, imageData }))

        dispatch(addFile({
          ...fileData,
          previewPath: filename
        }))
      }
    } catch (err) {
      console.error('Error processing files:', err)
      setError('An error occurred while processing the files. Please try again.')
    }
  }, [dispatch])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [processFiles])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        const uploadFiles = Array.from(target.files)
        processFiles(uploadFiles)
        target.value = ''
      }
    }
    input.click()
  }, [processFiles])

  const upscaleImage = useCallback(async (dataUrl: string, settings: UpscaleSettings): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = img.width * settings.scale
        canvas.height = img.height * settings.scale

        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          const mimeType = `image/${settings.format}`
          const quality = settings.format === 'jpg' ? 0.9 : undefined
          resolve(canvas.toDataURL(mimeType, quality))
        } else {
          resolve(dataUrl)
        }
      }
      img.src = dataUrl
    })
  }, [])

  const handleUpscale = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: files.length })
    setProcessedResults([])

    try {
      const results: Array<{ fileId: string; original: string; upscaled: string }> = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProcessingProgress({ current: i + 1, total: files.length })

        if (processedResults.some(r => r.fileId === file.id)) continue

        const originalDataUrl = file.previewData
        if (!originalDataUrl) continue

        const upscaledDataUrl = await upscaleImage(originalDataUrl, settings)

        results.push({
          fileId: file.id,
          original: originalDataUrl,
          upscaled: upscaledDataUrl
        })
      }

      setProcessedResults(prev => [...prev, ...results])

      try {
        await window.api.showNotification({
          title: 'Upscaling Complete',
          body: `Successfully upscaled ${results.length} image${results.length > 1 ? 's' : ''} to ${settings.scale}x`
        })
      } catch (error) {
        console.log('Could not show notification:', error)
      }

    } catch (error) {
      console.error('Error during upscaling:', error)
      setError('An error occurred during upscaling. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [files, settings, processedResults, upscaleImage])

  const handleClear = useCallback(() => {
    dispatch(clearFiles())
    setProcessedResults([])
  }, [dispatch])

  const handleRemoveImage = useCallback((fileId: string) => {
    dispatch(removeFile(fileId))
    setProcessedResults(prev => prev.filter(r => r.fileId !== fileId))
  }, [dispatch])

  const handleAddMoreImages = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        const uploadFiles = Array.from(target.files)
        processFiles(uploadFiles)
        target.value = ''
      }
    }
    input.click()
  }, [processFiles])

  const downloadUpscaledImage = useCallback((upscaledDataUrl: string, originalName: string) => {
    const link = document.createElement('a')
    link.href = upscaledDataUrl
    link.download = `${originalName.split('.')[0]}_upscaled_${settings.scale}x.${settings.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [settings])

  const downloadAllUpscaled = useCallback(async () => {
    const upscaledResults = processedResults.filter(result => result.upscaled)

    if (upscaledResults.length === 0) {
      setError('No upscaled images to download')
      return
    }

    try {
      // Create a zip file with all upscaled images
      let JSZip
      try {
        JSZip = (await import('jszip')).default
      } catch (importError) {
        // Fallback: download images individually if JSZip fails to load
        console.warn('JSZip failed to load, downloading images individually:', importError)
        for (const result of upscaledResults) {
          const file = files.find(f => f.id === result.fileId)
          if (file && result.upscaled) {
            downloadUpscaledImage(result.upscaled, file.name)
            // Add small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        return
      }

      const zip = new JSZip()

      for (let i = 0; i < upscaledResults.length; i++) {
        const result = upscaledResults[i]
        const file = files.find(f => f.id === result.fileId)

        if (file && result.upscaled) {
          // Convert data URL to blob
          const response = await fetch(result.upscaled)
          const blob = await response.blob()

          const filename = `${file.name.split('.')[0]}_upscaled_${settings.scale}x.${settings.format}`
          zip.file(filename, blob)
        }
      }

      // Generate zip and download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `upscaled_images_${settings.scale}x.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      // Show notification
      try {
        await window.api.showNotification({
          title: 'Download Complete',
          body: `Downloaded ${upscaledResults.length} upscaled images as ZIP file`
        })
      } catch (error) {
        console.log('Could not show notification:', error)
      }

    } catch (error) {
      console.error('Error creating zip file:', error)
      setError('Failed to create download package. Please try downloading images individually.')
    }
  }, [processedResults, files, settings])

  const UploadArea = () => (
    <>
      {error && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-lg w-full text-center bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow-lg z-50">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`
          rounded-xl p-8 transition-all duration-200 ease-in-out bg-[#f3f4f6] dark:bg-[#141517] w-3/4 max-w-3xl h-96 flex items-center justify-center
          ${isDragOver ? 'ring-4 ring-violet-400 dark:ring-violet-600' : 'hover:ring-4 hover:ring-blue-300 dark:hover:ring-blue-700'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          dark:text-white
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isProcessing ? undefined : handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex flex-col items-center justify-center">
          <img
            src={isHovering ? addSquareIcon : uploadIcon}
            alt="Upload"
            className="w-16 h-16 mb-4 transition-all duration-200 dark:invert"
            draggable="false"
          />
          <p className="text-lg font-medium text-gray-700 mb-2 dark:text-white">
            {isDragOver ? 'Drop images here' : 'Drop images here or click to upload'}
          </p>
          <p className="text-sm text-gray-500 dark:text-white">
            Images only - JPG, PNG, WebP supported
          </p>
        </div>
      </div>
    </>
  )

  const ImagesGrid = () => (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Images for Upscaling
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {files.length} image{files.length !== 1 ? 's' : ''} ready
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={settings.scale}
              onChange={(e) => setSettings({ ...settings, scale: parseInt(e.target.value) as 2 | 4 | 6 | 8 })}
              className="px-4 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors appearance-none pr-8 dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
              disabled={isProcessing}
            >
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={6}>6x</option>
              <option value={8}>8x</option>
            </select>
            <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={handleAddMoreImages}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
          >
            Add
          </button>

          <button
            onClick={handleClear}
            disabled={isProcessing || files.length === 0}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
          >
            Clear
          </button>

          {processedResults.length > 0 && (
            <button
              onClick={downloadAllUpscaled}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All ({processedResults.length})
            </button>
          )}

          {isProcessing ? (
            <button className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Upscaling ({processingProgress.current}/{processingProgress.total})
            </button>
          ) : (
            <button
              onClick={handleUpscale}
              disabled={files.length === 0}
              className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
            >
              Upscale to {settings.scale}x
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {files.map((file) => {
          const result = processedResults.find(r => r.fileId === file.id)
          const isUpscaled = !!result

          return (
            <div key={file.id} className="relative aspect-square group">
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                {file.previewData ? (
                  <img
                    src={file.previewData}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="text-gray-400">Loading...</div>
                )}
              </div>

              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  {isUpscaled && result && (
                    <button
                      onClick={() => downloadUpscaledImage(result.upscaled, file.name)}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      title="Download upscaled image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveImage(file.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {isUpscaled && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {settings.scale}x
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-2xl">
                <p className="text-white text-xs truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 min-h-screen flex flex-col bg-white dark:bg-[#101113]">
      <div className="flex-1 min-h-0 w-full p-4 relative space-y-4 overflow-y-auto">
        {files.length === 0 && !isProcessing ? (
          <div className="h-full flex items-center justify-center">
            <UploadArea />
          </div>
        ) : (
          <ImagesGrid />
        )}
      </div>
    </div>
  )
}

export default MediaUpscaler