import { useState, useCallback, useEffect } from 'react'
import { useGemini } from '../context/useGemini'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { ImageInput, MetadataResult } from '../context/GeminiContext.types'
import { addMetadata, updateMetadata, removeMetadata, clearMetadata } from '../store/slices/filesSlice'
import ImageUploader from '../components/ImageUploader'
import UploadedImagesDisplay from '../components/UploadedImagesDisplay'
import OnboardingModal from '../components/OnboardingModal'

const Generator = (): React.JSX.Element => {
  const { generateMetadata, stopGeneration, isLoading, error, processingProgress } = useGemini()
  const dispatch = useAppDispatch()
  const { files, metadata } = useAppSelector(state => state.files)
  const { hasCompletedOnboarding, apiKeys } = useAppSelector(state => state.settings)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  // Check if user has completed onboarding (5+ valid API keys)
  const validApiKeysCount = apiKeys.filter(key => key.isValid).length
  const needsOnboarding = !hasCompletedOnboarding || validApiKeysCount < 5
  const [showOnboardingModal, setShowOnboardingModal] = useState(needsOnboarding)

  // Update modal state when onboarding status changes
  useEffect(() => {
    setShowOnboardingModal(needsOnboarding)
  }, [needsOnboarding])

  // Clear metadata when no files are left
  useEffect(() => {
    if (files.length === 0 && metadata.length > 0) {
      dispatch(clearMetadata())
      setSelectedImageId(null)
    }
  }, [files.length, metadata.length, dispatch])

  // Clear selected image if it no longer exists
  useEffect(() => {
    if (selectedImageId && !files.find(f => f.id === selectedImageId)) {
      setSelectedImageId(null)
    }
  }, [files, selectedImageId])

  const handleFilesAccepted = useCallback((files: File[] | ImageInput[]) => {
    console.log('Files accepted:', files.length)
  }, [])

  const handleImageSelected = useCallback((imageId: string) => {
    setSelectedImageId(imageId)
  }, [])

  const handleProcess = useCallback(async (input: File[] | ImageInput[]) => {
    if (input.length === 0) return

    try {
      // Convert to ImageInput format if needed
      let imageInputs: ImageInput[]

      if (input.length > 0 && 'imageData' in input[0]) {
        // Already in ImageInput format
        imageInputs = input as ImageInput[]
      } else {
        // Convert File[] to ImageInput[] (this shouldn't happen in current flow)
        const fileInputs = input as File[]
        imageInputs = await Promise.all(
          fileInputs.map(async (file) => {
            const imageData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = () => reject(new Error('Failed to read file'))
              reader.readAsDataURL(file)
            })
            return {
              imageData,
              filename: file.name
            }
          })
        )
      }

      // Real-time metadata callback - add each result immediately when generated
      const handleMetadataGenerated = (result: MetadataResult): void => {
        console.log('🔥 Real-time metadata generated:', result.filename)
        dispatch(addMetadata([result]))
      }

      // Use the new parallel processing system with real-time callback
      const results = await generateMetadata(imageInputs, handleMetadataGenerated)

      // Final fallback - ensure any missed results are added
      // (This shouldn't be needed with real-time updates, but kept as safety net)
      const existingFilenames = metadata.map(m => m.filename)
      const newResults = results.filter(r => !existingFilenames.includes(r.filename))
      if (newResults.length > 0) {
        console.log(`📋 Adding ${newResults.length} missed results to store`)
        dispatch(addMetadata(newResults))
      }

    } catch (err) {
      console.error('Error generating metadata:', err)
      setShowErrorDialog(true)
    }
  }, [generateMetadata, dispatch, metadata])

  const handleImageRemoved = useCallback((filename: string) => {
    // Remove metadata for the removed image
    dispatch(removeMetadata(filename))

    // Clear selection if the removed image was selected
    const removedFile = files.find(f => f.name === filename)
    if (removedFile && selectedImageId === removedFile.id) {
      setSelectedImageId(null)
    }
  }, [files, selectedImageId, dispatch])

  const handleClear = useCallback(() => {
    dispatch(clearMetadata())
    setSelectedImageId(null)
  }, [dispatch])

  const handleCloseErrorDialog = useCallback(() => {
    setShowErrorDialog(false)
  }, [])

  const handleRetry = useCallback(() => {
    setShowErrorDialog(false)
    if (files.length > 0) {
      // Create ImageInput array from stored files for retry
      const imageInputs = files
        .filter(file => file.previewData && file.previewData.trim() !== '')
        .map(file => ({
          imageData: file.previewData,
          filename: file.name
        }))

      if (imageInputs.length > 0) {
        handleProcess(imageInputs as ImageInput[])
      }
    }
  }, [files, handleProcess])

  const handleExportCSV = useCallback(() => {
    if (metadata.length === 0) return

    // Create CSV content
    const csvHeaders = ['Filename', 'Title', 'Keywords']
    const csvRows = metadata.map(result => [
      result.filename,
      result.title,
      result.keywords.join(', ')
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`) // Escape quotes in CSV
          .join(',')
      )
    ].join('\n')

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `image-metadata-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [metadata])

  const handleMetadataUpdated = useCallback((filename: string, updatedMetadata: { title: string; keywords: string[] }) => {
    dispatch(updateMetadata({
      filename,
      title: updatedMetadata.title,
      keywords: updatedMetadata.keywords
    }))
  }, [dispatch])

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboardingModal(false)
  }, [])

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="min-h-full w-full p-4 relative space-y-4">
        {/* Onboarding Modal - Show if user hasn't completed setup */}
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={handleCloseOnboarding}
        />

        {/* Blocked state when onboarding not complete */}
        {needsOnboarding ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 bg-gray-50 dark:bg-[#2a2d3a] rounded-xl max-w-md">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-12 0v-3.5a3.5 3.5 0 117 0V9a6 6 0 010 12v-3.5a3.5 3.5 0 11-7 0V9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setup Required</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please add at least 5 valid API keys to start using the generator.
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Current: {validApiKeysCount}/5 API keys added
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Image Uploader - Only show if no files */}
            {files.length === 0 && !isLoading && (
              <div className="h-full flex items-center justify-center">
                <ImageUploader
                  onFilesAccepted={handleFilesAccepted}
                  isProcessing={isLoading}
                />
              </div>
            )}

            {/* Uploaded Images Display - Only show if files exist */}
            {files.length > 0 && (
              <UploadedImagesDisplay
                onClear={handleClear}
                onProcess={handleProcess}
                onFilesAccepted={handleFilesAccepted}
                onImageRemoved={handleImageRemoved}
                onImageSelected={handleImageSelected}
                selectedImageId={selectedImageId}
                isProcessing={isLoading}
                hasMetadata={metadata.length > 0}
                metadataResults={metadata}
                onExportCSV={handleExportCSV}
                processingProgress={processingProgress ? {
                  current: processingProgress.completed,
                  total: processingProgress.total
                } : undefined}
                currentProcessingFilename={processingProgress?.currentFilename || null}
                onMetadataUpdated={handleMetadataUpdated}
                onStopGeneration={stopGeneration}
              />
            )}
          </>
        )}

        {/* Error Dialog */}
        {showErrorDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generation Failed
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {error || 'An error occurred while generating metadata. Please try again.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseErrorDialog}
                  className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Generator
