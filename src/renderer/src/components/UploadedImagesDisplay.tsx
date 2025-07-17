import { useAppDispatch, useAppSelector } from '../store/hooks'
import { removeFile, clearFiles, deleteImagePreview, clearAllPreviews, addFile, saveImagePreview, MetadataResult } from '../store/slices/filesSlice'
import { ImageInput } from '../context/GeminiContext.types'
import { useState, useCallback, memo, useEffect } from 'react'
import GenerationSettingsModal from './GenerationSettingsModal'
import ExportDropdown from './ExportDropdown'

// Custom Tooltip Component
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

interface UploadedImagesDisplayProps {
  onClear: () => void
    onProcess?: (files: File[] | ImageInput[], settings?: {
    titleWords: number;
    titleMinWords?: number;
    titleMaxWords?: number;
    keywordsCount: number;
    keywordsMinCount?: number;
    keywordsMaxCount?: number;
    descriptionWords: number;
    descriptionMinWords?: number;
    descriptionMaxWords?: number;
    keywordSettings?: {
      singleWord: boolean;
      doubleWord: boolean;
      mixed: boolean;
    }
    customization?: {
      customPrompt: boolean;
      customPromptText: string;
      prohibitedWords: boolean;
      prohibitedWordsList: string;
      transparentBackground: boolean;
      silhouette: boolean;
    }
    titleCustomization?: {
      titleStyle: string;
      customPrefix: boolean;
      prefixText: string;
      customPostfix: boolean;
      postfixText: string;
    }
  }) => void
  onFilesAccepted: (files: File[] | ImageInput[]) => void
  onImageRemoved?: (filename: string) => void
  onImageSelected?: (imageId: string) => void
  selectedImageId?: string | null
  hasMetadata?: boolean
  metadataResults?: MetadataResult[]
  isProcessing: boolean
  onExportCSV?: () => void
  processingProgress?: { current: number; total: number }
  currentProcessingFilename?: string | null
  generationStartTime?: number | null
  onMetadataUpdated?: (filename: string, updatedMetadata: { title: string; keywords: string[]; description?: string }) => void
  onStopGeneration?: () => void
}

const UploadedImagesDisplay = memo(({ onClear, onProcess, onFilesAccepted, onImageRemoved, onImageSelected, selectedImageId, hasMetadata, metadataResults, isProcessing, onExportCSV, processingProgress, currentProcessingFilename, generationStartTime, onMetadataUpdated, onStopGeneration }: UploadedImagesDisplayProps): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { files, isLoading } = useAppSelector(state => state.files)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [editingKeywords, setEditingKeywords] = useState<{[filename: string]: string[]}>({})
  const [newKeyword, setNewKeyword] = useState('')
  const [draggedKeyword, setDraggedKeyword] = useState<{filename: string, index: number} | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<{type: 'title' | 'keywords' | 'description', filename: string} | null>(null)
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)
  const [processingCount, setProcessingCount] = useState(0)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('0s')
  const [showScrollToTop, setShowScrollToTop] = useState(false)

  // Update timer every second when generation is running
  useEffect(() => {
    if (!generationStartTime || !isProcessing) {
      setElapsedTime('0s')
      return
    }

    const updateTimer = (): void => {
      const elapsed = Date.now() - generationStartTime
      const seconds = Math.floor(elapsed / 1000)

      if (seconds < 60) {
        setElapsedTime(`${seconds}s`)
      } else {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        setElapsedTime(`${minutes}m ${remainingSeconds}s`)
      }
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [generationStartTime, isProcessing])

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = (): void => {
      // Find the scrollable container (the generator page container)
      const scrollContainer = document.querySelector('.overflow-y-auto')
      if (scrollContainer) {
        const scrollTop = scrollContainer.scrollTop
        // Show button when scrolled down more than 200px and have more than 10 images
        setShowScrollToTop(scrollTop > 200 && files.length > 10)
      }
    }

    // Add scroll listener to the correct container
    const scrollContainer = document.querySelector('.overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
    
    // Return empty cleanup function if no scroll container found
    return () => {}
  }, [files.length])



  const scrollToTop = useCallback((): void => {
    // Try multiple selectors to find the scrollable container
    const selectors = [
      '.overflow-y-auto',
      '[class*="overflow-y-auto"]',
      '.flex-1.min-h-0',
      'div[class*="overflow"]'
    ]
    
    let scrollContainer: Element | null = null
    
    for (const selector of selectors) {
      scrollContainer = document.querySelector(selector)
      if (scrollContainer && scrollContainer.scrollTop !== undefined) {
        break
      }
    }
    
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      // Fallback to window scroll
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }, [])

  const handleGenerateMetadata = useCallback((): void => {
    if (files.length > 0) {
      // Filter files that don't have metadata yet
      const filesToProcess = files.filter(file =>
        file.previewData &&
        file.previewData.trim() !== '' &&
        !metadataResults?.some(result => result.filename === file.name)
      )

      if (filesToProcess.length > 0) {
        // Show settings modal instead of immediately processing
        setShowSettingsModal(true)
      } else {
        console.log('All images already have metadata generated')
      }
    }
  }, [files, metadataResults])

    const handleConfirmGeneration = useCallback((settings: {
    titleWords: number;
    titleMinWords?: number;
    titleMaxWords?: number;
    keywordsCount: number;
    keywordsMinCount?: number;
    keywordsMaxCount?: number;
    descriptionWords: number;
    descriptionMinWords?: number;
    descriptionMaxWords?: number;
    keywordSettings?: {
      singleWord: boolean;
      doubleWord: boolean;
      mixed: boolean;
    }
    customization?: {
      customPrompt: boolean;
      customPromptText: string;
      prohibitedWords: boolean;
      prohibitedWordsList: string;
      transparentBackground: boolean;
      silhouette: boolean;
    }
    titleCustomization?: {
      titleStyle: string;
      customPrefix: boolean;
      prefixText: string;
      customPostfix: boolean;
      postfixText: string;
    }
  }): void => {
    if (files.length > 0) {
      // Filter files that don't have metadata yet
      const filesToProcess = files.filter(file =>
        file.previewData &&
        file.previewData.trim() !== '' &&
        !metadataResults?.some(result => result.filename === file.name)
      )

      if (filesToProcess.length > 0) {
        // Process files with settings
        const imageInputs: ImageInput[] = filesToProcess.map(file => {
          // For vector files (SVGs) that have been converted, update the filename to reflect the conversion
          let processedFilename = file.name
          if (file.fileType === 'vector' && file.name.toLowerCase().endsWith('.svg')) {
            // Change .svg extension to .png since we converted it
            processedFilename = file.name.replace(/\.svg$/i, '.png')
          }

          return {
            imageData: file.previewData || '',
            filename: processedFilename,
            fileType: file.fileType || 'image',
            originalData: file.originalData
          }
        })

        if (onProcess) {
          // Pass settings to the processing function
          onProcess(imageInputs, settings)
        } else {
          onFilesAccepted(imageInputs)
        }
      }
    }
  }, [files, metadataResults, onProcess, onFilesAccepted])

  const handleClearImages = useCallback((): void => {
    setShowClearConfirmation(true)
  }, [])

  const confirmClearImages = useCallback((): void => {
    dispatch(clearAllPreviews())
    dispatch(clearFiles())
    setShowClearConfirmation(false)
    onClear()
  }, [dispatch, onClear])

  const cancelClearImages = useCallback((): void => {
    setShowClearConfirmation(false)
  }, [])

  const handleRemoveImage = useCallback((fileId: string): void => {
    // Find the file to get its preview path for cleanup
    const file = files.find(f => f.id === fileId)
    if (file) {
      // Notify parent component about image removal
      if (onImageRemoved) {
        onImageRemoved(file.name)
      }

      // Clean up preview file
      if (file.previewPath) {
        const filename = file.previewPath.split('/').pop() || file.previewPath
        dispatch(deleteImagePreview(filename))
      }

      // Remove file from store
      dispatch(removeFile(fileId))
    }
  }, [files, onImageRemoved, dispatch])

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
          ctx.imageSmoothingQuality = 'high' // Better quality for compressed images

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

    const processFiles = useCallback(async (incomingFiles: File[]): Promise<void> => {
    if (isProcessingFiles) return // Prevent concurrent processing

    // Check file count limit first
    const currentFileCount = files.length
    if (currentFileCount >= 1000) {
      alert('You have reached the maximum limit of 1000 files.')
      return
    }

    if (currentFileCount + incomingFiles.length > 1000) {
      const remainingSlots = 1000 - currentFileCount
      alert(`You can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'} to reach the 1000 file limit.`)
      return
    }

    const filesToProcess = incomingFiles

    setIsProcessingFiles(true)
    setProcessingCount(filesToProcess.length)

    try {

      // Import file validation function
      const { validateFile } = await import('../utils/fileProcessor')

      // Filter for valid files (images, videos, vectors)
      const validFiles = filesToProcess.filter(file => {
        const validation = validateFile(file)

        if (!validation.isValid) {
          console.error(validation.error || 'Invalid file')
          return false
        }

        return true
      })

      if (validFiles.length === 0) {
        setIsProcessingFiles(false)
        setProcessingCount(0)
        return
      }

      // Process files in smaller batches to prevent UI freeze
      const batchSize = 2 // Reduced batch size for better performance on low-end PCs
      for (let i = 0; i < validFiles.length; i += batchSize) {
        const batch = validFiles.slice(i, i + batchSize)

        // Process batch with staggered timing
        await Promise.all(batch.map(async (file, index) => {
          return new Promise<void>((resolve) => {
            // Stagger processing to prevent overwhelming the system
            setTimeout(async () => {
              try {
                const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i + index}`

                // Process the media file (images, videos, vectors)
                const { processMediaFile } = await import('../utils/fileProcessor')
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

                setProcessingCount(prev => prev - 1)
              } catch (error) {
                console.error('Error setting up file processing:', file.name, error)
                setProcessingCount(prev => prev - 1)
                resolve()
              }
            }, index * 100) // Increased stagger time for low-end PCs
          })
        }))

        // Longer delay between batches to allow UI updates and prevent freezing
        if (i + batchSize < validFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Notify parent component
      onFilesAccepted(validFiles)

    } catch (err) {
      console.error('Error processing files:', err)
    } finally {
      setIsProcessingFiles(false)
      setProcessingCount(0)
    }
  }, [dispatch, onFilesAccepted, isProcessingFiles, compressImageIfNeeded])

  const handleAddMoreImages = useCallback((): void => {
    // Check if we're at the file limit
    if (files.length >= 1000) {
      alert('You have reached the maximum limit of 1000 files.')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/avi,video/mov,video/quicktime,.eps,.svg'

    // Set webkitdirectory to false to ensure we're selecting files, not directories
    input.webkitdirectory = false

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        const filesArray = Array.from(target.files)
        processFiles(filesArray)
      }
    }

    input.click()
  }, [processFiles, files.length])

  const handleCopyTitle = useCallback(async (title: string, filename: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(title)
      setCopyFeedback({ type: 'title', filename })
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (err) {
      console.error('Failed to copy title:', err)
    }
  }, [])

  const handleCopyKeywords = useCallback(async (keywords: string[], filename: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(keywords.join(', '))
      setCopyFeedback({ type: 'keywords', filename })
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (err) {
      console.error('Failed to copy keywords:', err)
    }
  }, [])

  const handleCopyDescription = useCallback(async (description: string, filename: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(description)
      setCopyFeedback({ type: 'description', filename })
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (err) {
      console.error('Failed to copy description:', err)
    }
  }, [])

  const handleAddKeyword = useCallback((filename: string): void => {
    if (newKeyword.trim() && onMetadataUpdated) {
      const currentKeywords = getKeywordsForFile(filename)
      const updatedKeywords = [...currentKeywords, newKeyword.trim()]

      // Update local editing state
      setEditingKeywords(prev => ({
        ...prev,
        [filename]: updatedKeywords
      }))

      // Find the current metadata to get the title
      const currentMetadata = metadataResults?.find(result => result.filename === filename)
      if (currentMetadata) {
        onMetadataUpdated(filename, {
          title: currentMetadata.title,
          keywords: updatedKeywords
        })
      }

      setNewKeyword('')
    }
  }, [newKeyword, onMetadataUpdated, metadataResults])

  const handleRemoveKeyword = useCallback((filename: string, index: number): void => {
    if (onMetadataUpdated) {
      const currentKeywords = getKeywordsForFile(filename)
      const updatedKeywords = currentKeywords.filter((_, i) => i !== index)

      // Update local editing state
      setEditingKeywords(prev => ({
        ...prev,
        [filename]: updatedKeywords
      }))

      // Find the current metadata to get the title
      const currentMetadata = metadataResults?.find(result => result.filename === filename)
      if (currentMetadata) {
        onMetadataUpdated(filename, {
          title: currentMetadata.title,
          keywords: updatedKeywords
        })
      }
    }
  }, [onMetadataUpdated, metadataResults])

  const handleDragStart = useCallback((filename: string, index: number): void => {
    setDraggedKeyword({ filename, index })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, filename: string, dropIndex: number): void => {
    e.preventDefault()

    if (draggedKeyword && draggedKeyword.filename === filename && onMetadataUpdated) {
      const currentKeywords = getKeywordsForFile(filename)
      const newKeywords = [...currentKeywords]
      const [draggedItem] = newKeywords.splice(draggedKeyword.index, 1)
      newKeywords.splice(dropIndex, 0, draggedItem)

      // Update local editing state
      setEditingKeywords(prev => ({
        ...prev,
        [filename]: newKeywords
      }))

      // Find the current metadata to get the title
      const currentMetadata = metadataResults?.find(result => result.filename === filename)
      if (currentMetadata) {
        onMetadataUpdated(filename, {
          title: currentMetadata.title,
          keywords: newKeywords
        })
      }
    }

    setDraggedKeyword(null)
  }, [draggedKeyword, onMetadataUpdated, metadataResults])

  const getKeywordsForFile = useCallback((filename: string): string[] => {
    // Check if we have local edits first
    if (editingKeywords[filename]) {
      return editingKeywords[filename]
    }

    // Fall back to metadata results
    const metadata = metadataResults?.find(result => result.filename === filename)
    return metadata?.keywords || []
  }, [editingKeywords, metadataResults])

  // Calculate adaptive grid columns based on file count and screen performance


  return (
    <div className="w-full relative">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Uploaded Images
          </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
            {files.length} image{files.length !== 1 ? 's' : ''} ready for processing
            {isProcessingFiles && processingCount > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                • Processing {processingCount} files...
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddMoreImages}
            disabled={isProcessing || isLoading || isProcessingFiles || files.length >= 1000}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
          >
            Add
          </button>

          <button
            onClick={handleClearImages}
            disabled={isProcessing || isLoading || files.length === 0 || isProcessingFiles}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
          >
            Clear
          </button>

          {isProcessing ? (
            <button
              onClick={onStopGeneration}
              className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
              </svg>
              Stop ({processingProgress ? `${processingProgress.current}/${processingProgress.total}` : 'Processing...'}{generationStartTime ? ` • ${elapsedTime}` : ''})
            </button>
          ) : (
          <button
            onClick={handleGenerateMetadata}
              disabled={isLoading || files.length === 0 || isProcessingFiles}
            className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 hover:shadow-md hover:scale-105 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-[#141517] dark:text-white dark:hover:bg-gray-600"
          >
              Generate
          </button>
          )}

          {hasMetadata && onExportCSV && (
            <ExportDropdown onExportCSV={onExportCSV} disabled={isProcessing || isLoading} />
          )}
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessingFiles && (
        <div className="mb-4 text-center py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Processing images... ({processingCount} remaining)
          </div>
        </div>
      )}

      {/* Images Grid with Inline Metadata */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {(() => {
          const itemsToRender: React.ReactNode[] = []

                     // Calculate grid columns dynamically based on container width
           const getColumnsCount = (): number => {
             if (typeof window !== 'undefined') {
               const containerWidth = Math.min(window.innerWidth - 200, 1200) // Account for sidebar and max width
               return Math.floor(containerWidth / (150 + 16)) // 150px min width + 16px gap
             }
             return 6 // Default fallback
           }

          const columnsCount = getColumnsCount()

          // Find the position where metadata should be inserted
          let metadataInsertPosition = -1
          let selectedFileIndex = -1

          if (selectedImageId) {
            selectedFileIndex = files.findIndex(file => file.id === selectedImageId)
            if (selectedFileIndex !== -1) {
              // Calculate the row of the selected image
              const selectedRow = Math.floor(selectedFileIndex / columnsCount)
              // Insert metadata at the end of the selected row, but ensure it doesn't exceed the file count
              metadataInsertPosition = Math.min((selectedRow + 1) * columnsCount, files.length)
            }
          }

          // Render images and insert metadata at calculated position
          files.forEach((file, index) => {
          const isSelected = selectedImageId === file.id
          const hasFileMetadata = metadataResults?.some(result => result.filename === file.name) || false
          const isCurrentlyProcessing = currentProcessingFilename === file.name

            // Add image to render queue
            itemsToRender.push(
            <div
              key={file.id}
              className={`relative aspect-square group cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                  : hasFileMetadata
                    ? 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-800'
                    : ''
              }`}
              onClick={() => {
                if (hasFileMetadata && onImageSelected && !isCurrentlyProcessing) {
                  onImageSelected(file.id)
                }
              }}
            >
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                {isCurrentlyProcessing ? (
                  /* Enhanced skeleton loading placeholder */
                  <div className="w-full h-full rounded-2xl overflow-hidden relative bg-gray-100 dark:bg-gray-800 skeleton-wrapper">
                    {/* Main shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-[shimmer_2.5s_ease-in-out_infinite] bg-[length:200%_100%] z-10"></div>

                    {/* Skeleton content structure */}
                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                      {/* Top section with image icon skeleton */}
                      <div className="flex justify-center pt-2">
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-[skeletonPulse_1.8s_ease-in-out_infinite]"></div>
                      </div>

                      {/* Middle section with content blocks */}
                      <div className="flex-1 flex flex-col justify-center items-center space-y-2">
                        <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-[skeletonPulse_1.8s_ease-in-out_infinite] delay-200"></div>
                        <div className="w-12 h-2 bg-gray-300 dark:bg-gray-600 rounded animate-[skeletonPulse_1.8s_ease-in-out_infinite] delay-400"></div>
                        <div className="w-20 h-2 bg-gray-300 dark:bg-gray-600 rounded animate-[skeletonPulse_1.8s_ease-in-out_infinite] delay-600"></div>
                      </div>
                    </div>

                    {/* Subtle border animation */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-200/50 via-transparent to-blue-200/50 dark:from-blue-500/30 dark:to-blue-500/30 animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%] pointer-events-none"></div>
                  </div>
                ) : file.previewData ? (
                  <img
                    src={file.previewData}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center break-all">{file.name}</span>
                  </div>
                )}
              </div>

              {/* File type indicator */}
              {file.fileType && file.fileType !== 'image' && (
                <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                  {file.fileType === 'video' ? '🎬' : '📐'}
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Metadata available indicator - Always visible green checkmark */}
              {hasFileMetadata && !isSelected && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Metadata generation failed indicator - Red cross for failed images */}
              {!hasFileMetadata && !isCurrentlyProcessing && metadataResults && metadataResults.length > 0 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">
                  <Tooltip text="Metadata generation failed">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Tooltip>
                </div>
              )}

              {/* Overlay with remove button - Hidden when processing */}
              {!isCurrentlyProcessing && (
                <>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-2xl flex items-center justify-center">
                    <Tooltip text="Double-click to delete">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Double-click confirmation to prevent accidental deletion
                          if (e.detail === 2) {
                            handleRemoveImage(file.id)
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(file.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white p-2 rounded-full hover:from-red-600 hover:via-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-red-500/30 overflow-hidden"
                        type="button"
                        aria-label="Double-click to remove image"
                        disabled={isProcessing || isLoading}
                      >
                        {/* Bleed/shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none" className="relative z-10">
                          <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M9 11.7349H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M10.5 15.6543H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M3 5.5H21M16.0555 5.5L15.3729 4.09173C14.9194 3.15626 14.6926 2.68852 14.3015 2.39681C14.2148 2.3321 14.1229 2.27454 14.0268 2.2247C13.5937 2 13.0739 2 12.0343 2C10.9686 2 10.4358 2 9.99549 2.23412C9.89791 2.28601 9.80479 2.3459 9.7171 2.41317C9.32145 2.7167 9.10044 3.20155 8.65842 4.17126L8.05273 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>

                  {/* File info tooltip */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="truncate">{file.name}</p>
                    <p className="text-gray-300">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </>
              )}
            </div>
          )

            // Insert metadata panel after the selected row is complete
            if (metadataInsertPosition !== -1 && index === metadataInsertPosition - 1) {
        const selectedFile = files.find(file => file.id === selectedImageId)
              if (selectedFile && metadataResults) {
        const metadata = metadataResults.find(result => result.filename === selectedFile.name)
                if (metadata) {
        const currentKeywords = getKeywordsForFile(metadata.filename)

                                     itemsToRender.push(
                     <div
                       key={`metadata-${selectedImageId}`}
                       className="col-span-full mt-2 mb-2 bg-[#f9fafb] dark:bg-gray-900 rounded-2xl p-6 relative border-2 border-blue-200 dark:border-blue-800 shadow-lg metadata-slide-in"
                       style={{
                         gridColumn: '1 / -1'
                       }}
                     >
            {/* Close button */}
            <button
              onClick={() => {
                if (onImageSelected) {
                  onImageSelected('') // Clear selection to close metadata
                }
              }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close metadata"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

                      {/* Metadata content */}
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filename:</h5>
                <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  {metadata.filename}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Title:</h5>
                  <button
                    onClick={() => handleCopyTitle(metadata.title, metadata.filename)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {copyFeedback?.type === 'title' && copyFeedback.filename === metadata.filename ? (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {metadata.title}
                </p>
              </div>

              {/* Description section */}
              {metadata.description && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</h5>
                    <button
                      onClick={() => handleCopyDescription(metadata.description!, metadata.filename)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      {copyFeedback?.type === 'description' && copyFeedback.filename === metadata.filename ? (
                        <>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                    {metadata.description}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Keywords ({currentKeywords.length}):
                  </h5>
                  <button
                    onClick={() => handleCopyKeywords(currentKeywords, metadata.filename)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {copyFeedback?.type === 'keywords' && copyFeedback.filename === metadata.filename ? (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {currentKeywords.map((keyword, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(metadata.filename, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, metadata.filename, index)}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 cursor-move hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                    >
                      <span className="mr-1">{keyword}</span>
                      <button
                        onClick={() => handleRemoveKeyword(metadata.filename, index)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-opacity"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddKeyword(metadata.filename)
                      }
                    }}
                    placeholder="Add new keyword..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAddKeyword(metadata.filename)}
                    disabled={!newKeyword.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
                }
              }
            }
          })

          return itemsToRender
      })()}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Clear All Images
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to remove all uploaded images? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelClearImages}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearImages}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Settings Modal */}
      <GenerationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onConfirm={handleConfirmGeneration}
      />

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
          title="Go to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 transition-transform group-hover:-translate-y-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  )
})

UploadedImagesDisplay.displayName = 'UploadedImagesDisplay'

export default UploadedImagesDisplay