import { useCallback, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addFile, saveImagePreview } from '../store/slices/filesSlice'
import uploadIcon from '../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../assets/icons/add-square-stroke-rounded.svg'

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

  // Advanced image compression optimized for low-end PCs
  const compressImageIfNeeded = useCallback(async (imageData: string, originalSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        let { width, height } = img
        let quality = 0.85 // Default quality
        let maxSize = 1200 // Default max size

        // Aggressive compression based on file size for low-end PC optimization
        if (originalSize > 8 * 1024 * 1024) { // > 8MB - Very large files
          maxSize = 800
          quality = 0.6
        } else if (originalSize > 5 * 1024 * 1024) { // > 5MB - Large files
          maxSize = 1000
          quality = 0.7
        } else if (originalSize > 2 * 1024 * 1024) { // > 2MB - Medium files
          maxSize = 1200
          quality = 0.75
        } else if (originalSize > 1 * 1024 * 1024) { // > 1MB - Small-medium files
          maxSize = 1400
          quality = 0.8
        } else {
          // Small files - minimal compression
          maxSize = 1600
          quality = 0.9
        }

        // Calculate new dimensions
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height

        if (ctx) {
          // Optimize canvas settings for performance
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Use white background for JPEGs to avoid transparency issues
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)

          ctx.drawImage(img, 0, 0, width, height)

          // Always output as JPEG for better compression
          const compressedData = canvas.toDataURL('image/jpeg', quality)

          // Verify compression actually reduced size
          const originalDataSize = imageData.length
          const compressedDataSize = compressedData.length

          // Use compressed version only if it's actually smaller
          if (compressedDataSize < originalDataSize) {
            resolve(compressedData)
          } else {
            resolve(imageData) // Fallback to original if compression didn't help
          }
        } else {
          resolve(imageData) // Fallback to original
        }
      }

      img.onerror = () => resolve(imageData) // Fallback to original
      img.src = imageData
    })
  }, [])

  const processFiles = useCallback(async (incomingFiles: File[]) => {
    try {
      setError(null)

      // Check if upload would exceed the 1000 file limit
      const currentFileCount = files.length
      if (currentFileCount >= 1000) {
        setError('You have reached the maximum limit of 1000 files.')
        return
      }

      if (currentFileCount + incomingFiles.length > 1000) {
        const remainingSlots = 1000 - currentFileCount
        setError(`You can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} to reach the 1000 file limit.`)
        return
      }

      // Filter for valid image files
      const validFiles = incomingFiles.filter(file => {
        const isValidType = file.type.startsWith('image/') &&
          ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
        const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit

        if (!isValidType) {
          setError(`${file.name} is not a supported image format. Please use JPEG, PNG, GIF, or WebP.`)
          return false
        }

        if (!isValidSize) {
          setError(`${file.name} is too large. Please use images smaller than 10MB.`)
          return false
        }

        return true
      })

      if (validFiles.length === 0) {
        return
      }

      // Process each file
      for (const file of validFiles) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Create file data object
        const fileData = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          previewPath: '',
          previewData: ''
        }

        // Create preview with compression
        const reader = new FileReader()
        reader.onload = async (e) => {
          if (e.target?.result) {
            const previewData = e.target.result as string

            // Compress image if needed for better performance
            const compressedData = await compressImageIfNeeded(previewData, file.size)

            // Save preview to file system
            const filename = `${fileId}.png`
            await dispatch(saveImagePreview({ filename, imageData: compressedData }))

            // Add file to store with preview data
            dispatch(addFile({
              ...fileData,
              previewPath: filename,
              previewData: compressedData
            }))
          }
        }
        reader.readAsDataURL(file)
      }

      // Notify parent component
      onFilesAccepted(validFiles)

    } catch (err) {
      console.error('Error processing files:', err)
      setError('An error occurred while processing the files. Please try again.')
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
    if (files.length >= 1000) {
      setError('You have reached the maximum limit of 1000 files.')
      return
    }

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [processFiles, files.length])

  const handleClick = useCallback(() => {
    // Check if at file limit before opening file dialog
    if (files.length >= 1000) {
      setError('You have reached the maximum limit of 1000 files.')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
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
          rounded-xl p-8 transition-all duration-200 ease-in-out bg-[#f9fafb] w-3/4 max-w-3xl h-96 flex items-center justify-center
          ${isDragOver ? 'bg-violet-50' : 'hover:bg-gray-100'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
            className="w-16 h-16 mb-4 transition-all duration-200"
            draggable="false"
          />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragOver ? 'Drop images here' : 'Drop images here or click to upload'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: JPEG, PNG, GIF, WebP (max 10MB, up to 1000 files)
          </p>
        </div>
      </div>
    </>
  )
}

export default ImageUploader
