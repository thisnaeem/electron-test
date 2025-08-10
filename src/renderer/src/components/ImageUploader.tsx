import { useCallback, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addFile, saveImagePreview, setUploadProcessing, updateUploadProgress } from '../store/slices/filesSlice'
import uploadIcon from '../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../assets/icons/add-square-stroke-rounded.svg'
import { processMediaFile, validateFile } from '../utils/fileProcessor'

interface ImageUploaderProps {
  onFilesAccepted: (files: File[]) => void
  isProcessing: boolean
}

const ImageUploader = ({ onFilesAccepted, isProcessing }: ImageUploaderProps): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { files } = useAppSelector(state => state.files)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ultra-fast image compression optimized for low-end PCs
  const compressImageIfNeeded = useCallback(async (imageData: string, originalSize: number): Promise<string> => {
    // Skip compression for files under 10MB to speed up processing significantly
    if (originalSize < 10 * 1024 * 1024) {
      return imageData
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      // Set timeout to prevent hanging on corrupted images
      const timeout = setTimeout(() => {
        resolve(imageData) // Return original if compression takes too long
      }, 2000)

      img.onload = () => {
        clearTimeout(timeout)

        try {
          let { width, height } = img
          const maxSize = 600 // Even smaller for low-end PCs
          const quality = 0.6 // Lower quality for speed

          // Aggressive resizing for low-end PCs
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.floor((height * maxSize) / width)
              width = maxSize
            } else {
              width = Math.floor((width * maxSize) / height)
              height = maxSize
            }

            canvas.width = width
            canvas.height = height

            if (ctx) {
              ctx.imageSmoothingEnabled = false // Disable for maximum speed
              ctx.imageSmoothingQuality = 'low'
              ctx.drawImage(img, 0, 0, width, height)
              const compressedData = canvas.toDataURL('image/jpeg', quality)
              resolve(compressedData)
            } else {
              resolve(imageData)
            }
          } else {
            resolve(imageData) // No compression needed
          }
        } catch (error) {
          console.warn('Image compression failed, using original:', error)
          resolve(imageData)
        }
      }

      img.onerror = () => {
        clearTimeout(timeout)
        resolve(imageData)
      }

      img.src = imageData
    })
  }, [])

  // Memory management and batch processing for low-end PCs
  const processFiles = useCallback(async (incomingFiles: File[]) => {
    try {
      setError(null)

      // Check if upload would exceed the 2000 file limit
      const currentFileCount = files.length
      if (currentFileCount >= 2000) {
        setError('You have reached the maximum limit of 2000 files.')
        return
      }

      if (currentFileCount + incomingFiles.length > 2000) {
        const remainingSlots = 2000 - currentFileCount
        setError(`You can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} to reach the 2000 file limit.`)
        return
      }

      // Filter for valid files (images, videos, vectors)
      const validFiles = incomingFiles.filter(file => {
        const validation = validateFile(file)

        if (!validation.isValid) {
          setError(validation.error || 'Invalid file')
          return false
        }

        return true
      })

      if (validFiles.length === 0) {
        return
      }

      // Start upload processing
      dispatch(setUploadProcessing({ isProcessing: true, total: validFiles.length }))

      // Low-end PC optimization: Process files in small batches to prevent memory issues
      const BATCH_SIZE = 5 // Process only 5 files at a time
      const MEMORY_CLEANUP_INTERVAL = 10 // Force garbage collection every 10 files

      for (let batchStart = 0; batchStart < validFiles.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, validFiles.length)
        const batch = validFiles.slice(batchStart, batchEnd)

        // Process batch sequentially to avoid overwhelming memory
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchStart + i
          const file = batch[i]
          const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

          try {
            // Update progress - show current file being processed
            dispatch(updateUploadProgress({ current: globalIndex, currentFileName: file.name }))

            // Process the media file (images, videos, vectors)
            const processedData = await processMediaFile(file)

            // Create file data object
            const fileData = {
              id: fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              previewPath: '',
              previewData: processedData.previewData,
              fileType: processedData.fileType,
              originalData: processedData.originalData
            }

            // For images, apply compression if needed
            let finalPreviewData = processedData.previewData
            if (processedData.fileType === 'image') {
              finalPreviewData = await compressImageIfNeeded(processedData.previewData, file.size)
            }

            // Save preview to file system
            const filename = `${fileId}.png`
            await dispatch(saveImagePreview({ filename, imageData: finalPreviewData }))

            // Add file to store with preview data
            dispatch(addFile({
              ...fileData,
              previewPath: filename,
              previewData: finalPreviewData
            }))

            // Memory cleanup for low-end PCs
            if ((globalIndex + 1) % MEMORY_CLEANUP_INTERVAL === 0) {
              // Force garbage collection and give browser time to clean up
              if (window.gc) {
                window.gc()
              }
              // Small delay to prevent UI freezing
              await new Promise(resolve => setTimeout(resolve, 100))
            }

          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError)
            // Continue with next file instead of stopping entire batch
            continue
          }
        }

        // Batch completion delay to prevent overwhelming the system
        if (batchEnd < validFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Update final progress to show completion
      dispatch(updateUploadProgress({ current: validFiles.length, currentFileName: '' }))

      // Small delay to show completion before hiding modal
      await new Promise(resolve => setTimeout(resolve, 500))

      // End upload processing
      dispatch(setUploadProcessing({ isProcessing: false }))

      // Final memory cleanup
      if (window.gc) {
        window.gc()
      }

      // Notify parent component
      onFilesAccepted(validFiles)

    } catch (err) {
      console.error('Error processing files:', err)
      setError('An error occurred while processing the files. Please try again.')
      // End upload processing on error
      dispatch(setUploadProcessing({ isProcessing: false }))
    }
  }, [dispatch, onFilesAccepted, compressImageIfNeeded, files.length])

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

    // Check if at file limit before processing
    if (files.length >= 2000) {
      setError('You have reached the maximum limit of 2000 files.')
      return
    }

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [processFiles, files.length])

  const handleClick = useCallback(() => {
    // Check if at file limit before opening file dialog
    if (files.length >= 2000) {
      setError('You have reached the maximum limit of 2000 files.')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/avi,video/mov,video/quicktime,.eps,.svg'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        const uploadFiles = Array.from(target.files)
        processFiles(uploadFiles)
        // Reset input value to allow re-selecting the same file
        target.value = ''
      }
    }
    input.click()
  }, [processFiles, files.length])

  return (
    <>
      {/* Error Display */}
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
            {isDragOver ? 'Drop files here' : 'Drop files here or click to upload'}
          </p>
          <p className="text-sm text-gray-500 dark:text-white">
            Images (50MB), Videos (100MB) - up to 2000 files
          </p>
        </div>
      </div>
    </>
  )
}

export default ImageUploader
